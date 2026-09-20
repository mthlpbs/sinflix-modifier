const fs = require('fs');
function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

const navLinks = html.match(/<a[^>]*href="[^"]*search\?[^"]*"[^>]*>[\s\S]*?<\/a>/gi);
console.log('Search nav links in mhtml:');
if (navLinks) {
    navLinks.slice(0, 10).forEach(l => console.log(l.replace(/\s+/g, ' ')));
}
