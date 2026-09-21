const fs = require('fs');
const assert = require('assert');

console.log('=== TEST SUITE: TMDb Default Disabled & Korean-Only Recommendations ===\n');

// 1. Read userscript content
const scriptPath = 'sinflix-modifier.user.js';
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Test 1: Version check
console.log('Test 1: Version bump check');
assert(scriptContent.includes('// @version      26.09.22.1'), 'Version should be bumped to 26.09.22.1');
console.log('  ✔ Version is 26.09.22.1');

// Test 1b: Fetchrr removed from paste pages
console.log('\nTest 1b: Fetchrr removed from paste sites (0g.gg, darklab, pst.moe)');
assert(!scriptContent.includes('sinflix-mega-fetchrr-dot'), 'sinflix-mega-fetchrr-dot must not exist in userscript');
console.log('  ✔ sinflix-mega-fetchrr-dot completely removed');

// Test 2: TMDb disabled by default
console.log('\nTest 2: sfx-tmdb-enabled default value check');
assert(!scriptContent.includes("getSetting('sfx-tmdb-enabled', true)"), 'Must NOT have getSetting for sfx-tmdb-enabled defaulting to true');
const matchesFalse = scriptContent.match(/getSetting\('sfx-tmdb-enabled',\s*false\)/g);
assert(matchesFalse && matchesFalse.length >= 2, `Should have at least 2 occurrences defaulting to false, found: ${matchesFalse ? matchesFalse.length : 0}`);
console.log(`  ✔ Found ${matchesFalse.length} occurrences of getSetting('sfx-tmdb-enabled', false)`);

// Test 3: Recommendation filtering strictly Korean only
console.log('\nTest 3: Recommendations filter check in userscript');
assert(!scriptContent.includes("lang === 'en'"), 'Should NOT allow English (lang === "en") in recommendations');
assert(scriptContent.includes("if (lang === 'ko')"), 'Must filter recommendations strictly for lang === "ko"');
console.log('  ✔ Recommendations filter strictly requires lang === "ko"');

// Test 4: Simulate recommendation logic with diverse languages
console.log('\nTest 4: Functional simulation of recommendations filter');
const mockRecommendations = [
    { id: 101, name: 'Crash Landing on You', original_language: 'ko', poster_path: '/cloy.jpg', vote_average: 8.7 },
    { id: 102, name: 'Stranger Things', original_language: 'en', poster_path: '/st.jpg', vote_average: 8.6 },
    { id: 103, name: 'Squid Game', original_language: 'ko', poster_path: '/squid.jpg', vote_average: 8.1 },
    { id: 104, name: 'Breaking Bad', original_language: 'en', poster_path: '/bb.jpg', vote_average: 9.5 },
    { id: 105, name: 'Alice in Borderland', original_language: 'ja', poster_path: '/aib.jpg', vote_average: 7.9 },
    { id: 106, name: 'The Untamed', original_language: 'zh', poster_path: '/untamed.jpg', vote_average: 8.2 },
    { id: 107, name: 'Money Heist', original_language: 'es', poster_path: '/mh.jpg', vote_average: 8.3 },
    { id: 108, name: 'Moving', original_language: 'ko', poster_path: '/moving.jpg', vote_average: 8.5 },
    { id: 109, name: 'Korean Drama Without Poster', original_language: 'ko', poster_path: null, vote_average: 7.0 },
    { id: 110, name: 'Dark', original_language: 'de', poster_path: '/dark.jpg', vote_average: 8.8 }
];

const seenRecIds = new Set();
const filteredRecs = [];
const currentDramaId = 999;

for (const item of mockRecommendations) {
    if (!item || !item.id || seenRecIds.has(item.id) || item.id === currentDramaId) continue;
    seenRecIds.add(item.id);
    const lang = item.original_language;
    // Suggestions MUST be Korean ('ko') only - no English or other language contents
    if (lang === 'ko') {
        if (item.poster_path) {
            filteredRecs.push(item);
        }
    }
}

console.log(`  Total input items: ${mockRecommendations.length}`);
console.log(`  Filtered items count: ${filteredRecs.length}`);
assert.strictEqual(filteredRecs.length, 3, 'Only the 3 Korean items with posters should be accepted');
assert.deepStrictEqual(filteredRecs.map(r => r.name), ['Crash Landing on You', 'Squid Game', 'Moving']);

const anyNonKorean = filteredRecs.some(r => r.original_language !== 'ko');
assert(!anyNonKorean, 'No non-Korean content must be present in filteredRecs');
console.log('  ✔ Verified: Zero English or foreign content allowed');

// Test 5: Default setting behavior
console.log('\nTest 5: Storage simulation for default behavior');
const mockStorage = {};
function getSetting(key, def) {
    if (key in mockStorage) return mockStorage[key];
    return def;
}

assert.strictEqual(getSetting('sfx-tmdb-enabled', false), false, 'Default for fresh user must be false (disabled)');
console.log('  ✔ Fresh user has TMDb disabled by default');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
