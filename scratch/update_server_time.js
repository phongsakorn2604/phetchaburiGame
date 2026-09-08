const fs = require('fs');
let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/server.js', 'utf8');

code = code.replace(
    '// คะแนนเวลา: ตอบเร็วได้คะแนนเยอะ (อิงจากเวลาเต็ม 25 วินาที, ให้สูงสุด 80 คะแนน)\n    const timeBonus = Math.round((timeRemainingSeconds / 25) * 80);',
    '// คะแนนเวลา: ตอบเร็วได้คะแนนเยอะ (อิงจากเวลาเต็ม 15 วินาที, ให้สูงสุด 80 คะแนน)\n    const timeBonus = Math.round((timeRemainingSeconds / 15) * 80);'
);

code = code.replace(
    'timeLimit: 25',
    'timeLimit: 15'
);

code = code.replace(
    'let timeLeft = 25;',
    'let timeLeft = 15;'
);

fs.writeFileSync('c:/xampp/htdocs/mark_map_1/server.js', code);
console.log('Modified server.js');
