const fs = require('fs');
const assert = require('assert');

const scriptContent = fs.readFileSync('sinflix-modifier.user.js', 'utf8');

// 1. Check version
assert(scriptContent.includes('// @version      26.09.15.18'), 'Should have version 26.09.15.18');

// 2. Check header search capsule is hidden
assert(scriptContent.includes('#sfx-tmdb-search-capsule {'), 'Should contain #sfx-tmdb-search-capsule rule');
assert(scriptContent.includes('display: none !important;'), 'Should hide #sfx-tmdb-search-capsule');

// 3. Check hero search action elements
assert(scriptContent.includes('id="sfx-hero-google-btn"'), 'Should contain #sfx-hero-google-btn');
assert(scriptContent.includes('id="sfx-hero-mdl-wrap"'), 'Should contain #sfx-hero-mdl-wrap');
assert(scriptContent.includes('id="sfx-hero-mdl-btn"'), 'Should contain #sfx-hero-mdl-btn');
assert(scriptContent.includes('id="sfx-hero-mdl-menu"'), 'Should contain #sfx-hero-mdl-menu');
assert(scriptContent.includes('id="sfx-hero-mdl-copy"'), 'Should contain #sfx-hero-mdl-copy');
assert(scriptContent.includes('id="sfx-hero-mdl-visit"'), 'Should contain #sfx-hero-mdl-visit');

// 4. Check handlers and functions
assert(scriptContent.includes('resolveMdlDrama'), 'Should contain resolveMdlDrama');
assert(scriptContent.includes('parseMdlSearchResults'), 'Should contain parseMdlSearchResults');
assert(scriptContent.includes('findMatchingMdlResult'), 'Should contain findMatchingMdlResult');
assert(scriptContent.includes('openPopupWindow'), 'Should contain openPopupWindow');
assert(scriptContent.includes('fetchMdlSearch'), 'Should contain fetchMdlSearch');
assert(scriptContent.includes('copyTextToClipboard'), 'Should contain copyTextToClipboard');
assert(scriptContent.includes('getMdlSearchQuery'), 'Should contain getMdlSearchQuery');

// 5. Check Dynamic Island z-index
assert(scriptContent.includes('z-index: 30000 !important;'), 'Dynamic Island progress mode should have z-index: 30000 !important');

console.log('All userscript code & DOM structure checks passed for v26.09.15.14!');
