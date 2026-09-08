const socket = io();

// Retrieve user info
const playerName = sessionStorage.getItem('playerName');
const playerAvatar = sessionStorage.getItem('playerAvatar');
const roomId = sessionStorage.getItem('roomId');

if (!playerName || !roomId) {
    window.location.href = '/';
}

document.getElementById('playerNameDisplay').innerText = playerName;
document.getElementById('playerAvatarDisplay').innerText = playerAvatar;
document.getElementById('roomCodeDisplay').innerText = roomId;

socket.on('playerJoined', (playersObj) => {
    const listContainer = document.getElementById('waitingPlayerList');
    const countDisplay = document.getElementById('waitingPlayerCount');
    
    if (!listContainer || !countDisplay) return;
    
    listContainer.innerHTML = '';
    
    if (playersObj) {
        const players = Object.values(playersObj);
        countDisplay.innerText = players.length;
        
        players.forEach(p => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.flexDirection = 'column';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'center';
            item.style.gap = '0.2rem';
            item.style.padding = '0.5rem';
            item.style.background = 'var(--bg-dark)';
            item.style.border = '1px solid var(--border)';
            item.style.borderRadius = '8px';
            item.style.position = 'relative';
            item.style.overflow = 'hidden';
            
            // Highlight self
            const isMe = p.name === playerName ? '<div style="position: absolute; top: 0; right: 0; font-size: 0.6rem; background: var(--primary); color: white; padding: 2px 5px; border-bottom-left-radius: 6px;">คุณ</div>' : '';
            
            item.innerHTML = `
                <div style="font-size: 1.8rem;">${p.avatar}</div>
                <div style="font-weight: bold; font-size: 0.85rem; color: var(--text); width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">${p.name}</div>
                ${isMe}
            `;
            listContainer.appendChild(item);
        });
    }
});

// Initialize Map (Centered on Phetchaburi, Thailand)
const phetchaburiLatLng = [13.1111, 99.9406];
const map = L.map('map').setView(phetchaburiLatLng, 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fix grey map issue when container size isn't ready
setTimeout(() => {
    map.invalidateSize();
}, 500);

let currentMarker = null;
let actualMarker = null;
let linePath = null;

let timeRemaining = 25;
let timerInterval = null;
let canGuess = false;

// Map Toggle Logic
document.getElementById('toggleMapBtn').addEventListener('click', () => {
    document.getElementById('mapSection').classList.add('active');
    setTimeout(() => map.invalidateSize(), 100);
});

document.getElementById('closeMapBtn').addEventListener('click', () => {
    document.getElementById('mapSection').classList.remove('active');
});

// Map click event
map.on('click', function(e) {
    if (!canGuess) return;
    
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker(e.latlng).addTo(map);
    document.getElementById('submitGuessBtn').disabled = false;
});

// Submit guess
document.getElementById('submitGuessBtn').addEventListener('click', () => {
    if (!canGuess || !currentMarker) return;
    
    canGuess = false;
    document.getElementById('submitGuessBtn').disabled = true;
    
    socket.emit('submitGuess', {
        roomId: roomId,
        lat: currentMarker.getLatLng().lat,
        lng: currentMarker.getLatLng().lng,
        timeRemaining: timeRemaining
    });
    
    // Hide map modal and button, show waiting status
    document.getElementById('mapSection').classList.remove('active');
    document.getElementById('toggleMapBtn').style.display = 'none';
    const statusOverlay = document.getElementById('statusOverlay');
    statusOverlay.innerText = 'ส่งคำตอบแล้ว รอเวลาหมด...';
    statusOverlay.style.display = 'block';
});

socket.on('guessReceived', () => {
    console.log('Server acknowledged guess');
});

// Socket Events
socket.emit('joinRoom', { roomId, name: playerName, avatar: playerAvatar });

socket.on('joined', () => {
    console.log('Successfully joined room');
});

socket.on('error', (msg) => {
    Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: msg,
        background: 'var(--bg-dark)',
        color: 'var(--text)',
        confirmButtonColor: 'var(--primary)'
    }).then(() => {
        window.location.href = '/';
    });
});

