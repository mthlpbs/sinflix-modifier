const fs = require('fs');

let mhtmlContent = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');

// Decode quoted-printable
const decodedHtml = mhtmlContent
    .replace(/=\r?\n/g, '')
    .replace(/=3D/gi, '=')
    .replace(/=20/gi, ' ');

function parseMdlSearchResults(html) {
    const results = [];
    if (!html || typeof html !== 'string') return results;

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
        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/) || title.match(/\b(19\d\d|20\d\d)\b/);
        const year = yearMatch ? yearMatch[1] : '';

        if (url && !url.includes('/people/') && !url.includes('/article/')) {
            results.push({ id, title, url, year, muted });
        }
    }
    return results;
}

function normalizeMdlTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTitleWords(norm) {
    if (!norm) return [];
    return norm.split(/\s+/).filter(w => w.length > 0);
}

function computeNameScore(normItem, normTarget) {
    if (!normItem || !normTarget) return 0;
    if (normItem === normTarget) return 100;

    // Item starts with target or target starts with item (e.g. "Lottery Trio" vs "Lottery Trio Season 1")
    if (normItem.startsWith(normTarget + ' ') || normTarget.startsWith(normItem + ' ')) {
        return 85;
    }

    const itemWords = getTitleWords(normItem);
    const targetWords = getTitleWords(normTarget);

    if (itemWords.length === 0 || targetWords.length === 0) return 0;

    // Check how many target words are in item words
    const matchingWords = targetWords.filter(tw => itemWords.includes(tw));
    const targetWordRatio = matchingWords.length / targetWords.length;
    const itemWordRatio = matchingWords.length / itemWords.length;

    // If all target words are present in item words (e.g. target: "Lottery Trio", item: "Lottery Trio (Special)")
    if (targetWordRatio === 1) {
        return 75 + Math.round(itemWordRatio * 15); // 75 - 90
    }

    // Partial word match (e.g. target: "Lottery", item: "Lottery Trio" -> 1/1 target word matched)
    if (targetWords.length === 1 && matchingWords.length === 1) {
        // Single word target matches one of item words
        return 50 + Math.round(itemWordRatio * 20); // 50 - 70
    }

    if (targetWordRatio >= 0.5) {
        return Math.round(targetWordRatio * 50); // 25 - 50
    }

    // Substring fallback
    if (normItem.includes(normTarget) || normTarget.includes(normItem)) {
        return 35;
    }

    return 0;
}

