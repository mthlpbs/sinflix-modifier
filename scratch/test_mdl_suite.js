const fs = require('fs');

function decodeQuotedPrintable(str) {
    return str
        .replace(/=\r?\n/g, '')
        .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

const rawMhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const decodedHtml = decodeQuotedPrintable(rawMhtml);

function parseMdlSearchResults(html) {
    const results = [];
    if (!html) return results;

    // Regex to match search result cards
    // Look for both <div id="mdl-XXXX" class="box"> and general cards
    const boxRegex = /<div id="mdl-(\d+)" class="box">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    while ((match = boxRegex.exec(html)) !== null) {
        const id = match[1];
        const content = match[2];

        // Link and Title
        const titleMatch = content.match(/<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a>/);
        if (!titleMatch) continue;

        let url = titleMatch[1];
        if (url && url.startsWith('/')) {
            url = 'https://mydramalist.com' + url;
        }
        const title = titleMatch[2].trim();

        // Subtitle / Year / Type
        const mutedMatch = content.match(/<span class="text-muted">([^<]*)<\/span>/);
        const muted = mutedMatch ? mutedMatch[1].trim() : '';

        // Extract year: 4 digits
        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        results.push({ id, title, url, year, muted });
    }

    // Fallback if structure is slightly different (e.g. DOM without box wrapper)
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

function normalizeTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findMatchingResult(results, targetTitle, targetYear) {
    if (!results || results.length === 0) return null;

    const normTarget = normalizeTitle(targetTitle);
    const targetY = targetYear ? String(targetYear).trim() : null;

    // Check first option first as requested
    const first = results[0];
    const firstNorm = normalizeTitle(first.title);
    const firstNameMatch = firstNorm.includes(normTarget) || normTarget.includes(firstNorm);
    const firstYearMatch = targetY && first.year && first.year === targetY;

    if (firstNameMatch || firstYearMatch) {
        return { item: first, matchedOn: firstNameMatch ? (firstYearMatch ? 'both' : 'name') : 'year' };
    }

    // Check remaining options
    for (let i = 1; i < results.length; i++) {
        const item = results[i];
        const itemNorm = normalizeTitle(item.title);
        const nameMatch = itemNorm.includes(normTarget) || normTarget.includes(itemNorm);
        const yearMatch = targetY && item.year && item.year === targetY;
        if (nameMatch || yearMatch) {
            return { item, matchedOn: nameMatch ? (yearMatch ? 'both' : 'name') : 'year' };
        }
    }

    return null;
}

const items = parseMdlSearchResults(decodedHtml);
console.log('Results parsed count:', items.length);

const testCases = [
    { title: 'Lottery Trio', year: '2008', expectedId: '1829' },
    { title: 'Lottery Doctor', year: '2024', expectedId: '795752' },
    { title: 'Crazy Lottery', year: '2007', expectedId: '64499' },
    { title: 'Mon Ruk Lottery', year: '2006', expectedId: '31902' },
    { title: 'Choosing Spouse by Lottery', year: '2018', expectedId: '29990' },
    { title: 'Unknown Drama', year: '1999', expectedId: null }
];

let allPassed = true;
testCases.forEach(tc => {
    const matched = findMatchingResult(items, tc.title, tc.year);
    const matchedId = matched ? matched.item.id : null;
    const pass = matchedId === tc.expectedId;
    console.log(`Test "${tc.title}" (${tc.year}): expected=${tc.expectedId}, got=${matchedId} -> ${pass ? 'PASS' : 'FAIL'}`);
    if (!pass) allPassed = false;
});

console.log('All tests passed:', allPassed);
