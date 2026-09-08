const fs = require('fs');
let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/js/admin.js', 'utf8');

// 1. Update upload logic
const oldUploadLogic = `document.getElementById('uploadImgBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('locImgFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        Toast.fire({ icon: 'warning', title: 'กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด' });
        return;
    }

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        document.getElementById('uploadImgBtn').innerText = 'กำลังอัปโหลด...';
        document.getElementById('uploadImgBtn').disabled = true;

        const res = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        
        if (data.imageUrl) {
            document.getElementById('locImg').value = data.imageUrl;
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
});`;

const newUploadLogic = `document.getElementById('uploadImgBtn').addEventListener('click', async () => {
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
});`;

code = code.replace(oldUploadLogic, newUploadLogic);

// 2. Update addLocBtn logic
const oldAddLocBtnLogic = `customLocations.push({ id: customLocations.length + 1, name, imageUrl: img, lat, lng });`;
const newAddLocBtnLogic = `const imageUrlsArray = img.split(',').map(s=>s.trim()).filter(s=>s.length>0);
    customLocations.push({ id: customLocations.length + 1, name, imageUrl: imageUrlsArray[0], imageUrls: imageUrlsArray, lat, lng });`;

code = code.replace(oldAddLocBtnLogic, newAddLocBtnLogic);

// 3. Update updateLocationsList thumbnail
const oldImgTag = `<img src="\${loc.imageUrl}"`;
const newImgTag = `<img src="\${loc.imageUrls && loc.imageUrls.length > 0 ? loc.imageUrls[0] : loc.imageUrl}"`;
code = code.replace(oldImgTag, newImgTag);

fs.writeFileSync('c:/xampp/htdocs/mark_map_1/js/admin.js', code);
console.log('Modified admin.js successfully.');
