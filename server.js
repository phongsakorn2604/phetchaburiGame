const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://hzibytcdjyncsowmznyw.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_ulnQyeMBoZsri-h1_AbGYQ_bu_TdWFA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Multer setup for Supabase Storage
const upload = multer({ storage: multer.memoryStorage() });

app.post('/upload', upload.array('images', 3), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    try {
        const imageUrls = [];
        for (const file of req.files) {
            const ext = path.extname(file.originalname);
            const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
            
            // Upload to Supabase 'images' bucket
            const { data, error } = await supabase.storage
                .from('images')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false
                });
                
            if (error) {
                console.error('Supabase upload error:', error);
                return res.status(500).json({ error: 'Failed to upload to Supabase' });
            }
            
            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
                
            imageUrls.push(publicUrlData.publicUrl);
        }
        
        res.json({ imageUrls: imageUrls });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during upload' });
    }
});

// Fallback to index.html for 404s
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});



let savedSets = [];

async function loadSavedSetsFromSupabase() {
    try {
        const { data, error } = await supabase.from('saved_sets').select('*');
        if (error) {
            console.error('Error fetching from Supabase:', error);
        } else if (data) {
            savedSets = data;
            console.log(`Loaded ${savedSets.length} sets from Supabase`);
        }
    } catch(e) {
        console.error('Failed to load sets from Supabase', e);
    }
}

// Load sets initially
loadSavedSetsFromSupabase();

const rooms = {};

// Sample locations (can be expanded later)
const gameLocations = [
    {
        id: 1,
        imageUrls: ['/images/1.jpg'],
        lat: 48.8584,
        lng: 2.2945,
        name: 'Eiffel Tower, Paris'
    },
    {
        id: 2,
        imageUrls: ['/images/2.jpg'],
        lat: 51.5033,
        lng: -0.1195,
        name: 'London Eye, UK'
    },
    {
        id: 3,
        imageUrls: ['/images/3.jpg'],
        lat: 25.1972,
        lng: 55.2744,
        name: 'Burj Khalifa, Dubai'
    },
    {
        id: 4,
        imageUrls: ['/images/4.jpg'],
        lat: 41.8902,
        lng: 12.4922,
        name: 'Colosseum, Rome'
    },
    {
        id: 5,
        imageUrls: ['/images/5.jpg'],
        lat: 40.6892,
        lng: -74.0445,
        name: 'Statue of Liberty, New York'
    }
];

// Helper to calculate distance in km using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
}

