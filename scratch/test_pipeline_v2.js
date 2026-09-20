const fs = require('fs');
const assert = require('assert');

function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const sampleHtml = decodeQP(mhtml);

function parseMdlSearchResults(html) {
    const results = [];
    if (!html || typeof html !== 'string') return results;

    // 1. Browser DOMParser if available
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
            // fallback
        }
    }

    // 2. Robust Regex on mdl- cards
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

    // 3. Fallback regex
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

function normalizeMdlTitle(t) {
    return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findMatchingMdlResult(results, targetTitle, targetYear, extraTitles = []) {
    if (!results || results.length === 0) return null;

    let targetY = null;
    if (targetYear) {
        const ym = String(targetYear).match(/\b(19\d\d|20\d\d)\b/);
        if (ym) targetY = parseInt(ym[1], 10);
    }
    if (!targetY && targetTitle) {
        const ym = String(targetTitle).match(/\b(19\d\d|20\d\d)\b/);
        if (ym) targetY = parseInt(ym[1], 10);
    }

    const normTarget = normalizeMdlTitle(targetTitle);
    const allTargets = [];
    if (normTarget) allTargets.push(normTarget);

    if (Array.isArray(extraTitles)) {
        extraTitles.forEach(t => {
            const n = normalizeMdlTitle(t);
            if (n && !allTargets.includes(n)) allTargets.push(n);
            if (t && !targetY) {
                const ym = String(t).match(/\b(19\d\d|20\d\d)\b/);
                if (ym) targetY = parseInt(ym[1], 10);
            }
        });
    }

    const cleanTargets = allTargets
        .map(t => t.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    const candidateTargets = Array.from(new Set([...allTargets, ...cleanTargets]));

    function getTitleWords(norm) {
        if (!norm) return [];
        return norm.split(/\s+/).filter(w => w.length > 0);
    }

    function computeNameScore(normItem, normTgt) {
        if (!normItem || !normTgt) return 0;
        if (normItem === normTgt) return 100;

        if (normItem.startsWith(normTgt + ' ') || normTgt.startsWith(normItem + ' ')) {
            return 85;
        }

        const itemWords = getTitleWords(normItem);
        const targetWords = getTitleWords(normTgt);
        if (itemWords.length === 0 || targetWords.length === 0) return 0;

        const matchingWords = targetWords.filter(tw => itemWords.includes(tw));
        const targetWordRatio = matchingWords.length / targetWords.length;
        const itemWordRatio = matchingWords.length / itemWords.length;

        if (targetWordRatio === 1) {
            return 75 + Math.round(itemWordRatio * 15);
        }
        if (targetWords.length === 1 && matchingWords.length === 1) {
            return 50 + Math.round(itemWordRatio * 20);
        }
        if (targetWordRatio >= 0.5) {
            return Math.round(targetWordRatio * 50);
        }
        if (normItem.includes(normTgt) || normTgt.includes(normItem)) {
            return 35;
        }
        return 0;
    }

    const scored = results.map((item, index) => {
        const normItem = normalizeMdlTitle(item.title);
        const cleanItem = normItem.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim();

        let bestNameScore = 0;
        for (const tgt of candidateTargets) {
            const s1 = computeNameScore(normItem, tgt);
            const s2 = computeNameScore(cleanItem, tgt);
            const s = Math.max(s1, s2);
            if (s > bestNameScore) bestNameScore = s;
        }

        if (bestNameScore <= 0) {
            return { item, index, score: -999, nameScore: 0, yearScore: 0, matchedOn: 'none' };
        }

        let yearScore = 0;
        let yearMatchStatus = 'none';
        let itemY = null;
        if (item.year) {
            const ym = String(item.year).match(/\b(19\d\d|20\d\d)\b/);
            if (ym) itemY = parseInt(ym[1], 10);
        }
        if (!itemY && item.muted) {
            const ym = String(item.muted).match(/\b(19\d\d|20\d\d)\b/);
            if (ym) itemY = parseInt(ym[1], 10);
        }
        if (!itemY && item.title) {
            const ym = String(item.title).match(/\b(19\d\d|20\d\d)\b/);
            if (ym) itemY = parseInt(ym[1], 10);
        }

        if (targetY) {
            if (itemY) {
                const diff = Math.abs(itemY - targetY);
                if (diff === 0) {
                    yearScore = 80;
                    yearMatchStatus = 'exact';
                } else if (diff === 1) {
                    yearScore = 40;
                    yearMatchStatus = 'close';
                } else {
                    yearScore = -50 - Math.min(diff * 5, 40);
                    yearMatchStatus = 'mismatch';
                }
            } else {
                yearScore = -15;
                yearMatchStatus = 'missing';
            }
        } else {
            yearScore = 0;
            yearMatchStatus = 'unspecified';
        }

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

    const validCandidates = scored.filter(s => s.score > 0 && s.nameScore >= 35);
    if (validCandidates.length === 0) {
        const fallbackCandidates = scored.filter(s => s.nameScore >= 50);
        if (fallbackCandidates.length > 0) {
            fallbackCandidates.sort((a, b) => b.nameScore - a.nameScore);
            return { item: fallbackCandidates[0].item, matchedOn: 'name' };
        }
        return null;
    }

    validCandidates.sort((a, b) => b.score - a.score);
    return {
        item: validCandidates[0].item,
        matchedOn: validCandidates[0].matchedOn
    };
}

// Test parsing
const results = parseMdlSearchResults(sampleHtml);
assert.strictEqual(results.length, 10, 'Must find 10 results');

// Test matching Lottery Trio (2008)
const matchTrio = findMatchingMdlResult(results, 'Lottery Trio', '2008');
assert(matchTrio, 'Must match Lottery Trio');
assert.strictEqual(matchTrio.item.id, '1829');
assert.strictEqual(matchTrio.item.url, 'https://mydramalist.com/1829-lottery-trio');

// Test year-priority: query "Lottery" with year '2008' must select "Lottery Trio" (2008), NOT "Lottery Doctor" (TBA)
const matchAmbiguous = findMatchingMdlResult(results, 'Lottery', '2008');
assert(matchAmbiguous, 'Must match Lottery');
assert.strictEqual(matchAmbiguous.item.id, '1829', 'Must select Lottery Trio (2008) over Lottery Doctor (TBA) because year matches');
assert.strictEqual(matchAmbiguous.item.url, 'https://mydramalist.com/1829-lottery-trio');

// Test matching Lottery Doctor
const matchDoctor = findMatchingMdlResult(results, 'Lottery Doctor', '2024');
assert(matchDoctor, 'Must match Lottery Doctor');
assert.strictEqual(matchDoctor.item.id, '795752');
assert.strictEqual(matchDoctor.item.url, 'https://mydramalist.com/795752-lottery-doctor');

// Test target selection for Visit & Copy
const targetForVisit = matchTrio ? matchTrio.item.url : (results[0] ? results[0].url : 'https://mydramalist.com/search?q=lottery');
assert.strictEqual(targetForVisit, 'https://mydramalist.com/1829-lottery-trio', 'Visit URL must be direct drama page, not search results page');

console.log('All pipeline tests passed 100%!');
