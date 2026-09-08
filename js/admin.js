
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'var(--card-light)',
  color: 'var(--text)'
});
const socket = io();

let currentRoomId = null;
let currentPlayers = {};
let customLocations = [];

// Setup Admin Map
const phetchaburiLatLng = [13.1111, 99.9406];
const setupMap = L.map('setupMap').setView(phetchaburiLatLng, 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(setupMap);

// Modal logic
document.getElementById('openSetupBtn').addEventListener('click', () => {
    document.getElementById('setupModal').style.display = 'flex';
    // Fix map rendering issue when opening modal
    setTimeout(() => {
        setupMap.invalidateSize();
    }, 100);
});

document.getElementById('closeSetupBtn').addEventListener('click', () => {
    document.getElementById('setupModal').style.display = 'none';
});

let setupMarker = null;

setupMap.on('click', function(e) {
    if (setupMarker) {
        setupMap.removeLayer(setupMarker);
    }
    setupMarker = L.marker(e.latlng).addTo(setupMap);
    checkAddLocBtn();
});

document.getElementById('locName').addEventListener('input', checkAddLocBtn);
document.getElementById('locImg').addEventListener('input', checkAddLocBtn);

document.getElementById('uploadImgBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('locImgFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        Toast.fire({ icon: 'warning', title: 'กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด' });
        return;
    }

    if (fileInput.files.length > 3) {
        Toast.fire({ icon: 'warning', title: 'อัปโหลดได้สูงสุด 3 รูปภาพ' });
        return;
    }

    const formData = new FormData();
    for(let i = 0; i < fileInput.files.length; i++) {
        formData.append('images', fileInput.files[i]);
    }

    try {
        document.getElementById('uploadImgBtn').innerText = 'กำลังอัปโหลด...';
        document.getElementById('uploadImgBtn').disabled = true;

        const res = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.imageUrls) {
            // Append to existing if any
            let current = document.getElementById('locImg').value.trim();
            if(current && !current.endsWith(',')) current += ', ';
            document.getElementById('locImg').value = current + data.imageUrls.join(', ');
            checkAddLocBtn();
            Toast.fire({ icon: 'success', title: 'อัปโหลดรูปภาพสำเร็จ!' });
        } else {
            Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการอัปโหลด' });
        }
    } catch (err) {
        console.error(err);
        Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    } finally {
        document.getElementById('uploadImgBtn').innerText = 'อัปโหลด';
        document.getElementById('uploadImgBtn').disabled = false;
        fileInput.value = '';
    }
});

function checkAddLocBtn() {
    const name = document.getElementById('locName').value.trim();
    const img = document.getElementById('locImg').value.trim();
    if (name && img && setupMarker) {
        document.getElementById('addLocBtn').disabled = false;
    } else {
        document.getElementById('addLocBtn').disabled = true;
    }
}

document.getElementById('addLocBtn').addEventListener('click', () => {
    const name = document.getElementById('locName').value.trim();
    const img = document.getElementById('locImg').value.trim();
    const lat = setupMarker.getLatLng().lat;
    const lng = setupMarker.getLatLng().lng;

    const imageUrlsArray = img.split(',').map(s=>s.trim()).filter(s=>s.length>0);
    customLocations.push({ id: customLocations.length + 1, name, imageUrl: imageUrlsArray[0], imageUrls: imageUrlsArray, lat, lng });
    
    // Reset form
    document.getElementById('locName').value = '';
    document.getElementById('locImg').value = '';
    setupMap.removeLayer(setupMarker);
    setupMarker = null;
    document.getElementById('addLocBtn').disabled = true;

    updateLocationsList();
    checkStartGame();
});

let savedSetsData = [];

function updateLocationsList() {
    document.getElementById('locCount').innerText = customLocations.length;
    const list = document.getElementById('locationsList');
    const saveBtn = document.getElementById('saveSetBtn');
    
    list.innerHTML = '';
    if (customLocations.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9CA3AF;">ยังไม่มีสถานที่ กรุณาเพิ่มสถานที่ทางซ้าย</div>';
        saveBtn.style.display = 'none';
        return;
    }
    
    saveBtn.style.display = 'inline-block';
        customLocations.forEach((loc, index) => {
            list.innerHTML += `<div class="location-item" style="display: flex; gap: 1rem; align-items: center; border-left: 4px solid var(--primary); padding: 0.8rem; border-radius: 8px; margin-bottom: 0.8rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <div style="width: 60px; height: 60px; border-radius: 6px; overflow: hidden; background: var(--bg-dark); flex-shrink: 0;">
                    <img src="${loc.imageUrls && loc.imageUrls.length > 0 ? loc.imageUrls[0] : loc.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/60x60?text=Error'">
                </div>
                <div>
                    <strong style="font-size: 1rem; color: var(--text);">ข้อที่ ${index + 1}: ${loc.name}</strong><br>
                    <span style="font-size: 0.85rem; color: var(--text-soft);">พิกัด: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</span>
                </div>
            </div>`;
        });
}

document.getElementById('saveSetBtn').addEventListener('click', () => {
    const setName = prompt("ตั้งชื่อชุดโจทย์นี้:");
    if (setName) {
        socket.emit('saveSet', { name: setName, locations: customLocations });
        Toast.fire({ icon: 'success', title: 'บันทึกชุดโจทย์เรียบร้อยแล้ว!' });
    }
});