function findMatchingMdlResult(results, targetTitle, targetYear, extraTitles = []) {
    if (!results || results.length === 0) return null;

    // Extract year from targetTitle if targetYear is missing
    let targetY = null;
    if (targetYear) {
        const ym = String(targetYear).match(/\b(19\d\d|20\d\d)\b/);
        if (ym) targetY = parseInt(ym[1], 10);
    }
    if (!targetY && targetTitle) {
        const ym = String(targetTitle).match(/\b(19\d\d|20\d\d)\b/);
        if (ym) targetY = parseInt(ym[1], 10);
    }

    // Target titles
    const normTarget = normalizeMdlTitle(targetTitle);
    const allTargets = [];
    if (normTarget) allTargets.push(normTarget);

    if (Array.isArray(extraTitles)) {
        extraTitles.forEach(t => {
            const n = normalizeMdlTitle(t);
            if (n && !allTargets.includes(n)) allTargets.push(n);
        });
    }

    // Remove 4-digit year from target titles for cleaner name matching
    const cleanTargets = allTargets.map(t => t.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const candidateTargets = Array.from(new Set([...allTargets, ...cleanTargets]));

    const scored = results.map((item, index) => {
        const normItem = normalizeMdlTitle(item.title);
        const cleanItem = normItem.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim();

        // 1. Calculate best name score
        let bestNameScore = 0;
        let matchedTarget = '';
        for (const target of candidateTargets) {
            const s1 = computeNameScore(normItem, target);
            const s2 = computeNameScore(cleanItem, target);
            const s = Math.max(s1, s2);
            if (s > bestNameScore) {
                bestNameScore = s;
                matchedTarget = target;
            }
        }

        // If name score is 0, this item does not match the drama name
        if (bestNameScore <= 0) {
            return { item, index, score: -999, nameScore: 0, yearScore: 0, matchedOn: 'none' };
        }

        // 2. ALWAYS CONSIDER THE YEAR after the name
        let yearScore = 0;
        let yearMatchStatus = 'none';

        const itemY = item.year ? parseInt(item.year, 10) : null;

        if (targetY) {
            if (itemY) {
                const diff = Math.abs(itemY - targetY);
                if (diff === 0) {
                    // Exact year match! Huge boost
                    yearScore = 80;
                    yearMatchStatus = 'exact';
                } else if (diff === 1) {
                    // Airing year / calendar year boundary
                    yearScore = 40;
                    yearMatchStatus = 'close';
                } else {
                    // Year does not match: significant penalty so year-matched drama wins
                    yearScore = -50 - Math.min(diff * 5, 40);
                    yearMatchStatus = 'mismatch';
                }
            } else {
                // Item has no year (TBA or missing): small penalty compared to year-matched
                yearScore = -15;
                yearMatchStatus = 'missing';
            }
        } else {
            // Target has no year: slight preference if item has year vs TBA
            yearScore = 0;
            yearMatchStatus = 'unspecified';
        }

        // Small index preference (earlier search results in MDL get small tie-break bonus)
        const positionBonus = Math.max(0, (results.length - index) * 0.5);

        const totalScore = bestNameScore + yearScore + positionBonus;

        let matchedOn = 'name';
        if (yearMatchStatus === 'exact' || yearMatchStatus === 'close') {
            matchedOn = bestNameScore >= 70 ? 'both' : 'year';
        }

        return {
            item,
            index,
            score: totalScore,
            nameScore: bestNameScore,
            yearScore,
            positionBonus,
            yearMatchStatus,
            matchedOn
        };
    });

    // Filter out items with no name match
    const validCandidates = scored.filter(s => s.score > 0 && s.nameScore >= 35);
    if (validCandidates.length === 0) return null;

    // Sort by total score descending
    validCandidates.sort((a, b) => b.score - a.score);

    return validCandidates[0];
}

const parsed = parseMdlSearchResults(decodedHtml);

console.log('\n--- Test 1: Searching "Lottery Trio" (year 2008) ---');
let res1 = findMatchingMdlResult(parsed, 'Lottery Trio', 2008);
console.log('Result:', res1 ? { title: res1.item.title, year: res1.item.year, score: res1.score, matchedOn: res1.matchedOn } : null);

console.log('\n--- Test 2: Searching "Lottery" (year 2008) ---');
let res2 = findMatchingMdlResult(parsed, 'Lottery', 2008);
console.log('Result:', res2 ? { title: res2.item.title, year: res2.item.year, score: res2.score, matchedOn: res2.matchedOn } : null);

console.log('\n--- Test 3: Searching "Crazy Lottery" (year 2007) ---');
let res3 = findMatchingMdlResult(parsed, 'Crazy Lottery', 2007);
console.log('Result:', res3 ? { title: res3.item.title, year: res3.item.year, score: res3.score, matchedOn: res3.matchedOn } : null);

console.log('\n--- Test 4: Searching "Mon Ruk Lottery" (year 2006) ---');
let res4 = findMatchingMdlResult(parsed, 'Mon Ruk Lottery', 2006);
console.log('Result:', res4 ? { title: res4.item.title, year: res4.item.year, score: res4.score, matchedOn: res4.matchedOn } : null);

console.log('\n--- Test 5: Searching "Lottery Doctor" (no year specified) ---');
let res5 = findMatchingMdlResult(parsed, 'Lottery Doctor', null);
console.log('Result:', res5 ? { title: res5.item.title, year: res5.item.year, score: res5.score, matchedOn: res5.matchedOn } : null);
