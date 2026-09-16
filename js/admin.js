
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
let currentLoadedSetId = null;

function updateLocationsList() {
    document.getElementById('locCount').innerText = customLocations.length;
    const list = document.getElementById('locationsList');
    const saveBtn = document.getElementById('saveSetBtn');
    const updateBtn = document.getElementById('updateSetBtn');
    
    list.innerHTML = '';
    if (customLocations.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #9CA3AF;">ยังไม่มีสถานที่ กรุณาเพิ่มสถานที่ทางซ้าย</div>';
        saveBtn.style.display = 'none';
        if (updateBtn) updateBtn.style.display = 'none';
        return;
    }
    
    saveBtn.style.display = 'inline-block';
    if (updateBtn) updateBtn.style.display = currentLoadedSetId ? 'inline-block' : 'none';

    customLocations.forEach((loc, index) => {
        list.innerHTML += `<div class="location-item" style="display: flex; justify-content: space-between; align-items: center; border-left: 4px solid var(--primary); padding: 0.8rem; border-radius: 8px; margin-bottom: 0.8rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); background: var(--bg-dark);">
            <div style="display: flex; gap: 1rem; align-items: center;">
                <div style="width: 60px; height: 60px; border-radius: 6px; overflow: hidden; background: #000; flex-shrink: 0;">
                    <img src="${loc.imageUrls && loc.imageUrls.length > 0 ? loc.imageUrls[0] : loc.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://placehold.co/60x60?text=Error'">
                </div>
                <div>
                    <strong style="font-size: 1rem; color: var(--text);">ข้อที่ ${index + 1}: ${loc.name}</strong><br>
                    <span style="font-size: 0.85rem; color: var(--text-soft);">พิกัด: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</span>
                </div>
            </div>
            <button onclick="deleteLocation(${index})" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #e74c3c; padding: 0.5rem;" title="ลบสถานที่นี้">❌</button>
        </div>`;
    });
}

window.deleteLocation = function(index) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: 'ต้องการลบสถานที่นี้ออกจากรายการใช่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ลบเลย',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#e74c3c'
    }).then((result) => {
        if (result.isConfirmed) {
            customLocations.splice(index, 1);
            updateLocationsList();
        }
    });
};

document.getElementById('saveSetBtn').addEventListener('click', () => {
    if (customLocations.length === 0) {
        Toast.fire({ icon: 'warning', title: 'ไม่มีสถานที่สำหรับบันทึก' });
        return;
    }
    Swal.fire({
        title: 'บันทึกเป็นชุดใหม่',
        input: 'text',
        inputLabel: 'ตั้งชื่อชุดโจทย์ใหม่',
        inputPlaceholder: 'เช่น: เพชรบุรี (ยาก)',
        showCancelButton: true,
        confirmButtonText: 'บันทึกใหม่',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            socket.emit('saveSet', { name: result.value, locations: customLocations });
            Toast.fire({ icon: 'success', title: 'บันทึกชุดโจทย์ใหม่เรียบร้อย!' });
        }
    });
});

const updateSetBtn = document.getElementById('updateSetBtn');
if (updateSetBtn) {
    updateSetBtn.addEventListener('click', () => {
        if (!currentLoadedSetId || customLocations.length === 0) return;
        const selectedSet = savedSetsData.find(s => s.id === currentLoadedSetId);
        Swal.fire({
            title: 'อัปเดตชุดโจทย์เดิม?',
            text: `ต้องการอัปเดตข้อมูลทับชุดโจทย์ "${selectedSet ? selectedSet.name : 'เดิม'}" ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'อัปเดตทับเลย',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                socket.emit('updateSet', { id: currentLoadedSetId, name: selectedSet.name, locations: customLocations });
                Toast.fire({ icon: 'success', title: 'อัปเดตชุดโจทย์เรียบร้อย!' });
            }
        });
    });
}

document.getElementById('loadSetBtn').addEventListener('click', () => {
    const setId = document.getElementById('savedSetsSelect').value;
    if (!setId) {
        Toast.fire({ icon: 'warning', title: 'กรุณาเลือกชุดโจทย์ที่ต้องการโหลด' });
        return;
    }
    const selectedSet = savedSetsData.find(s => s.id === setId);
    if (selectedSet) {
        customLocations = [...selectedSet.locations];
        currentLoadedSetId = selectedSet.id;
        updateLocationsList();
        checkStartGame();
        Toast.fire({ icon: 'success', title: 'โหลดชุดโจทย์เรียบร้อยแล้ว!' });
    }
});

document.getElementById('savedSetsSelect').addEventListener('change', (e) => {
    const btn = document.getElementById('deleteSetBtn');
    if (btn) btn.style.display = e.target.value ? 'inline-block' : 'none';
});

const deleteSetBtn = document.getElementById('deleteSetBtn');
if (deleteSetBtn) {
    deleteSetBtn.addEventListener('click', () => {
        const setId = document.getElementById('savedSetsSelect').value;
        if (!setId) return;
        const selectedSet = savedSetsData.find(s => s.id === setId);
        Swal.fire({
            title: 'ยืนยันการลบชุดโจทย์?',
            text: `คุณต้องการลบ "${selectedSet.name}" ถาวรใช่หรือไม่?`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'ลบถาวร',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#e74c3c'
        }).then((result) => {
            if (result.isConfirmed) {
                socket.emit('deleteSet', setId);
                if (currentLoadedSetId === setId) {
                    currentLoadedSetId = null;
                    customLocations = [];
                }
                document.getElementById('savedSetsSelect').value = '';
                document.getElementById('deleteSetBtn').style.display = 'none';
                updateLocationsList();
                Toast.fire({ icon: 'success', title: 'ลบชุดโจทย์เรียบร้อย' });
            }
        });
    });
}

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
    
    // Update the Dashboard Dashboard Info
    const setListEl = document.getElementById('currentSetList');
    if (setListEl) {
        if (customLocations.length > 0) {
            let setName = 'โจทย์ปรับแต่งเอง (Custom)';
            if (currentLoadedSetId) {
                const loadedSet = savedSetsData.find(s => s.id === currentLoadedSetId);
                if (loadedSet) setName = loadedSet.name;
            }
            setListEl.innerHTML = `<div style="font-size: 1.1rem; color: var(--primary); font-weight: bold; text-align: center; padding: 1rem 0;">${setName}</div>`;
        } else {
            setListEl.innerHTML = 'ยังไม่มีโจทย์ที่เลือก';
        }
    }
    
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

// Click QR code to enlarge
document.getElementById('qrcode').addEventListener('click', function() {
    const canvas = this.querySelector('canvas');
    const img = this.querySelector('img');
    let src = '';
    if (canvas) src = canvas.toDataURL();
    else if (img) src = img.src;
    
    if (src) {
        Swal.fire({
            title: 'สแกนเพื่อเข้าร่วม',
            imageUrl: src,
            imageWidth: 400,
            imageHeight: 400,
            imageAlt: 'QR Code',
            showConfirmButton: false,
            showCloseButton: true,
            background: '#fff',
            color: '#000'
        });
    }
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
