const fs = require('fs');
const assert = require('assert');

const scriptCode = fs.readFileSync('sinflix-modifier.user.js', 'utf8');

// 1. Version check
assert(scriptCode.includes('// @version      26.09.15.18'), 'Version must be 26.09.15.18');
console.log('✓ Check 1: Version is 26.09.15.18');

// 2. Section order check: Download section must come BEFORE Recommendations section
const dlIndex = scriptCode.indexOf('id="sfx-tmdb-download-section"');
const recIndex = scriptCode.indexOf('id="sfx-tmdb-recommendations-section"');
assert(dlIndex !== -1, 'Download section must exist');
assert(recIndex !== -1, 'Recommendations section must exist');
assert(dlIndex < recIndex, 'Download section MUST appear BEFORE recommendations section in template');
console.log('✓ Check 2: Download section is placed before Recommendations section');

// 3. Download grid CSS: Must use repeat(2, minmax(0, 1fr)) so a single item allocates only space for 1 slot
assert(scriptCode.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'Download grid must use 2-column layout');
console.log('✓ Check 3: Download grid is 2-column allocated layout');

// 4. Extract isMultiSeasonTv and test logic
function extractFunction(src, fnName) {
    const fnStart = src.indexOf(`function ${fnName}(`);
    if (fnStart === -1) throw new Error(`Function ${fnName} not found`);
    let braceCount = 0;
    let started = false;
    let fnEnd = -1;
    for (let i = fnStart; i < src.length; i++) {
        if (src[i] === '{') {
            braceCount++;
            started = true;
        } else if (src[i] === '}') {
            braceCount--;
            if (started && braceCount === 0) {
                fnEnd = i + 1;
                break;
            }
        }
    }
    return src.slice(fnStart, fnEnd);
}

const isMultiSeasonCode = extractFunction(scriptCode, 'isMultiSeasonTv');
const isMultiSeasonTv = new Function(`${isMultiSeasonCode}; return isMultiSeasonTv;`)();

// Test A: Taxi Driver (multi-season)
const taxiDriver = {
    name: "Taxi Driver",
    media_type: "tv",
    number_of_seasons: 3,
    seasons: [
        { season_number: 0, name: "Specials" },
        { season_number: 1, name: "Season 1" },
        { season_number: 2, name: "Season 2" },
        { season_number: 3, name: "Season 3" }
    ]
};
assert.strictEqual(isMultiSeasonTv(taxiDriver), true, 'Taxi Driver (3 seasons) must be multi-season');

// Test B: Voice (multi-season)
const voice = {
    name: "Voice",
    media_type: "tv",
    seasons: [
        { season_number: 1, name: "Season 1" },
        { season_number: 2, name: "Season 2" }
    ]
};
assert.strictEqual(isMultiSeasonTv(voice), true, 'Voice (2 seasons) must be multi-season');

// Test C: Crash Landing on You (single season)
const cloy = {
    name: "Crash Landing on You",
    media_type: "tv",
    number_of_seasons: 1,
    seasons: [
        { season_number: 0, name: "Specials" },
        { season_number: 1, name: "Season 1" }
    ]
};
assert.strictEqual(isMultiSeasonTv(cloy), false, 'Crash Landing on You (1 season) must NOT be multi-season');

// Test D: Movie (Parasite)
const parasite = {
    title: "Parasite",
    _mediaType: "movie",
    seasons: []
};
assert.strictEqual(isMultiSeasonTv(parasite), false, 'Movie must NOT be multi-season');
console.log('✓ Check 4: isMultiSeasonTv correctly identifies 2+ season TV shows');

// 5. Check Copy & Visit logic in userscript
assert(scriptCode.includes('if (isMultiSeasonTv(currentMediaData)) {'), 'Copy and visit must check isMultiSeasonTv(currentMediaData)');
assert(scriptCode.includes("showProgressIsland('Copy disabled: TV show has 2 or more seasons', 'error')"), 'Must notify user when copy is blocked on multi-season TV show');
assert(scriptCode.includes("openPopupWindow(searchPageUrl, 960, 720);"), 'Visit must open search page URL for multi-season TV show');
console.log('✓ Check 5: Copy blocked and visit redirected to search page for 2+ season TV shows');

console.log('\n======================================================');
console.log('All Download Section & Multi-Season MDL tests PASSED!');
console.log('======================================================');
