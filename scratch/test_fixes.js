const fs = require('fs');

console.log('Testing fixes in sinflix-modifier.user.js...');
const scriptCode = fs.readFileSync('sinflix-modifier.user.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Check version and matches
console.log('\n--- 1. Testing Version & Matches ---');
const hasVersion12 = scriptCode.includes('// @version      26.09.15.12');
console.log('Version bumped to 26.09.15.12:', hasVersion12 ? 'PASS' : 'FAIL');

// 2. Check Drama vs Movie Download Options filtering
console.log('\n--- 2. Testing Drama vs Movie Download Options Filtering ---');
const dramaShowsOnlySinflix = scriptCode.includes("if (dlSinflix) dlSinflix.style.display = 'flex';") &&
    scriptCode.includes("if (dlDramaday) dlDramaday.style.display = 'none';") &&
    scriptCode.includes("if (dlExtto) dlExtto.style.display = 'none';");
console.log('For dramas: hides dramaday & ext.to, shows only sinflix:', dramaShowsOnlySinflix ? 'PASS' : 'FAIL');

const movieShowsOnlyOther2 = scriptCode.includes("if (dlSinflix) dlSinflix.style.display = 'none';") &&
    scriptCode.includes("if (dlDramaday) {\n                        dlDramaday.style.display = 'flex';") &&
    scriptCode.includes("if (dlExtto) {\n                        dlExtto.style.display = 'flex';");
console.log('For movies: hides sinflix, shows only dramaday & ext.to:', movieShowsOnlyOther2 ? 'PASS' : 'FAIL');

// 3. Check ext.to IMDb Browse URL
console.log('\n--- 3. Testing ext.to IMDb Browse URL ---');
const getsImdbId = scriptCode.includes("const imdbId = (data.external_ids && data.external_ids.imdb_id) || data.imdb_id || null;");
const setsExttoImdbUrl = scriptCode.includes("dlExtto.href = `https://ext.to/browse/?imdb_id=${encodeURIComponent(imdbId)}`;");
console.log('Extracts imdb_id from TMDb external_ids or top-level:', getsImdbId ? 'PASS' : 'FAIL');
console.log('Sets ext.to browse URL with imdb_id:', setsExttoImdbUrl ? 'PASS' : 'FAIL');

// 4. Check Reset State
console.log('\n--- 4. Testing Download State Reset ---');
const resetsDownloadState = scriptCode.includes("const dlSinflix = modalWrap.querySelector('#sfx-tmdb-dl-sinflix');\n            if (dlSinflix) dlSinflix.style.display = 'none';") &&
    scriptCode.includes("const dlDramaday = modalWrap.querySelector('#sfx-tmdb-dl-dramaday');") &&
    scriptCode.includes("const dlExtto = modalWrap.querySelector('#sfx-tmdb-dl-extto');");
console.log('resetMediaState clears download options state:', resetsDownloadState ? 'PASS' : 'FAIL');

// 5. Check Hero Card Bleed Line Fix
console.log('\n--- 5. Testing Hero Card Bleed Line Fix ---');
const hasPaddingBoxClip = scriptCode.includes('background-clip: padding-box;');
const hasSolidCardBg = scriptCode.includes('background-color: #0e0f14;');
const hasDedicatedHeroBg = scriptCode.includes('.sfx-media-hero-bg {') && scriptCode.includes('bottom: 4px;');
const hasOpaqueBottomGradient = scriptCode.includes('linear-gradient(0deg, #0e0f14 0%, rgba(14, 15, 20, 0.98) 28px, transparent 65%)');
const resetsHeroBg = scriptCode.includes("const heroBg = modalWrap.querySelector('#sfx-media-hero-bg');\n            if (heroBg) {\n                heroBg.style.backgroundImage = 'none';\n            }");
const rendersHeroBg = scriptCode.includes("heroBg.style.backgroundImage = `url(\"${bgUrl}\")`;");

console.log('sfx-media-hero-card has background-clip: padding-box:', hasPaddingBoxClip ? 'PASS' : 'FAIL');
console.log('sfx-media-hero-card has solid background-color: #0e0f14:', hasSolidCardBg ? 'PASS' : 'FAIL');
console.log('Dedicated sfx-media-hero-bg container with bottom: 4px inset:', hasDedicatedHeroBg ? 'PASS' : 'FAIL');
console.log('sfx-media-hero-overlay has 100% opaque bottom edge gradient:', hasOpaqueBottomGradient ? 'PASS' : 'FAIL');
console.log('resetMediaState properly clears heroBg:', resetsHeroBg ? 'PASS' : 'FAIL');
console.log('renderMediaDetails populates heroBg backdrop:', rendersHeroBg ? 'PASS' : 'FAIL');

const allPassed = hasVersion12 && dramaShowsOnlySinflix && movieShowsOnlyOther2 &&
    getsImdbId && setsExttoImdbUrl && resetsDownloadState &&
    hasPaddingBoxClip && hasSolidCardBg && hasDedicatedHeroBg &&
    hasOpaqueBottomGradient && resetsHeroBg && rendersHeroBg;

if (allPassed) {
    console.log('\n=========================================');
    console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('=========================================');
} else {
    console.error('\nSOME CHECKS FAILED!');
    process.exit(1);
}