document.getElementById('loadSetBtn').addEventListener('click', () => {
    const setId = document.getElementById('savedSetsSelect').value;
    if (!setId) return;
    
    const selectedSet = savedSetsData.find(s => s.id === setId);
    if (selectedSet) {
        customLocations = [...selectedSet.locations];
        updateLocationsList();
        checkStartGame();
        Toast.fire({ icon: 'success', title: 'โหลดชุดโจทย์เรียบร้อยแล้ว!' });
    }
});

socket.on('savedSets', (sets) => {
    savedSetsData = sets;
    const select = document.getElementById('savedSetsSelect');
    select.innerHTML = '<option value="">-- เลือกชุดโจทย์ที่บันทึกไว้ --</option>';
    sets.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.name} (${s.locations.length} สถานที่)`;
        select.appendChild(opt);
    });
});

function checkStartGame() {
    const playerCount = Object.keys(currentPlayers).length;
    
    if (playerCount > 0 && customLocations.length > 0) {
        document.getElementById('startRoundBtn').disabled = false;
        if (isGameOver) {
            document.getElementById('gameStatus').innerText = `พร้อมเริ่มเกมใหม่ (มีผู้เล่นรออยู่ ${playerCount} คน)`;
        } else {
            document.getElementById('gameStatus').innerText = `พร้อมเริ่มเกม (มีผู้เล่นรออยู่ ${playerCount} คน)`;
        }
    } else {
        document.getElementById('startRoundBtn').disabled = true;
        if (customLocations.length === 0) {
            document.getElementById('gameStatus').innerText = 'กรุณาเพิ่มโจทย์อย่างน้อย 1 สถานที่';
        } else {
            document.getElementById('gameStatus').innerText = `รอผู้เล่นเข้าห้อง... (ตอนนี้มี ${playerCount} คน)`;
        }
    }
}

// Create room on load
socket.emit('createRoom');
socket.emit('getSavedSets');

socket.on('roomCreated', (roomId) => {
    currentRoomId = roomId;
    document.getElementById('displayRoomId').innerText = roomId;
    console.log('Room created:', roomId);

    // Generate QR Code
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = ''; // Clear previous QR
    const joinUrl = window.location.origin + '/?room=' + roomId;
    new QRCode(qrContainer, {
        text: joinUrl,
        width: 150,
        height: 150,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });
});

let isGameOver = false;

socket.on('playerJoined', (players) => {
    currentPlayers = players;
    if (!isGameOver) {
        updateScoreboard(players);
    }
    checkStartGame();
});

document.getElementById('startRoundBtn').addEventListener('click', () => {
    // Send custom locations to server on first start
    socket.emit('startRound', { roomId: currentRoomId, locations: customLocations });
    document.getElementById('startRoundBtn').disabled = true;
    document.getElementById('gameStatus').innerText = 'กำลังเล่น...';
    document.getElementById('openSetupBtn').style.display = 'none'; // Hide setup button once game starts
    document.getElementById('setupModal').style.display = 'none'; // Ensure modal is closed
});

socket.on('roundStarted', (data) => {
    isGameOver = false;
    document.getElementById('roundCounter').innerText = `${data.round} / ${data.totalRounds}`;
    document.getElementById('gameStatus').innerText = 'ผู้เล่นกำลังทายสถานที่...';
    const startBtn = document.getElementById('startRoundBtn');
    startBtn.innerText = 'เริ่มรอบแรก';
    startBtn.disabled = true;
});

socket.on('scoreboardUpdate', (players) => {
    if (!isGameOver) {
        updateScoreboard(players);
    }
});

socket.on('roundEnded', (data) => {
    currentPlayers = data.players;
    if (!isGameOver) {
        updateScoreboard(currentPlayers);
    }
    
    // Auto-round logic: button remains disabled
    document.getElementById('startRoundBtn').disabled = true;
    document.getElementById('gameStatus').innerText = `จบรอบ! สถานที่คือ: ${data.actualLocation.name} (กำลังรอรอบถัดไป...)`;
});

socket.on('gameOver', (players) => {
    isGameOver = true;
    updateScoreboard(players);
    
    const startBtn = document.getElementById('startRoundBtn');
    startBtn.innerText = 'เริ่มเกมใหม่ (Restart)';
    
    // Show the setup button again so they can pick a new set for the new game
    document.getElementById('openSetupBtn').style.display = 'inline-block';
    
    // Run this to correctly disable/enable button based on who is STILL in the room
    checkStartGame();
});

socket.on('error', (msg) => {
    Swal.fire('แจ้งเตือน', msg, 'info');
});

function updateScoreboard(players) {
    const tbody = document.getElementById('scoreboardBody');
    tbody.innerHTML = '';
    
    const playerArray = Object.values(players).sort((a, b) => b.score - a.score);
    
    if (playerArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">ยังไม่มีผู้เล่น</td></tr>';
        return;
    }

    playerArray.forEach(p => {
        const tr = document.createElement('tr');
        
        let lastGuessText = '-';
        if (p.lastGuess) {
            if (p.lastGuess.distance !== null) {
                lastGuessText = `${p.lastGuess.distance.toFixed(1)} กม. (+${p.lastGuess.total} คะแนน)`;
            } else {
                lastGuessText = 'หมดเวลา (0 คะแนน)';
            }
        } else if (p.hasGuessed) {
             lastGuessText = 'ส่งคำตอบแล้ว...';
        }

        tr.innerHTML = `
            <td><span class="avatar-sm">${p.avatar}</span> ${p.name}</td>
            <td class="font-bold">${p.score}</td>
            <td>${lastGuessText}</td>
        `;
        tbody.appendChild(tr);
    });
}
