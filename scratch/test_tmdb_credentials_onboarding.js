const fs = require('fs');
const path = require('path');
const assert = require('assert');

const scriptPath = path.join(__dirname, '..', 'sinflix-modifier.user.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

console.log('--- TEST 1: Version check ---');
const versionMatch = scriptContent.match(/\/\/\s*@version\s+([0-9.]+)/);
assert(versionMatch, 'Version header not found');
console.log('Detected version:', versionMatch[1]);
assert.strictEqual(versionMatch[1], '26.09.15.18', 'Version should be bumped to 26.09.15.18');
console.log('✓ Check 1 Passed: Version is 26.09.15.18');

console.log('\n--- TEST 2: DEFAULT_TMDB constants are empty ---');
const readTokenMatch = scriptContent.match(/const\s+DEFAULT_TMDB_READ_TOKEN\s*=\s*'([^']*)';/);
const apiKeyMatch = scriptContent.match(/const\s+DEFAULT_TMDB_API_KEY\s*=\s*'([^']*)';/);
assert(readTokenMatch, 'DEFAULT_TMDB_READ_TOKEN definition not found');
assert(apiKeyMatch, 'DEFAULT_TMDB_API_KEY definition not found');
assert.strictEqual(readTokenMatch[1], '', 'DEFAULT_TMDB_READ_TOKEN must be empty string');
assert.strictEqual(apiKeyMatch[1], '', 'DEFAULT_TMDB_API_KEY must be empty string');
console.log('✓ Check 2 Passed: DEFAULT_TMDB_READ_TOKEN and DEFAULT_TMDB_API_KEY are empty');

console.log('\n--- TEST 3: Settings panel instructions & links ---');
assert(scriptContent.includes('id="sfx-settings-group-tmdb"'), 'Settings group should have id sfx-settings-group-tmdb');
assert(scriptContent.includes('class="sfx-settings-guide-card"'), 'sfx-settings-guide-card must exist');
assert(scriptContent.includes('href="https://www.themoviedb.org/"'), 'Link to https://www.themoviedb.org/ must exist in settings');
assert(scriptContent.includes('href="https://www.themoviedb.org/settings/api"'), 'Link to https://www.themoviedb.org/settings/api must exist in settings');
console.log('✓ Check 3 Passed: TMDb settings guide and clickable links are present');

console.log('\n--- TEST 4: Modal missing-credentials state ---');
assert(scriptContent.includes('id="sfx-tmdb-creds-empty"'), 'Modal must have #sfx-tmdb-creds-empty element');
assert(scriptContent.includes('id="sfx-tmdb-modal-settings-btn"'), 'Modal must have #sfx-tmdb-modal-settings-btn element');
assert(scriptContent.includes('TheMovieDB API Credentials Required'), 'Modal credentials notice title must exist');
console.log('✓ Check 4 Passed: TMDb modal has dedicated missing credentials state and Open Settings button');

console.log('\n--- TEST 5: Legacy credential cleanup helper ---');
assert(scriptContent.includes('function getTmdbCredentials()'), 'getTmdbCredentials helper must exist');
assert(scriptContent.includes('LEGACY_DEFAULT_TMDB_READ_TOKEN'), 'LEGACY_DEFAULT_TMDB_READ_TOKEN must exist for cleanup');
console.log('✓ Check 5 Passed: Legacy credential cleanup logic verified');

console.log('\n======================================================');
console.log('All TMDb Credentials & Onboarding tests PASSED (100%)!');
console.log('======================================================');
