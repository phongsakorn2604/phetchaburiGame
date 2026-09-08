const fs = require('fs');

// 1. Fix game.html
let html = fs.readFileSync('c:/xampp/htdocs/mark_map_1/game.html', 'utf8');

const oldBtn = `<button onclick="window.location.href='/'" style="position: absolute; top: 15px; left: 15px; background: #f3f4f6; border: none; font-size: 1rem; cursor: pointer; color: #4B5563; display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; border-radius: 8px; transition: 0.2s;">`;
const newBtn = `<button onclick="window.location.href='/'" style="position: absolute; top: 15px; left: 15px; background: rgba(255,255,255,0.1); border: none; font-size: 1rem; cursor: pointer; color: var(--text-soft); display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.8rem; border-radius: 8px; transition: 0.2s;">`;

const oldContainer = `<div style="margin: 1.5rem 0; text-align: left; background: #f9fafb; border-radius: 8px; padding: 1rem; border: 1px solid #e5e7eb; max-height: 250px; overflow-y: auto;">
                <h3 style="font-size: 1rem; color: #4B5563; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 0.8rem; margin-top: 0;">ผู้เล่นที่รออยู่ (<span id="waitingPlayerCount">0</span>)</h3>
                <div id="waitingPlayerList" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.8rem;">
                    <!-- Player list injected here -->
                    <div style="color: #9CA3AF; text-align: center; font-size: 0.9rem; grid-column: 1 / -1;">กำลังโหลดรายชื่อ...</div>
                </div>
            </div>`;
const newContainer = `<div style="margin: 1.5rem 0; text-align: left; background: var(--card-light); border-radius: 8px; padding: 1rem; border: 1px solid var(--border); max-height: 250px; overflow-y: auto;">
                <h3 style="font-size: 1rem; color: var(--text-soft); border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 0.8rem; margin-top: 0;">ผู้เล่นที่รออยู่ (<span id="waitingPlayerCount">0</span>)</h3>
                <div id="waitingPlayerList" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 0.8rem;">
                    <!-- Player list injected here -->
                    <div style="color: var(--text-soft); text-align: center; font-size: 0.9rem; grid-column: 1 / -1;">กำลังโหลดรายชื่อ...</div>
                </div>
            </div>`;

html = html.replace(oldBtn, newBtn).replace(oldContainer, newContainer);
fs.writeFileSync('c:/xampp/htdocs/mark_map_1/game.html', html);

// 2. Fix js/client.js
let js = fs.readFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', 'utf8');

const oldJsItem = `            item.style.padding = '0.5rem';
            item.style.background = 'white';
            item.style.borderRadius = '8px';
            item.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            item.style.position = 'relative';`;
            
const newJsItem = `            item.style.padding = '0.5rem';
            item.style.background = 'var(--bg-dark)';
            item.style.border = '1px solid var(--border)';
            item.style.borderRadius = '8px';
            item.style.position = 'relative';`;

const oldName = `color: #374151;`;
const newName = `color: var(--text);`;

js = js.replace(oldJsItem, newJsItem).replace(oldName, newName);
fs.writeFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', js);

console.log('Fixed waiting screen dark theme styles.');