socket.on('roundStarted', (data) => {
    document.getElementById('waitingScreen').style.display = 'none';
    document.getElementById('resultModal').style.display = 'none';
    
    const carouselContainer = document.getElementById('carouselContainer');
    const indicator = document.getElementById('carouselIndicator');
    
    carouselContainer.innerHTML = '';
    let urls = data.imageUrls || [data.imageUrl];
    
    urls.forEach((url, i) => {
        carouselContainer.innerHTML += `<div class="carousel-slide"><img src="${url}"></div>`;
    });
    
    carouselContainer.style.display = 'flex';
    document.getElementById('imagePlaceholder').style.display = 'none';
    
    const prevBtn = document.getElementById('prevImgBtn');
    const nextBtn = document.getElementById('nextImgBtn');
    
    if (urls.length > 1) {
        indicator.style.display = 'block';
        indicator.innerText = `1 / ${urls.length}`;
        
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        
        prevBtn.onclick = () => carouselContainer.scrollBy({ left: -carouselContainer.clientWidth, behavior: 'smooth' });
        nextBtn.onclick = () => carouselContainer.scrollBy({ left: carouselContainer.clientWidth, behavior: 'smooth' });
        
        carouselContainer.onscroll = () => {
            let index = Math.round(carouselContainer.scrollLeft / carouselContainer.clientWidth);
            indicator.innerText = `${index + 1} / ${urls.length}`;
        };
    } else {
        indicator.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
    
    // Reset map
    if (currentMarker) map.removeLayer(currentMarker);
    if (actualMarker) map.removeLayer(actualMarker);
    if (linePath) map.removeLayer(linePath);
    currentMarker = null;
    map.setView(phetchaburiLatLng, 12);
    
    // Reset game state if it's round 1
    if (data.round === 1) {
        document.getElementById('scoreDisplay').innerText = '0';
    }
    
    // Reset UI elements
    document.getElementById('toggleMapBtn').style.display = 'flex';
    document.getElementById('statusOverlay').style.display = 'none';
    document.getElementById('mapSection').classList.remove('active');

    
    // Ensure map renders correctly when becoming visible
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
    
    canGuess = true;
    document.getElementById('submitGuessBtn').disabled = true;
    
    // Start local timer
    timeRemaining = data.timeLimit;
    document.getElementById('timeDisplay').innerText = timeRemaining;
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining--;
        document.getElementById('timeDisplay').innerText = timeRemaining;
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            canGuess = false;
            document.getElementById('submitGuessBtn').disabled = true;
            document.getElementById('toggleMapBtn').style.display = 'none';
            document.getElementById('statusOverlay').innerText = 'หมดเวลา! รอเฉลย...';
            document.getElementById('statusOverlay').style.display = 'block';
        }
    }, 1000);
});

