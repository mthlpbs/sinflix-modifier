const fs = require('fs');

const userscript = fs.readFileSync('sinflix-modifier.user.js', 'utf8');

// Extract CSS block
const cssMatch = userscript.match(/GM_addStyle\(`([\s\S]*?)`\);/);
const css = cssMatch ? cssMatch[1] : '';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Preview MDL & Google Actions in Rating Section</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #111;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #fff;
        }
        ${css}
    </style>
</head>
<body>
    <div style="padding: 20px;">
        <button id="open-btn" style="padding: 10px 20px; font-size: 16px; border-radius: 8px; cursor: pointer; background: #e50914; color: #fff; border: none;">
            Open Modal for "Lottery Trio (2008)"
        </button>
    </div>

    <!-- Dynamic Island wrapper -->
    <div id="sfx-island-wrap" style="display: none;">
        <div id="sfx-island-default-view">
            <div id="sfx-island-search-icon"></div>
            <span id="sfx-island-label"></span>
        </div>
    </div>

    <script>
        // Mock functions for preview
        function showProgressIsland(message, statusType = 'progress') {
            const island = document.getElementById('sfx-island-wrap');
            island.className = 'sfx-progress-mode';
            island.style.display = 'flex';
            island.style.opacity = '1';
            island.style.transform = 'translateX(-50%) scale(1)';
            
            const label = island.querySelector('#sfx-island-label');
            const icon = island.querySelector('#sfx-island-search-icon');
            if (label) label.textContent = message;
            
            if (statusType === 'progress') {
                icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: sfx-spin 1s linear infinite; width: 16px; height: 16px; color: #30d158;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>';
            } else if (statusType === 'success') {
                icon.innerHTML = '<svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #30d158;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
                setTimeout(() => {
                    island.style.opacity = '0';
                    setTimeout(() => { island.style.display = 'none'; }, 300);
                }, 2500);
            }
        }

        function openPopupWindow(url, width = 960, height = 720) {
            console.log('Opened popup window:', url, width, height);
            alert('Popup Window Opened:\\nURL: ' + url + '\\nDimensions: ' + width + 'x' + height);
        }

        // Add modal HTML from script
        const modalWrap = document.createElement('div');
        modalWrap.id = 'sfx-tmdb-modal-backdrop';
        modalWrap.className = 'sfx-open';
        modalWrap.innerHTML = \`
            <div class="sfx-tmdb-ambient-bg" id="sfx-tmdb-ambient-bg" style="background-image: url('https://image.tmdb.org/t/p/w1280/m9jV87178u88X3Zk018Y.jpg');"></div>
            <div class="sfx-tmdb-ambient-overlay"></div>
            <div class="sfx-tmdb-scroll-layer" id="sfx-tmdb-scroll-layer">
                <div id="sfx-tmdb-modal-card" role="dialog" aria-modal="true">
                    <div class="sfx-tmdb-header" id="sfx-tmdb-header">
                        <div class="sfx-tmdb-header-left">
                            <button class="sfx-tmdb-header-btn" id="sfx-tmdb-back-btn" style="display: none;">‹</button>
                            <span class="sfx-tmdb-header-title">Lottery Trio</span>
                            <div class="sfx-header-search-capsule" id="sfx-tmdb-search-capsule">
                                <button class="sfx-capsule-btn">G</button>
                                <button class="sfx-capsule-btn">MDL</button>
                            </div>
                        </div>
                        <div class="sfx-tmdb-header-right">
                            <button class="sfx-tmdb-header-btn" id="sfx-tmdb-close">✕</button>
                        </div>
                    </div>
                    
                    <div id="sfx-tmdb-content">
                        <div class="sfx-media-hero">
                            <div class="sfx-media-hero-content">
                                <div class="sfx-media-poster-wrap">
                                    <img class="sfx-media-poster" src="https://image.tmdb.org/t/p/w500/m9jV87178u88X3Zk018Y.jpg" alt="Poster" />
                                </div>
                                <div class="sfx-media-details">
                                    <h1 class="sfx-media-title">Lottery Trio <span class="sfx-media-year">(2008)</span></h1>
                                    <div class="sfx-media-meta-row">
                                        <span class="sfx-media-badge">TV-14</span>
                                        <span>Comedy, Drama</span>
                                        <span>• 3 Episodes</span>
                                    </div>
                                    
                                    <!-- Scores & Hero Actions Row -->
                                    <div class="sfx-media-scores-actions-row">
                                        <div class="sfx-user-score-wrap">
                                            <svg class="sfx-user-score-svg" viewBox="0 0 36 36">
                                                <path class="sfx-user-score-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="100, 100" />
                                                <path class="sfx-user-score-bar" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke-dasharray="78, 100" style="stroke: #21d07a;" />
                                            </svg>
                                            <div class="sfx-user-score-val">78<span class="sfx-score-pct">%</span></div>
                                            <div class="sfx-user-score-lbl">User<br/>Score</div>
                                        </div>

                                        <a class="sfx-hero-score-badge" id="sfx-hero-rt-badge" href="#" target="_blank">
                                            <div class="sfx-hero-score-icon">
                                                <svg viewBox="0 0 32 32" width="28" height="28"><circle cx="16" cy="16" r="14" fill="#fa320a"/></svg>
                                            </div>
                                            <div class="sfx-hero-score-details">
                                                <span class="sfx-hero-score-val" id="sfx-tmdb-rt-score">85%</span>
                                                <span class="sfx-hero-score-subval">Tomatometer</span>
                                            </div>
                                        </a>

                                        <a class="sfx-hero-score-badge" id="sfx-hero-imdb-badge" href="#" target="_blank">
                                            <div class="sfx-hero-score-icon">
                                                <svg viewBox="0 0 512 512" width="30" height="30"><rect width="512" height="512" rx="64" fill="#f5c518"/></svg>
                                            </div>
                                            <div class="sfx-hero-score-details">
                                                <span class="sfx-hero-score-val" id="sfx-tmdb-imdb-score">7.4</span>
                                                <span class="sfx-hero-score-subval">IMDb</span>
                                            </div>
                                        </a>

                                        <!-- Search Actions (Google & MDL) -->
                                        <div class="sfx-hero-search-actions">
                                            <button class="sfx-hero-action-badge" id="sfx-hero-google-btn" type="button" title="Search on Google">
                                                <svg viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
                                            </button>

                                            <div class="sfx-hero-mdl-wrap" id="sfx-hero-mdl-wrap">
                                                <button class="sfx-hero-action-badge" id="sfx-hero-mdl-btn" type="button" title="MyDramaList Options">
                                                    <svg viewBox="0 0 48 48" fill="none" stroke="#3b82f6" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M38.5 5.5h-29a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h29a4 4 0 0 0 4-4v-29a4 4 0 0 0-4-4"/><path fill="none" d="M9.5 29.591V18.396l5.604 11.208l5.604-11.191v11.191m2.382 0V18.396h2.521a4.903 4.903 0 0 1 4.903 4.904v1.4a4.903 4.903 0 0 1-4.903 4.904zm9.806-11.208v11.208H38.5"/></svg>
                                                </button>
                                                <div class="sfx-hero-mdl-menu" id="sfx-hero-mdl-menu" style="display: none;">
                                                    <button class="sfx-hero-mdl-item" id="sfx-hero-mdl-copy" type="button" title="Copy drama link">
                                                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                                        <span>Copy drama link</span>
                                                    </button>
                                                    <button class="sfx-hero-mdl-item" id="sfx-hero-mdl-visit" type="button" title="Visit site in popup">
                                                        <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                                                        <span>Visit site</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Play Trailer Button -->
                                        <button class="sfx-play-trailer-action-btn" id="sfx-play-trailer-btn" type="button" title="Play Trailer">
                                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            <span>Play Trailer</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        \`;
        document.body.appendChild(modalWrap);

        // Wire event handlers
        const googleBtn = document.getElementById('sfx-hero-google-btn');
        googleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPopupWindow('https://www.google.com/search?q=Lottery%20Trio%20TV%20Series', 960, 680);
        });

        const mdlBtn = document.getElementById('sfx-hero-mdl-btn');
        const mdlMenu = document.getElementById('sfx-hero-mdl-menu');
        mdlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mdlMenu.style.display = mdlMenu.style.display === 'flex' ? 'none' : 'flex';
        });

        const mdlCopy = document.getElementById('sfx-hero-mdl-copy');
        mdlCopy.addEventListener('click', (e) => {
            e.stopPropagation();
            mdlMenu.style.display = 'none';
            showProgressIsland('Searching MyDramaList...', 'progress');
            setTimeout(() => {
                showProgressIsland('Copied drama link!', 'success');
            }, 500);
        });

        const mdlVisit = document.getElementById('sfx-hero-mdl-visit');
        mdlVisit.addEventListener('click', (e) => {
            e.stopPropagation();
            mdlMenu.style.display = 'none';
            openPopupWindow('https://mydramalist.com/1829-lottery-trio', 960, 720);
        });

        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('sfx-hero-mdl-wrap');
            if (mdlMenu && mdlMenu.style.display === 'flex') {
                if (!wrap || !wrap.contains(e.target)) {
                    mdlMenu.style.display = 'none';
                }
            }
        });
    </script>
</body>
</html>`;

fs.writeFileSync('scratch/preview_mdl_flow.html', htmlContent, 'utf8');
console.log('Written preview to scratch/preview_mdl_flow.html');
