const fs = require('fs');
function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

// Method 1: split by <div id="mdl- or match <div id="mdl-(\d+)"
const cardRegex = /<div id="mdl-(\d+)" class="box"[\s\S]*?(?=<div id="mdl-\d+" class="box"|<div class="m-t-nav|<div class="footer|<div class="col-lg-4|$)/g;

let m;
let count = 0;
while ((m = cardRegex.exec(html)) !== null) {
    count++;
    const card = m[0];
    const id = m[1];
    const titleMatch = card.match(/<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a>/);
    const mutedMatch = card.match(/<span class="text-muted">([^<]*)<\/span>/);
    const yearMatch = mutedMatch ? mutedMatch[1].match(/\b(19\d\d|20\d\d)\b/) : null;
    console.log(`Card ${count}: ID=${id}, Title=${titleMatch ? titleMatch[2] : 'NONE'}, URL=${titleMatch ? titleMatch[1] : 'NONE'}, Year=${yearMatch ? yearMatch[1] : 'NONE'}`);
}
