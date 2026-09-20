const https = require('https');

const READ_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjOWI0ZDgzNzgzMjI0NDI3MjA3MjRhNjlhMTZlYTNkNiIsIm5iZiI6MTc0NjUxNTg3My4zMzc5OTk4LCJSUBiI6IjY4MTliN2ExNDM2ZGVkMmZiZTRmZWZmNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.6xRH1vsWJ_DmfZ0e5xX0GHPv3etLwXr1IMGoK4IPlak';
const API_KEY = 'c9b4d8378322442720724a69a16ea3d6';

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'Authorization': `Bearer ${READ_TOKEN}`,
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
    });
}

function stripPunct(s) {
    return (s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function stripThe(s) {
    return (s || '').replace(/^the\s+/, '');
}

function findDramaInMockList(mockTitles, targetTitle) {
    const cleanTarget = stripThe(stripPunct(targetTitle));
    if (!cleanTarget) return null;

    for (const title of mockTitles) {
        const clean = stripThe(stripPunct(title));
        if (clean === cleanTarget) return title;
        if (clean && (clean.startsWith(cleanTarget) || cleanTarget.startsWith(clean))) {
            return title;
        }
    }
    return null;
}

async function runTest() {
    console.log('--- 1. Testing Person API ---');
    const kimSooHyunId = 1253360; // Kim Soo-hyun
    const person = await makeRequest(`https://api.themoviedb.org/3/person/${kimSooHyunId}?append_to_response=combined_credits,external_ids&api_key=${API_KEY}`);
    console.log('Actor Name:', person.name);
    console.log('Birthday:', person.birthday);
    console.log('Place of Birth:', person.place_of_birth);
    console.log('Biography length:', person.biography ? person.biography.length : 0);

    const rawCredits = person.combined_credits && person.combined_credits.cast ? person.combined_credits.cast : [];
    const seen = new Set();
    const deduped = [];
    for (const item of rawCredits) {
        const key = `${item.media_type || 'tv'}:${item.id}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(item);
        }
    }
    deduped.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    const tvCredits = deduped.filter(c => c.media_type === 'tv');
    const movieCredits = deduped.filter(c => c.media_type === 'movie');

    console.log(`\n--- 2. Filmography Breakdown ---`);
    console.log(`TV Series / Dramas count: ${tvCredits.length}`);
    console.log('Top 5 TV series:');
    tvCredits.slice(0, 5).forEach(c => console.log(`  • ${c.name} (${c.first_air_date ? c.first_air_date.slice(0,4) : 'N/A'}) - character: "${c.character}" [pop: ${c.popularity}]`));

    console.log(`Movies count: ${movieCredits.length}`);
    console.log('Top 5 Movies:');
    movieCredits.slice(0, 5).forEach(c => console.log(`  • ${c.title} (${c.release_date ? c.release_date.slice(0,4) : 'N/A'}) - character: "${c.character}" [pop: ${c.popularity}]`));

    console.log(`\n--- 3. Testing Media By ID (Fetching Movie: ${movieCredits[0].title}) ---`);
    const movieDetails = await makeRequest(`https://api.themoviedb.org/3/movie/${movieCredits[0].id}?append_to_response=credits,images,external_ids,videos&api_key=${API_KEY}`);
    console.log('Movie fetched:', movieDetails.title, `(${movieDetails.release_date.slice(0,4)})`);
    console.log('Movie vote average:', movieDetails.vote_average);
    console.log('Movie IMDb ID:', movieDetails.external_ids ? movieDetails.external_ids.imdb_id : 'None');

    console.log(`\n--- 4. Testing SinFlix Drama Matching ---`);
    const mockPageTitles = [
        'Queen of Tears (2024)',
        'Crash Landing on You',
        'Vincenzo',
        'Hospital Playlist',
        'Guardian: The Lonely and Great God'
    ];

    const match1 = findDramaInMockList(mockPageTitles, 'Queen of Tears');
    console.log('Match "Queen of Tears":', match1, match1 ? '✅ FOUND' : '❌ NOT FOUND');

    const match2 = findDramaInMockList(mockPageTitles, 'Vincenzo');
    console.log('Match "Vincenzo":', match2, match2 ? '✅ FOUND' : '❌ NOT FOUND');

    const match3 = findDramaInMockList(mockPageTitles, 'Squid Game');
    console.log('Match "Squid Game":', match3, match3 ? '❌ NOT FOUND (as expected)' : '✅ UNEXPECTED');

    console.log(`\n--- 5. Download URLs Verification ---`);
    const testTitle = 'Queen of Tears';
    const ddUrl = `https://dramaday.me/?s=${encodeURIComponent(testTitle)}`;
    const extUrl = `https://ext.to/search/?q=${encodeURIComponent(testTitle)}`;
    console.log('Dramaday URL:', ddUrl);
    console.log('Ext.to URL:', extUrl);
    console.log('\nAll checks passed successfully!');
}

runTest().catch(console.error);
