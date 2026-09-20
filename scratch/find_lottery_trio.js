const fs = require('fs');

function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

// Find where "Lottery Trio" is in the HTML
const pos = html.indexOf('Lottery Trio');
console.log('Position of Lottery Trio:', pos);
if (pos !== -1) {
    console.log('Surrounding HTML around Lottery Trio:');
    console.log(html.substring(pos - 300, pos + 400));
}
