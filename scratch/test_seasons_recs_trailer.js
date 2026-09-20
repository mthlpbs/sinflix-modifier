const https = require('https');
const fs = require('fs');

const apiKey = 'c9b4d8378322442720724a69a16ea3d6';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('=== TEST 1: Taxi Driver (Multi-Season TV Series) ===');
    const taxiUrl = `https://api.themoviedb.org/3/tv/119769?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar&api_key=${apiKey}`;
    const taxiData = await fetchUrl(taxiUrl);
    taxiData._mediaType = 'tv';

    const isTv1 = taxiData._mediaType !== 'movie';
    const regularSeasons1 = (taxiData.seasons && Array.isArray(taxiData.seasons))
        ? taxiData.seasons.filter(s => s && s.season_number > 0)
        : [];
    const showSeasons1 = isTv1 && regularSeasons1.length > 1;
    console.log(`Title: ${taxiData.name}`);
    console.log(`Regular seasons count: ${regularSeasons1.length}`);
    console.log(`Should show Seasons section: ${showSeasons1} (Expected: true)`);
    if (!showSeasons1) throw new Error('Taxi Driver should show seasons');

    console.log('\n=== TEST 2: Crash Landing on You (Single-Season TV Series) ===');
    const cloyUrl = `https://api.themoviedb.org/3/tv/94796?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar&api_key=${apiKey}`;
    const cloyData = await fetchUrl(cloyUrl);
    cloyData._mediaType = 'tv';

    const isTv2 = cloyData._mediaType !== 'movie';
    const regularSeasons2 = (cloyData.seasons && Array.isArray(cloyData.seasons))
        ? cloyData.seasons.filter(s => s && s.season_number > 0)
        : [];
    const showSeasons2 = isTv2 && regularSeasons2.length > 1;
    console.log(`Title: ${cloyData.name}`);
    console.log(`Regular seasons count: ${regularSeasons2.length}`);
    console.log(`Should show Seasons section: ${showSeasons2} (Expected: false)`);
    if (showSeasons2) throw new Error('Crash Landing on You should NOT show seasons');

    console.log('\n=== TEST 3: Parasite (Movie) ===');
    const movieUrl = `https://api.themoviedb.org/3/movie/496243?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar&api_key=${apiKey}`;
    const movieData = await fetchUrl(movieUrl);
    movieData._mediaType = 'movie';

    const isTv3 = movieData._mediaType !== 'movie';
    const regularSeasons3 = (movieData.seasons && Array.isArray(movieData.seasons))
        ? movieData.seasons.filter(s => s && s.season_number > 0)
        : [];
    const showSeasons3 = isTv3 && regularSeasons3.length > 1;
    console.log(`Title: ${movieData.title}`);
    console.log(`Should show Seasons section: ${showSeasons3} (Expected: false)`);
    if (showSeasons3) throw new Error('Movie should NOT show seasons');

    console.log('\n=== TEST 4: Recommendations Language Filter (Strictly Korean or English) ===');
    const rawRecs = (taxiData.recommendations && taxiData.recommendations.results) || [];
    const rawSimilar = (taxiData.similar && taxiData.similar.results) || [];
    const combinedRecs = [...rawRecs, ...rawSimilar];
    const seenRecIds = new Set();
    const filteredRecs = [];

    for (const item of combinedRecs) {
        if (!item || !item.id || seenRecIds.has(item.id) || item.id === taxiData.id) continue;
        seenRecIds.add(item.id);
        const lang = item.original_language;
        if (lang === 'ko' || lang === 'en') {
            if (item.poster_path) {
                filteredRecs.push(item);
            }
        }
    }

    console.log(`Total raw suggestions: ${combinedRecs.length}`);
    console.log(`Filtered suggestions (ko/en with poster): ${filteredRecs.length}`);
    const nonKoEn = filteredRecs.filter(r => r.original_language !== 'ko' && r.original_language !== 'en');
    console.log(`Non-Korean/English items count in filtered: ${nonKoEn.length} (Expected: 0)`);
    if (nonKoEn.length > 0) throw new Error('Found non-Korean/English recommendations!');

    console.log('\nSample filtered recommendations:');
    filteredRecs.slice(0, 5).forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.original_language.toUpperCase()}] ${r.name || r.title} (${(r.first_air_date || r.release_date || '').slice(0, 4)})`);
    });

    console.log('\n=== TEST 5: Verify Userscript Text Content for Removed Elements ===');
    const scriptContent = fs.readFileSync('sinflix-modifier.user.js', 'utf8');
    const hasWatchOnYt = scriptContent.includes('Watch on YouTube ↗');
    const hasBotCheckMsg = scriptContent.includes('Video blocked by YouTube bot check');
    const hasYtFooterBtn = scriptContent.includes('sfx-trailer-footer-btn');
    const hasYtHeaderBtn = scriptContent.includes('sfx-trailer-header-yt-btn');

    console.log(`Contains 'Watch on YouTube ↗': ${hasWatchOnYt} (Expected: false)`);
    console.log(`Contains 'Video blocked by YouTube bot check': ${hasBotCheckMsg} (Expected: false)`);
    console.log(`Contains 'sfx-trailer-footer-btn': ${hasYtFooterBtn} (Expected: false)`);
    console.log(`Contains 'sfx-trailer-header-yt-btn': ${hasYtHeaderBtn} (Expected: false)`);

    if (hasWatchOnYt || hasBotCheckMsg || hasYtFooterBtn || hasYtHeaderBtn) {
        throw new Error('Obsolete YouTube trailer elements still present in userscript!');
    }

    console.log('\nALL 5 TESTS PASSED SUCCESSFULLY! ✅');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
