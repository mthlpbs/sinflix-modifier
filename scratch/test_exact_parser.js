const fs = require('fs');
function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

// Exact function from sinflix-modifier.user.js
function parseMdlSearchResults(html) {
    const results = [];
    if (!html) return results;

    const boxRegex = /<div id="mdl-(\d+)" class="box">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    while ((match = boxRegex.exec(html)) !== null) {
        const id = match[1];
        const content = match[2];

        const titleMatch = content.match(/<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a>/);
        if (!titleMatch) continue;

        let url = titleMatch[1];
        if (url && url.startsWith('/')) {
            url = 'https://mydramalist.com' + url;
        }
        const title = titleMatch[2].trim();

        const mutedMatch = content.match(/<span class="text-muted">([^<]*)<\/span>/);
        const muted = mutedMatch ? mutedMatch[1].trim() : '';

        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        results.push({ id, title, url, year, muted });
    }

    if (results.length === 0) {
        const linkRegex = /<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a>/g;
        let lMatch;
        while ((lMatch = linkRegex.exec(html)) !== null) {
            let url = lMatch[1];
            if (url && url.startsWith('/')) {
                url = 'https://mydramalist.com' + url;
            }
            const title = lMatch[2].trim();
            const idMatch = url.match(/\/(\d+)-/);
            const id = idMatch ? idMatch[1] : '';
            results.push({ id, title, url, year: '', muted: '' });
        }
    }

    return results;
}

const parsed = parseMdlSearchResults(html);
console.log('Parsed count:', parsed.length);
console.log('First 3 items:', parsed.slice(0, 3));
