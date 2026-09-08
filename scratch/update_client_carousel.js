const fs = require('fs');
let code = fs.readFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', 'utf8');

const oldLogic = `    document.getElementById('locationImage').src = data.imageUrl;
    document.getElementById('locationImage').style.display = 'block';
    document.getElementById('imagePlaceholder').style.display = 'none';`;

const newLogic = `    const carouselContainer = document.getElementById('carouselContainer');
    const indicator = document.getElementById('carouselIndicator');
    
    carouselContainer.innerHTML = '';
    let urls = data.imageUrls || [data.imageUrl];
    
    urls.forEach((url, i) => {
        carouselContainer.innerHTML += \`<div class="carousel-slide"><img src="\${url}"></div>\`;
    });
    
    carouselContainer.style.display = 'flex';
    document.getElementById('imagePlaceholder').style.display = 'none';
    
    if (urls.length > 1) {
        indicator.style.display = 'block';
        indicator.innerText = \`1 / \${urls.length}\`;
        
        carouselContainer.onscroll = () => {
            let index = Math.round(carouselContainer.scrollLeft / carouselContainer.clientWidth);
            indicator.innerText = \`\${index + 1} / \${urls.length}\`;
        };
    } else {
        indicator.style.display = 'none';
    }`;

code = code.replace(oldLogic, newLogic);
fs.writeFileSync('c:/xampp/htdocs/mark_map_1/js/client.js', code);
console.log('client.js modified.');
