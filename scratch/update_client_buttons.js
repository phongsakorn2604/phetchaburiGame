const fs = require('fs');
let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', 'utf8');

const oldLogic = `    if (urls.length > 1) {
        indicator.style.display = 'block';
        indicator.innerText = \`1 / \${urls.length}\`;
        
        carouselContainer.onscroll = () => {
            let index = Math.round(carouselContainer.scrollLeft / carouselContainer.clientWidth);
            indicator.innerText = \`\${index + 1} / \${urls.length}\`;
        };
    } else {
        indicator.style.display = 'none';
    }`;

const newLogic = `    const prevBtn = document.getElementById('prevImgBtn');
    const nextBtn = document.getElementById('nextImgBtn');
    
    if (urls.length > 1) {
        indicator.style.display = 'block';
        indicator.innerText = \`1 / \${urls.length}\`;
        
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
        
        prevBtn.onclick = () => carouselContainer.scrollBy({ left: -carouselContainer.clientWidth, behavior: 'smooth' });
        nextBtn.onclick = () => carouselContainer.scrollBy({ left: carouselContainer.clientWidth, behavior: 'smooth' });
        
        carouselContainer.onscroll = () => {
            let index = Math.round(carouselContainer.scrollLeft / carouselContainer.clientWidth);
            indicator.innerText = \`\${index + 1} / \${urls.length}\`;
        };
    } else {
        indicator.style.display = 'none';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', code);
console.log('client.js buttons modified.');
