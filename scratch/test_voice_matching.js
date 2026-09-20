const fs = require('fs');

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

    if (normItem.startsWith(normTarget + ' ') || normTarget.startsWith(normItem + ' ')) {
        return 85;
    }

    const itemWords = getTitleWords(normItem);
    const targetWords = getTitleWords(normTarget);

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

    if (normItem.includes(normTarget) || normTarget.includes(normItem)) {
        return 35;
    }

    return 0;
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
        });
    }

    const cleanTargets = allTargets.map(t => t.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    const candidateTargets = Array.from(new Set([...allTargets, ...cleanTargets]));

    const scored = results.map((item, index) => {
        const normItem = normalizeMdlTitle(item.title);
        const cleanItem = normItem.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim();

        let bestNameScore = 0;
        for (const target of candidateTargets) {
            const s1 = computeNameScore(normItem, target);
            const s2 = computeNameScore(cleanItem, target);
            const s = Math.max(s1, s2);
            if (s > bestNameScore) {
                bestNameScore = s;
            }
        }

        if (bestNameScore <= 0) {
            return { item, index, score: -999, nameScore: 0, yearScore: 0, matchedOn: 'none' };
        }

        let yearScore = 0;
        let yearMatchStatus = 'none';
        const itemY = item.year ? parseInt(item.year, 10) : null;

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
        // Fallback: if year mismatch penalized all candidates below 0, take the best name candidate
        const fallbackCandidates = scored.filter(s => s.nameScore >= 50);
        if (fallbackCandidates.length > 0) {
            fallbackCandidates.sort((a, b) => b.nameScore - a.nameScore);
            return fallbackCandidates[0];
        }
        return null;
    }

    validCandidates.sort((a, b) => b.score - a.score);
    return validCandidates[0];
}

// Test Voice seasons
const voiceResults = [
    { title: "Voice", year: "2017", url: "https://mydramalist.com/voice-1" },
    { title: "Voice 2", year: "2018", url: "https://mydramalist.com/voice-2" },
    { title: "Voice 3: City of Accomplices", year: "2019", url: "https://mydramalist.com/voice-3" },
    { title: "Voice 4: Judgment Hour", year: "2021", url: "https://mydramalist.com/voice-4" }
];

console.log('--- Voice 2021 match ---');
const voiceRes = findMatchingMdlResult(voiceResults, 'Voice', 2021);
console.log('Selected:', voiceRes ? { title: voiceRes.item.title, year: voiceRes.item.year, score: voiceRes.score } : null);

console.log('--- Voice 2017 match ---');
const voiceRes2017 = findMatchingMdlResult(voiceResults, 'Voice', 2017);
console.log('Selected:', voiceRes2017 ? { title: voiceRes2017.item.title, year: voiceRes2017.item.year, score: voiceRes2017.score } : null);

console.log('--- Voice 2019 match ---');
const voiceRes2019 = findMatchingMdlResult(voiceResults, 'Voice', 2019);
console.log('Selected:', voiceRes2019 ? { title: voiceRes2019.item.title, year: voiceRes2019.item.year, score: voiceRes2019.score } : null);

console.log('--- Voice with embedded year "Voice (2021)" without targetYear param ---');
const voiceResEmbedded = findMatchingMdlResult(voiceResults, 'Voice (2021)', null);
console.log('Selected:', voiceResEmbedded ? { title: voiceResEmbedded.item.title, year: voiceResEmbedded.item.year, score: voiceResEmbedded.score } : null);