socket.on('guessResult', (data) => {
    // Open the map so players can see the answer
    document.getElementById('mapSection').classList.add('active');
    document.getElementById('toggleMapBtn').style.display = 'none';
    document.getElementById('statusOverlay').style.display = 'none';
    setTimeout(() => map.invalidateSize(), 100);

    // Show actual location and draw line
    if (currentMarker && data.actualLocation) {
        actualMarker = L.marker([data.actualLocation.lat, data.actualLocation.lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map);
        
        const latlngs = [
            currentMarker.getLatLng(),
            [data.actualLocation.lat, data.actualLocation.lng]
        ];
        linePath = L.polyline(latlngs, {color: 'red'}).addTo(map);
        map.fitBounds(linePath.getBounds(), { padding: [50, 50] });
    } else if (!currentMarker && data.actualLocation) {
        // Player didn't guess, just show the answer
        actualMarker = L.marker([data.actualLocation.lat, data.actualLocation.lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
            })
        }).addTo(map);
        map.setView([data.actualLocation.lat, data.actualLocation.lng], 12);
    }

    // Update Score
    const currentScore = parseInt(document.getElementById('scoreDisplay').innerText);
    document.getElementById('scoreDisplay').innerText = currentScore + data.total;

    // Show result modal after 3 seconds so player can see the map line
    setTimeout(() => {
        document.getElementById('resultModal').style.display = 'flex';
        document.getElementById('resultLocationName').innerText = data.actualLocation.name;
        
        if (data.distance !== null) {
            const distDisplay = data.distance < 1 ? (data.distance * 1000).toFixed(0) + ' ม.' : data.distance.toFixed(2) + ' กม.';
            document.getElementById('resultDistance').innerText = distDisplay;
            document.getElementById('resultDistanceScore').innerText = '+' + data.distanceScore;
            document.getElementById('resultTimeBonus').innerText = '+' + data.timeBonus;
            document.getElementById('resultTotalScore').innerText = '+' + data.total;
        } else {
            document.getElementById('resultDistance').innerText = 'ไม่ได้ตอบ (หมดเวลา)';
            document.getElementById('resultDistanceScore').innerText = '0';
            document.getElementById('resultTimeBonus').innerText = '0';
            document.getElementById('resultTotalScore').innerText = '0';
        }
    }, 3000); 
});

socket.on('roundEnded', () => {
    // handled mostly by guessResult, but useful if server forces end
    clearInterval(timerInterval);
    canGuess = false;
    document.getElementById('submitGuessBtn').disabled = true;
});

socket.on('gameOver', (playersObj) => {
    document.getElementById('resultModal').style.display = 'none'; // Hide round result if it's open
    document.getElementById('gameOverModal').style.display = 'flex';
    document.getElementById('finalScoreDisplay').innerText = document.getElementById('scoreDisplay').innerText;
    
    // Build Podium
    const podiumContainer = document.getElementById('leaderboardPodium');
    podiumContainer.innerHTML = '';
    
    if (playersObj) {
        const players = Object.values(playersObj).sort((a, b) => b.score - a.score);
        
        // Define podium heights and colors
        const podiumStyles = [
            { height: '140px', bg: '#FBBF24', label: '1st' }, // Gold
            { height: '110px', bg: '#9CA3AF', label: '2nd' }, // Silver
            { height: '80px', bg: '#D97706', label: '3rd' }  // Bronze
        ];
        
        // Reorder for display: 2nd, 1st, 3rd
        const displayOrder = [];
        if (players[1]) displayOrder.push({ player: players[1], style: podiumStyles[1] });
        if (players[0]) displayOrder.push({ player: players[0], style: podiumStyles[0] });
        if (players[2]) displayOrder.push({ player: players[2], style: podiumStyles[2] });
        
        displayOrder.forEach((item) => {
            const p = item.player;
            const s = item.style;
            
            const col = document.createElement('div');
            col.style.display = 'flex';
            col.style.flexDirection = 'column';
            col.style.alignItems = 'center';
            col.style.width = '80px';
            
            col.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.2rem;">${p.avatar}</div>
                <div style="font-size: 0.85rem; font-weight: bold; width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.name}</div>
                <div style="font-size: 0.8rem; color: #4B5563; margin-bottom: 0.5rem;">${p.score} pt</div>
                <div style="width: 100%; height: ${s.height}; background: ${s.bg}; border-radius: 8px 8px 0 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 0.5rem; color: white; font-weight: bold; box-shadow: inset 0 -10px 20px rgba(0,0,0,0.1);">
                    ${s.label}
                </div>
            `;
            podiumContainer.appendChild(col);
        });
    }
});

window.returnToLobby = function() {
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('waitingScreen').style.display = 'flex';
};
