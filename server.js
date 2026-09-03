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

// Multer setup for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the URL to access the uploaded file
    res.json({ imageUrl: '/uploads/' + req.file.filename });
});

// Fallback to index.html for 404s
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const DATA_FILE = path.join(__dirname, 'saved_sets.json');
let savedSets = [];
if (fs.existsSync(DATA_FILE)) {
    try {
        savedSets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading saved sets:', e);
    }
}

function saveSetsToFile() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(savedSets, null, 2));
}

const rooms = {};

// Sample locations (can be expanded later)
const gameLocations = [
    {
        id: 1,
        imageUrl: '/images/1.jpg',
        lat: 48.8584,
        lng: 2.2945,
        name: 'Eiffel Tower, Paris'
    },
    {
        id: 2,
        imageUrl: '/images/2.jpg',
        lat: 51.5033,
        lng: -0.1195,
        name: 'London Eye, UK'
    },
    {
        id: 3,
        imageUrl: '/images/3.jpg',
        lat: 25.1972,
        lng: 55.2744,
        name: 'Burj Khalifa, Dubai'
    },
    {
        id: 4,
        imageUrl: '/images/4.jpg',
        lat: 41.8902,
        lng: 12.4922,
        name: 'Colosseum, Rome'
    },
    {
        id: 5,
        imageUrl: '/images/5.jpg',
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

// Calculate score based on distance and remaining time
function calculateScore(distanceKm, timeRemainingSeconds) {
    // For a local/province scale game, a distance of 20-50km is considered far.
    // Distance score: 0 to 200 points
    let distanceScore = 200 * Math.exp(-distanceKm / 20); // Exponential decay (scale: 20km)
    distanceScore = Math.max(0, Math.round(distanceScore));

    // Time bonus: up to 80 points (proportional to 15 seconds)
    // If they guess instantly (15s), they get 80. If 0s, they get 0.
    const timeBonus = Math.round((timeRemainingSeconds / 15) * 80);

    return { distanceScore, timeBonus, total: distanceScore + timeBonus };
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
    socket.on('getSavedSets', () => {
        socket.emit('savedSets', savedSets);
    });

    socket.on('saveSet', (setObj) => {
        setObj.id = Date.now().toString();
        savedSets.push(setObj);
        saveSetsToFile();
        // Broadcast to all admins that a new set is available
        io.emit('savedSets', savedSets);
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
            imageUrl: currentLocation.imageUrl,
            round: room.currentRoundIndex + 1,
            totalRounds: room.locations.length,
            timeLimit: 15
        });

        // Start timer on server
        let timeLeft = 15;
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
