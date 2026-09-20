const fs = require('fs');
const https = require('https');

const apiKey = 'c9b4d8378322442720724a69a16ea3d6';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function build() {
    const data = await fetchUrl(`https://api.themoviedb.org/3/tv/119769?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar&api_key=${apiKey}`);
    
    const regularSeasons = (data.seasons || []).filter(s => s && s.season_number > 0);
    const rawRecs = [...(data.recommendations?.results || []), ...(data.similar?.results || [])];
    const seen = new Set();
    const filteredRecs = [];
    for (const item of rawRecs) {
        if (!item || !item.id || seen.has(item.id) || item.id === data.id) continue;
        seen.add(item.id);
        if ((item.original_language === 'ko' || item.original_language === 'en') && item.poster_path) {
            filteredRecs.push(item);
        }
    }

    const scriptText = fs.readFileSync('sinflix-modifier.user.js', 'utf8');
    // Extract CSS from GM_addStyle
    const cssMatch = scriptText.match(/GM_addStyle\(`([\s\S]*?)`\);/);
    const css = cssMatch ? cssMatch[1] : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SinFlix TMDb Modal Preview v26.09.15.15</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #0d0d12;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow-x: hidden;
        }
        ${css}
        /* Keep modal open in preview */
        #sfx-tmdb-modal-wrap {
            position: relative !important;
            width: 100vw !important;
            height: auto !important;
            min-height: 100vh !important;
            opacity: 1 !important;
            pointer-events: auto !important;
            display: flex !important;
            justify-content: center !important;
            padding: 20px 0 !important;
        }
        .sfx-tmdb-container {
            position: relative !important;
            margin: 0 auto !important;
            transform: none !important;
        }
        .sfx-preview-controls {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            gap: 10px;
        }
        .sfx-preview-btn {
            background: #30d158;
            color: #000;
            font-weight: 700;
            border: none;
            padding: 10px 18px;
            border-radius: 9999px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(48, 209, 88, 0.4);
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="sfx-preview-controls">
        <button class="sfx-preview-btn" onclick="openTrailer()">🎬 Test Borderless Trailer Modal</button>
    </div>

    <div class="sfx-tmdb-modal-wrap sfx-open" id="sfx-tmdb-modal-wrap">
        <div class="sfx-tmdb-container">
            <!-- Header -->
            <div class="sfx-tmdb-header">
                <div class="sfx-tmdb-header-left">
                    <span class="sfx-tmdb-title-text">${data.name}</span>
                    <span class="sfx-tmdb-year">(${data.first_air_date ? data.first_air_date.slice(0, 4) : ''})</span>
                </div>
            </div>
            <div class="sfx-tmdb-divider"></div>

            <div class="sfx-tmdb-scroll-body">
                <div class="sfx-tmdb-content" style="display: flex;">
                    <!-- Hero Card -->
                    <div class="sfx-media-hero-card" style="background-image: url('https://image.tmdb.org/t/p/w1280${data.backdrop_path}');">
                        <div class="sfx-media-hero-bg" style="background-image: url('https://image.tmdb.org/t/p/w1280${data.backdrop_path}');"></div>
                        <div class="sfx-media-hero-overlay"></div>
                        <div class="sfx-media-hero-body">
                            <div class="sfx-media-poster-wrap">
                                <img class="sfx-media-poster-img" src="https://image.tmdb.org/t/p/w500${data.poster_path}" alt="${data.name}" style="display: block;" />
                            </div>
                            <div class="sfx-media-details">
                                <div class="sfx-media-title-row">
                                    <h1 class="sfx-media-main-title">${data.name}</h1>
                                    <span class="sfx-media-release-year">(${data.first_air_date.slice(0,4)})</span>
                                </div>
                                <div class="sfx-media-meta-line">
                                    <span>${data.genres.map(g => g.name).join(', ')}</span>
                                    <span class="sfx-meta-bullet">·</span>
                                    <span>${data.number_of_episodes} eps</span>
                                    <span class="sfx-meta-bullet">·</span>
                                    <span>${data.status}</span>
                                </div>

                                <div class="sfx-media-scores-actions-row">
                                    <div class="sfx-user-score-wrap">
                                        <div class="sfx-user-score-circle">
                                            <div class="sfx-user-score-val">${Math.round(data.vote_average * 10)}<span class="sfx-score-pct">%</span></div>
                                        </div>
                                        <span class="sfx-user-score-lbl">User<br>Score</span>
                                    </div>

                                    <!-- Search Icons before play trailer -->
                                    <div class="sfx-hero-search-actions">
                                        <button class="sfx-hero-search-btn sfx-hero-btn-google" title="Search Google">
                                            <svg viewBox="-3 0 262 262" width="18" height="18"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
                                        </button>
                                        <div class="sfx-hero-mdl-wrap">
                                            <button class="sfx-hero-search-btn sfx-hero-btn-mdl" title="MyDramaList Options">
                                                <svg viewBox="0 0 48 48" width="19" height="19" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M38.5 5.5h-29a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h29a4 4 0 0 0 4-4v-29a4 4 0 0 0-4-4"/><path fill="none" d="M9.5 29.591V18.396l5.604 11.208l5.604-11.191v11.191m2.382 0V18.396h2.521a4.903 4.903 0 0 1 4.903 4.904v1.4a4.903 4.903 0 0 1-4.903 4.904zm9.806-11.208v11.208H38.5"/></svg>
                                            </button>
                                        </div>
                                    </div>

                                    <button class="sfx-hero-trailer-btn" onclick="openTrailer()">
                                        <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        <span>Play Trailer</span>
                                    </button>
                                </div>

                                <div class="sfx-media-overview-wrap">
                                    <h3 class="sfx-media-overview-heading">Overview</h3>
                                    <p class="sfx-media-overview-text">${data.overview}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 1. Cast Section -->
                    <div class="sfx-tmdb-section" id="sfx-tmdb-cast-section">
                        <div class="sfx-tmdb-section-header">
                            <span class="sfx-tmdb-section-title">Cast & Crew ›</span>
                        </div>
                        <div class="sfx-tmdb-cast-scroll-container">
                            <div class="sfx-tmdb-cast-list">
                                ${data.credits.cast.slice(0, 10).map(c => `
                                    <div class="sfx-tmdb-cast-item">
                                        <img class="sfx-tmdb-cast-photo" src="https://image.tmdb.org/t/p/w185${c.profile_path}" alt="${c.name}" />
                                        <span class="sfx-tmdb-cast-name">${c.name}</span>
                                        <span class="sfx-tmdb-cast-char">${c.character || ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 2. NEW: Seasons Section (Under Cast & Crew) -->
                    <div class="sfx-tmdb-section" id="sfx-tmdb-seasons-section">
                        <div class="sfx-tmdb-section-header">
                            <span class="sfx-tmdb-section-title">Seasons</span>
                            <span class="sfx-season-section-count">(${regularSeasons.length} Seasons)</span>
                        </div>
                        <div class="sfx-tmdb-seasons-scroll-container">
                            <div class="sfx-tmdb-seasons-list">
                                ${regularSeasons.map(s => `
                                    <div class="sfx-season-card">
                                        <div class="sfx-season-poster-wrap">
                                            <img class="sfx-season-poster" src="https://image.tmdb.org/t/p/w342${s.poster_path || data.poster_path}" alt="${s.name}" />
                                            ${s.vote_average ? `<div class="sfx-season-badge">★ ${s.vote_average.toFixed(1)}</div>` : ''}
                                        </div>
                                        <span class="sfx-season-title">${s.name}</span>
                                        <span class="sfx-season-meta">${[s.air_date ? s.air_date.slice(0,4) : '', `${s.episode_count} eps`].filter(Boolean).join(' · ')}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 3. Images Section -->
                    <div class="sfx-tmdb-section" id="sfx-tmdb-images-section">
                        <div class="sfx-tmdb-section-header">
                            <span class="sfx-tmdb-section-title">Images</span>
                        </div>
                        <div class="sfx-tmdb-gallery-container">
                            <div class="sfx-tmdb-gallery">
                                ${data.images.backdrops.slice(0, 6).map(b => `
                                    <img class="sfx-tmdb-gallery-item" src="https://image.tmdb.org/t/p/w780${b.file_path}" alt="Backdrop" />
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 4. NEW: More Like This / Recommendations Section (Korean or English only) -->
                    <div class="sfx-tmdb-section" id="sfx-tmdb-recommendations-section">
                        <div class="sfx-tmdb-section-header">
                            <span class="sfx-tmdb-section-title">More Like This</span>
                            <span class="sfx-rec-section-count">(${filteredRecs.length})</span>
                        </div>
                        <div class="sfx-tmdb-recs-scroll-container">
                            <div class="sfx-tmdb-recs-list">
                                ${filteredRecs.slice(0, 12).map(r => `
                                    <div class="sfx-rec-card">
                                        <div class="sfx-rec-poster-wrap">
                                            <img class="sfx-rec-poster" src="https://image.tmdb.org/t/p/w342${r.poster_path}" alt="${r.name || r.title}" />
                                            <div class="sfx-rec-lang-badge">${r.original_language.toUpperCase()}</div>
                                            ${r.vote_average ? `<div class="sfx-rec-score-badge">${Math.round(r.vote_average * 10)}%</div>` : ''}
                                        </div>
                                        <span class="sfx-rec-title">${r.name || r.title}</span>
                                        <span class="sfx-rec-meta">${(r.first_air_date || r.release_date || '').slice(0, 4)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- 5. Download Section -->
                    <div class="sfx-tmdb-section" id="sfx-tmdb-download-section">
                        <div class="sfx-tmdb-section-header">
                            <span class="sfx-tmdb-section-title">Download</span>
                        </div>
                        <div class="sfx-tmdb-download-grid">
                            <a class="sfx-tmdb-download-card sfx-dl-card-sinflix" href="#">
                                <div class="sfx-dl-icon-badge" style="background: rgba(48, 209, 88, 0.15); border: 1px solid rgba(48, 209, 88, 0.35); color: #30d158;">SX</div>
                                <div class="sfx-dl-info">
                                    <span class="sfx-dl-name">rentry.co/sin0flix</span>
                                    <span class="sfx-dl-desc">On-page releases & download links</span>
                                </div>
                                <span class="sfx-dl-arrow">↓</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Play Trailer Pop-up Modal (Borderless, Video Only) -->
    <div class="sfx-tmdb-trailer-modal-backdrop" id="sfx-tmdb-trailer-modal">
        <div class="sfx-tmdb-trailer-modal-card">
            <button class="sfx-tmdb-trailer-modal-close" id="sfx-tmdb-trailer-close" onclick="closeTrailer()" title="Close">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div class="sfx-tmdb-trailer-player-box" id="sfx-tmdb-trailer-player-box"></div>
        </div>
    </div>

    <script>
        function openTrailer() {
            const modal = document.getElementById('sfx-tmdb-trailer-modal');
            const box = document.getElementById('sfx-tmdb-trailer-player-box');
            box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1" allowfullscreen></iframe>';
            modal.classList.add('sfx-open');
        }
        function closeTrailer() {
            const modal = document.getElementById('sfx-tmdb-trailer-modal');
            const box = document.getElementById('sfx-tmdb-trailer-player-box');
            box.innerHTML = '';
            modal.classList.remove('sfx-open');
        }
        document.getElementById('sfx-tmdb-trailer-modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeTrailer();
        });
    </script>
</body>
</html>`;

    fs.writeFileSync('scratch/preview_v15.html', html, 'utf8');
    console.log('Preview generated successfully at scratch/preview_v15.html');
}

build().catch(console.error);
