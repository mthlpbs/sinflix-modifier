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
    // Match each box id="mdl-XXXX"
    const boxRegex = /<div id="mdl-(\d+)" class="box">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
    let match;
    while ((match = boxRegex.exec(html)) !== null) {
        const id = match[1];
        const content = match[2];

        // Link and Title: <h6 class="text-primary title"><a href="...">...</a>
        const titleMatch = content.match(/<h6 class="text-primary title"><a href="([^"]*)">([^<]*)<\/a>/);
        if (!titleMatch) continue;

        let url = titleMatch[1];
        if (url && url.startsWith('/')) {
            url = 'https://mydramalist.com' + url;
        }
        const title = titleMatch[2].trim();

        // Subtitle / Year / Type: <span class="text-muted">...</span>
        const mutedMatch = content.match(/<span class="text-muted">([^<]*)<\/span>/);
        const muted = mutedMatch ? mutedMatch[1].trim() : '';

        // Extract year: 4 digits
        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        results.push({ id, title, url, year, muted });
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
console.log('Parsed items count:', items.length);
console.log('First item:', items[0]);

// Test 1: Match "Lottery Trio" (2008)
const res1 = findMatchingResult(items, "Lottery Trio", "2008");
console.log('\nMatch for Lottery Trio (2008):', res1);

// Test 2: Match "Lottery Doctor" (2024)
const res2 = findMatchingResult(items, "Lottery Doctor", "2024");
console.log('\nMatch for Lottery Doctor (2024):', res2);

// Test 3: Match with slight title variation
const res3 = findMatchingResult(items, "Lottery Trio Korean Drama", "2008");
console.log('\nMatch for Lottery Trio Korean Drama (2008):', res3);
