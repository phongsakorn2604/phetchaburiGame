const fs = require('fs');

let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/game.html', 'utf8');

const oldModal = `<div id="resultModal" class="overlay" style="display: none;">
        <div class="card result-card text-center">
            <h2 id="resultTitle">สรุปผลรอบนี้</h2>
            <p id="resultLocationName" class="font-bold"></p>
            <p>ความคลาดเคลื่อน: <span id="resultDistance"></span> กม.</p>
            
            <div class="points-breakdown">
                <div>คะแนนระยะทาง: +<span id="resultDistanceScore"></span></div>
                <div>โบนัสเวลา: +<span id="resultTimeBonus"></span></div>
                <div class="total-points">รวม: +<span id="resultTotalScore"></span></div>
            </div>
            
            <p class="mt-4 text-sm text-gray">กำลังเริ่มรอบถัดไปอัตโนมัติ...</p>
        </div>
    </div>`;

const newModal = `<div id="resultModal" class="overlay" style="display: none; z-index: 9999;">
        <div class="card result-card text-center" style="width: 90%; max-width: 400px; padding: 2rem; border-top: 5px solid var(--primary); background: var(--bg-dark); box-shadow: 0 15px 40px rgba(0,0,0,0.5);">
            <div style="font-size: 3.5rem; margin-bottom: 0.5rem; line-height: 1;">🎯</div>
            <h2 id="resultTitle" style="color: var(--primary); margin: 0 0 1rem 0; font-size: 1.8rem; text-shadow: 0 2px 10px rgba(255,122,0,0.3);">สรุปผลรอบนี้</h2>
            
            <div style="background: var(--card-light); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 1.5rem;">
                <p id="resultLocationName" class="font-bold" style="font-size: 1.1rem; color: var(--text); margin: 0; line-height: 1.4;"></p>
            </div>
            
            <div style="margin-bottom: 1.5rem; display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.3); padding: 0.5rem 1.2rem; border-radius: 20px;">
                <span style="color: var(--text-soft); font-size: 0.95rem;">📍 ความคลาดเคลื่อน:</span> 
                <strong id="resultDistance" style="color: var(--secondary); font-size: 1.2rem;"></strong>
            </div>
            
            <div class="points-breakdown" style="display: grid; gap: 0.8rem; text-align: left; background: var(--card-light); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-soft); font-size: 0.95rem;">🗺️ คะแนนระยะทาง</span>
                    <strong id="resultDistanceScore" style="color: var(--success); font-size: 1.1rem;"></strong>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-soft); font-size: 0.95rem;">⏱️ โบนัสเวลา</span>
                    <strong id="resultTimeBonus" style="color: var(--success); font-size: 1.1rem;"></strong>
                </div>
                <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.1); margin: 0.5rem 0;">
                <div class="total-points" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: bold; font-size: 1.1rem; color: var(--text);">🏆 รวมคะแนน</span>
                    <strong id="resultTotalScore" style="color: var(--primary); font-size: 1.8rem; text-shadow: 0 0 15px rgba(255,122,0,0.3);"></strong>
                </div>
            </div>
            
            <p class="text-sm" style="color: var(--text-soft); margin-top: 2rem; margin-bottom: 0; animation: fadePulse 1.5s infinite;">⏳ กำลังเริ่มรอบถัดไปอัตโนมัติ...</p>
        </div>
    </div>`;

code = code.replace(oldModal, newModal);

// Also add a fadePulse animation to the <style> block if not exists
const animCss = `
        @keyframes fadePulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
        }
    </style>`;

if (!code.includes('fadePulse')) {
    code = code.replace('</style>', animCss);
}

fs.writeFileSync('c:/xampp/htdocs/mark_map_1/game.html', code);
console.log('game.html updated');
