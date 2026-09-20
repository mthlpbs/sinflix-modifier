const fs = require('fs');
let content = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
content = content.replace(/=\r?\n/g, '').replace(/=3D/g, '=');

const cardRegex = /<div id="mdl-(\d+)" class="box"[\s\S]*?(?=<div id="mdl-\d+" class="box"|<div class="m-t-nav|<div class="footer|<div class="col-lg-4|$)/g;
let m;
const cards = [];
while ((m = cardRegex.exec(content)) !== null) {
    const id = m[1];
    const cardHtml = m[0];
    const titleMatch = cardHtml.match(/<h6 class="[^"]*title[^"]*"><a href="([^"]*)">([^<]*)<\/a>/i);
    const mutedMatch = cardHtml.match(/<span class="text-muted">([^<]*)<\/span>/i);
    const muted = mutedMatch ? mutedMatch[1].trim() : '';
    const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
    if (titleMatch) {
        cards.push({
            id,
            title: titleMatch[2].trim(),
            url: titleMatch[1],
            year: yearMatch ? yearMatch[1] : null,
            muted
        });
    }
}
console.log('Parsed', cards.length, 'cards:');
cards.forEach((c, idx) => console.log(`${idx + 1}. [${c.year || 'NO_YEAR'}] ${c.title} -> ${c.url} (${c.muted})`));