function calculateScore(distanceKm, timeRemainingSeconds) {
    let distanceScore = 0;
    let distanceBonus = 0;

    // ระบบกำหนดระยะทางสูงสุดที่นำมาคำนวณคะแนนไว้ที่ 1 กิโลเมตร (1 km)
    // หากเกิน 1 km จะไม่ได้คะแนนระยะทาง
    if (distanceKm <= 1) {
        // คะแนนลดลงตามสัดส่วนของระยะทาง (0 km = 100 คะแนน, 1 km = 0 คะแนน)
        distanceScore = Math.round(100 * (1 - distanceKm));
        
        // หากระยะไม่เกิน 200 เมตร (0.2 km) ได้รับโบนัส +20 คะแนน
        if (distanceKm <= 0.2) {
            distanceBonus = 20;
        }
    }

    // คะแนนเวลา: ตอบเร็วได้คะแนนเยอะ (อิงจากเวลาเต็ม 25 วินาที, ให้สูงสุด 50 คะแนน)
    const timeBonus = Math.round((timeRemainingSeconds / 25) * 50);

    const totalDistancePoints = distanceScore + distanceBonus;
    return { 
        distanceScore: totalDistancePoints, 
        timeBonus, 
        total: totalDistancePoints + timeBonus 
    };
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Admin creates a room
    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
            admin: socket.id,
            players: {},
            status: 'waiting',
            locations: [...gameLocations].sort(() => 0.5 - Math.random()), // Shuffle locations
            currentRoundIndex: -1,
            timerInterval: null
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    // Saved Sets Logic
    socket.on('getSavedSets', async () => {
        try {
            const { data, error } = await supabase.from('saved_sets').select('*');
            if (data && !error) {
                savedSets = data;
                socket.emit('savedSets', savedSets);
            } else {
                socket.emit('savedSets', savedSets); // fallback
            }
        } catch(e) {
            socket.emit('savedSets', savedSets);
        }
    });

    socket.on('saveSet', async (setObj) => {
        setObj.id = Date.now().toString();
        try {
            const { error } = await supabase.from('saved_sets').insert([{ id: setObj.id, name: setObj.name, locations: setObj.locations }]);
            if (error) { socket.emit('error', 'Failed to save set to database'); return; }
            savedSets.push(setObj);
            io.emit('savedSets', savedSets);
        } catch(e) { socket.emit('error', 'Server error saving set'); }
    });

    socket.on('updateSet', async (setObj) => {
        try {
            const { error } = await supabase.from('saved_sets').update({ name: setObj.name, locations: setObj.locations }).eq('id', setObj.id);
            if (error) { socket.emit('error', 'Failed to update set'); return; }
            const index = savedSets.findIndex(s => s.id === setObj.id);
            if (index !== -1) { savedSets[index] = setObj; }
            io.emit('savedSets', savedSets);
        } catch(e) { socket.emit('error', 'Server error updating set'); }
    });

    socket.on('deleteSet', async (setId) => {
        try {
            const { error } = await supabase.from('saved_sets').delete().eq('id', setId);
            if (error) { socket.emit('error', 'Failed to delete set'); return; }
            savedSets = savedSets.filter(s => s.id !== setId);
            io.emit('savedSets', savedSets);
        } catch(e) { socket.emit('error', 'Server error deleting set'); }
    });

    // Player joins a room
    socket.on('joinRoom', ({ roomId, name, avatar }) => {
        const room = rooms[roomId];
        if (!room) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (room.status !== 'waiting') {
            socket.emit('error', 'Game already in progress');
            return;
        }

        room.players[socket.id] = {
            name,
            avatar,
            score: 0,
            hasGuessed: false,
            lastGuess: null
        };
        socket.join(roomId);
        
        // Notify everyone (admin and players)
        io.to(roomId).emit('playerJoined', room.players);
        // Notify player of success
        socket.emit('joined', roomId);
    });

    function startNextRound(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        room.currentRoundIndex++;
        if (room.currentRoundIndex >= room.locations.length) {
            io.to(roomId).emit('gameOver', room.players);
            room.status = 'finished';
            return;
        }

        room.status = 'playing';
        const currentLocation = room.locations[room.currentRoundIndex];
        
        // Reset player round states
        for (let playerId in room.players) {
            room.players[playerId].hasGuessed = false;
            room.players[playerId].lastGuess = null;
        }

        // Broadcast to players to start round (hide coordinates)
        io.to(roomId).emit('roundStarted', {
            imageUrls: currentLocation.imageUrls || [currentLocation.imageUrl], // Fallback for old saved sets
            round: room.currentRoundIndex + 1,
            totalRounds: room.locations.length,
            timeLimit: 25
        });

        // Start timer on server
        let timeLeft = 25;
        room.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(room.timerInterval);
                endRound(roomId);
            }
        }, 1000);
    }

    // Admin starts game
    socket.on('startRound', ({ roomId, locations }) => {
        const room = rooms[roomId];
        if (!room || room.admin !== socket.id) return;
        
        // Only allow starting if it's the first round or the game has finished
        if (room.currentRoundIndex === -1 || room.status === 'finished') {
            room.currentRoundIndex = -1; // Reset for new game
            
            // Reset player scores for the new game
            for (let pId in room.players) {
                room.players[pId].score = 0;
                room.players[pId].hasGuessed = false;
                room.players[pId].lastGuess = null;
            }

            // Use custom locations provided by admin
            if (locations && locations.length > 0) {
                room.locations = locations;
            } else {
                // Fallback (shouldn't happen with new UI, but safe)
                room.locations = [...gameLocations].sort(() => 0.5 - Math.random());
            }
            startNextRound(roomId);
        }
    });

    // Player submits a guess
    socket.on('submitGuess', ({ roomId, lat, lng, timeRemaining }) => {
        const room = rooms[roomId];
        if (!room || room.status !== 'playing' || !room.players[socket.id] || room.players[socket.id].hasGuessed) return;

        const player = room.players[socket.id];
        const currentLocation = room.locations[room.currentRoundIndex];
        
        const distance = calculateDistance(lat, lng, currentLocation.lat, currentLocation.lng);
        const { distanceScore, timeBonus, total } = calculateScore(distance, timeRemaining);

        player.hasGuessed = true;
        player.score += total;
        player.lastGuess = {
            lat, lng, distance, distanceScore, timeBonus, total
        };

        // Just acknowledge receipt to the player
        socket.emit('guessReceived');

        // Notify admin of live scoreboard update
        io.to(room.admin).emit('scoreboardUpdate', room.players);
    });

    function endRound(roomId) {
        const room = rooms[roomId];
        if (!room) return;

        room.status = 'waiting';
        const currentLocation = room.locations[room.currentRoundIndex];

        // Give 0 score to those who didn't guess, and send guessResult to everyone
        for (let playerId in room.players) {
            if (!room.players[playerId].hasGuessed) {
                room.players[playerId].lastGuess = {
                    distance: null, distanceScore: 0, timeBonus: 0, total: 0
                };
            }
            
            io.to(playerId).emit('guessResult', {
                distance: room.players[playerId].lastGuess.distance,
                distanceScore: room.players[playerId].lastGuess.distanceScore,
                timeBonus: room.players[playerId].lastGuess.timeBonus,
                total: room.players[playerId].lastGuess.total,
                actualLocation: { lat: currentLocation.lat, lng: currentLocation.lng, name: currentLocation.name }
            });
        }

        io.to(roomId).emit('roundEnded', {
            players: room.players,
            actualLocation: currentLocation
        });

        // Automatically start next round after 5 seconds
        setTimeout(() => {
            if (rooms[roomId] && rooms[roomId].status === 'waiting') {
                startNextRound(roomId);
            }
        }, 5000);
    }

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up rooms if admin leaves, or remove player
        for (let roomId in rooms) {
            const room = rooms[roomId];
            if (room.admin === socket.id) {
                // Admin left, destroy room
                io.to(roomId).emit('error', 'Admin disconnected. Game over.');
                delete rooms[roomId];
            } else if (room.players[socket.id]) {
                delete room.players[socket.id];
                // Notify everyone
                if (rooms[roomId]) { // double check if room still exists
                    io.to(roomId).emit('playerJoined', room.players);
                }
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
