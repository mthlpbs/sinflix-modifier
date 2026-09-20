const fs = require('fs');
const assert = require('assert');

// 1. Read sinflix-modifier.user.js
const scriptCode = fs.readFileSync('sinflix-modifier.user.js', 'utf8');

// 2. Validate version
assert(scriptCode.includes('// @version      26.09.15.18'), 'Version must be 26.09.15.18');

// 3. Extract functions from sinflix-modifier.user.js using Function constructor / eval in sandbox
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

const normFnCode = extractFunction(scriptCode, 'normalizeMdlTitle');
const parseFnCode = extractFunction(scriptCode, 'parseMdlSearchResults');
const matchFnCode = extractFunction(scriptCode, 'findMatchingMdlResult');
const queryFnCode = extractFunction(scriptCode, 'getMdlSearchQuery');

const ctx = {};
const evalEnv = `
${normFnCode}
${queryFnCode}
${parseFnCode}
${matchFnCode}
return { normalizeMdlTitle, getMdlSearchQuery, parseMdlSearchResults, findMatchingMdlResult };
`;

const fns = new Function(evalEnv)();
const { normalizeMdlTitle, getMdlSearchQuery, parseMdlSearchResults, findMatchingMdlResult } = fns;

// 4. Test with real MHTML search results for "lottery"
function decodeQP(s) {
    return s.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}
const mhtml = fs.readFileSync('Search results for lottery - MyDramaList.mhtml', 'utf8');
const decodedHtml = decodeQP(mhtml);
const searchResults = parseMdlSearchResults(decodedHtml);

assert.strictEqual(searchResults.length, 10, 'Must extract 10 search results from lottery search');
console.log('Parsed 10 search results successfully.');

// Test 1: "Lottery Trio" (year 2008)
const match1 = findMatchingMdlResult(searchResults, 'Lottery Trio', 2008);
assert(match1, 'Match 1 must be found');
assert.strictEqual(match1.item.title, 'Lottery Trio', 'Must match Lottery Trio');
assert.strictEqual(match1.item.year, '2008', 'Must match year 2008');
assert.strictEqual(match1.item.url, 'https://mydramalist.com/1829-lottery-trio');
console.log('✓ Test 1 Passed: "Lottery Trio" (2008) -> Lottery Trio (2008)');

// Test 2: "Lottery" (year 2008) - Ambiguous query where result #1 is "Lottery Doctor" (TBA) and result #2 is "Lottery Trio" (2008)
// Requirement: ALWAYS consider about the year in MyDramaList after the name!
const match2 = findMatchingMdlResult(searchResults, 'Lottery', 2008);
assert(match2, 'Match 2 must be found');
assert.strictEqual(match2.item.title, 'Lottery Trio', 'Must choose Lottery Trio over Lottery Doctor because year matches 2008');
assert.strictEqual(match2.item.year, '2008', 'Must have year 2008');
console.log('✓ Test 2 Passed: Query "Lottery" (2008) selects Lottery Trio (2008) due to year priority!');

// Test 3: "Lottery Trio (2008)" with embedded year and null targetYear parameter
const match3 = findMatchingMdlResult(searchResults, 'Lottery Trio (2008)', null);
assert(match3, 'Match 3 must be found');
assert.strictEqual(match3.item.title, 'Lottery Trio');
assert.strictEqual(match3.item.year, '2008');
console.log('✓ Test 3 Passed: "Lottery Trio (2008)" extracts embedded year and selects Lottery Trio!');

// Test 4: "Crazy Lottery" (year 2007)
const match4 = findMatchingMdlResult(searchResults, 'Crazy Lottery', 2007);
assert(match4, 'Match 4 must be found');
assert.strictEqual(match4.item.title, 'Crazy Lottery');
assert.strictEqual(match4.item.year, '2007');
console.log('✓ Test 4 Passed: "Crazy Lottery" (2007) -> Crazy Lottery');

// Test 5: "Lottery Doctor" (no year specified)
const match5 = findMatchingMdlResult(searchResults, 'Lottery Doctor', null);
assert(match5, 'Match 5 must be found');
assert.strictEqual(match5.item.title, 'Lottery Doctor');
console.log('✓ Test 5 Passed: "Lottery Doctor" (null year) -> Lottery Doctor');

// Test 6: Multi-season drama ("Voice")
const voiceResults = [
    { title: "Voice", year: "2017", url: "https://mydramalist.com/voice-1" },
    { title: "Voice 2", year: "2018", url: "https://mydramalist.com/voice-2" },
    { title: "Voice 3: City of Accomplices", year: "2019", url: "https://mydramalist.com/voice-3" },
    { title: "Voice 4: Judgment Hour", year: "2021", url: "https://mydramalist.com/voice-4" }
];
const voice2021 = findMatchingMdlResult(voiceResults, 'Voice', 2021);
assert.strictEqual(voice2021.item.title, 'Voice 4: Judgment Hour', 'Must select Voice 4 for year 2021');
const voice2017 = findMatchingMdlResult(voiceResults, 'Voice', 2017);
assert.strictEqual(voice2017.item.title, 'Voice', 'Must select Voice 1 for year 2017');
console.log('✓ Test 6 Passed: Multi-season drama selects correct season by year!');

// Test 7: Remakes with identical title ("Signal")
const signalResults = [
    { title: "Signal", year: "2016", url: "https://mydramalist.com/signal-kr" },
    { title: "Signal", year: "2018", url: "https://mydramalist.com/signal-jp" }
];
const signal2016 = findMatchingMdlResult(signalResults, 'Signal', 2016);
assert.strictEqual(signal2016.item.year, '2016');
const signal2018 = findMatchingMdlResult(signalResults, 'Signal', 2018);
assert.strictEqual(signal2018.item.year, '2018');
console.log('✓ Test 7 Passed: Remakes with identical titles disambiguated by year!');

console.log('\n=============================================');
console.log('All Year-Priority MDL Matching tests PASSED!');
console.log('=============================================');
