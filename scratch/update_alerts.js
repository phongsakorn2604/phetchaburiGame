const fs = require('fs');

let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/js/admin.js', 'utf8');

const swalInit = `
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: 'var(--card-light)',
  color: 'var(--text)'
});
`;

if (!code.includes('const Toast = Swal.mixin')) {
    code = swalInit + code;
}

code = code.replace(/alert\('กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด'\);/g, "Toast.fire({ icon: 'warning', title: 'กรุณาเลือกไฟล์รูปภาพก่อนอัปโหลด' });");
code = code.replace(/alert\('อัปโหลดรูปภาพสำเร็จ!'\);/g, "Toast.fire({ icon: 'success', title: 'อัปโหลดรูปภาพสำเร็จ!' });");
code = code.replace(/alert\('เกิดข้อผิดพลาดในการอัปโหลด'\);/g, "Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการอัปโหลด' });");
code = code.replace(/alert\('เกิดข้อผิดพลาดในการเชื่อมต่อ'\);/g, "Toast.fire({ icon: 'error', title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });");
code = code.replace(/alert\('บันทึกชุดโจทย์เรียบร้อยแล้ว!'\);/g, "Toast.fire({ icon: 'success', title: 'บันทึกชุดโจทย์เรียบร้อยแล้ว!' });");
code = code.replace(/alert\('โหลดชุดโจทย์เรียบร้อยแล้ว!'\);/g, "Toast.fire({ icon: 'success', title: 'โหลดชุดโจทย์เรียบร้อยแล้ว!' });");
code = code.replace(/alert\(msg\);/g, "Swal.fire('แจ้งเตือน', msg, 'info');");

fs.writeFileSync('c:/xampp/htdocs/mark_map_1/js/admin.js', code);
console.log('Done!');
