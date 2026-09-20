const fs = require('fs');
function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

// Find all elements with class="box" or id="mdl-*"
const boxes = [];
const boxRegex = /<div id="([^"]*)" class="box(?:-body)?">|<div class="box" id="([^"]*)">/g;
let m;
while ((m = boxRegex.exec(html)) !== null) {
    boxes.push(m[1] || m[2]);
}
console.log('Found boxes IDs:', boxes);

// Check if there are tabs or sections
const headings = html.match(/<h\d[^>]*>[\s\S]*?<\/h\d>/g);
console.log('Headings:', headings ? headings.slice(0, 15) : []);
