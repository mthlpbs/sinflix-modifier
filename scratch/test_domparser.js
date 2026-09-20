const fs = require('fs');

function parseMdlSearchResultsRobust(html) {
    const results = [];
    if (!html) return results;

    // Browser DOMParser approach if available
    if (typeof DOMParser !== 'undefined') {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const cards = doc.querySelectorAll('div[id^="mdl-"]');
            cards.forEach(card => {
                const titleLink = card.querySelector('h6.title a, h6.text-primary a, h6 a');
                if (!titleLink) return;

                let href = titleLink.getAttribute('href') || '';
                if (href && href.startsWith('/')) {
                    href = 'https://mydramalist.com' + href;
                }
                const title = titleLink.textContent.trim();
                const mutedEl = card.querySelector('.text-muted');
                const muted = mutedEl ? mutedEl.textContent.trim() : '';
                const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
                const year = yearMatch ? yearMatch[1] : '';
                const idMatch = (card.id || '').match(/mdl-(\d+)/);
                const id = idMatch ? idMatch[1] : '';

                if (href && !href.includes('/people/') && !href.includes('/article/')) {
                    results.push({ id, title, url: href, year, muted });
                }
            });
            if (results.length > 0) return results;
        } catch (e) {
            // fallback to regex
        }
    }

    // Regex fallback
    const cardRegex = /<div id="mdl-(\d+)" class="box"[\s\S]*?(?=<div id="mdl-\d+" class="box"|<div class="m-t-nav|<div class="footer|<div class="col-lg-4|$)/g;
    let m;
    while ((m = cardRegex.exec(html)) !== null) {
        const id = m[1];
        const cardHtml = m[0];
        const titleMatch = cardHtml.match(/<h6 class="[^"]*title[^"]*"><a href="([^"]*)">([^<]*)<\/a>/i);
        if (!titleMatch) continue;

        let url = titleMatch[1];
        if (url && url.startsWith('/')) {
            url = 'https://mydramalist.com' + url;
        }
        const title = titleMatch[2].trim();
        const mutedMatch = cardHtml.match(/<span class="text-muted">([^<]*)<\/span>/i);
        const muted = mutedMatch ? mutedMatch[1].trim() : '';
        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        if (url && !url.includes('/people/') && !url.includes('/article/')) {
            results.push({ id, title, url, year, muted });
        }
    }

    // Secondary regex fallback if mdl- IDs were not present
    if (results.length === 0) {
        const titleRegex = /<h6 class="[^"]*title[^"]*"><a href="([^"]*)">([^<]*)<\/a>/gi;
        let tm;
        while ((tm = titleRegex.exec(html)) !== null) {
            let url = tm[1];
            if (url && url.startsWith('/')) {
                url = 'https://mydramalist.com' + url;
            }
            const title = tm[2].trim();
            if (url && !url.includes('/people/') && !url.includes('/article/')) {
                results.push({ id: '', title, url, year: '', muted: '' });
            }
        }
    }

    return results;
}

function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const html = decodeQP(mhtml);

const results = parseMdlSearchResultsRobust(html);
console.log('Total results found:', results.length);
results.forEach((r, i) => {
    console.log(`[${i + 1}] ${r.title} (${r.year || 'N/A'}) -> ${r.url}`);
});
