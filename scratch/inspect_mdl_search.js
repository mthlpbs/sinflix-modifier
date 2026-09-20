const fs = require('fs');

function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

const regex = /<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a><\/h6>/g;
let match;
while ((match = regex.exec(html)) !== null) {
    console.log('Found:', match[1], '-->', match[2]);
}
