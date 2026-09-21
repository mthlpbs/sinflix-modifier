// ==UserScript==
// @name         SinFlix Modifier
// @namespace    https://greasyfork.org/en/users/1490967-asurpbs
// @version      26.09.22.1
// @description  Enhances SinFlix pages with Google & MyDramaList search icons, BuzzHeavier ID auto-linking, back-to-top button, inline search, customizable section ordering, and a SinFlix chat button. On BuzzHeavier folder pages: auto-splits episodes by quality (1080p/720p/540p etc.) into separate tables sorted highest-to-lowest. On pst.moe, p.darklab.sh & 0g.gg: clickable links, same-tab opening, and copy-all-links per resolution. On Transfer.it: direct download links, PotPlayer stream integration, and batch copy utilities powered by Dynamic Island. On mega.nz file/folder pages: Dynamic Island pill that opens Fetchrr.io with the link pre-filled. On fetchrr.io: auto-fills the mega link and clicks Parse.
// @license      MIT
// @author       asurpbs
// @match        https://rentry.co/sin-flix
// @match        https://rentry.co/sin-flix/*
// @match        https://rentry.co/sin0flix
// @match        https://rentry.co/sin0flix/*
// @match        https://text.is/Sinflix
// @match        https://pst.moe/paste/*
// @match        https://*.pst.moe/paste/*
// @match        https://p.darklab.sh/*
// @match        https://*.darklab.sh/*
// @match        http://0g.gg/*
// @match        http://*.0g.gg/*
// @match        https://0g.gg/*
// @match        https://*.0g.gg/*
// @match        http://buzzheavier.com/*
// @match        http://*.buzzheavier.com/*
// @match        https://buzzheavier.com/*
// @match        https://*.buzzheavier.com/*
// @match        http://transfer.it/*
// @match        http://*.transfer.it/*
// @match        https://transfer.it/*
// @match        https://*.transfer.it/*
// @match        *://*/*.mhtml*
// @match        file:///*
// @match        https://mega.nz/*
// @match        https://*.mega.nz/*
// @match        https://fetchrr.io/*
// @match        https://*.fetchrr.io/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_openInTab
// @connect      api.themoviedb.org
// @connect      *.themoviedb.org
// @connect      rottentomatoes.com
// @connect      *.rottentomatoes.com
// @connect      algolia.net
// @connect      *.algolia.net
// @connect      v3-cinemeta.strem.io
// @connect      cinemeta-live.strem.io
// @connect      *.strem.io
// @connect      omdbapi.com
// @connect      *.omdbapi.com
// @connect      mydramalist.com
// @connect      *.mydramalist.com
// @connect      *
// @run-at       document-start
// @updateURL https://raw.githubusercontent.com/mthlpbs/sinflix-modifier/refs/heads/main/sinflix-modifier.user.js
// @downloadURL https://raw.githubusercontent.com/mthlpbs/sinflix-modifier/refs/heads/main/sinflix-modifier.user.js
// @copyright    2026, mthlpbs (https://greasyfork.org/en/users/1490967-asurpbs)
// ==/UserScript==

(function() {
    'use strict';

    // Module-level reference to buzzheavier's debounced enhance runner (set in init())
    let bhRunEnhance = null;
    // Module-level reference to transfer.it's debounced enhance runner (set in init())
    let tiRunEnhance = null;

    // TheMovieDB default credentials (empty by default - must be provided by user)
    const DEFAULT_TMDB_READ_TOKEN = '';
    const DEFAULT_TMDB_API_KEY = '';

    function getTmdbCredentials() {
        let readToken = (getSetting('sfx-tmdb-read-token', DEFAULT_TMDB_READ_TOKEN) || '').trim();
        let apiKey = (getSetting('sfx-tmdb-api-key', DEFAULT_TMDB_API_KEY) || '').trim();
        if (readToken.toLowerCase().startsWith('bearer ')) {
            readToken = readToken.slice(7).trim();
        }
        return { readToken, apiKey };
    }

    // Cross-origin request helper using GM_xmlhttpRequest with fetch fallback
    function makeSfxRequest(url, headers = {}, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const reqMethod = (method || 'GET').toUpperCase();
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                const gmOpts = {
                    method: reqMethod,
                    url: url,
                    headers: headers,
                    timeout: 12000,
                    onload: function(response) {
                        if (response.status >= 200 && response.status < 400) {
                            resolve(response.responseText);
                        } else {
                            reject(new Error(`HTTP error: ${response.status}`));
                        }
                    },
                    onerror: function(err) {
                        reject(err);
                    },
                    ontimeout: function() {
                        reject(new Error('Request timed out'));
                    }
                };
                if (data && (reqMethod === 'POST' || reqMethod === 'PUT')) {
                    gmOpts.data = data;
                }
                GM_xmlhttpRequest(gmOpts);
            } else if (typeof fetch !== 'undefined') {
                const fetchOpts = { method: reqMethod, headers: headers };
                if (data && (reqMethod === 'POST' || reqMethod === 'PUT')) {
                    fetchOpts.body = data;
                }
                fetch(url, fetchOpts)
                    .then(res => {
                        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
                        return res.text();
                    })
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error('No request mechanism available'));
            }
        });
    }

    // Inject custom CSS styling
    let css = `

        /* --- Responsive CSS Variables --- */
        :root {
            --sfx-island-full-width: 480px;
            --sfx-island-collapsed-width: 96px;
            --sfx-island-settings-width: 480px;
            --sfx-collapsed-label-max-width: 50px;
            --sfx-collapsed-label-opacity: 1;
            --sfx-collapsed-padding: 0 10px;
            --sfx-collapsed-justify: flex-start;
        }

        @media (max-width: 768px) {
            :root {
                --sfx-island-full-width: 380px;
                --sfx-island-collapsed-width: 88px;
                --sfx-island-settings-width: 380px;
                --sfx-collapsed-label-max-width: 40px;
                --sfx-collapsed-label-opacity: 1;
                --sfx-collapsed-padding: 0 10px;
                --sfx-collapsed-justify: flex-start;
            }
        }

        @media (max-width: 480px) {
            :root {
                --sfx-island-full-width: calc(100vw - 32px);
                --sfx-island-collapsed-width: 36px;
                --sfx-island-settings-width: calc(100vw - 32px);
                --sfx-collapsed-label-max-width: 0px;
                --sfx-collapsed-label-opacity: 0;
                --sfx-collapsed-padding: 0;
                --sfx-collapsed-justify: center;
            }
            #sfx-island-wrap.sfx-collapsed #sfx-island-label {
                display: none !important;
            }
        }

        /* --- iOS 27 Dynamic Island Capsule --- */
        #sfx-island-wrap {
            position: fixed;
            top: 14px;
            left: 50%;
            transform: translateX(-50%) translateZ(0);
            z-index: 10000;

            /* Sizing & Shape */
            width: min(var(--sfx-island-full-width), calc(100vw - 32px));
            height: 44px;
            border-radius: 22px;
            padding: 0 16px;

            /* Style */
            background: rgba(15, 15, 20, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);

            /* Layout */
            display: flex;
            align-items: center;
            box-sizing: border-box;
            overflow: hidden;
            cursor: pointer;
            user-select: none;

            /* Performance & Animation */
            will-change: transform, width, height, border-radius, padding;
            transition:
                width 0.45s cubic-bezier(0.25, 1, 0.4, 1),
                height 0.45s cubic-bezier(0.25, 1, 0.4, 1),
                border-radius 0.45s cubic-bezier(0.25, 1, 0.4, 1),
                padding 0.45s cubic-bezier(0.25, 1, 0.4, 1),
                background 0.3s ease,
                box-shadow 0.3s ease;
        }

        /* Views */
        #sfx-island-default-view {
            display: flex;
            align-items: center;
            width: 100%;
            height: 100%;
            gap: 10px;
            box-sizing: border-box;
        }

        #sfx-island-wrap.sfx-collapsed #sfx-island-default-view {
            gap: 5px;
            justify-content: var(--sfx-collapsed-justify);
        }

        #sfx-island-settings-view {
            display: none;
            flex-direction: column;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }

        /* Settings Open State */
        #sfx-island-wrap.sfx-settings-open {
            width: min(var(--sfx-island-settings-width), calc(100vw - 32px));
            height: min(480px, calc(100vh - 100px));
            border-radius: 24px;
            padding: 12px 16px;
            align-items: flex-start;
        }

        #sfx-island-wrap.sfx-settings-open #sfx-island-default-view {
            display: none;
        }

        #sfx-island-wrap.sfx-settings-open #sfx-island-settings-view {
            display: flex;
        }

        /* Collapsed State */
        #sfx-island-wrap.sfx-collapsed {
            width: var(--sfx-island-collapsed-width);
            height: 30px;
            border-radius: 15px;
            background: rgba(15, 15, 20, 0.72);
            border-color: rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
            padding: var(--sfx-collapsed-padding);
        }

        /* Progress/Status Mode State */
        #sfx-island-wrap.sfx-progress-mode {
            z-index: 30000 !important;
            width: auto !important;
            max-width: 90% !important;
            height: 34px !important;
            border-radius: 17px !important;
            padding: 0 16px !important;
            background: rgba(15, 15, 20, 0.85) !important;
            border-color: rgba(255, 255, 255, 0.12) !important;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
        }

        #sfx-island-wrap.sfx-progress-mode #sfx-island-label {
            display: inline !important;
            max-width: none !important;
            opacity: 1 !important;
            color: #ffffff !important;
        }

        #sfx-island-wrap.sfx-progress-mode #sfx-island-input,
        #sfx-island-wrap.sfx-progress-mode #sfx-island-search-clear,
        #sfx-island-wrap.sfx-progress-mode #sfx-island-count,
        #sfx-island-wrap.sfx-progress-mode .sfx-island-nav,
        #sfx-island-wrap.sfx-progress-mode .sfx-island-divider,
        #sfx-island-wrap.sfx-progress-mode .sfx-island-action {
            display: none !important;
        }

        /* Icons & Inner Elements */
        #sfx-island-search-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            color: rgba(255, 255, 255, 0.6);
            flex-shrink: 0;
            transition: color 0.3s ease;
        }

        #sfx-island-wrap:hover #sfx-island-search-icon {
            color: #ffffff;
        }

        #sfx-island-search-icon svg {
            width: 100%;
            height: 100%;
            fill: currentColor;
        }

        #sfx-island-label {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.6);
            white-space: nowrap;
            max-width: 0;
            opacity: 0;
            display: none;
            transition: opacity 0.25s ease, max-width 0.25s ease;
        }

        #sfx-island-wrap.sfx-collapsed #sfx-island-label {
            display: inline;
            max-width: var(--sfx-collapsed-label-max-width);
            opacity: var(--sfx-collapsed-label-opacity);
        }

        /* Input Box */
        #sfx-island-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 14px;
            padding: 0;
            margin: 0;
            min-width: 0;
            opacity: 1;
            pointer-events: auto;
            transition: opacity 0.25s ease;
        }

        #sfx-island-input::placeholder {
            color: rgba(255, 255, 255, 0.35);
        }

        #sfx-island-wrap.sfx-collapsed #sfx-island-input {
            display: none !important;
        }

        /* Match Counter */
        #sfx-island-count {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", monospace;
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.4);
            white-space: nowrap;
            flex-shrink: 0;
            transition: opacity 0.25s ease;
        }

        #sfx-island-wrap.sfx-collapsed #sfx-island-count {
            display: none !important;
        }

        /* Prev / Next Nav Buttons */
        .sfx-island-nav {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            padding: 0;
            margin: 0;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.5);
            flex-shrink: 0;
            transition: background 0.2s, color 0.2s, opacity 0.25s;
        }

        .sfx-island-nav:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }

        .sfx-island-nav:disabled {
            opacity: 0.15;
            cursor: not-allowed;
        }

        #sfx-island-wrap.sfx-collapsed .sfx-island-nav {
            display: none !important;
        }

        .sfx-island-nav svg {
            width: 14px;
            height: 14px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* Divider Line */
        .sfx-island-divider {
            width: 1px;
            height: 18px;
            background: rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
            transition: opacity 0.25s;
        }

        #sfx-island-wrap.sfx-collapsed .sfx-island-divider {
            display: none !important;
        }

        /* Action Buttons */
        .sfx-island-action {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            padding: 0;
            margin: 0;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.55);
            flex-shrink: 0;
            transition: background 0.2s, color 0.2s, opacity 0.25s;
        }

        .sfx-island-action:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }

        #sfx-island-wrap.sfx-collapsed .sfx-island-action {
            display: none !important;
        }

        .sfx-island-action svg {
            width: 15px;
            height: 15px;
            fill: currentColor;
        }

        /* Highlights */
        .sfx-search-highlight {
            background-color: rgba(255, 235, 59, 0.6) !important;
            color: #000000 !important;
            border-radius: 2px;
            padding: 1px 0;
            font-weight: 500;
        }

        .sfx-search-highlight.sfx-current-match {
            background-color: rgba(0, 230, 118, 0.9) !important;
            color: #000000 !important;
            box-shadow: 0 0 6px rgba(0, 230, 118, 0.8);
        }

        /* --- Back to Top Floating Button --- */
        #sfx-back-to-top {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(15, 15, 20, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);

            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.65);
            cursor: pointer;
            z-index: 9999;

            /* Animation states */
            opacity: 0;
            transform: translateY(15px) translateZ(0);
            pointer-events: none;
            will-change: opacity, transform;
            transition:
                opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1),
                transform 0.3s cubic-bezier(0.25, 1, 0.5, 1),
                background-color 0.2s,
                color 0.2s;
        }

        #sfx-back-to-top.sfx-show {
            opacity: 1;
            transform: translateY(0) translateZ(0);
            pointer-events: auto;
        }

        #sfx-back-to-top:hover {
            background-color: rgba(15, 15, 20, 0.9);
            color: #ffffff;
        }

        #sfx-back-to-top svg {
            width: 16px;
            height: 16px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        /* --- Settings Panel Styles --- */
        .sfx-settings-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13.5px;
            font-weight: 600;
            color: #ffffff;
            height: 26px;
            box-sizing: border-box;
        }

        .sfx-settings-divider {
            height: 0.5px;
            background: rgba(255, 255, 255, 0.12);
            margin: 4px 0 2px 0;
            width: 100%;
        }

        .sfx-switch-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 24px;
            box-sizing: border-box;
            padding: 0 4px;
        }

        .sfx-switch-label {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13px;
            color: rgba(255, 255, 255, 0.85);
        }

        .sfx-switch {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 20px;
            flex-shrink: 0;
            margin: 0;
        }

        .sfx-switch input {
            opacity: 0;
            width: 0;
            height: 0;
            margin: 0;
        }

        .sfx-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.16);
            border-radius: 20px;
            transition: background-color 0.2s ease;
        }

        .sfx-slider::before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: #ffffff;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1);
            will-change: transform;
        }

        .sfx-switch input:checked + .sfx-slider {
            background-color: #30d158;
        }

        .sfx-switch input:checked + .sfx-slider::before {
            transform: translateX(14px);
        }

        #sfx-island-search-clear {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            padding: 0;
            margin: 0 6px 0 2px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.45);
            flex-shrink: 0;
            transition: color 0.2s, background 0.2s, opacity 0.25s;
        }

        #sfx-island-search-clear:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.15);
        }

        #sfx-island-search-clear svg {
            width: 10px;
            height: 10px;
            fill: currentColor;
        }

        #sfx-island-wrap.sfx-collapsed #sfx-island-search-clear {
            display: none !important;
        }

        .sfx-settings-scroll-container {
            width: 100%;
            height: calc(100% - 32px);
            overflow-y: auto;
            overscroll-behavior: contain;
            display: flex;
            flex-direction: column;
            gap: 12px;
            padding: 4px 6px 12px 0;
            box-sizing: border-box;
        }

        .sfx-settings-scroll-container::-webkit-scrollbar {
            width: 4px;
        }
        .sfx-settings-scroll-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-settings-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.16);
            border-radius: 2px;
        }
        .sfx-settings-scroll-container::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .sfx-settings-section-title {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 10.5px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin: 10px 4px 2px 4px;
            user-select: none;
        }

        .sfx-settings-section-title:first-child {
            margin-top: 2px;
        }

        .sfx-settings-group {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 2px 0;
            display: flex;
            flex-direction: column;
            width: 100%;
            box-sizing: border-box;
        }

        .sfx-settings-row-divider {
            height: 0.5px;
            background: rgba(255, 255, 255, 0.08);
            margin: 0 12px;
        }

        .sfx-switch-row, .sfx-settings-select-row, .sfx-settings-input-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            height: 38px;
            box-sizing: border-box;
            padding: 0 12px;
            gap: 10px;
        }

        .sfx-switch-label, .sfx-select-label, .sfx-input-label {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.9);
        }

        .sfx-settings-select-row select, .sfx-settings-input-row input {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            color: #ffffff;
            padding: 4px 8px;
            font-size: 12px;
            width: 138px;
            height: 26px;
            box-sizing: border-box;
            outline: none;
            font-family: inherit;
            transition: border-color 0.2s, background-color 0.2s;
        }

        .sfx-settings-select-row select {
            cursor: pointer;
        }

        .sfx-settings-select-row select option {
            background: #15151a;
            color: #ffffff;
        }

        .sfx-settings-select-row select:focus, .sfx-settings-input-row input:focus {
            border-color: #30d158;
            background: rgba(255, 255, 255, 0.12);
        }

        .sfx-settings-input-row.sfx-input-wide input {
            width: 200px;
            text-overflow: ellipsis;
        }

        .sfx-settings-guide-card {
            padding: 9px 12px 10px 12px;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.02);
            border-bottom-left-radius: 11px;
            border-bottom-right-radius: 11px;
        }

        .sfx-settings-guide-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.75);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .sfx-settings-guide-title svg {
            color: #30d158;
            flex-shrink: 0;
        }

        .sfx-settings-guide-list {
            margin: 0;
            padding-left: 18px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 11.5px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.65);
        }

        .sfx-settings-guide-list li {
            margin-bottom: 4px;
        }

        .sfx-settings-guide-list li:last-child {
            margin-bottom: 0;
        }

        .sfx-settings-guide-list a {
            color: #30d158;
            text-decoration: underline;
            text-underline-offset: 2px;
            transition: color 0.15s;
        }

        .sfx-settings-guide-list a:hover {
            color: #4ade80;
            text-decoration: underline;
        }

        .sfx-settings-guide-list b {
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
        }

        .sfx-settings-btn-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 7px 12px;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.015);
        }

        .sfx-settings-save-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 5px 14px;
            background: rgba(48, 209, 88, 0.15);
            color: #30d158;
            border: 1px solid rgba(48, 209, 88, 0.35);
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .sfx-settings-save-btn:hover {
            background: #30d158;
            color: #0b2210;
            border-color: #30d158;
            box-shadow: 0 2px 10px rgba(48, 209, 88, 0.35);
        }

        .sfx-settings-save-btn.sfx-saved {
            background: #30d158 !important;
            color: #0b2210 !important;
            border-color: #30d158 !important;
        }

        /* --- Drama Title interactive element --- */
        .sfx-drama-title {
            cursor: pointer;
            color: #ffffff;
            border-bottom: 1px dashed rgba(255, 255, 255, 0.35);
            transition: color 0.2s, border-bottom-color 0.2s, text-shadow 0.2s;
        }
        .sfx-drama-title:hover {
            color: #30d158;
            border-bottom-color: #30d158;
            text-shadow: 0 0 8px rgba(48, 209, 88, 0.4);
        }

        /* --- Minimal Single Popover Menu --- */
        #sfx-popover-menu {
            position: absolute;
            z-index: 10001;
            display: none;
            flex-direction: column;
            width: 224px;
            background: rgba(18, 18, 24, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 13px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(24px) saturate(190%);
            -webkit-backdrop-filter: blur(24px) saturate(190%);
            padding: 7px 9px;
            box-sizing: border-box;
            opacity: 0;
            transform: scale(0.95);
            transform-origin: top center;
            transition: opacity 0.15s ease, transform 0.15s ease;
        }
        #sfx-popover-menu.sfx-show {
            display: flex;
            opacity: 1;
            transform: scale(1);
        }
        .sfx-popover-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            min-height: 22px;
        }
        .sfx-popover-title {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 11.5px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.95);
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            padding-left: 2px;
        }
        .sfx-popover-copy-btn {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            border-radius: 5px;
            color: rgba(255, 255, 255, 0.65);
            flex-shrink: 0;
            padding: 0;
            transition: background 0.18s, color 0.18s, transform 0.15s;
        }
        .sfx-popover-copy-btn:hover {
            background: rgba(255, 255, 255, 0.12) !important;
            color: #ffffff;
        }
        .sfx-popover-copy-btn:active {
            transform: scale(0.92);
        }
        .sfx-popover-copy-btn svg {
            width: 13px;
            height: 13px;
            fill: currentColor;
            flex-shrink: 0;
        }
        .sfx-popover-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.09);
            margin: 5px 0 6px 0;
        }
        .sfx-popover-search-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 1px 2px;
        }
        .sfx-popover-search-label {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 11.5px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.55);
            white-space: nowrap;
        }
        .sfx-popover-icons {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .sfx-popover-icon-btn {
            background: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            border-radius: 7px;
            padding: 0;
            transition: background 0.18s, border-color 0.18s, transform 0.15s, box-shadow 0.18s;
        }
        .sfx-popover-icon-btn:hover {
            background: rgba(255, 255, 255, 0.14) !important;
            border-color: rgba(255, 255, 255, 0.25) !important;
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35) !important;
        }
        .sfx-popover-icon-btn:active {
            transform: scale(0.94);
        }
        .sfx-popover-icon-btn svg {
            width: 15px;
            height: 15px;
            flex-shrink: 0;
        }

        /* --- TheMovieDB Apple TV / Apple Music Glassmorphism Modal --- */
        #sfx-tmdb-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 20000;
            display: block;
            background: #08080c;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1);
            box-sizing: border-box;
            padding: 0;
            margin: 0;
            overflow: hidden;
        }
        #sfx-tmdb-modal-backdrop.sfx-open {
            opacity: 1;
            pointer-events: auto;
        }
        #sfx-tmdb-modal-backdrop.sfx-closing {
            opacity: 0;
            pointer-events: none;
        }

        .sfx-tmdb-ambient-bg {
            position: absolute;
            top: -6%;
            left: -6%;
            width: 112%;
            height: 112%;
            background-size: cover;
            background-position: center 25%;
            filter: blur(55px) saturate(180%) brightness(0.32);
            transform: scale(1.08);
            pointer-events: none;
            z-index: 1;
            opacity: 0;
            transition: opacity 0.45s ease, background-image 0.45s ease;
        }
        .sfx-tmdb-ambient-bg.sfx-active {
            opacity: 0.85;
        }
        .sfx-tmdb-ambient-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 28%, rgba(10, 10, 16, 0.25) 0%, rgba(6, 6, 9, 0.92) 100%);
            pointer-events: none;
            z-index: 2;
        }
        /* In TV and Movie view, the backdrop only belongs inside .sfx-media-hero-card. Disable ambient background bleed. */
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode) .sfx-tmdb-ambient-bg,
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode) .sfx-tmdb-ambient-overlay {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
        }

        /* Dedicated Scroll Layer for fullscreen content */
        .sfx-tmdb-scroll-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            z-index: 10;
        }
        .sfx-tmdb-scroll-layer::-webkit-scrollbar {
            width: 8px;
        }
        .sfx-tmdb-scroll-layer::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-tmdb-scroll-layer::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }
        .sfx-tmdb-scroll-layer::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.35);
        }

        /* Fullscreen Container: No window borders, no boxed card */
        #sfx-tmdb-modal-card {
            position: relative;
            z-index: 10;
            background: transparent;
            border: none;
            box-shadow: none;
            border-radius: 0;
            width: 100%;
            min-height: 100%;
            display: flex;
            flex-direction: column;
            overflow: visible;
            box-sizing: border-box;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
            transform: none;
            opacity: 0;
            filter: none;
            transition: opacity 0.28s ease;
            user-select: text;
            flex-shrink: 0;
        }
        #sfx-tmdb-modal-backdrop.sfx-open #sfx-tmdb-modal-card {
            transform: none;
            opacity: 1;
            filter: none;
        }
        #sfx-tmdb-modal-backdrop.sfx-closing #sfx-tmdb-modal-card {
            transform: none;
            opacity: 0;
            filter: none;
        }

        /* Fullscreen Sticky Top Header */
        .sfx-tmdb-header {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 40px;
            gap: 16px;
            flex-shrink: 0;
            background: rgba(12, 12, 20, 0.82);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            border-radius: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            box-sizing: border-box;
            width: 100%;
        }
        .sfx-tmdb-title-group {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
            flex: 1;
        }
        .sfx-tmdb-title {
            margin: 0;
            font-size: 19px;
            font-weight: 700;
            letter-spacing: -0.2px;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: baseline;
            gap: 8px;
        }
        .sfx-tmdb-year {
            font-size: 15px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.55);
            flex-shrink: 0;
        }
        .sfx-tmdb-back-btn {
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.22);
            outline: none;
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            flex-shrink: 0;
            padding: 0;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .sfx-tmdb-back-btn:hover {
            background: rgba(255, 255, 255, 0.22);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.4);
            transform: scale(1.06);
        }
        .sfx-tmdb-back-btn:active {
            transform: scale(0.94);
        }
        .sfx-tmdb-back-btn svg {
            width: 17px;
            height: 17px;
            fill: currentColor;
        }
        .sfx-header-person-thumb {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            border: 1.5px solid rgba(255, 255, 255, 0.25);
            flex-shrink: 0;
            opacity: 0;
            max-width: 0;
            margin-right: 0;
            transform: scale(0.75);
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s ease, margin-right 0.25s ease;
            background: rgba(255, 255, 255, 0.08);
            pointer-events: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .sfx-header-person-thumb img {
            width: 32px;
            height: 32px;
            object-fit: cover;
            display: block;
            border-radius: 50%;
        }

        /* Actor & Media View Sticky Header Transitions */
        #sfx-tmdb-modal-backdrop.sfx-actor-mode #sfx-tmdb-copy-btn,
        #sfx-tmdb-modal-backdrop.sfx-actor-mode .sfx-header-search-capsule,
        #sfx-tmdb-modal-backdrop.sfx-actor-mode .sfx-tmdb-search-icons {
            display: none !important;
        }
        /* Hide search icons and copy button while loading details */
        #sfx-tmdb-modal-backdrop.sfx-loading #sfx-tmdb-copy-btn,
        #sfx-tmdb-modal-backdrop.sfx-loading .sfx-header-search-capsule,
        #sfx-tmdb-modal-backdrop.sfx-loading .sfx-tmdb-search-icons {
            display: none !important;
        }
        #sfx-tmdb-modal-backdrop.sfx-actor-mode .sfx-header-media-thumb {
            display: none !important;
        }
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode) .sfx-header-person-thumb {
            display: none !important;
        }

        /* Title in header initially hidden in both actor and media views */
        #sfx-tmdb-modal-backdrop .sfx-tmdb-title {
            opacity: 0;
            transform: translateY(6px);
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
        }
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode) #sfx-tmdb-copy-btn {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.22s ease;
        }

        /* Scrolled state: Actor mode */
        #sfx-tmdb-modal-backdrop.sfx-actor-mode.sfx-header-scrolled .sfx-header-person-thumb {
            opacity: 1;
            max-width: 32px;
            margin-right: 6px;
            transform: scale(1);
            pointer-events: auto;
        }
        #sfx-tmdb-modal-backdrop.sfx-actor-mode.sfx-header-scrolled .sfx-tmdb-title {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        /* Scrolled state: Media mode */
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode).sfx-header-scrolled .sfx-header-media-thumb {
            opacity: 1;
            max-width: 28px;
            margin-right: 8px;
            transform: scale(1);
            pointer-events: auto;
        }
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode).sfx-header-scrolled .sfx-tmdb-title {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }
        #sfx-tmdb-modal-backdrop:not(.sfx-actor-mode).sfx-header-scrolled #sfx-tmdb-copy-btn {
            opacity: 1;
            pointer-events: auto;
        }

        .sfx-header-media-thumb {
            width: 28px;
            height: 40px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.25);
            flex-shrink: 0;
            opacity: 0;
            max-width: 0;
            margin-right: 0;
            transform: scale(0.75);
            transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.25s ease, margin-right 0.25s ease;
            background: rgba(255, 255, 255, 0.08);
            pointer-events: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .sfx-header-media-thumb img {
            width: 28px;
            height: 40px;
            object-fit: cover;
            display: block;
            border-radius: 4px;
        }

        #sfx-tmdb-search-capsule {
            display: none !important;
        }
        .sfx-header-search-capsule {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 20px;
            padding: 3px 8px;
            box-sizing: border-box;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
        .sfx-header-search-capsule .sfx-popover-icon-btn {
            width: 24px !important;
            height: 24px !important;
            border-radius: 50% !important;
            border: none !important;
            background: transparent !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer;
            transition: transform 0.18s ease, background 0.18s ease;
            padding: 0 !important;
        }
        .sfx-header-search-capsule .sfx-popover-icon-btn:hover {
            transform: scale(1.1);
            background: rgba(255, 255, 255, 0.16) !important;
        }

        .sfx-tmdb-copy-btn {
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.1);
            outline: none;
            cursor: pointer;
            width: 26px;
            height: 26px;
            border-radius: 7px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.7);
            flex-shrink: 0;
            padding: 0;
            transition: all 0.18s ease;
        }
        .sfx-tmdb-copy-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.25);
            transform: scale(1.05);
        }
        .sfx-tmdb-copy-btn:active {
            transform: scale(0.92);
        }
        .sfx-tmdb-copy-btn svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }

        .sfx-tmdb-header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }
        .sfx-tmdb-search-icons {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .sfx-tmdb-search-icons .sfx-popover-icon-btn {
            width: 26px !important;
            height: 26px !important;
        }
        .sfx-tmdb-close-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            cursor: pointer;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.8);
            padding: 0;
            transition: all 0.18s ease;
        }
        .sfx-tmdb-close-btn:hover {
            background: rgba(255, 255, 255, 0.22);
            color: #ffffff;
            transform: scale(1.08);
        }
        .sfx-tmdb-close-btn:active {
            transform: scale(0.92);
        }
        .sfx-tmdb-close-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        .sfx-tmdb-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
            width: 100%;
            flex-shrink: 0;
        }

        .sfx-tmdb-scroll-body {
            overflow: visible;
            width: 100%;
            max-width: 1160px;
            margin: 0 auto;
            padding: 30px 40px 140px 40px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            box-sizing: border-box;
        }

        /* Upgraded Premium Loading Skeleton UI/UX */
        .sfx-tmdb-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            padding: 0 0 40px 0;
            box-sizing: border-box;
            animation: sfxFadeIn 0.3s ease-out;
        }
        .sfx-skeleton-hero-card {
            position: relative;
            width: 100%;
            background: rgba(20, 20, 26, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            display: flex;
            padding: 32px 36px;
            gap: 32px;
            box-sizing: border-box;
            overflow: hidden;
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45);
        }
        .sfx-skeleton-poster {
            position: relative;
            width: 220px;
            height: 330px;
            min-width: 220px;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .sfx-skeleton-poster-icon {
            opacity: 0.25;
            transition: opacity 0.3s ease;
        }
        .sfx-skeleton-shimmer {
            position: absolute;
            top: 0;
            left: -100%;
            width: 250%;
            height: 100%;
            background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255, 255, 255, 0.03) 30%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0.03) 70%,
                transparent 100%
            );
            animation: sfxShimmerSweep 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: none;
        }
        @keyframes sfxShimmerSweep {
            0% { transform: translateX(0%); }
            100% { transform: translateX(100%); }
        }
        .sfx-skeleton-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-width: 0;
        }
        .sfx-skeleton-title-bar {
            position: relative;
            height: 34px;
            width: 55%;
            min-width: 180px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 8px;
            overflow: hidden;
        }
        .sfx-skeleton-meta-bar {
            position: relative;
            height: 16px;
            width: 38%;
            min-width: 140px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 6px;
            overflow: hidden;
        }
        .sfx-skeleton-scores-row {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 4px;
        }
        .sfx-skeleton-score-circle {
            position: relative;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.08);
            overflow: hidden;
            flex-shrink: 0;
        }
        .sfx-skeleton-score-pill {
            position: relative;
            width: 82px;
            height: 34px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.04);
            overflow: hidden;
            flex-shrink: 0;
        }
        .sfx-skeleton-trailer-pill {
            position: relative;
            width: 120px;
            height: 38px;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.06);
            overflow: hidden;
            flex-shrink: 0;
        }
        .sfx-skeleton-desc-lines {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 8px;
        }
        .sfx-skeleton-desc-line {
            position: relative;
            height: 14px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 6px;
            overflow: hidden;
        }
        .sfx-skeleton-desc-line.full { width: 92%; }
        .sfx-skeleton-desc-line.three-quarters { width: 78%; }
        .sfx-skeleton-desc-line.half { width: 55%; }

        .sfx-skeleton-status-row {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-top: auto;
            padding-top: 14px;
            color: rgba(255, 255, 255, 0.75);
            font-size: 13px;
            font-weight: 500;
            letter-spacing: 0.2px;
        }
        .sfx-loading-pulse-ring {
            position: relative;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .sfx-loading-pulse-ring::before {
            content: '';
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(48, 209, 88, 0.35);
            animation: sfxPulseCore 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .sfx-loading-pulse-core {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #30d158;
            box-shadow: 0 0 8px rgba(48, 209, 88, 0.7);
        }
        @keyframes sfxPulseCore {
            0% { transform: scale(0.8); opacity: 0.8; }
            70% { transform: scale(2.2); opacity: 0; }
            100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes sfxFadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .sfx-skeleton-hero-card {
                flex-direction: column;
                align-items: center;
                padding: 20px;
                gap: 20px;
            }
            .sfx-skeleton-poster {
                width: 160px;
                height: 240px;
                min-width: 160px;
            }
            .sfx-skeleton-body {
                align-items: center;
                width: 100%;
            }
            .sfx-skeleton-title-bar { width: 80%; }
            .sfx-skeleton-meta-bar { width: 60%; }
            .sfx-skeleton-scores-row { justify-content: center; }
            .sfx-skeleton-desc-lines { width: 100%; align-items: center; }
            .sfx-skeleton-desc-line.full { width: 100%; }
            .sfx-skeleton-desc-line.three-quarters { width: 85%; }
            .sfx-skeleton-desc-line.half { width: 65%; }
        }

        /* Content Area & Sections (Vertical Stack) */
        .sfx-tmdb-content {
            display: flex;
            flex-direction: column;
            gap: 18px;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }
        .sfx-tmdb-section {
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }

        /* Media Hero Backdrop Card */
        .sfx-media-hero-card {
            position: relative;
            width: 100%;
            border-radius: 18px;
            overflow: hidden;
            background-color: #0e0f14;
            background-clip: padding-box;
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65);
            display: flex;
            box-sizing: border-box;
            transition: opacity 0.28s ease, transform 0.28s ease;
        }
        .sfx-media-hero-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 4px;
            background-size: cover;
            background-position: center top;
            background-repeat: no-repeat;
            pointer-events: none;
            z-index: 0;
        }
        #sfx-tmdb-modal-backdrop.sfx-header-scrolled:not(.sfx-actor-mode) .sfx-media-hero-card {
            opacity: 0.18;
            transform: translateY(-8px);
        }
        .sfx-media-hero-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(14, 15, 20, 0.98) 0%, rgba(14, 15, 20, 0.88) 42%, rgba(14, 15, 20, 0.62) 100%),
                        linear-gradient(0deg, #0e0f14 0%, rgba(14, 15, 20, 0.98) 28px, transparent 65%);
            pointer-events: none;
            z-index: 1;
        }
        .sfx-media-hero-body {
            position: relative;
            z-index: 2;
            display: flex;
            gap: 32px;
            padding: 32px;
            width: 100%;
            box-sizing: border-box;
        }
        .sfx-media-poster-wrap {
            flex-shrink: 0;
            width: 220px;
            height: 330px;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75);
            background: rgba(255, 255, 255, 0.04);
        }
        .sfx-media-poster-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .sfx-media-details {
            display: flex;
            flex-direction: column;
            gap: 12px;
            min-width: 0;
            flex: 1;
            color: #ffffff;
        }
        .sfx-media-title-row {
            display: flex;
            align-items: baseline;
            gap: 8px;
            flex-wrap: wrap;
        }
        .sfx-media-main-title {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.15;
            margin: 0;
            letter-spacing: -0.4px;
        }
        .sfx-media-release-year {
            font-size: 26px;
            font-weight: 400;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: -0.2px;
        }
        .sfx-media-meta-line {
            font-size: 13.5px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.72);
            line-height: 1.4;
        }
        .sfx-meta-bullet {
            margin: 0 7px;
            opacity: 0.55;
            user-select: none;
        }
        .sfx-media-scores-actions-row {
            display: flex;
            align-items: center;
            gap: 22px;
            flex-wrap: wrap;
            padding: 4px 0;
        }

        /* User Score Circular Progress */
        .sfx-user-score-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
            text-decoration: none !important;
            color: #ffffff !important;
            transition: transform 0.18s ease;
        }
        .sfx-user-score-wrap:hover {
            transform: scale(1.05);
        }
        .sfx-user-score-circle {
            position: relative;
            width: 48px;
            height: 48px;
            background: #081c22;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            flex-shrink: 0;
        }
        .sfx-user-score-svg {
            width: 44px;
            height: 44px;
            transform: rotate(-90deg);
        }
        .sfx-circle-bg {
            fill: none;
            stroke: #204529;
            stroke-width: 3.2;
        }
        .sfx-circle-bar {
            fill: none;
            stroke: #21d07a;
            stroke-width: 3.2;
            stroke-linecap: round;
            transition: stroke-dasharray 0.6s ease;
        }
        .sfx-user-score-val {
            position: absolute;
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            display: flex;
            align-items: baseline;
        }
        .sfx-user-score-val .sfx-score-pct {
            font-size: 8px;
            font-weight: 600;
            margin-left: 1px;
            opacity: 0.8;
        }
        .sfx-user-score-lbl {
            font-size: 12px;
            font-weight: 700;
            line-height: 1.15;
            color: #ffffff;
            letter-spacing: 0.2px;
        }

        /* Borderless Rotten Tomatoes & IMDb Badges */
        .sfx-hero-score-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none !important;
            color: #ffffff !important;
            background: transparent !important;
            border: none !important;
            padding: 4px 6px;
            border-radius: 8px;
            transition: transform 0.18s ease, opacity 0.18s ease;
            cursor: pointer;
        }
        .sfx-hero-score-badge:hover {
            transform: translateY(-2px);
            opacity: 0.9;
        }
        .sfx-hero-score-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .sfx-hero-score-icon svg {
            width: 28px;
            height: 28px;
            display: block;
        }
        .sfx-hero-score-details {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
        }
        .sfx-hero-score-val {
            font-size: 15.5px;
            font-weight: 700;
            color: #ffffff;
        }
        .sfx-hero-score-subval {
            font-size: 11px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.65);
            margin-top: 2px;
        }

        /* Search Action Badges (Google & MDL in Rating Section) */
        .sfx-hero-search-actions {
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        .sfx-hero-action-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #ffffff;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            outline: none;
            padding: 0;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
            flex-shrink: 0;
        }
        .sfx-hero-action-badge:hover {
            background: rgba(255, 255, 255, 0.16);
            border-color: rgba(255, 255, 255, 0.35);
            transform: translateY(-2px) scale(1.06);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        .sfx-hero-action-badge:active {
            transform: scale(0.95);
        }
        .sfx-hero-action-badge svg {
            width: 19px;
            height: 19px;
            display: block;
        }
        .sfx-hero-mdl-wrap {
            position: relative;
            display: inline-flex;
        }
        .sfx-hero-mdl-menu {
            position: absolute;
            top: calc(100% + 8px);
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 22, 30, 0.96);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 14px;
            padding: 6px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            z-index: 1000;
            min-width: 175px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            animation: sfxFadeInMenu 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes sfxFadeInMenu {
            from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .sfx-hero-mdl-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 9px 12px;
            background: transparent;
            border: none;
            border-radius: 10px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s ease;
            text-align: left;
            white-space: nowrap;
            width: 100%;
            outline: none;
            box-sizing: border-box;
        }
        .sfx-hero-mdl-item:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #ffffff;
        }
        .sfx-hero-mdl-item:active {
            background: rgba(255, 255, 255, 0.18);
        }
        .sfx-hero-mdl-item svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
            opacity: 0.85;
            flex-shrink: 0;
        }

        /* Play Trailer Action Button */
        .sfx-play-trailer-action-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.22);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #ffffff;
            font-size: 13.5px;
            font-weight: 700;
            padding: 9px 18px;
            border-radius: 24px;
            cursor: pointer;
            transition: all 0.2s ease;
            outline: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
        .sfx-play-trailer-action-btn:hover {
            background: #e50914;
            border-color: #e50914;
            transform: scale(1.05);
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.45);
        }
        .sfx-play-trailer-action-btn:active {
            transform: scale(0.96);
        }
        .sfx-play-trailer-action-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }

        /* Tagline */
        .sfx-media-tagline {
            font-size: 14px;
            font-style: italic;
            color: rgba(255, 255, 255, 0.65);
            line-height: 1.35;
        }

        /* Overview */
        .sfx-media-overview-wrap {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .sfx-media-overview-heading {
            font-size: 15px;
            font-weight: 700;
            color: #ffffff;
            margin: 0;
        }
        .sfx-media-overview-text {
            font-size: 13.5px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.82);
            margin: 0;
            max-width: 820px;
        }
        .sfx-media-more-btn {
            background: none;
            border: none;
            color: #388bfd;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            padding: 0 0 0 5px;
            text-transform: uppercase;
            outline: none;
            display: inline;
            vertical-align: baseline;
            transition: color 0.18s;
        }
        .sfx-media-more-btn:hover {
            color: #58a6ff;
            text-decoration: underline;
        }

        /* Crew / Creator line */
        .sfx-media-crew {
            display: flex;
            align-items: center;
            gap: 28px;
            flex-wrap: wrap;
            margin-top: 4px;
        }
        .sfx-crew-member {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .sfx-crew-name {
            font-size: 13.5px;
            font-weight: 700;
            color: #ffffff;
        }
        .sfx-crew-job {
            font-size: 11.5px;
            color: rgba(255, 255, 255, 0.55);
        }

        /* Section Title & Headers */
        .sfx-tmdb-section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            flex-wrap: wrap;
            gap: 8px;
        }
        .sfx-tmdb-section-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: rgba(255, 255, 255, 0.45);
        }

        /* Cast Section - Circular Avatars */
        .sfx-tmdb-cast-scroll-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 2px 10px 2px;
            box-sizing: border-box;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
        }
        .sfx-tmdb-cast-scroll-container::-webkit-scrollbar {
            height: 5px;
        }
        .sfx-tmdb-cast-scroll-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-tmdb-cast-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 3px;
        }
        .sfx-tmdb-cast-list {
            display: flex;
            gap: 16px;
        }
        .sfx-tmdb-cast-item {
            min-width: 90px;
            max-width: 90px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 8px;
            flex-shrink: 0;
            scroll-snap-align: start;
            cursor: pointer;
            transition: transform 0.2s ease;
            user-select: none;
        }
        .sfx-tmdb-cast-item:hover {
            transform: translateY(-3px);
        }
        .sfx-tmdb-cast-photo {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.15);
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.5px;
        }
        .sfx-tmdb-cast-item:hover .sfx-tmdb-cast-photo {
            transform: scale(1.06);
            border-color: rgba(255, 255, 255, 0.45);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
        }
        .sfx-tmdb-cast-name {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.25;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            transition: color 0.18s ease;
        }
        .sfx-tmdb-cast-item:hover .sfx-tmdb-cast-name {
            color: #30d158;
        }
        .sfx-tmdb-cast-char {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
        }

        /* Images Gallery (Moved under Cast) */
        .sfx-tmdb-gallery-container {
            width: 100%;
            border-radius: 18px;
            overflow: hidden;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-sizing: border-box;
        }
        .sfx-tmdb-gallery {
            display: flex;
            gap: 14px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding: 12px;
            box-sizing: border-box;
            width: 100%;
        }
        .sfx-tmdb-gallery::-webkit-scrollbar {
            height: 6px;
        }
        .sfx-tmdb-gallery::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-tmdb-gallery::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
        }
        .sfx-tmdb-gallery-item {
            height: 180px;
            min-width: 320px;
            max-width: 320px;
            border-radius: 14px;
            object-fit: cover;
            scroll-snap-align: start;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.03);
            transition: transform 0.22s ease, box-shadow 0.22s ease;
            flex-shrink: 0;
        }
        .sfx-tmdb-gallery-item:hover {
            transform: scale(1.02);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        }

        /* Play Trailer Popup Modal (Borderless, Video Only) */
        .sfx-tmdb-trailer-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(4, 4, 8, 0.88);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            z-index: 26000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.24s ease;
            box-sizing: border-box;
            padding: 24px;
        }
        .sfx-tmdb-trailer-modal-backdrop.sfx-open {
            opacity: 1;
            pointer-events: auto;
        }
        .sfx-tmdb-trailer-modal-card {
            background: #000000;
            border: none !important;
            border-radius: 16px;
            max-width: 960px;
            width: 100%;
            box-shadow: 0 32px 80px rgba(0, 0, 0, 0.95);
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            position: relative;
            transform: scale(0.96);
            transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
            overflow: hidden;
        }
        .sfx-tmdb-trailer-modal-backdrop.sfx-open .sfx-tmdb-trailer-modal-card {
            transform: scale(1);
        }
        .sfx-tmdb-trailer-player-box {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000000;
            border: none !important;
            border-radius: 16px;
            overflow: hidden;
            position: relative;
        }
        .sfx-tmdb-trailer-player-box iframe {
            width: 100%;
            height: 100%;
            border: none !important;
            display: block;
        }
        .sfx-tmdb-trailer-modal-close {
            position: absolute;
            top: 12px;
            right: 12px;
            z-index: 25;
            background: rgba(0, 0, 0, 0.65);
            border: 1px solid rgba(255, 255, 255, 0.22);
            color: #ffffff;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0;
            outline: none;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
        }
        .sfx-tmdb-trailer-modal-close:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: scale(1.08);
            border-color: rgba(255, 255, 255, 0.5);
        }
        .sfx-tmdb-trailer-modal-close svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }

        /* Seasons Section (Under Cast & Crew) */
        .sfx-season-section-count, .sfx-rec-section-count {
            font-size: 11.5px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.35);
            margin-left: 6px;
        }
        .sfx-tmdb-seasons-scroll-container, .sfx-tmdb-recs-scroll-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 6px 2px 12px 2px;
            box-sizing: border-box;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
        }
        .sfx-tmdb-seasons-scroll-container::-webkit-scrollbar, .sfx-tmdb-recs-scroll-container::-webkit-scrollbar {
            height: 5px;
        }
        .sfx-tmdb-seasons-scroll-container::-webkit-scrollbar-track, .sfx-tmdb-recs-scroll-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-tmdb-seasons-scroll-container::-webkit-scrollbar-thumb, .sfx-tmdb-recs-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.12);
            border-radius: 3px;
        }
        .sfx-tmdb-seasons-list, .sfx-tmdb-recs-list {
            display: flex;
            gap: 14px;
        }
        .sfx-season-card {
            min-width: 130px;
            max-width: 130px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
            scroll-snap-align: start;
            user-select: none;
            transition: transform 0.22s ease;
        }
        .sfx-season-card:hover {
            transform: translateY(-3px);
        }
        .sfx-season-poster-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 2 / 3;
            border-radius: 12px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sfx-season-card:hover .sfx-season-poster-wrap {
            border-color: rgba(255, 255, 255, 0.35);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
        }
        .sfx-season-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .sfx-season-poster-fallback {
            color: rgba(255, 255, 255, 0.25);
            font-size: 32px;
        }
        .sfx-season-badge {
            position: absolute;
            top: 7px;
            left: 7px;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            background: rgba(0, 0, 0, 0.72);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #30d158;
            letter-spacing: 0.3px;
        }
        .sfx-season-title {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.25;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sfx-season-meta {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            line-height: 1.2;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        /* Recommendations / Suggestions Section (After Image Section) */
        .sfx-rec-card {
            min-width: 140px;
            max-width: 140px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
            scroll-snap-align: start;
            cursor: pointer;
            user-select: none;
            transition: transform 0.22s ease;
        }
        .sfx-rec-card:hover {
            transform: translateY(-4px);
        }
        .sfx-rec-poster-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 2 / 3;
            border-radius: 12px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sfx-rec-card:hover .sfx-rec-poster-wrap {
            border-color: rgba(255, 255, 255, 0.4);
            box-shadow: 0 8px 26px rgba(0, 0, 0, 0.65);
        }
        .sfx-rec-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .sfx-rec-poster-fallback {
            color: rgba(255, 255, 255, 0.25);
            font-size: 36px;
        }
        .sfx-rec-lang-badge {
            position: absolute;
            top: 7px;
            left: 7px;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 800;
            background: rgba(0, 0, 0, 0.72);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: #58a6ff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .sfx-rec-score-badge {
            position: absolute;
            bottom: 7px;
            right: 7px;
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #21d07a;
            letter-spacing: 0.3px;
        }
        .sfx-rec-title {
            font-size: 12.5px;
            font-weight: 700;
            color: #ffffff;
            line-height: 1.25;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            transition: color 0.18s ease;
        }
        .sfx-rec-card:hover .sfx-rec-title {
            color: #30d158;
        }
        .sfx-rec-meta {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.5);
            line-height: 1.2;
        }

        @media (max-width: 768px) {
            .sfx-media-hero-body {
                flex-direction: column;
                align-items: center;
                text-align: center;
                padding: 20px;
                gap: 18px;
            }
            .sfx-media-poster-wrap {
                width: 160px;
                height: 240px;
            }
            .sfx-media-details {
                align-items: center;
            }
            .sfx-media-title-row {
                justify-content: center;
            }
            .sfx-media-scores-actions-row {
                justify-content: center;
            }
            .sfx-media-crew {
                justify-content: center;
            }
        }

        /* Download Options Section */
        .sfx-tmdb-download-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            width: 100%;
        }
        @media (max-width: 640px) {
            .sfx-tmdb-download-grid {
                grid-template-columns: 1fr;
            }
        }
        .sfx-tmdb-download-card {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 14px;
            padding: 11px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: #ffffff;
            cursor: pointer;
            box-sizing: border-box;
            transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .sfx-tmdb-download-card:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        .sfx-dl-icon-badge {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: rgba(48, 209, 88, 0.15);
            border: 1px solid rgba(48, 209, 88, 0.35);
            color: #30d158;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .sfx-dl-icon-badge svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
        }
        .sfx-dl-ext-badge {
            background: rgba(255, 159, 10, 0.15);
            border-color: rgba(255, 159, 10, 0.35);
            color: #ff9f0a;
        }
        .sfx-dl-info {
            display: flex;
            flex-direction: column;
            min-width: 0;
            flex: 1;
        }
        .sfx-dl-name,
        .sfx-dl-site {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sfx-dl-desc {
            font-size: 10.5px;
            color: rgba(255, 255, 255, 0.5);
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sfx-dl-arrow {
            color: rgba(255, 255, 255, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            font-size: 14px;
            transition: transform 0.2s ease, color 0.2s ease;
        }
        .sfx-dl-arrow svg {
            width: 14px;
            height: 14px;
        }
        .sfx-tmdb-download-card:hover .sfx-dl-arrow {
            color: #ffffff;
            transform: translate(2px, -2px);
        }

        /* SinFlix Download Card (rentry.co/sin0flix) */
        .sfx-dl-card-sinflix {
            background: linear-gradient(135deg, rgba(48, 209, 88, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%) !important;
            border: 1px solid rgba(48, 209, 88, 0.28) !important;
        }
        .sfx-dl-card-sinflix:hover {
            background: linear-gradient(135deg, rgba(48, 209, 88, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%) !important;
            border-color: rgba(48, 209, 88, 0.52) !important;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(48, 209, 88, 0.18) !important;
        }
        .sfx-dl-card-sinflix .sfx-dl-name {
            color: #30d158 !important;
        }
        .sfx-dl-card-sinflix .sfx-dl-arrow {
            color: #30d158 !important;
            font-size: 15px;
            font-weight: 700;
        }
        .sfx-dl-card-sinflix:hover .sfx-dl-arrow {
            transform: translateY(2px);
            color: #ffffff !important;
        }
        .sfx-tmdb-sinflix-msg {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 500;
            color: #ff453a;
            padding: 7px 12px;
            border-radius: 8px;
            background: rgba(255, 69, 58, 0.12);
            border: 1px solid rgba(255, 69, 58, 0.25);
            text-align: center;
            margin-top: 8px;
        }
        @keyframes sfxSpotlightGlow {
            0% {
                box-shadow: 0 0 0 0 rgba(48, 209, 88, 0.85);
                background-color: rgba(48, 209, 88, 0.32) !important;
            }
            40% {
                box-shadow: 0 0 24px 6px rgba(48, 209, 88, 0.65);
                background-color: rgba(48, 209, 88, 0.25) !important;
            }
            100% {
                box-shadow: 0 0 0 0 rgba(48, 209, 88, 0);
                background-color: transparent !important;
            }
        }
        .sfx-drama-spotlight {
            animation: sfxSpotlightGlow 2.6s ease-out !important;
            border-radius: 6px;
            position: relative;
            z-index: 100;
        }

        /* Person Profile View Container */
        .sfx-tmdb-person-view {
            display: flex;
            flex-direction: column;
            gap: 28px;
            width: 100%;
            min-width: 0;
            box-sizing: border-box;
        }

        /* Apple TV+ Style Person Hero Card */
        .sfx-person-hero-card {
            display: flex;
            align-items: center;
            gap: 28px;
            padding: 8px 0 16px 0;
            width: 100%;
            box-sizing: border-box;
            transition: opacity 0.28s ease, transform 0.28s ease;
        }
        #sfx-tmdb-modal-backdrop.sfx-actor-mode.sfx-header-scrolled .sfx-person-hero-card {
            opacity: 0.15;
            transform: translateY(-8px);
        }
        .sfx-person-photo-wrap {
            flex-shrink: 0;
        }
        .sfx-person-photo {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.22);
            box-shadow: 0 10px 32px rgba(0, 0, 0, 0.65);
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.05);
            display: block;
        }
        .sfx-person-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
            flex: 1;
        }
        .sfx-person-name {
            font-size: 32px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.4px;
            margin: 0;
            line-height: 1.15;
        }
        .sfx-person-meta-text {
            font-size: 13.5px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 0.2px;
            margin-bottom: 2px;
        }
        .sfx-person-bio-wrap {
            font-size: 13.5px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.78);
            max-width: 820px;
        }
        .sfx-person-bio {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            display: inline;
        }
        .sfx-bio-more-btn {
            background: none;
            border: none;
            color: #388bfd;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.5px;
            cursor: pointer;
            padding: 0 0 0 5px;
            text-transform: uppercase;
            outline: none;
            display: inline;
            vertical-align: baseline;
            transition: color 0.18s;
        }
        .sfx-bio-more-btn:hover {
            color: #58a6ff;
            text-decoration: underline;
        }

        /* Apple TV+ Style Biography Pop-Up Modal */
        .sfx-tmdb-bio-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(4, 4, 8, 0.72);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            z-index: 25000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.24s ease;
            box-sizing: border-box;
            padding: 24px;
        }
        .sfx-tmdb-bio-modal-backdrop.sfx-open {
            opacity: 1;
            pointer-events: auto;
        }
        .sfx-tmdb-bio-modal-card {
            background: rgba(28, 28, 36, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 18px;
            max-width: 580px;
            width: 100%;
            max-height: 82vh;
            padding: 24px 28px 28px 28px;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.88);
            display: flex;
            flex-direction: column;
            gap: 14px;
            box-sizing: border-box;
            position: relative;
            transform: scale(0.96);
            transition: transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sfx-tmdb-bio-modal-backdrop.sfx-open .sfx-tmdb-bio-modal-card {
            transform: scale(1);
        }
        .sfx-tmdb-bio-close {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            padding: 0;
            outline: none;
        }
        .sfx-tmdb-bio-close:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: scale(1.06);
        }
        .sfx-tmdb-bio-close svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
        .sfx-tmdb-bio-title {
            margin: 36px 0 0 0;
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: -0.3px;
        }
        .sfx-tmdb-bio-content {
            font-size: 13.5px;
            line-height: 1.7;
            color: rgba(255, 255, 255, 0.84);
            overflow-y: auto;
            max-height: 52vh;
            padding-right: 8px;
            white-space: pre-line;
        }
        .sfx-tmdb-bio-content::-webkit-scrollbar {
            width: 6px;
        }
        .sfx-tmdb-bio-content::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .sfx-section-count, .sfx-person-section-count {
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.08);
            padding: 2px 8px;
            border-radius: 12px;
            letter-spacing: 0.3px;
        }

        /* Filmography Credits Horizontal Scroller */
        .sfx-credit-scroll-container {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 8px 2px 12px 2px;
            box-sizing: border-box;
            scroll-snap-type: x proximity;
            -webkit-overflow-scrolling: touch;
        }
        .sfx-credit-scroll-container::-webkit-scrollbar {
            height: 6px;
        }
        .sfx-credit-scroll-container::-webkit-scrollbar-track {
            background: transparent;
        }
        .sfx-credit-scroll-container::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.14);
            border-radius: 3px;
        }
        .sfx-credit-list {
            display: flex;
            gap: 16px;
        }
        .sfx-credit-card {
            min-width: 165px;
            max-width: 165px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            flex-shrink: 0;
            scroll-snap-align: start;
            cursor: pointer;
            transition: transform 0.22s ease;
            user-select: none;
        }
        .sfx-credit-card:hover {
            transform: translateY(-4px);
        }
        .sfx-credit-poster-wrap {
            position: relative;
            width: 100%;
            height: 248px;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.12);
            background: rgba(255, 255, 255, 0.04);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sfx-credit-card:hover .sfx-credit-poster-wrap {
            border-color: rgba(48, 209, 88, 0.6);
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65);
        }
        .sfx-credit-poster {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        .sfx-credit-year-badge {
            position: absolute;
            bottom: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 7px;
            border-radius: 6px;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }
        .sfx-credit-title {
            font-size: 13.5px;
            font-weight: 600;
            color: #ffffff;
            line-height: 1.3;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            transition: color 0.18s;
        }
        .sfx-credit-card:hover .sfx-credit-title {
            color: #30d158;
        }
        .sfx-credit-char {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.52);
            line-height: 1.3;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* Not Found / Error state */
        .sfx-tmdb-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 36px 16px;
            gap: 14px;
        }
        .sfx-tmdb-empty-title {
            font-size: 15px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
        }
        .sfx-tmdb-empty-desc {
            font-size: 12.5px;
            color: rgba(255, 255, 255, 0.5);
            max-width: 360px;
            line-height: 1.45;
        }

        .sfx-tmdb-creds-empty {
            padding: 44px 20px;
            gap: 16px;
        }

        .sfx-tmdb-creds-icon {
            width: 52px;
            height: 52px;
            border-radius: 50%;
            background: rgba(48, 209, 88, 0.12);
            border: 1px solid rgba(48, 209, 88, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 2px;
        }

        .sfx-tmdb-creds-box {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 16px 20px;
            max-width: 440px;
            text-align: left;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .sfx-tmdb-creds-steps {
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.75);
        }

        .sfx-tmdb-creds-steps li {
            margin-bottom: 6px;
        }

        .sfx-tmdb-creds-steps li:last-child {
            margin-bottom: 0;
        }

        .sfx-tmdb-creds-steps a {
            color: #30d158;
            text-decoration: underline;
            text-underline-offset: 2px;
            font-weight: 500;
        }

        .sfx-tmdb-creds-steps a:hover {
            color: #4ade80;
        }

        .sfx-tmdb-creds-steps b {
            color: #ffffff;
        }

        .sfx-tmdb-open-settings-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 9px 18px;
            background: #30d158;
            color: #0b2210;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13px;
            font-weight: 600;
            border: none;
            border-radius: 980px;
            cursor: pointer;
            transition: background-color 0.2s, transform 0.15s, box-shadow 0.2s;
            align-self: center;
            margin-top: 4px;
        }

        .sfx-tmdb-open-settings-action:hover {
            background: #3ee268;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(48, 209, 88, 0.4);
        }

        .sfx-tmdb-open-settings-action:active {
            transform: translateY(0);
        }



        /* --- BuzzHeavier Premium iOS 27 Single Card UI --- */
        .sfx-bh-single-card {
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            border-radius: 20px !important;
            padding: 20px !important;
            margin: 24px 0 !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
            backdrop-filter: blur(20px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif !important;
            color: #ffffff !important;
        }
        .sfx-bh-card-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            margin-bottom: 18px !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
        }
        .sfx-bh-file-title {
            font-size: 17px !important;
            font-weight: 700 !important;
            letter-spacing: -0.3px !important;
            word-break: break-all !important;
            flex: 1 !important;
            min-width: 250px !important;
        }
        .sfx-bh-file-size {
            font-size: 14px !important;
            font-weight: 600 !important;
            background: rgba(255, 255, 255, 0.1) !important;
            padding: 4px 10px !important;
            border-radius: 20px !important;
            color: rgba(255, 255, 255, 0.9) !important;
        }
        .sfx-bh-servers-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            background: rgba(0, 0, 0, 0.2) !important;
            border-radius: 14px !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            padding: 2px 0 !important;
        }
        .sfx-bh-server-row {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 12px 16px !important;
            gap: 12px !important;
            flex-wrap: wrap !important;
        }
        .sfx-bh-server-info {
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
        }
        .sfx-bh-server-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            display: inline-block !important;
            box-shadow: 0 0 8px currentColor !important;
        }
        .sfx-bh-server-dot.sfx-server1 {
            color: #6ba5f5 !important;
            background-color: #6ba5f5 !important;
        }
        .sfx-bh-server-dot.sfx-server2 {
            color: #5dba72 !important;
            background-color: #5dba72 !important;
        }
        .sfx-bh-server-name {
            font-size: 14px !important;
            font-weight: 600 !important;
            color: rgba(255, 255, 255, 0.9) !important;
        }
        .sfx-bh-server-actions {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
        }
        .sfx-bh-action-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            padding: 6px 14px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
            border: none !important;
            outline: none !important;
        }
        .sfx-bh-action-btn.sfx-download {
            background: #2563eb !important;
            color: #ffffff !important;
        }
        .sfx-bh-action-btn.sfx-download:hover {
            background: #1d4ed8 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3) !important;
        }
        .sfx-bh-action-btn.sfx-copy {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
        }
        .sfx-bh-action-btn.sfx-copy:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            transform: translateY(-1px) !important;
        }
        .sfx-bh-action-btn.bh-loading {
            background: rgba(255, 255, 255, 0.05) !important;
            color: rgba(255, 255, 255, 0.5) !important;
            border-color: rgba(255, 255, 255, 0.05) !important;
            cursor: not-allowed !important;
            transform: none !important;
            box-shadow: none !important;
        }
        .sfx-bh-action-btn.bh-loading svg {
            animation: sfx-spin 1s linear infinite !important;
        }
        .sfx-bh-action-btn svg {
            width: 14px !important;
            height: 14px !important;
        }
        .sfx-bh-divider {
            height: 0.5px !important;
            background: rgba(255, 255, 255, 0.06) !important;
            margin: 0 16px !important;
        }
        .sfx-bh-card-footer {
            margin-top: 14px !important;
            display: flex !important;
            justify-content: center !important;
        }
        .sfx-bh-preview-btn {
            background: transparent !important;
            border: 1px dashed rgba(255, 255, 255, 0.2) !important;
            color: rgba(255, 255, 255, 0.6) !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 8px !important;
            padding: 8px 16px !important;
            border-radius: 12px !important;
            font-size: 13px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
        }
        .sfx-bh-preview-btn:hover {
            border-color: rgba(255, 255, 255, 0.4) !important;
            color: #ffffff !important;
            background: rgba(255, 255, 255, 0.03) !important;
        }
        .sfx-bh-preview-btn svg {
            width: 14px !important;
            height: 14px !important;
        }

        /* --- BuzzHeavier List Page Custom Capsule styling --- */
        .sfx-bh-row-capsule {
            position: absolute !important;
            right: 6px !important;
            top: 50% !important;
            transform: translateY(-50%) !important;
            display: inline-flex !important;
            align-items: center !important;
            background: rgba(255, 255, 255, 0.06) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 8px !important;
            padding: 1px 2px !important;
            gap: 0 !important;
            z-index: 5 !important;
            height: 22px !important;
            box-sizing: border-box !important;
        }
        .sfx-bh-row-btn {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            cursor: pointer !important;
            padding: 0 6px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            color: rgba(255, 255, 255, 0.7) !important;
            font-size: 10px !important;
            font-weight: 600 !important;
            height: 18px !important;
            border-radius: 6px !important;
            transition: all 0.15s !important;
        }
        .sfx-bh-row-btn:hover {
            background: rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
        }
        .sfx-bh-row-btn svg {
            width: 10px !important;
            height: 10px !important;
            fill: currentColor !important;
        }
        .sfx-bh-row-divider {
            width: 1px !important;
            height: 12px !important;
            background: rgba(255, 255, 255, 0.12) !important;
        }

        /* --- Transfer.it: Hide top "Download all" icon in header --- */
        .grid-header .js-download-all,
        .info-header .js-download-all {
            display: none !important;
        }
        .grid-header .info-header:not(:has(.link-name:not(:empty))) {
            display: none !important;
        }

        /* --- Transfer.it Copy Button (Matches official .it-button.sm-size.ghost) --- */
        .sfx-ti-copy-btn {
            margin-right: 6px !important;
            cursor: pointer !important;
            flex-shrink: 0 !important;
            transition: color 0.15s ease, background-color 0.15s ease, transform 0.15s ease !important;
        }
        .sfx-ti-copy-btn:hover {
            transform: scale(1.08) !important;
        }
        .sfx-ti-copy-btn:active {
            transform: scale(0.95) !important;
        }
        .sfx-ti-copy-btn svg {
            width: 16px !important;
            height: 16px !important;
            fill: currentColor !important;
            display: block !important;
            pointer-events: none !important;
        }
        .sfx-ti-copy-btn.sfx-copied {
            color: #4ade80 !important;
        }

        /* --- Transfer.it Summary Card & Toolbar Actions --- */
        .sfx-ti-summary-actions {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 12px !important;
            margin: 14px 0 !important;
            width: 100% !important;
        }
        .sfx-ti-summary-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            padding: 9px 18px !important;
            border-radius: 10px !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            background: rgba(30, 41, 59, 0.85) !important;
            color: #e2e8f0 !important;
            transition: all 0.2s ease !important;
            backdrop-filter: blur(8px) !important;
            font-family: inherit !important;
        }
        .sfx-ti-summary-btn:hover {
            background: rgba(51, 65, 85, 0.95) !important;
            color: #ffffff !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
        }
        .sfx-ti-summary-btn.sfx-copy-all:hover {
            border-color: rgba(96, 165, 250, 0.4) !important;
            color: #93c5fd !important;
        }
        .sfx-ti-summary-btn.sfx-copy-zip:hover {
            border-color: rgba(74, 222, 128, 0.4) !important;
            color: #86efac !important;
        }
        .sfx-ti-summary-btn svg {
            width: 15px !important;
            height: 15px !important;
            fill: currentColor !important;
        }

        /* --- BuzzHeavier Quality Split Tables --- */
        .sfx-quality-section {
            margin-bottom: 24px;
        }
        .sfx-quality-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 24px 0 12px 0;
            padding: 8px 12px 8px 16px;
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px;
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            box-sizing: border-box;
        }
        .sfx-quality-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #fff;
            background: linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.85));
            border: 1px solid rgba(255,255,255,0.12);
            box-shadow: 0 2px 8px rgba(99,102,241,0.25);
        }
        .sfx-quality-badge svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
            opacity: 0.9;
        }
        .sfx-quality-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .sfx-quality-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: rgba(255,255,255,0.25);
            display: inline-block;
        }
        .sfx-quality-meta {
            font-size: 13px;
            font-weight: 600;
            color: rgba(255,255,255,0.85);
        }
        .sfx-quality-size {
            font-size: 13px;
            font-weight: 600;
            color: rgba(255,255,255,0.55);
        }
        .sfx-bh-copy-all-btn,
        .sfx-bh-select-custom-btn,
        .sfx-bh-copy-dropdown-trigger {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            color: #ffffff !important;
            transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
            outline: none;
        }
        .sfx-bh-copy-all-btn:hover,
        .sfx-bh-select-custom-btn:hover,
        .sfx-bh-copy-dropdown-trigger:hover {
            background: rgba(255, 255, 255, 0.15) !important;
            border-color: rgba(255, 255, 255, 0.18) !important;
            transform: translateY(-0.5px) scale(1.02);
        }
        .sfx-bh-copy-all-btn:active,
        .sfx-bh-select-custom-btn:active,
        .sfx-bh-copy-dropdown-trigger:active {
            transform: scale(0.98);
        }
        .sfx-bh-copy-all-btn svg,
        .sfx-bh-select-custom-btn svg,
        .sfx-bh-copy-dropdown-trigger svg {
            width: 12px;
            height: 12px;
            fill: currentColor;
        }

        /* --- Dropdown Menu --- */
        .sfx-copy-dropdown-container {
            position: relative;
            display: inline-block;
        }
        .sfx-dropdown-arrow {
            width: 10px !important;
            height: 10px !important;
            margin-left: 2px;
            fill: currentColor;
            opacity: 0.8;
            transition: transform 0.2s ease;
        }
        .sfx-copy-dropdown-container.sfx-active .sfx-dropdown-arrow {
            transform: rotate(180deg);
        }
        .sfx-copy-dropdown-menu {
            position: absolute;
            top: calc(100% + 6px);
            right: 0;
            background: rgba(25, 25, 30, 0.95) !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            padding: 4px;
            min-width: 150px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 2px;
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
            pointer-events: none;
            transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .sfx-copy-dropdown-menu.sfx-show {
            opacity: 1;
            transform: translateY(0) scale(1);
            pointer-events: auto;
        }
        .sfx-dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: transparent !important;
            border: none !important;
            border-radius: 8px;
            color: rgba(255, 255, 255, 0.9) !important;
            font-size: 12px;
            font-weight: 500;
            text-align: left;
            cursor: pointer;
            width: 100%;
            transition: background 0.15s ease;
        }
        .sfx-dropdown-item:hover {
            background: rgba(255, 255, 255, 0.08) !important;
        }
        .sfx-dropdown-item svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
            opacity: 0.8;
        }
        .sfx-dropdown-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.08);
            margin: 2px 4px;
        }
        .sfx-quality-section table.fs {
            margin-top: 0;
        }

        /* --- pst.moe Enhanced Layout --- */
        .sfx-pst-section {
            margin-bottom: 24px;
            background: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-radius: 16px;
            padding: 16px;
            box-sizing: border-box;
        }
        .sfx-pst-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
            padding: 8px 12px 8px 16px;
            background: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 16px;
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            box-sizing: border-box;
        }
        .sfx-pst-row {
            display: flex;
            align-items: center;
            padding: 6px 8px;
            border-radius: 8px;
            transition: background 0.2s ease;
            gap: 10px;
        }
        .sfx-pst-text-line {
            font-family: 'Roboto Mono', monospace;
            font-size: 13px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.85);
            word-break: break-all;
            padding: 0 8px;
        }
        .sfx-pst-row:hover {
            background: rgba(255, 255, 255, 0.03);
        }
        .sfx-pst-checkbox-col {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            flex-shrink: 0;
        }
        .sfx-pst-row-content {
            font-family: 'Roboto Mono', monospace;
            font-size: 13px;
            line-height: 1.5;
            color: rgba(255, 255, 255, 0.85);
            word-break: break-all;
        }

        @keyframes sfx-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;

    // Only apply border-radius styling on rentry.co/sin-flix, rentry.co/sin0flix and text.is/Sinflix
    if (window.location.href.includes('rentry.co/sin-flix') || window.location.href.includes('rentry.co/sin0flix') || window.location.href.includes('text.is/Sinflix')) {
        css += `
            /* 10px rounded corners for outer backgrounds */
            .col-12.long-words,
            .entry-text {
                border-radius: 10px !important;
                overflow: hidden !important;
            }

            /* 15px rounded corners for internal boxes/content elements */
            .admonition,
            .admonition-title,
            table,
            thead,
            tbody,
            tr,
            td,
            th,
            pre,
            code,
            img {
                border-radius: 15px !important;
            }

            /* --- iOS 27 Day/Schedule Headers --- */
            blockquote.sfx-day-header {
                border-left: none !important;
                background: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 14px !important;
                padding: 10px 16px !important;
                margin: 22px 0 12px 0 !important;
                display: inline-block !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
                backdrop-filter: blur(20px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }

            .sfx-day-header-wrap {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                column-gap: 12px;
                row-gap: 6px;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", sans-serif;
            }

            .sfx-day-header-main {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sfx-day-icon {
                width: 16px;
                height: 16px;
                fill: #30d158; /* iOS Green */
                flex-shrink: 0;
            }

            .sfx-day-title {
                font-size: 13px;
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }

            .sfx-day-note {
                font-size: 12px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.5);
                letter-spacing: 0.1px;
            }

            /* --- Completed Dramas Filter Chips --- */
            .sfx-filter-container {
                display: inline-flex !important;
                flex-wrap: wrap !important;
                gap: 6px !important;
                margin: 18px 0 24px 0 !important;
                padding: 5px 6px !important;
                background: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 18px !important;
                backdrop-filter: blur(20px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
            }
            .sfx-filter-chip {
                background: transparent !important;
                border: 1px solid transparent !important;
                color: rgba(255, 255, 255, 0.65) !important;
                padding: 6px 14px !important;
                border-radius: 13px !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif !important;
                cursor: pointer !important;
                user-select: none !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
                outline: none !important;
                line-height: 1 !important;
                box-shadow: none !important;
            }
            .sfx-filter-chip:hover {
                color: #ffffff !important;
                background: rgba(255, 255, 255, 0.06) !important;
            }
            .sfx-filter-chip:active {
                transform: scale(0.96) !important;
            }
            .sfx-filter-chip.sfx-active {
                background: rgba(48, 209, 88, 0.14) !important;
                border-color: rgba(48, 209, 88, 0.25) !important;
                color: #30d158 !important;
                box-shadow: 0 4px 12px rgba(48, 209, 88, 0.12) !important;
            }
            .sfx-filter-chip.sfx-active:hover {
                background: rgba(48, 209, 88, 0.18) !important;
                border-color: rgba(48, 209, 88, 0.35) !important;
            }
            .sfx-filter-chip-count {
                font-size: 10px !important;
                font-weight: 600 !important;
                padding: 2px 6px !important;
                border-radius: 9px !important;
                background: rgba(255, 255, 255, 0.06) !important;
                color: rgba(255, 255, 255, 0.45) !important;
                transition: all 0.2s ease !important;
                line-height: 1 !important;
            }
            .sfx-filter-chip:hover .sfx-filter-chip-count {
                background: rgba(255, 255, 255, 0.12) !important;
                color: rgba(255, 255, 255, 0.75) !important;
            }
            .sfx-filter-chip.sfx-active .sfx-filter-chip-count {
                background: rgba(48, 209, 88, 0.18) !important;
                color: #30d158 !important;
            }
            .sfx-completed-drama-item {
                animation: sfx-fade-in 0.25s ease forwards !important;
            }
            @keyframes sfx-fade-in {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
    }

    // Styles for buzzheavier.com pages
    if (window.location.hostname.includes('buzzheavier.com')) {
        css += `
            /* --- BuzzHeavier Site Adjustments --- */
            table,
            thead,
            tbody,
            tr,
            th,
            td {
                border-color: #000000 !important;
                background: transparent !important;
            }
            .divide-y > * {
                border-color: #000000 !important;
                background: transparent !important;
            }
            /* Style file name, size, views, downloads and dateModified columns in the file list */
            table tbody tr td a,
            table tbody tr td:nth-child(2),
            table tbody tr td:nth-child(3),
            table tbody tr td:nth-child(4),
            table tbody tr td:nth-child(5) {
                color: #b0b0b0 !important;
            }
        `;
    }

    // Styles for pst.moe, p.darklab.sh & 0g.gg paste pages
    const isPasteDomain = window.location.hostname.includes('pst.moe') ||
                          window.location.hostname.includes('darklab.sh') ||
                          window.location.hostname.includes('0g.gg') ||
                          window.location.href.includes('darklab.sh') ||
                          window.location.href.includes('0g.gg') ||
                          document.querySelector('#prettyprint, #prettymessage, #cleartext') !== null;
    if (isPasteDomain) {
        css += `
            /* --- pst.moe & PrivateBin Enhancements --- */
            .sfx-pst-container {
                width: 100%;
                margin-top: 8px;
                box-sizing: border-box;
            }
            .sfx-pst-container svg {
                display: inline-block !important;
                vertical-align: middle !important;
                flex-shrink: 0 !important;
            }
            .sfx-pst-intro {
                margin-bottom: 16px;
                padding: 12px 16px;
                background: rgba(255, 255, 255, 0.02) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                border-radius: 12px;
                box-sizing: border-box;
            }
            .sfx-pst-section {
                margin-bottom: 24px;
                background: rgba(255, 255, 255, 0.02) !important;
                border: 1px solid rgba(255, 255, 255, 0.05) !important;
                border-radius: 16px;
                padding: 16px;
                box-sizing: border-box;
            }
            .sfx-pst-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                padding: 8px 12px 8px 16px;
                background: rgba(255, 255, 255, 0.03) !important;
                border: 1px solid rgba(255, 255, 255, 0.06) !important;
                border-radius: 16px;
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                box-sizing: border-box;
            }
            .sfx-quality-info {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
            }
            .sfx-quality-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                border-radius: 10px;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: #fff !important;
                background: linear-gradient(135deg, rgba(99,102,241,0.85), rgba(139,92,246,0.85));
                border: 1px solid rgba(255,255,255,0.12);
                box-shadow: 0 2px 8px rgba(99,102,241,0.25);
            }
            .sfx-quality-badge svg {
                width: 14px !important;
                height: 14px !important;
                max-width: 14px !important;
                max-height: 14px !important;
                fill: currentColor !important;
                opacity: 0.9;
            }
            .sfx-quality-meta {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.85) !important;
            }
            .sfx-quality-dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.25);
                display: inline-block;
            }
            .sfx-quality-size {
                font-size: 13px;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.55) !important;
            }
            .sfx-quality-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .sfx-pst-content {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .sfx-pst-row {
                display: flex;
                align-items: center;
                padding: 6px 8px;
                border-radius: 8px;
                transition: background 0.2s ease;
                gap: 10px;
            }
            .sfx-pst-row:hover {
                background: rgba(255, 255, 255, 0.03);
            }
            .sfx-pst-row a {
                color: #60a5fa !important;
                text-decoration: none;
                transition: color 0.15s ease;
            }
            .sfx-pst-row a:hover {
                color: #93c5fd !important;
                text-decoration: underline;
            }
            body:not(.sfx-pst-dark):not(.dark-theme) .sfx-pst-row a {
                color: #2563eb !important;
            }
            body:not(.sfx-pst-dark):not(.dark-theme) .sfx-pst-row a:hover {
                color: #1d4ed8 !important;
            }
            .sfx-pst-row-content {
                font-family: 'Roboto Mono', monospace;
                font-size: 13px;
                line-height: 1.5;
                word-break: break-all;
            }
            .sfx-pst-text-line {
                font-family: 'Roboto Mono', monospace;
                font-size: 13px;
                line-height: 1.5;
                color: rgba(255, 255, 255, 0.85);
                word-break: break-all;
                padding: 4px 8px;
            }
            .sfx-pst-checkbox-col {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                flex-shrink: 0;
            }

            /* Copy button & dropdown menu styles for paste pages */
            .sfx-bh-copy-dropdown-trigger {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 14px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                background: rgba(255, 255, 255, 0.08) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                color: #ffffff !important;
                transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
                outline: none;
            }
            .sfx-bh-copy-dropdown-trigger:hover {
                background: rgba(255, 255, 255, 0.15) !important;
                border-color: rgba(255, 255, 255, 0.18) !important;
                transform: translateY(-0.5px) scale(1.02);
            }
            .sfx-bh-copy-dropdown-trigger svg {
                width: 12px !important;
                height: 12px !important;
                max-width: 12px !important;
                max-height: 12px !important;
                fill: currentColor !important;
            }
            .sfx-copy-dropdown-container {
                position: relative;
                display: inline-block;
            }
            .sfx-dropdown-arrow {
                width: 10px !important;
                height: 10px !important;
                max-width: 10px !important;
                max-height: 10px !important;
                margin-left: 2px;
                fill: currentColor !important;
                opacity: 0.8;
                transition: transform 0.2s ease;
            }
            .sfx-copy-dropdown-container.sfx-active .sfx-dropdown-arrow {
                transform: rotate(180deg);
            }
            .sfx-copy-dropdown-menu {
                position: absolute;
                top: calc(100% + 6px);
                right: 0;
                background: rgba(25, 25, 30, 0.95) !important;
                border: 1px solid rgba(255, 255, 255, 0.1) !important;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                padding: 4px;
                min-width: 150px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 2px;
                opacity: 0;
                transform: translateY(-8px) scale(0.95);
                pointer-events: none;
                transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            .sfx-copy-dropdown-menu.sfx-show {
                opacity: 1 !important;
                transform: translateY(0) scale(1) !important;
                pointer-events: auto !important;
            }
            .sfx-dropdown-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 500;
                color: rgba(255, 255, 255, 0.9) !important;
                background: transparent !important;
                border: none !important;
                cursor: pointer;
                transition: background 0.15s ease, color 0.15s ease;
                white-space: nowrap;
                width: 100%;
                text-align: left;
                box-sizing: border-box;
            }
            .sfx-dropdown-item:hover {
                background: rgba(255, 255, 255, 0.08) !important;
                color: #ffffff !important;
            }
            .sfx-dropdown-item svg {
                width: 14px !important;
                height: 14px !important;
                max-width: 14px !important;
                max-height: 14px !important;
                fill: currentColor !important;
                opacity: 0.85;
            }
            .sfx-dropdown-divider {
                height: 1px;
                background: rgba(255, 255, 255, 0.08);
                margin: 2px 4px;
            }

            .sinflix-res-header {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-weight: bold;
                margin: 8px 0;
            }
            .sinflix-copy-btn {
                background: #2a2b2c;
                color: #e8eaed;
                border: 1px solid #5f6368;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-family: inherit;
                transition: all 0.2s;
            }
            .sinflix-copy-btn:hover {
                background: #1a73e8;
                border-color: #1a73e8;
                color: white;
            }


            /* --- FileDitch download circle --- */
            .sinflix-fd-dl-circle {
                display: inline-block;
                width: 13px;
                height: 13px;
                border-radius: 50%;
                background: #f97316;
                cursor: pointer;
                vertical-align: middle;
                margin-left: 4px;
                opacity: 0.55;
                transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
                flex-shrink: 0;
            }
            .sinflix-fd-dl-circle:hover { opacity: 1; transform: scale(1.3); background: #fb923c; }
            .sinflix-fd-dl-circle.fd-loading {
                opacity: 0.35;
                cursor: wait;
                animation: fd-pulse 0.9s ease-in-out infinite alternate;
            }
            @keyframes fd-pulse {
                from { opacity: 0.25; transform: scale(0.85); }
                to   { opacity: 0.65; transform: scale(1.05); }
            }

            /* --- pst.moe Dark Mode --- */
            body.sfx-pst-dark,
            body.sfx-pst-dark *:not(#sfx-island-wrap):not(#sfx-island-wrap *):not(.sfx-notification):not(.sfx-notification *):not([class^="sfx-"]):not([class*=" sfx-"]):not([id^="sfx-"]):not([class^="sinflix-"]):not([class*=" sinflix-"]) {
                transition: none !important;
            }
            body.sfx-pst-dark {
                background: #0f0f13 !important;
                color: #d4d4d8 !important;
            }
            body.sfx-pst-dark *:not(#sfx-island-wrap):not(#sfx-island-wrap *):not(.sfx-notification):not(.sfx-notification *):not([class^="sfx-"]):not([class*=" sfx-"]):not([id^="sfx-"]):not([class^="sinflix-"]):not([class*=" sinflix-"]) {
                color: #d4d4d8;
                border-color: rgba(255,255,255,0.08);
            }
            body.sfx-pst-dark pre:not(.sfx-pst-processed),
            body.sfx-pst-dark code,
            body.sfx-pst-dark textarea {
                background: #18181b !important;
                color: #e4e4e7 !important;
                border-color: rgba(255,255,255,0.1) !important;
            }
            body.sfx-pst-dark pre.sfx-pst-processed {
                background: transparent !important;
                border: none !important;
                padding: 0 !important;
            }

            /* --- Hyperlink Colors --- */
            body a {
                color: #4b5563 !important; /* dark grey in light mode */
            }
            body a:visited {
                color: #555566 !important;
            }
            body a:hover {
                color: #1f2937 !important;
            }

            body.sfx-pst-dark a {
                color: #9ca3af !important; /* medium-dark grey in dark mode to remain readable */
            }
            body.sfx-pst-dark a:visited {
                color: #78716c !important;
            }
            body.sfx-pst-dark a:hover {
                color: #d1d5db !important;
            }
            body.sfx-pst-dark header,
            body.sfx-pst-dark nav,
            body.sfx-pst-dark footer,
            body.sfx-pst-dark .header,
            body.sfx-pst-dark .nav,
            body.sfx-pst-dark .footer {
                background: #111115 !important;
                border-color: rgba(255,255,255,0.06) !important;
            }
            body.sfx-pst-dark input:not([class^="sfx-"]):not([class*=" sfx-"]):not([id^="sfx-"]),
            body.sfx-pst-dark select:not([class^="sfx-"]):not([class*=" sfx-"]):not([id^="sfx-"]),
            body.sfx-pst-dark button:not(#sfx-island-wrap button):not([class^="sfx-"]):not([class*=" sfx-"]):not([id^="sfx-"]) {
                background: #27272a !important;
                color: #e4e4e7 !important;
                border-color: rgba(255,255,255,0.12) !important;
            }
            body.sfx-pst-dark .sinflix-res-header {
                color: #a3e635 !important;
            }
        `;
    }

    // Floating notifications (global, works on rentry and pst.moe)
    css += `
        /* --- Floating Notification --- */
        .sfx-notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateZ(0);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10005;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            will-change: transform;
        }
        .sfx-notification.show {
            opacity: 1;
            transform: translateX(-50%) translateY(10px);
        }
        .sfx-notification.success {
            background: rgba(34, 139, 34, 0.9);
            border-color: rgba(34, 139, 34, 0.3);
        }
        .sfx-notification.error {
            background: rgba(220, 20, 60, 0.9);
            border-color: rgba(220, 20, 60, 0.3);
        }
        .sfx-notification.info {
            background: rgba(30, 144, 255, 0.9);
            border-color: rgba(30, 144, 255, 0.3);
        }
    `;

    // Append styles instantly at document-start to prevent FOUC
    if (typeof GM_addStyle !== 'undefined') {
        GM_addStyle(css);
    }
    const style = document.createElement('style');
    style.textContent = css;
    const target = document.head || document.documentElement;
    if (target) {
        target.appendChild(style);
    } else {
        const observer = new MutationObserver(() => {
            const root = document.documentElement;
            if (root) {
                root.appendChild(style);
                observer.disconnect();
            }
        });
        observer.observe(document, { childList: true, subtree: true });
    }

    // --- Dynamic Island logic ---
    let matches = [];
    let activeMatchIndex = -1;

    function escapeRegex(string) {
        return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    function highlightActiveMatch() {
        matches.forEach((m, idx) => {
            if (idx === activeMatchIndex) {
                m.classList.add('sfx-current-match');
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                m.classList.remove('sfx-current-match');
            }
        });
    }

    function updateCounter(current, total) {
        const countEl = document.getElementById('sfx-island-count');
        const prevBtn = document.getElementById('sfx-island-prev');
        const nextBtn = document.getElementById('sfx-island-next');
        if (!countEl) return;

        if (total > 0) {
            countEl.textContent = `${current}/${total}`;
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        } else {
            countEl.textContent = '0/0';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }
    }

    function performSearch(query) {
        clearHighlights();
        if (!query || query.length < 2) {
            updateCounter(0, 0);
            return;
         }

         const contentArea = document.querySelector('.entry-text article');
         if (!contentArea) return;

         const textNodes = [];
         const walker = document.createTreeWalker(contentArea, NodeFilter.SHOW_TEXT, {
             acceptNode: (n) => {
                 if (n.parentNode.closest('script, style, #sfx-island-wrap, .kdrama-circle-container')) return NodeFilter.FILTER_REJECT;
                 return NodeFilter.FILTER_ACCEPT;
             }
         });
         let node;
         while (node = walker.nextNode()) {
             textNodes.push(node);
         }

         const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
         matches = [];

         textNodes.forEach(node => {
             const val = node.nodeValue;
             if (regex.test(val)) {
                 const span = document.createElement('span');
                 span.innerHTML = val.replace(regex, '<span class="sfx-search-highlight">$1</span>');

                 const highlights = Array.from(span.querySelectorAll('.sfx-search-highlight'));
                 node.parentNode.replaceChild(span, node);

                 const parent = span.parentNode;
                 while (span.firstChild) {
                     parent.insertBefore(span.firstChild, span);
                 }
                 parent.removeChild(span);

                 matches.push(...highlights);
             }
         });

         activeMatchIndex = -1;
         if (matches.length > 0) {
             activeMatchIndex = 0;
             highlightActiveMatch();
         }
         updateCounter(activeMatchIndex + 1, matches.length);
    }

    function clearHighlights() {
        const highlights = document.querySelectorAll('.sfx-search-highlight');
        highlights.forEach(hl => {
            const text = document.createTextNode(hl.textContent);
            hl.parentNode.replaceChild(text, hl);
        });
        const contentArea = document.querySelector('.entry-text article');
        if (contentArea) contentArea.normalize();
        matches = [];
        activeMatchIndex = -1;
    }

    function getSetting(key, defaultValue) {
        let val = undefined;
        let fromGM = false;
        let fromLS = false;
        if (typeof GM_getValue !== 'undefined') {
            try {
                val = GM_getValue(key);
                if (val !== undefined && val !== null && val !== '') {
                    fromGM = true;
                }
            } catch (e) {
                console.warn('SinFlixModifier GM_getValue error:', e);
            }
        }
        if (val === undefined || val === null || val === '') {
            try {
                const lsVal = localStorage.getItem(key);
                if (lsVal !== null && lsVal !== undefined && lsVal !== '') {
                    try {
                        val = JSON.parse(lsVal);
                    } catch (e) {
                        val = lsVal;
                    }
                    if (val !== undefined && val !== null && val !== '') {
                        fromLS = true;
                    }
                }
            } catch (e) {
                console.warn('SinFlixModifier localStorage error:', e);
            }
        }
        const finalVal = (val !== undefined && val !== null && val !== '') ? val : defaultValue;
        if (fromGM && !fromLS) {
            try {
                if (localStorage.getItem(key) === null) {
                    localStorage.setItem(key, JSON.stringify(finalVal));
                }
            } catch (e) {}
        } else if (fromLS && !fromGM && typeof GM_setValue !== 'undefined') {
            try {
                GM_setValue(key, finalVal);
            } catch (e) {}
        }
        return finalVal;
    }


    function setSetting(key, value) {
        if (typeof GM_setValue !== 'undefined') {
            try {
                GM_setValue(key, value);
            } catch (e) {
                console.warn('SinFlixModifier GM_setValue error:', e);
            }
        }
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('SinFlixModifier localStorage.setItem error:', e);
        }
    }

    function updateBackToTopVisibility() {
        const topBtn = document.getElementById('sfx-back-to-top');
        if (topBtn) {
            const isEnabled = getSetting('sfx-back-to-top-enabled', true);
            if (isEnabled && window.scrollY > 300) {
                topBtn.classList.add('sfx-show');
            } else {
                topBtn.classList.remove('sfx-show');
            }
        }
    }

    function setupIslandEvents(wrap) {
        const input = wrap.querySelector('#sfx-island-input');
        const prevBtn = wrap.querySelector('#sfx-island-prev');
        const nextBtn = wrap.querySelector('#sfx-island-next');
        const chatBtn = wrap.querySelector('#sfx-island-chat');
        const settingsBtn = wrap.querySelector('#sfx-island-settings');
        const settingsCloseBtn = wrap.querySelector('#sfx-island-settings-close');
        const toggleInput = wrap.querySelector('#sfx-toggle-back-to-top');
        const toggleBuzzheavier = wrap.querySelector('#sfx-toggle-buzzheavier');
        const toggleBuzzheavierUI = wrap.querySelector('#sfx-toggle-buzzheavier-ui');
        const toggleBuzzheavierSplit = wrap.querySelector('#sfx-toggle-buzzheavier-split');
        const toggleBuzzheavierCopyAll = wrap.querySelector('#sfx-toggle-buzzheavier-copy-all');
        const toggleBuzzheavierCustomSelect = wrap.querySelector('#sfx-toggle-buzzheavier-custom-select');
        const selectDownloadStyle = wrap.querySelector('#sfx-select-download-style');
        const toggleDramaSearch = wrap.querySelector('#sfx-toggle-drama-search');
        const toggleMoveOngoing = wrap.querySelector('#sfx-toggle-move-ongoing');
        const toggleMegaFetchrr = wrap.querySelector('#sfx-toggle-mega-fetchrr');
        const selectMegaFetchrrStyle = wrap.querySelector('#sfx-select-mega-fetchrr-style');
        const selectChatStyle = wrap.querySelector('#sfx-select-chat-style');
        const selectDramaStyle = wrap.querySelector('#sfx-select-drama-style');
        const selectFileDitchStyle = wrap.querySelector('#sfx-select-fileditch-style');
        const inputGoogleSuffix = wrap.querySelector('#sfx-input-google-suffix');
        const toggleTmdbEnabled = wrap.querySelector('#sfx-toggle-tmdb-enabled');
        const inputTmdbReadToken = wrap.querySelector('#sfx-input-tmdb-read-token');
        const inputTmdbApiKey = wrap.querySelector('#sfx-input-tmdb-api-key');
        const btnSaveTmdb = wrap.querySelector('#sfx-save-tmdb-btn');
        const btnSaveTmdbText = wrap.querySelector('#sfx-save-tmdb-btn-text');
        const togglePstDark = wrap.querySelector('#sfx-toggle-pst-dark');
        const togglePstCopyOptions = wrap.querySelector('#sfx-toggle-pst-copy-options');
        const togglePstSameTab = wrap.querySelector('#sfx-toggle-pst-same-tab');
        const toggleDarklabDark = wrap.querySelector('#sfx-toggle-darklab-dark');
        const toggleDarklabCopyOptions = wrap.querySelector('#sfx-toggle-darklab-copy-options');
        const toggleDarklabSameTab = wrap.querySelector('#sfx-toggle-darklab-same-tab');
        const toggleTransferItUI = wrap.querySelector('#sfx-toggle-transferit-ui');
        const toggleTransferItCopyAll = wrap.querySelector('#sfx-toggle-transferit-copy-all');
        const clearBtn = wrap.querySelector('#sfx-island-search-clear');

        let isFocused = false;
        let isHovered = false;
        let isScrolled = false;

        function updateIslandState() {
            if (wrap.classList.contains('sfx-settings-open') || wrap.classList.contains('sfx-progress-mode')) {
                wrap.classList.remove('sfx-collapsed');
                return;
            }
            if (isFocused || isHovered || !isScrolled) {
                wrap.classList.remove('sfx-collapsed');
            } else {
                wrap.classList.add('sfx-collapsed');
            }
        }

        // Scroll listener
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY > 80;
            if (scrolled !== isScrolled) {
                isScrolled = scrolled;
                updateIslandState();
            }
            updateBackToTopVisibility();
        }, { passive: true });

        // Hover listeners
        wrap.addEventListener('mouseenter', () => {
            isHovered = true;
            updateIslandState();
        });

        wrap.addEventListener('mouseleave', () => {
            isHovered = false;
            updateIslandState();
        });

        // Prevent scroll leakage from settings panel to parent site page
        wrap.addEventListener('wheel', (e) => {
            if (!wrap.classList.contains('sfx-settings-open')) return;

            const scrollContainer = wrap.querySelector('.sfx-settings-scroll-container');
            if (!scrollContainer) return;

            const isInsideScroll = e.target.closest('.sfx-settings-scroll-container');
            if (!isInsideScroll) {
                // Scroll happened on settings background/header - prevent scrolling the main site page
                e.preventDefault();
                return;
            }

            // Scroll happened inside the scroll container - prevent scroll leakage at boundaries
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            const delta = e.deltaY;

            if (delta < 0 && scrollTop <= 0) {
                // Scrolling up at the top limit
                e.preventDefault();
            } else if (delta > 0 && scrollTop + clientHeight >= scrollHeight - 0.5) {
                // Scrolling down at the bottom limit
                e.preventDefault();
            }
        }, { passive: false });

        // Focus listeners
        input.addEventListener('focus', () => {
            isFocused = true;
            updateIslandState();
        });

        input.addEventListener('blur', () => {
            isFocused = false;
            updateIslandState();
        });

        // Click collapsed control -> expand and focus
        wrap.addEventListener('click', (e) => {
            if (wrap.classList.contains('sfx-collapsed')) {
                e.preventDefault();
                e.stopPropagation();
                wrap.classList.remove('sfx-collapsed');
                setTimeout(() => input.focus(), 150);
            }
        });

        // Prev / Next actions
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (matches.length === 0) return;
            activeMatchIndex = (activeMatchIndex - 1 + matches.length) % matches.length;
            highlightActiveMatch();
            updateCounter(activeMatchIndex + 1, matches.length);
        });

        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (matches.length === 0) return;
            activeMatchIndex = (activeMatchIndex + 1) % matches.length;
            highlightActiveMatch();
            updateCounter(activeMatchIndex + 1, matches.length);
        });

        // Search text input handler
        let debounceTimer;
        input.addEventListener('input', () => {
            clearBtn.style.display = input.value ? 'flex' : 'none';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                performSearch(input.value.trim());
            }, 250);
        });

        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            clearBtn.style.display = 'none';
            performSearch('');
            input.focus();
        });

        // Action buttons listeners
        chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const style = getSetting('sfx-chat-open-style', 'tab');
            const chatUrl = 'https://my.cbox.ws/sin-flix';
            if (style === 'popup') {
                const w = 900, h = 650;
                const left = Math.round((screen.width - w) / 2);
                const top = Math.round((screen.height - h) / 2);
                window.open(chatUrl, '_blank', `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,status=no,location=yes`);
            } else {
                window.open(chatUrl, '_blank');
            }
        });

        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            wrap.classList.add('sfx-settings-open');
            if (inputTmdbReadToken) {
                const { readToken } = getTmdbCredentials();
                inputTmdbReadToken.value = readToken;
            }
            if (inputTmdbApiKey) {
                const { apiKey } = getTmdbCredentials();
                inputTmdbApiKey.value = apiKey;
            }
            updateIslandState();
        });

        settingsCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof saveTmdbCredentials === 'function') {
                saveTmdbCredentials(false);
            }
            wrap.classList.remove('sfx-settings-open');
            updateIslandState();
        });

        // Initialize toggle states
        toggleInput.checked = getSetting('sfx-back-to-top-enabled', true);
        toggleInput.addEventListener('change', () => {
            setSetting('sfx-back-to-top-enabled', toggleInput.checked);
            updateBackToTopVisibility();
        });

        toggleBuzzheavier.checked = getSetting('sfx-buzzheavier-convert', true);
        toggleBuzzheavier.addEventListener('change', () => {
            setSetting('sfx-buzzheavier-convert', toggleBuzzheavier.checked);
            if (toggleBuzzheavier.checked) {
                const content = document.querySelector('.entry-text article');
                if (content) {
                    enhancePageContent(content);
                }
            }
        });

        toggleBuzzheavierUI.checked = getSetting('sfx-buzzheavier-ui-enhancements', true);
        toggleBuzzheavierUI.addEventListener('change', () => {
            setSetting('sfx-buzzheavier-ui-enhancements', toggleBuzzheavierUI.checked);
            if (window.location.hostname.includes('buzzheavier.com')) {
                if (typeof bhRunEnhance === 'function') bhRunEnhance();
                else enhanceBuzzheavierContent();
            }
        });

        if (toggleBuzzheavierSplit) {
            toggleBuzzheavierSplit.checked = getSetting('sfx-bh-quality-split', true);
            toggleBuzzheavierSplit.addEventListener('change', () => {
                setSetting('sfx-bh-quality-split', toggleBuzzheavierSplit.checked);
                if (window.location.hostname.includes('buzzheavier.com')) {
                    if (typeof bhRunEnhance === 'function') bhRunEnhance();
                    else enhanceBuzzheavierContent();
                }
            });
        }

        if (toggleBuzzheavierCopyAll) {
            toggleBuzzheavierCopyAll.checked = getSetting('sfx-bh-copy-all', true);
            toggleBuzzheavierCopyAll.addEventListener('change', () => {
                setSetting('sfx-bh-copy-all', toggleBuzzheavierCopyAll.checked);
                if (window.location.hostname.includes('buzzheavier.com')) {
                    if (typeof bhRunEnhance === 'function') bhRunEnhance();
                    else enhanceBuzzheavierContent();
                }
            });
        }

        if (toggleBuzzheavierCustomSelect) {
            toggleBuzzheavierCustomSelect.checked = getSetting('sfx-bh-custom-select', true);
            toggleBuzzheavierCustomSelect.addEventListener('change', () => {
                setSetting('sfx-bh-custom-select', toggleBuzzheavierCustomSelect.checked);
                if (window.location.hostname.includes('buzzheavier.com')) {
                    if (typeof bhRunEnhance === 'function') bhRunEnhance();
                    else enhanceBuzzheavierContent();
                }
            });
        }

        if (toggleTransferItUI) {
            toggleTransferItUI.checked = getSetting('sfx-transferit-ui-enhancements', true);
            toggleTransferItUI.addEventListener('change', () => {
                setSetting('sfx-transferit-ui-enhancements', toggleTransferItUI.checked);
                if (window.location.hostname.includes('transfer.it')) {
                    if (typeof tiRunEnhance === 'function') tiRunEnhance();
                    else enhanceTransferItContent();
                }
            });
        }

        if (toggleTransferItCopyAll) {
            toggleTransferItCopyAll.checked = getSetting('sfx-transferit-copy-all', true);
            toggleTransferItCopyAll.addEventListener('change', () => {
                setSetting('sfx-transferit-copy-all', toggleTransferItCopyAll.checked);
                if (window.location.hostname.includes('transfer.it')) {
                    if (typeof tiRunEnhance === 'function') tiRunEnhance();
                    else enhanceTransferItContent();
                }
            });
        }

        selectDownloadStyle.value = getSetting('sfx-download-link-style', 'tab');
        selectDownloadStyle.addEventListener('change', () => {
            setSetting('sfx-download-link-style', selectDownloadStyle.value);
        });

        toggleDramaSearch.checked = getSetting('sfx-drama-search-enabled', true);
        toggleDramaSearch.addEventListener('change', () => {
            setSetting('sfx-drama-search-enabled', toggleDramaSearch.checked);
            if (toggleDramaSearch.checked) {
                const content = document.querySelector('.entry-text article');
                if (content) {
                    enhancePageContent(content);
                }
            } else {
                // Instantly unwrap and restore drama titles on page
                document.querySelectorAll('.sfx-drama-title').forEach(el => {
                    const parent = el.parentNode;
                    if (parent) {
                        const textNode = document.createTextNode(el.textContent);
                        parent.replaceChild(textNode, el);
                    }
                });
                const contentArea = document.querySelector('.entry-text article');
                if (contentArea) contentArea.normalize();
            }
        });

        toggleMoveOngoing.checked = getSetting('sfx-move-ongoing-top', false);
        toggleMoveOngoing.addEventListener('change', () => {
            setSetting('sfx-move-ongoing-top', toggleMoveOngoing.checked);
            if (toggleMoveOngoing.checked) {
                reorderSections();
            } else {
                if (confirm('Restoring section order requires a page reload. Reload now?')) {
                    window.location.reload();
                }
            }
        });

        toggleMegaFetchrr.checked = getSetting('sfx-mega-fetchrr-enabled', true);
        toggleMegaFetchrr.addEventListener('change', () => {
            setSetting('sfx-mega-fetchrr-enabled', toggleMegaFetchrr.checked);
        });

        selectMegaFetchrrStyle.value = getSetting('sfx-mega-fetchrr-open-style', 'tab');
        selectMegaFetchrrStyle.addEventListener('change', () => {
            setSetting('sfx-mega-fetchrr-open-style', selectMegaFetchrrStyle.value);
        });

        selectChatStyle.value = getSetting('sfx-chat-open-style', 'tab');
        selectChatStyle.addEventListener('change', () => {
            setSetting('sfx-chat-open-style', selectChatStyle.value);
        });

        selectDramaStyle.value = getSetting('sfx-drama-search-open-style', 'tab');
        selectDramaStyle.addEventListener('change', () => {
            setSetting('sfx-drama-search-open-style', selectDramaStyle.value);
        });

        selectFileDitchStyle.value = getSetting('sfx-fileditch-open-style', 'popup');
        selectFileDitchStyle.addEventListener('change', () => {
            setSetting('sfx-fileditch-open-style', selectFileDitchStyle.value);
        });

        inputGoogleSuffix.value = getSetting('sfx-google-search-suffix', 'TV Series');
        inputGoogleSuffix.addEventListener('input', () => {
            setSetting('sfx-google-search-suffix', inputGoogleSuffix.value.trim());
        });

        if (toggleTmdbEnabled) {
            toggleTmdbEnabled.checked = getSetting('sfx-tmdb-enabled', false);
            toggleTmdbEnabled.addEventListener('change', () => {
                setSetting('sfx-tmdb-enabled', toggleTmdbEnabled.checked);
            });
        }

        function saveTmdbCredentials(showFeedback = true) {
            let readVal = inputTmdbReadToken ? inputTmdbReadToken.value.trim() : '';
            let apiVal = inputTmdbApiKey ? inputTmdbApiKey.value.trim() : '';
            if (readVal.toLowerCase().startsWith('bearer ')) {
                readVal = readVal.slice(7).trim();
                if (inputTmdbReadToken) inputTmdbReadToken.value = readVal;
            }
            setSetting('sfx-tmdb-read-token', readVal);
            setSetting('sfx-tmdb-api-key', apiVal);

            if (showFeedback && btnSaveTmdb && btnSaveTmdbText) {
                btnSaveTmdb.classList.add('sfx-saved');
                btnSaveTmdbText.textContent = 'Saved \u2713';
                setTimeout(() => {
                    btnSaveTmdb.classList.remove('sfx-saved');
                    btnSaveTmdbText.textContent = 'Save Credentials';
                }, 2000);
            }
        }

        if (inputTmdbReadToken) {
            const { readToken } = getTmdbCredentials();
            inputTmdbReadToken.value = readToken;
            ['input', 'change', 'blur', 'paste', 'keyup'].forEach(evtType => {
                inputTmdbReadToken.addEventListener(evtType, () => saveTmdbCredentials(false));
            });
            inputTmdbReadToken.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveTmdbCredentials(true);
                }
            });
        }

        if (inputTmdbApiKey) {
            const { apiKey } = getTmdbCredentials();
            inputTmdbApiKey.value = apiKey;
            ['input', 'change', 'blur', 'paste', 'keyup'].forEach(evtType => {
                inputTmdbApiKey.addEventListener(evtType, () => saveTmdbCredentials(false));
            });
            inputTmdbApiKey.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveTmdbCredentials(true);
                }
            });
        }

        if (btnSaveTmdb) {
            btnSaveTmdb.addEventListener('click', (e) => {
                e.preventDefault();
                saveTmdbCredentials(true);
            });
        }

        window.addEventListener('beforeunload', () => {
            saveTmdbCredentials(false);
        });

        if (togglePstDark) {
            togglePstDark.checked = getSetting('sfx-pst-dark-mode', false);
            togglePstDark.addEventListener('change', () => {
                setSetting('sfx-pst-dark-mode', togglePstDark.checked);
                applyPstDarkMode(togglePstDark.checked);
            });
        }

        if (togglePstCopyOptions) {
            togglePstCopyOptions.checked = getSetting('sfx-pst-copy-options', true);
            togglePstCopyOptions.addEventListener('change', () => {
                setSetting('sfx-pst-copy-options', togglePstCopyOptions.checked);
                if (window.location.hostname.includes('pst.moe')) {
                    window.location.reload();
                }
            });
        }

        if (togglePstSameTab) {
            togglePstSameTab.checked = getSetting('sfx-pst-open-same-tab', true);
            togglePstSameTab.addEventListener('change', () => {
                setSetting('sfx-pst-open-same-tab', togglePstSameTab.checked);
            });
        }

        const isDarklabPage = window.location.hostname.includes('darklab.sh') ||
                              window.location.hostname.includes('0g.gg') ||
                              window.location.href.includes('darklab.sh') ||
                              window.location.href.includes('0g.gg') ||
                              (document.querySelector('#prettyprint, #prettymessage, #cleartext') !== null && !window.location.hostname.includes('pst.moe'));

        if (toggleDarklabDark) {
            toggleDarklabDark.checked = getSetting('sfx-darklab-dark-mode', false);
            toggleDarklabDark.addEventListener('change', () => {
                setSetting('sfx-darklab-dark-mode', toggleDarklabDark.checked);
                if (isDarklabPage) {
                    applyPstDarkMode(toggleDarklabDark.checked);
                }
            });
        }

        if (toggleDarklabCopyOptions) {
            toggleDarklabCopyOptions.checked = getSetting('sfx-darklab-copy-options', true);
            toggleDarklabCopyOptions.addEventListener('change', () => {
                setSetting('sfx-darklab-copy-options', toggleDarklabCopyOptions.checked);
                if (isDarklabPage) {
                    window.location.reload();
                }
            });
        }

        if (toggleDarklabSameTab) {
            toggleDarklabSameTab.checked = getSetting('sfx-darklab-open-same-tab', true);
            toggleDarklabSameTab.addEventListener('change', () => {
                setSetting('sfx-darklab-open-same-tab', toggleDarklabSameTab.checked);
            });
        }
    }

    function applyPstDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('sfx-pst-dark');
        } else {
            document.body.classList.remove('sfx-pst-dark');
        }
    }

    function reorderSections() {
        const content = document.querySelector('.entry-text article');
        if (!content) return;
        if (content.dataset.sectionsReordered === 'true') return;

        try {
            const headers = Array.from(content.querySelectorAll('h4'));
            let currentlyAiringHeader = null;
            let insertBeforeHeader = null;

            for (const header of headers) {
                if (header.textContent.trim().toLowerCase().includes('currently airing')) {
                    currentlyAiringHeader = header;
                    break;
                }
            }

            if (!currentlyAiringHeader) {
                headers.forEach(h => h.classList.add('sinflix-visible'));
                content.dataset.sectionsReordered = 'true';
                return;
            }

            const firstH4 = headers[0];
            for (const header of headers) {
                if (header === firstH4) continue;
                if (header === currentlyAiringHeader) continue;
                insertBeforeHeader = header;
                break;
            }

            if (!insertBeforeHeader) {
                headers.forEach(h => h.classList.add('sinflix-visible'));
                content.dataset.sectionsReordered = 'true';
                return;
            }

            const airingIndex = headers.indexOf(currentlyAiringHeader);
            const insertIndex = headers.indexOf(insertBeforeHeader);

            if (airingIndex < insertIndex) {
                content.dataset.sectionsReordered = 'true';
                headers.forEach(h => h.classList.add('sinflix-visible'));
                return;
            }

            const currentlyAiringContent = [];
            let currentElement = currentlyAiringHeader.nextElementSibling;
            while (currentElement && currentElement.tagName !== 'H4') {
                currentlyAiringContent.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }

            currentlyAiringHeader.remove();
            currentlyAiringContent.forEach(el => el.remove());

            const parentElement = insertBeforeHeader.parentNode;
            parentElement.insertBefore(currentlyAiringHeader, insertBeforeHeader);

            let insertAfter = currentlyAiringHeader;
            currentlyAiringContent.forEach(el => {
                parentElement.insertBefore(el, insertAfter.nextSibling);
                insertAfter = el;
            });

            if (insertAfter.nextSibling && insertAfter.nextSibling.tagName !== 'HR') {
                const separator = document.createElement('hr');
                parentElement.insertBefore(separator, insertAfter.nextSibling);
            }

            content.dataset.sectionsReordered = 'true';
            content.querySelectorAll('h4').forEach(h => h.classList.add('sinflix-visible'));
        } catch (error) {
            console.error('Sinflix Modifier: Error reordering sections:', error);
            content.querySelectorAll('h4').forEach(h => h.classList.add('sinflix-visible'));
        }
    }

    function enhanceDayHeaders(root) {
        if (!root) return;
        const blockquotes = root.querySelectorAll('blockquote');
        const dayRegex = /daily|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i;
        blockquotes.forEach(bq => {
            const p = bq.querySelector('p');
            if (!p) return;
            const text = p.textContent.trim();
            if (dayRegex.test(text)) {
                bq.classList.add('sfx-day-header');

                let titleText = text;
                let noteText = '';
                const openParenIdx = text.indexOf('(');
                if (openParenIdx !== -1) {
                    titleText = text.slice(0, openParenIdx).trim();
                    noteText = text.slice(openParenIdx).trim();
                }

                bq.innerHTML = `
                    <div class="sfx-day-header-wrap">
                        <div class="sfx-day-header-main">
                            <svg class="sfx-day-icon" viewBox="0 0 24 24">
                                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5H7v2h5v-2zm4 0h-3v2h3v-2zm-4 4H7v2h5v-2zm4 0h-3v2h3v-2z"/>
                            </svg>
                            <span class="sfx-day-title">${titleText}</span>
                        </div>
                        ${noteText ? `<span class="sfx-day-note">${noteText}</span>` : ''}
                    </div>
                `;
            }
        });
    }

    function setupCompletedDramasFilter(content) {
        if (!content) return;
        const completedHeader = document.getElementById('completed-korean-dramas');
        if (!completedHeader) return;

        let listP = completedHeader.nextElementSibling;
        // Skip the orange warning paragraph if it exists
        if (listP && (listP.querySelector('span[style*="color:orange"]') || listP.textContent.includes('dead links'))) {
            listP = listP.nextElementSibling;
        }

        if (!listP || listP.tagName !== 'P') return;

        const childNodes = Array.from(listP.childNodes);
        const items = [];
        let currentItemNodes = [];

        childNodes.forEach(node => {
            if (node.nodeName === 'BR') {
                if (currentItemNodes.length > 0) {
                    items.push(currentItemNodes);
                    currentItemNodes = [];
                }
            } else {
                currentItemNodes.push(node);
            }
        });
        if (currentItemNodes.length > 0) {
            items.push(currentItemNodes);
        }

        const container = document.createElement('div');
        container.id = 'sfx-completed-dramas-container';

        items.forEach(nodes => {
            // Check if the item contains non-whitespace text or has element children
            const hasContent = nodes.some(n => {
                if (n.nodeType === Node.ELEMENT_NODE) return true;
                if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) return true;
                return false;
            });
            if (!hasContent) return;

            let text = '';
            nodes.forEach(n => {
                text += n.textContent;
            });

            const epMatch = text.match(/\((\d+)\s*ep/i);
            let episodes = null;
            if (epMatch) {
                episodes = parseInt(epMatch[1], 10);
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'sfx-completed-drama-item';
            itemDiv.style.marginBottom = '6px';
            if (episodes !== null) {
                itemDiv.dataset.episodes = episodes;
            }

            nodes.forEach(node => {
                itemDiv.appendChild(node);
            });

            container.appendChild(itemDiv);
        });

        listP.parentNode.replaceChild(container, listP);

        // Calculate counts for each range dynamically
        const dramaItems = container.querySelectorAll('.sfx-completed-drama-item');
        const counts = { all: dramaItems.length, '12': 0, '16': 0, '20': 0, '30': 0, '50': 0, '100': 0, '100+': 0 };
        dramaItems.forEach(item => {
            const episodes = parseInt(item.dataset.episodes, 10);
            if (!isNaN(episodes)) {
                if (episodes <= 12) counts['12']++;
                else if (episodes <= 16) counts['16']++;
                else if (episodes <= 20) counts['20']++;
                else if (episodes <= 30) counts['30']++;
                else if (episodes <= 50) counts['50']++;
                else if (episodes <= 100) counts['100']++;
                else counts['100+']++;
            }
        });

        // Create filter chips container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'sfx-filter-container';

        const filterRanges = [
            { label: 'All', key: 'all' },
            { label: '<= 12', key: '12' },
            { label: '<= 16', key: '16' },
            { label: '<= 20', key: '20' },
            { label: '<= 30', key: '30' },
            { label: '<= 50', key: '50' },
            { label: '<= 100', key: '100' },
            { label: '100+', key: '100+' }
        ];

        function filterCompletedDramas(rangeKey) {
            const itemsToFilter = container.querySelectorAll('.sfx-completed-drama-item');
            itemsToFilter.forEach(item => {
                const episodes = parseInt(item.dataset.episodes, 10);
                let visible = false;

                if (rangeKey === 'all') {
                    visible = true;
                } else if (isNaN(episodes)) {
                    visible = false;
                } else {
                    switch (rangeKey) {
                        case '12':
                            visible = (episodes <= 12);
                            break;
                        case '16':
                            visible = (episodes > 12 && episodes <= 16);
                            break;
                        case '20':
                            visible = (episodes > 16 && episodes <= 20);
                            break;
                        case '30':
                            visible = (episodes > 20 && episodes <= 30);
                            break;
                        case '50':
                            visible = (episodes > 30 && episodes <= 50);
                            break;
                        case '100':
                            visible = (episodes > 50 && episodes <= 100);
                            break;
                        case '100+':
                            visible = (episodes > 100);
                            break;
                    }
                }

                item.style.display = visible ? '' : 'none';
            });
        }

        filterRanges.forEach(range => {
            const chip = document.createElement('button');
            chip.className = 'sfx-filter-chip';
            if (range.key === 'all') chip.classList.add('sfx-active');

            const labelSpan = document.createElement('span');
            labelSpan.textContent = range.label;
            chip.appendChild(labelSpan);

            const countVal = counts[range.key];
            if (countVal !== undefined) {
                const countSpan = document.createElement('span');
                countSpan.className = 'sfx-filter-chip-count';
                countSpan.textContent = countVal;
                chip.appendChild(countSpan);
            }

            chip.dataset.key = range.key;

            chip.addEventListener('click', () => {
                filterContainer.querySelectorAll('.sfx-filter-chip').forEach(c => c.classList.remove('sfx-active'));
                chip.classList.add('sfx-active');
                filterCompletedDramas(range.key);
            });

            filterContainer.appendChild(chip);
        });

        container.parentNode.insertBefore(filterContainer, container);
    }

    function enhancePageContent(root) {
        if (!root) return;
        const convertBuzz = getSetting('sfx-buzzheavier-convert', true);
        const searchEnabled = getSetting('sfx-drama-search-enabled', true);

        if (!convertBuzz && !searchEnabled) return;

        const buzzRegex = /\b(?![a-zA-Z]{12}\b)([a-zA-Z0-9]{12})\b/g;
        const dramaPatterns = [
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[/,
            /^(?:\(reup\)|\(redo\))?\s*([^([]+?)\s*[\[(][^\])]*[\])][\s\S]*?\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)\s*-/i,
            /^([a-zA-Z0-9][^[]*?)\s*\[/,
            /^(?:\(reup\)|\(redo\))?\s*([^-]+?)\s*-\s*coming\s+soon/i,
            /^(?:\(reup\)|\(redo\))?\s*([^-]+?)\s*-\s*$/,
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)\s*-/i,
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?(?:\s+S\d+)?)\s*\[.*?\]\s*\(\d+ep\)\s*-/i,
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\(e\d+\s+of\s+\d+\)\s*-/i,
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\(.*?ep.*?\)\s*-/i,
            /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)/i
        ];

        function getDramaMatch(line) {
            if (!searchEnabled) return null;
            const cleanText = line.trim();
            if (cleanText.length < 10) return null;

            const lower = cleanText.toLowerCase();
            if (!cleanText.includes('[') && !cleanText.includes('(') && !cleanText.includes('-') && !lower.includes('soon')) {
                return null;
            }

            for (const pattern of dramaPatterns) {
                const match = line.match(pattern);
                if (match && match[1]) {
                    const dramaName = match[1].trim().replace(/:$/, '').trim().replace(/\s+/g, ' ');
                    if (dramaName.length > 0 && dramaName.length < 200) {
                        const rawText = match[1];
                        const startIndex = line.indexOf(rawText);
                        if (startIndex !== -1) {
                            return {
                                name: dramaName,
                                start: startIndex,
                                length: rawText.length
                            };
                        }
                    }
                }
            }
            return null;
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function(n) {
                const parent = n.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
                if (parent.closest('a, .sfx-drama-title')) return NodeFilter.FILTER_REJECT;
                return n.nodeValue.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        let idx = 0;
        function processBatch() {
            const batchSize = 80;
            const end = Math.min(idx + batchSize, textNodes.length);
            for (; idx < end; idx++) {
                const textNode = textNodes[idx];
                const parent = textNode.parentNode;
                if (!parent) continue;

                const text = textNode.nodeValue;
                buzzRegex.lastIndex = 0;
                const hasBuzzId = convertBuzz && buzzRegex.test(text);
                const mightHaveDrama = searchEnabled && (text.includes('[') || text.includes('(') || text.includes('-') || text.toLowerCase().includes('soon'));

                if (!hasBuzzId && !mightHaveDrama) continue;

                const lines = text.split('\n');
                const fragment = document.createDocumentFragment();
                let modified = false;

                lines.forEach((line, lineIdx) => {
                    const lineFrag = document.createDocumentFragment();
                    const dramaMatch = getDramaMatch(line);

                    if (dramaMatch) {
                        modified = true;
                        // Prefix before drama name
                        if (dramaMatch.start > 0) {
                            lineFrag.appendChild(document.createTextNode(line.slice(0, dramaMatch.start)));
                        }

                        // Drama name title span
                        const titleSpan = document.createElement('span');
                        titleSpan.className = 'sfx-drama-title';
                        titleSpan.setAttribute('data-name', dramaMatch.name);
                        titleSpan.textContent = line.slice(dramaMatch.start, dramaMatch.start + dramaMatch.length);
                        lineFrag.appendChild(titleSpan);

                        // Suffix after drama name
                        const suffix = line.slice(dramaMatch.start + dramaMatch.length);
                        if (suffix.length > 0) {
                            if (convertBuzz) {
                                lineFrag.appendChild(convertTextWithLinks(suffix, buzzRegex));
                            } else {
                                lineFrag.appendChild(document.createTextNode(suffix));
                            }
                        }
                    } else {
                        // Just regular text (maybe convert BuzzHeavier)
                        if (convertBuzz && buzzRegex.test(line)) {
                            modified = true;
                            lineFrag.appendChild(convertTextWithLinks(line, buzzRegex));
                        } else {
                            lineFrag.appendChild(document.createTextNode(line));
                        }
                    }

                    fragment.appendChild(lineFrag);
                    if (lineIdx < lines.length - 1) {
                        fragment.appendChild(document.createTextNode('\n'));
                    }
                });

                if (modified) {
                    parent.replaceChild(fragment, textNode);
                }
            }

            if (idx < textNodes.length) {
                setTimeout(processBatch, 0);
            }
        }

        function convertTextWithLinks(text, regex) {
            regex.lastIndex = 0;
            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            let match;
            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIdx) {
                    frag.appendChild(document.createTextNode(text.slice(lastIdx, match.index)));
                }
                const link = document.createElement('a');
                link.href = 'https://buzzheavier.com/' + match[1];
                link.textContent = link.href;
                const dlStyle = getSetting('sfx-download-link-style', 'tab');
                if (dlStyle === 'popup') {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        sfxOpenPopup(this.href);
                    });
                    link.removeAttribute('target');
                } else {
                    link.target = '_blank';
                }
                frag.appendChild(link);
                lastIdx = match.index + match[0].length;
            }
            if (lastIdx < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIdx)));
            }
            return frag;
        }

        processBatch();
    }

    function sfxOpenPopup(url) {
        const pw = 950;
        const ph = 700;
        const pl = Math.round((screen.width - pw) / 2);
        const pt = Math.round((screen.height - ph) / 2);
        const name = "sfx_popup_" + Math.random().toString(36).substring(2, 9);
        const w = window.open(url, name, `popup=yes,width=${pw},height=${ph},left=${pl},top=${pt},menubar=no,toolbar=no,status=no,location=yes,resizable=yes,scrollbars=yes`);
        if (!w) {
            showNotification('Popup blocked! Allow popups for this site.', 'error', 6000);
        }
    }

    function showNotification(message, type = 'info', duration = 3000) {
        const existing = document.querySelector('.sfx-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `sfx-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) notification.remove();
            }, 300);
        }, duration);
    }


    function openMegaInFetchrr(megaUrl, openStyle) {
        const style = openStyle || getSetting('sfx-mega-fetchrr-open-style', 'tab');
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue('pendingMegaLink', megaUrl);
        } else {
            localStorage.setItem('pendingMegaLink', megaUrl);
        }
        const fetchrrUrl = 'https://fetchrr.io/';
        if (style === 'self') {
            window.location.href = fetchrrUrl;
        } else if (style === 'popup') {
            const w = 900, h = 700;
            const left = Math.round((screen.width  - w) / 2);
            const top  = Math.round((screen.height - h) / 2);
            window.open(fetchrrUrl, 'sfx_fetchrr',
                `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`);
        } else {
            window.open(fetchrrUrl, '_blank');
        }
    }

    function handleFetchrrPage() {
        let pending = '';
        if (typeof GM_getValue !== 'undefined') {
            pending = GM_getValue('pendingMegaLink', '');
            if (pending) GM_setValue('pendingMegaLink', '');
        } else {
            pending = localStorage.getItem('pendingMegaLink') || '';
            if (pending) localStorage.removeItem('pendingMegaLink');
        }

        if (!pending) return;

        function fillAndParse() {
            const input = document.getElementById('mega-link');
            if (!input) return false;

            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeSetter.call(input, pending);

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => {
                const btn = document.querySelector('button.cds--btn--primary:not([disabled])');
                if (btn) {
                    btn.click();
                } else {
                    setTimeout(() => {
                        const btn2 = document.querySelector('button.cds--btn--primary');
                        if (btn2) btn2.click();
                    }, 300);
                }
            }, 150);
            return true;
        }

        let attempts = 0;
        const t = setInterval(() => {
            if (fillAndParse() || ++attempts > 20) clearInterval(t);
        }, 200);
    }

    function handleFileDitchPage() {
        if (!window.opener) return;

        function tryClick() {
            const btn = document.querySelector('a.btn.btn-main[download], a.btn-main[download]');
            if (!btn || !btn.href) return false;
            btn.click();
            setTimeout(() => { try { window.close(); } catch(_) {} }, 3000);
            return true;
        }

        if (!tryClick()) {
            const obs = new MutationObserver(() => {
                if (tryClick()) obs.disconnect();
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
            setTimeout(() => { obs.disconnect(); try { window.close(); } catch(_) {} }, 15000);
        }
    }

    function showMegaFetchrrPill() {
        const isMegaPage = window.location.href.includes('/file/') || window.location.href.includes('/folder/');
        if (!isMegaPage) return;

        GM_addStyle(`
            #sfx-fetchrr-pill {
                position: fixed;
                bottom: 28px;
                left: 50%;
                transform: translateX(-50%) scale(0.85) translateZ(0);
                z-index: 99999;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 0 22px;
                height: 50px;
                border-radius: 25px;
                border: 1px solid rgba(0, 178, 89, 0.5);
                background: rgba(18, 18, 18, 0.94);
                backdrop-filter: blur(20px) saturate(1.6);
                -webkit-backdrop-filter: blur(20px) saturate(1.6);
                color: #e8e8e8;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.15px;
                cursor: pointer;
                white-space: nowrap;
                box-shadow: 0 6px 32px rgba(0,0,0,0.6),
                            0 0 0 1px rgba(255,255,255,0.04) inset,
                            0 1px 0 rgba(255,255,255,0.08) inset;
                transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
                            border-color 0.2s ease,
                            box-shadow 0.2s ease,
                            background 0.2s ease;
                user-select: none;
                will-change: transform;
                opacity: 0;
                pointer-events: none;
            }
            #sfx-fetchrr-pill.sfx-pill-visible {
                opacity: 1;
                pointer-events: auto;
                transform: translateX(-50%) scale(1) translateZ(0);
            }
            #sfx-fetchrr-pill:hover {
                border-color: rgba(0, 210, 100, 0.85);
                background: rgba(0, 40, 20, 0.92);
                box-shadow: 0 8px 36px rgba(0,180,80,0.28), 0 2px 8px rgba(0,0,0,0.5);
                transform: translateX(-50%) scale(1.03) translateY(-2px) translateZ(0);
            }
            #sfx-fetchrr-pill:active {
                transform: translateX(-50%) scale(0.97) translateY(0px) translateZ(0);
            }
            #sfx-fetchrr-pill .sfx-pill-logo {
                width: 22px;
                height: 22px;
                border-radius: 6px;
                background: linear-gradient(135deg, #00c261 0%, #007a40 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                box-shadow: 0 2px 6px rgba(0,180,80,0.4);
            }
            #sfx-fetchrr-pill .sfx-pill-logo svg {
                width: 13px;
                height: 13px;
                fill: #fff;
            }
            #sfx-fetchrr-pill .sfx-pill-text {
                display: flex;
                flex-direction: column;
                gap: 1px;
                line-height: 1;
            }
            #sfx-fetchrr-pill .sfx-pill-label {
                font-size: 13px;
                font-weight: 600;
                color: #fff;
            }
            #sfx-fetchrr-pill .sfx-pill-sub {
                font-size: 10px;
                font-weight: 500;
                color: rgba(255,255,255,0.45);
                letter-spacing: 0.3px;
            }
            #sfx-fetchrr-pill .sfx-pill-arrow {
                margin-left: 2px;
                opacity: 0.5;
                font-size: 16px;
            }
        `);

        const pill = document.createElement('button');
        pill.id = 'sfx-fetchrr-pill';
        pill.title = 'Mirror this MEGA link via Fetchrr.io — unlimited direct download';
        pill.innerHTML = `
            <div class="sfx-pill-logo">
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </div>
            <div class="sfx-pill-text">
                <span class="sfx-pill-label">Mirror on Fetchrr</span>
                <span class="sfx-pill-sub">Direct · Unthrottled</span>
            </div>
            <span class="sfx-pill-arrow">›</span>
        `;

        const appendPill = () => {
            if (!document.body || document.getElementById('sfx-fetchrr-pill')) return;
            document.body.appendChild(pill);
            requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('sfx-pill-visible')));
        };
        if (document.body) appendPill();
        else document.addEventListener('DOMContentLoaded', appendPill);
        pill.addEventListener('click', () => {
            openMegaInFetchrr(window.location.href);
        });
    }

    function linkifyAndSetupAnchors(container, openSameTab) {
        if (!container) return;

        container.querySelectorAll('a[href]').forEach(a => {
            if (openSameTab) a.target = '_self';
            a.rel = 'noopener noreferrer';
        });

        const linkRegex = /(https?:\/\/[^\s<>"']+)/g;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const nodesToReplace = [];
        let textNode;
        while ((textNode = walker.nextNode())) {
            if (textNode.parentNode && textNode.parentNode.tagName === 'A') continue;
            if (linkRegex.test(textNode.nodeValue)) {
                nodesToReplace.push(textNode);
            }
        }

        nodesToReplace.forEach(node => {
            const parent = node.parentNode;
            if (!parent) return;
            const text = node.nodeValue;
            const fragment = document.createDocumentFragment();
            let lastIdx = 0;
            linkRegex.lastIndex = 0;
            let m;
            while ((m = linkRegex.exec(text)) !== null) {
                if (m.index > lastIdx) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
                }
                const a = document.createElement('a');
                a.href = m[0];
                a.textContent = m[0];
                if (openSameTab) a.target = '_self';
                else a.target = '_blank';
                a.rel = 'noopener noreferrer';
                fragment.appendChild(a);
                lastIdx = m.index + m[0].length;
            }
            if (lastIdx < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIdx)));
            }
            parent.replaceChild(fragment, node);
        });
    }

    function enhancePstMoeContent(targetPre) {
        const isDarklab = window.location.hostname.includes('darklab.sh') ||
                          window.location.hostname.includes('0g.gg') ||
                          window.location.href.includes('darklab.sh') ||
                          window.location.href.includes('0g.gg') ||
                          (document.querySelector('#prettyprint, #prettymessage, #cleartext') !== null && !window.location.hostname.includes('pst.moe'));
        const settingKey = isDarklab ? 'sfx-darklab-copy-options' : 'sfx-pst-copy-options';
        const sameTabKey = isDarklab ? 'sfx-darklab-open-same-tab' : 'sfx-pst-open-same-tab';
        const isEnhancedEnabled = getSetting(settingKey, true);
        const isOpenSameTab = getSetting(sameTabKey, true);

        const preElement = targetPre || document.querySelector('#prettyprint, #cleartext, pre');
        if (!preElement) return false;

        const rawText = preElement.textContent || '';
        const hasMega = rawText.includes('mega.nz');

        // On 0g.gg / darklab: quality-wise UI and quality-wise partition MUST show ONLY for mega links
        if (isDarklab && !hasMega) {
            preElement.style.display = '';
            if (preElement.parentElement) {
                preElement.parentElement.classList.remove('hidden');
                preElement.parentElement.style.display = 'block';
                const existingContainer = preElement.parentElement.querySelector('.sfx-pst-container');
                if (existingContainer) existingContainer.remove();
            }
            linkifyAndSetupAnchors(preElement, isOpenSameTab);
            return true;
        }

        const hasTransferIt = rawText.includes('transfer.it');
        if (hasTransferIt) {
            preElement.style.display = '';
            if (preElement.parentElement) {
                preElement.parentElement.classList.remove('hidden');
                preElement.parentElement.style.display = 'block';
                const existingContainer = preElement.parentElement.querySelector('.sfx-pst-container');
                if (existingContainer) existingContainer.remove();
            }
            linkifyAndSetupAnchors(preElement, isOpenSameTab);
            return true;
        }

        // Prevent duplicate container if already processed and ready
        if (preElement.parentElement && preElement.parentElement.querySelector('.sfx-pst-container.sfx-ready')) return true;
        if (preElement.querySelector && preElement.querySelector('.sfx-pst-section')) return true;

        // Clean up any stale or unready container from previous runs or saved mhtml
        if (preElement.parentElement) {
            preElement.parentElement.querySelectorAll('.sfx-pst-container:not(.sfx-ready)').forEach(el => el.remove());
        }

        // Determine if we should perform quality split:
        // - On 0g.gg/darklab: ONLY when hasMega is true
        // - On pst.moe: when hasMega is true or isEnhancedEnabled
        const shouldQualitySplit = isDarklab ? hasMega : (hasMega || isEnhancedEnabled);

        if (shouldQualitySplit) {
            const selectCustomForPstGroup = (sectionEl, sectionLines) => {
                cancelActiveSelection();

                const rows = sectionEl.querySelectorAll('.sfx-pst-row');
                rows.forEach(row => {
                    if (!row.querySelector('.sfx-pst-checkbox-col')) {
                        const cbCol = document.createElement('div');
                        cbCol.className = 'sfx-pst-checkbox-col';
                        cbCol.innerHTML = `<input type="checkbox" class="sfx-pst-row-checkbox" style="cursor: pointer; width: 16px; height: 16px; border-radius: 4px;">`;
                        row.insertBefore(cbCol, row.firstChild);

                        cbCol.querySelector('.sfx-pst-row-checkbox').addEventListener('change', () => {
                            updatePstSelectionCount();
                        });
                    }
                });

                const removePstCheckboxes = () => {
                    sectionEl.querySelectorAll('.sfx-pst-checkbox-col').forEach(el => el.remove());
                };

                const handlePstCancel = () => {
                    removePstCheckboxes();
                    const island = document.getElementById('sfx-island-wrap');
                    if (island) {
                        const actions = island.querySelector('.sfx-island-selection-actions');
                        if (actions) actions.remove();
                        hideProgressIsland(island);
                    }
                };

                const handlePstConfirm = () => {
                    const selectedCbs = Array.from(sectionEl.querySelectorAll('.sfx-pst-row-checkbox')).filter(cb => cb.checked);
                    if (selectedCbs.length === 0) {
                        showProgressIsland("No items selected", "error");
                        removePstCheckboxes();
                        return;
                    }

                    removePstCheckboxes();

                    const fileUrls = [];
                    selectedCbs.forEach(cb => {
                        const row = cb.closest('.sfx-pst-row');
                        if (row) {
                            row.querySelectorAll('a[href]').forEach(a => {
                                fileUrls.push(a.href);
                            });
                        }
                    });

                    if (fileUrls.length > 0) {
                        GM_setClipboard(fileUrls.join('\n'), 'text');
                        showProgressIsland(`Copied ${fileUrls.length} link${fileUrls.length !== 1 ? 's' : ''} successfully!`, 'success');
                    } else {
                        showProgressIsland("No links resolved", "error");
                    }
                };

                const updatePstSelectionCount = () => {
                    const count = Array.from(sectionEl.querySelectorAll('.sfx-pst-row-checkbox')).filter(cb => cb.checked).length;
                    showProgressIsland(`Selected: ${count} item${count !== 1 ? 's' : ''}`, 'selection', handlePstConfirm, handlePstCancel);
                };

                updatePstSelectionCount();
            };

            const text = preElement.textContent || '';
            const lines = text.split('\n');

            function parseSizeStr(sizeStr) {
                if (!sizeStr) return 0;
                const match = sizeStr.match(/^([\d.]+)\s*([a-zA-Z]+)/);
                if (!match) return 0;
                const val = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                if (unit.startsWith('G')) return val * 1024 * 1024 * 1024;
                if (unit.startsWith('M')) return val * 1024 * 1024;
                if (unit.startsWith('K')) return val * 1024;
                return val;
            }

            function formatSizeStr(bytes) {
                if (!bytes || isNaN(bytes)) return '';
                if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
                return bytes + ' B';
            }

            const headerRegex = /^---\s+(.*?)(?:\s+\[(.*?)\])?\s+---/;
            const linkRegex = /(https?:\/\/[^\s]+)/g;

            let rawSections = [];
            let currentSection = {
                title: 'General',
                label: 'General',
                sizeText: '',
                lines: []
            };

            lines.forEach(line => {
                const trimmed = line.trim();
                const match = trimmed.match(headerRegex);
                if (match) {
                    if (currentSection.lines.length > 0 || currentSection.label !== 'General') {
                        rawSections.push(currentSection);
                    }
                    currentSection = {
                        title: trimmed,
                        label: match[1].trim(),
                        sizeText: match[2] ? match[2].trim() : '',
                        lines: []
                    };
                } else {
                    currentSection.lines.push(line);
                }
            });
            if (currentSection.lines.length > 0 || currentSection.label !== 'General') {
                rawSections.push(currentSection);
            }

            // Auto-partition lines by quality like BuzzHeavier if no '---' header was found
            if (rawSections.length === 1 && rawSections[0].label === 'General') {
                const introLines = [];
                const qualityMap = new Map();

                rawSections[0].lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return;
                    linkRegex.lastIndex = 0;
                    const hasLink = linkRegex.test(trimmed);
                    if (!hasLink) {
                        introLines.push(line);
                    } else {
                        const qMatch = trimmed.match(/(\d{3,4})p/i);
                        const qKey = qMatch ? `${qMatch[1]}p` : 'Other';
                        if (!qualityMap.has(qKey)) qualityMap.set(qKey, []);
                        qualityMap.get(qKey).push(line);
                    }
                });

                if (qualityMap.size > 0) {
                    const newSections = [];
                    if (introLines.length > 0) {
                        newSections.push({
                            title: 'General',
                            label: 'General',
                            sizeText: '',
                            lines: introLines
                        });
                    }
                    qualityMap.forEach((qLines, qLabel) => {
                        newSections.push({
                            title: qLabel,
                            label: qLabel,
                            sizeText: '',
                            lines: qLines
                        });
                    });
                    rawSections = newSections;
                }
            }

            // Separate intro metadata section (General with NO URLs) and quality sections
            const introSections = [];
            const qualitySections = [];

            rawSections.forEach(sec => {
                let hasUrl = false;
                sec.lines.forEach(line => {
                    linkRegex.lastIndex = 0;
                    if (linkRegex.test(line)) hasUrl = true;
                });
                if (sec.label === 'General' && !hasUrl) {
                    introSections.push(sec);
                } else {
                    qualitySections.push(sec);
                }
            });

            // Sort quality sections descending by resolution (e.g. 1080p -> 720p -> 540p -> Other) like BuzzHeavier
            const getResolutionNumber = (label) => {
                const m = (label || '').match(/(\d{3,4})/);
                return m ? parseInt(m[1], 10) : 0;
            };

            qualitySections.sort((a, b) => {
                const aRes = getResolutionNumber(a.label);
                const bRes = getResolutionNumber(b.label);
                if (aRes === 0) return 1;
                if (bRes === 0) return -1;
                return bRes - aRes;
            });

            const sections = [...introSections, ...qualitySections];

            let targetMount = preElement;
            if (isDarklab || preElement.id === 'prettyprint') {
                const parent = preElement.parentElement || document.body;
                parent.classList.remove('hidden');
                parent.style.display = 'block';

                let container = parent.querySelector('.sfx-pst-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'sfx-pst-container sfx-ready';
                    parent.appendChild(container);
                } else {
                    container.className = 'sfx-pst-container sfx-ready';
                }
                container.innerHTML = '';
                preElement.style.display = 'none';
                targetMount = container;
            } else {
                preElement.innerHTML = '';
                preElement.style.background = 'transparent';
                preElement.style.border = 'none';
                preElement.style.padding = '0';
                preElement.classList.add('sfx-pst-processed');
            }

            const allPageUrls = [];
            sections.forEach(s => {
                s.lines.forEach(line => {
                    let m;
                    linkRegex.lastIndex = 0;
                    while ((m = linkRegex.exec(line)) !== null) {
                        allPageUrls.push(m[0]);
                    }
                });
            });

            const totalQualitySections = sections.filter(s => {
                let count = 0;
                s.lines.forEach(line => {
                    let m;
                    linkRegex.lastIndex = 0;
                    while ((m = linkRegex.exec(line)) !== null) {
                        count++;
                    }
                });
                return count > 0;
            }).length;

            sections.forEach(section => {
                const sectionUrls = [];
                section.lines.forEach(line => {
                    let match;
                    linkRegex.lastIndex = 0;
                    while ((match = linkRegex.exec(line)) !== null) {
                        sectionUrls.push(match[0]);
                    }
                });

                // If section is General/intro metadata and has NO URLs, render cleanly without quality badge
                if (section.label === 'General' && sectionUrls.length === 0) {
                    const introEl = document.createElement('div');
                    introEl.className = 'sfx-pst-intro';
                    section.lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return;
                        const lineDiv = document.createElement('div');
                        lineDiv.className = 'sfx-pst-text-line';
                        lineDiv.textContent = trimmed;
                        introEl.appendChild(lineDiv);
                    });
                    if (introEl.children.length > 0) {
                        targetMount.appendChild(introEl);
                    }
                    return;
                }

                const sectionEl = document.createElement('div');
                sectionEl.className = 'sfx-quality-section sfx-pst-section';

                const header = document.createElement('div');
                header.className = 'sfx-quality-header sfx-pst-header';

                let copyBtnHtml = '';
                // Quality-wise copy options enabled when copy options setting is active
                const allowCopy = isEnhancedEnabled && sectionUrls.length > 0;
                if (allowCopy) {
                    const copySectionLabel = section.label && section.label !== 'General' ? ` ${section.label}` : '';
                    const copyAllQualitiesHtml = totalQualitySections > 1 ? `
                                <div class="sfx-dropdown-divider"></div>
                                <button class="sfx-dropdown-item sfx-copy-all-qualities-item">
                                   <span>Copy All Qualities (${allPageUrls.length})</span>
                                </button>
                    ` : '';

                    copyBtnHtml = `
                        <div class="sfx-copy-dropdown-container">
                            <button class="sfx-bh-copy-dropdown-trigger" title="Copy options${copySectionLabel ? ` for${copySectionLabel}` : ''}">
                                <span>Copy</span>
                            </button>
                            <div class="sfx-copy-dropdown-menu">
                                <button class="sfx-dropdown-item sfx-copy-all-item">
                                   <span>Copy ${section.label !== 'General' ? section.label : 'All'} Links (${sectionUrls.length})</span>
                                </button>
                                <div class="sfx-dropdown-divider"></div>
                                <button class="sfx-dropdown-item sfx-custom-select-item">
                                   <span>Select Custom</span>
                                </button>
                                ${copyAllQualitiesHtml}
                            </div>
                        </div>
                    `;
                }

                // Calculate size if not provided in header
                let displaySize = section.sizeText || '';
                if (!displaySize && sectionUrls.length > 0) {
                    let totalBytes = 0;
                    section.lines.forEach(line => {
                        const sm = line.match(/\[([\d.]+\s*[a-zA-Z]+)\]/);
                        if (sm) {
                            totalBytes += parseSizeStr(sm[1]);
                        }
                    });
                    if (totalBytes > 0) {
                        displaySize = formatSizeStr(totalBytes);
                    }
                }

                const epCountText = sectionUrls.length > 0 ? `${sectionUrls.length} Ep${sectionUrls.length !== 1 ? 's' : ''}` : '';
                const sizeBadgeHtml = displaySize ? `
                    <span class="sfx-quality-dot"></span>
                    <span class="sfx-quality-size">${displaySize}</span>
                ` : '';

                header.innerHTML = `
                    <div class="sfx-quality-info">
                        <span class="sfx-quality-badge">${section.label}</span>
                        ${epCountText ? `<span class="sfx-quality-meta">${epCountText}</span>` : ''}
                        ${sizeBadgeHtml}
                    </div>
                    ${copyBtnHtml ? `<div class="sfx-quality-actions">${copyBtnHtml}</div>` : ''}
                `;
                sectionEl.appendChild(header);

                if (allowCopy) {
                    const dropdownContainer = header.querySelector('.sfx-copy-dropdown-container');
                    if (dropdownContainer) {
                        const trigger = dropdownContainer.querySelector('.sfx-bh-copy-dropdown-trigger');
                        const menu = dropdownContainer.querySelector('.sfx-copy-dropdown-menu');

                        trigger.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const isShown = menu.classList.contains('sfx-show');
                            document.querySelectorAll('.sfx-copy-dropdown-menu.sfx-show').forEach(m => {
                                m.classList.remove('sfx-show');
                                m.parentElement.classList.remove('sfx-active');
                            });

                            if (!isShown) {
                                menu.classList.add('sfx-show');
                                dropdownContainer.classList.add('sfx-active');
                            }
                        });

                        const copyAllItem = menu.querySelector('.sfx-copy-all-item');
                        if (copyAllItem) {
                            copyAllItem.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                menu.classList.remove('sfx-show');
                                dropdownContainer.classList.remove('sfx-active');

                                if (sectionUrls.length > 0) {
                                    GM_setClipboard(sectionUrls.join('\n'), 'text');
                                    const labelDesc = section.label !== 'General' ? `${section.label} ` : '';
                                    showProgressIsland(`Copied ${sectionUrls.length} ${labelDesc}link${sectionUrls.length !== 1 ? 's' : ''} successfully!`, 'success');
                                }
                            });
                        }

                        const customSelectItem = menu.querySelector('.sfx-custom-select-item');
                        if (customSelectItem) {
                            customSelectItem.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                menu.classList.remove('sfx-show');
                                dropdownContainer.classList.remove('sfx-active');
                                selectCustomForPstGroup(sectionEl, section.lines);
                            });
                        }

                        const copyAllQualitiesItem = menu.querySelector('.sfx-copy-all-qualities-item');
                        if (copyAllQualitiesItem) {
                            copyAllQualitiesItem.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                menu.classList.remove('sfx-show');
                                dropdownContainer.classList.remove('sfx-active');

                                if (allPageUrls.length > 0) {
                                    GM_setClipboard(allPageUrls.join('\n'), 'text');
                                    showProgressIsland(`Copied all ${allPageUrls.length} links successfully!`, 'success');
                                }
                            });
                        }
                    }
                }

                const contentDiv = document.createElement('div');
                contentDiv.className = 'sfx-pst-content';
                contentDiv.style.display = 'flex';
                contentDiv.style.flexDirection = 'column';

                section.lines.forEach(line => {
                    if (!line.trim()) {
                        const spacer = document.createElement('div');
                        spacer.style.height = '8px';
                        contentDiv.appendChild(spacer);
                        return;
                    }

                    const hasLink = /(https?:\/\/[^\s]+)/.test(line);
                    const row = document.createElement('div');
                    row.className = hasLink ? 'sfx-pst-row' : 'sfx-pst-text-line';

                    const contentSpan = document.createElement('span');
                    if (hasLink) {
                        contentSpan.className = 'sfx-pst-row-content';
                    }

                    linkRegex.lastIndex = 0;
                    let lastIndex = 0;
                    let match;
                    while ((match = linkRegex.exec(line)) !== null) {
                        if (match.index > lastIndex) {
                            contentSpan.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
                        }

                        const rawUrl = match[0];
                        const cleanUrl = rawUrl.replace(/"/g, '%22');

                        const anchor = document.createElement('a');
                        anchor.href = cleanUrl;
                        if (isOpenSameTab) {
                            anchor.target = '_self';
                            anchor.addEventListener('click', function(e) {
                                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                                e.preventDefault();
                                window.location.href = this.href;
                            });
                        } else {
                            const pstDlStyle = getSetting('sfx-download-link-style', 'tab');
                            if (pstDlStyle === 'popup') {
                                anchor.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    sfxOpenPopup(this.href);
                                });
                                anchor.removeAttribute('target');
                            } else {
                                anchor.target = '_blank';
                            }
                        }
                        anchor.rel = 'noopener noreferrer';
                        anchor.textContent = rawUrl;
                        contentSpan.appendChild(anchor);


                        if (cleanUrl.includes('fileditchfiles.me')) {
                            const dlCircle = document.createElement('span');
                            dlCircle.className = 'sinflix-fd-dl-circle';
                            dlCircle.title = '\u2b07 Download via FileDitch (auto-clicks download & closes)';
                            dlCircle.dataset.fdUrl = cleanUrl;
                            contentSpan.appendChild(dlCircle);
                        }

                        lastIndex = match.index + match[0].length;
                    }

                    if (lastIndex < line.length) {
                        contentSpan.appendChild(document.createTextNode(line.slice(lastIndex)));
                    }

                    row.appendChild(contentSpan);
                    contentDiv.appendChild(row);
                });

                sectionEl.appendChild(contentDiv);
                targetMount.appendChild(sectionEl);
            });
        } else {
            preElement.classList.remove('sfx-pst-processed');
            // Original rendering
            let currentResolution = null;
            const linkRegex = /(https?:\/\/[^\s]+)/g;

            function processTextContent(text) {
                const fragment = document.createDocumentFragment();
                const lines = text.split('\n');

                lines.forEach((line, lineIdx) => {
                    const resMatch = line.trim().match(/^---\s+(.*?)\s+---/);
                    if (resMatch) {
                        currentResolution = resMatch[1];
                        const resSpan = document.createElement('span');
                        resSpan.className = 'sinflix-res-header';

                        const textNode = document.createTextNode(line.trim() + ' ');
                        resSpan.appendChild(textNode);

                        fragment.appendChild(resSpan);
                        fragment.appendChild(document.createTextNode('\n'));
                        return;
                    }

                    linkRegex.lastIndex = 0;
                    let lastIndex = 0;
                    let match;
                    while ((match = linkRegex.exec(line)) !== null) {
                        if (match.index > lastIndex) {
                            fragment.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
                        }

                        const rawUrl = match[0];
                        const cleanUrl = rawUrl.replace(/"/g, '%22');

                        const anchor = document.createElement('a');
                        anchor.href = cleanUrl;
                        if (isOpenSameTab) {
                            anchor.target = '_self';
                            anchor.addEventListener('click', function(e) {
                                if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                                e.preventDefault();
                                window.location.href = this.href;
                            });
                        } else {
                            const pstDlStyle = getSetting('sfx-download-link-style', 'tab');
                            if (pstDlStyle === 'popup') {
                                anchor.addEventListener('click', function(e) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    sfxOpenPopup(this.href);
                                });
                                anchor.removeAttribute('target');
                            } else {
                                anchor.target = '_blank';
                            }
                        }
                        anchor.rel = 'noopener noreferrer';
                        anchor.textContent = rawUrl;
                        fragment.appendChild(anchor);


                        if (cleanUrl.includes('fileditchfiles.me')) {
                            const dlCircle = document.createElement('span');
                            dlCircle.className = 'sinflix-fd-dl-circle';
                            dlCircle.title = '\u2b07 Download via FileDitch (auto-clicks download & closes)';
                            dlCircle.dataset.fdUrl = cleanUrl;
                            fragment.appendChild(dlCircle);
                        }

                        lastIndex = match.index + match[0].length;
                    }

                    if (lastIndex < line.length) {
                        fragment.appendChild(document.createTextNode(line.slice(lastIndex)));
                    }

                    if (lineIdx < lines.length - 1) {
                        fragment.appendChild(document.createTextNode('\n'));
                    }
                });

                return fragment;
            }

            const childNodes = Array.from(preElement.childNodes);
            for (const node of childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const fragment = processTextContent(node.textContent);
                    preElement.replaceChild(fragment, node);
                }
            }
        }

        // Shared click events setup for generated circles
        document.querySelectorAll('.sinflix-fd-dl-circle').forEach(circle => {
            if (circle.dataset.sfxListener) return;
            circle.dataset.sfxListener = 'true';
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (circle.classList.contains('fd-loading')) return;
                circle.classList.add('fd-loading');
                const style = getSetting('sfx-fileditch-open-style', 'popup');
                const url = circle.dataset.fdUrl + '#sfx=dl';
                let w;
                if (style === 'tab') {
                    w = window.open(url, '_blank');
                } else {
                    const wWidth = 900, wHeight = 650;
                    const left = Math.round((screen.width  - wWidth) / 2);
                    const top  = Math.round((screen.height - wHeight) / 2);
                    w = window.open(url, '_blank',
                        `width=${wWidth},height=${wHeight},left=${left},top=${top},menubar=no,toolbar=no,status=no,location=yes`);
                }
                showProgressIsland('Opening FileDitch... will auto-download & close.', 'info', 5000);
                setTimeout(() => circle.classList.remove('fd-loading'), 18000);
                if (!w) showNotification('Popup blocked! Allow popups/tabs for paste service.', 'error', 6000);
            });
        });


        if (!window.sfxDropdownInit) {
            window.sfxDropdownInit = true;
            document.addEventListener('click', () => {
                document.querySelectorAll('.sfx-copy-dropdown-menu.sfx-show').forEach(m => {
                    m.classList.remove('sfx-show');
                    m.parentElement.classList.remove('sfx-active');
                });
            });
        }
        return true;
    }

    /* --- BuzzHeavier Enhancements & Retry Fallback --- */
    const buzzDownloadUrlsCache = new Map();

    function showProgressIsland(message, statusType = 'progress', onConfirm = null, onCancel = null) {
        let island = document.getElementById('sfx-island-wrap');
        if (!island) {
            island = document.createElement('div');
            island.id = 'sfx-island-wrap';
            island.innerHTML = `
                <div id="sfx-island-default-view">
                    <div id="sfx-island-search-icon"></div>
                    <span id="sfx-island-label"></span>
                </div>
            `;
            document.body.appendChild(island);
        }

        // Clean up selection actions if switching to other modes
        if (statusType !== 'selection') {
            const actions = island.querySelector('.sfx-island-selection-actions');
            if (actions) actions.remove();
        }

        // Set class and styles
        island.className = 'sfx-progress-mode';
        island.style.display = 'flex';
        // Force reflow
        island.offsetHeight;
        island.style.opacity = '1';
        island.style.transform = 'translateX(-50%) scale(1)';

        const label = island.querySelector('#sfx-island-label');
        const iconContainer = island.querySelector('#sfx-island-search-icon');

        if (label) label.textContent = message;

        // Reset styling for iOS style popups
        island.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        island.style.background = 'rgba(15, 15, 20, 0.85)';

        if (statusType === 'progress') {
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: sfx-spin 1s linear infinite; width: 16px; height: 16px; color: #30d158;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>
                `;
            }
        } else if (statusType === 'success') {
            island.style.borderColor = 'rgba(48, 209, 88, 0.3)';
            island.style.background = 'rgba(10, 30, 15, 0.9)';
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #30d158;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                `;
            }
            setTimeout(() => hideProgressIsland(island), 2500);
        } else if (statusType === 'error') {
            island.style.borderColor = 'rgba(255, 69, 58, 0.3)';
            island.style.background = 'rgba(35, 10, 10, 0.9)';
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #ff453a;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                `;
            }
            setTimeout(() => hideProgressIsland(island), 3000);
        } else if (statusType === 'warning') {
            island.style.borderColor = 'rgba(255, 159, 10, 0.3)';
            island.style.background = 'rgba(30, 20, 10, 0.9)';
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #ff9f0a;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                `;
            }
            setTimeout(() => hideProgressIsland(island), 8000);
        } else if (statusType === 'selection') {
            island.style.borderColor = 'rgba(10, 132, 255, 0.3)';
            island.style.background = 'rgba(15, 20, 35, 0.9)';
            if (iconContainer) {
                iconContainer.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: #0a84ff;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                `;
            }

            let actionsWrap = island.querySelector('.sfx-island-selection-actions');
            if (!actionsWrap) {
                actionsWrap = document.createElement('div');
                actionsWrap.className = 'sfx-island-selection-actions';
                actionsWrap.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-left: 12px;';
                actionsWrap.innerHTML = `
                    <button class="sfx-island-confirm-btn" style="background: rgba(48, 209, 88, 0.2); border: 1px solid rgba(48, 209, 88, 0.4); color: #30d158; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: all 0.2s;" title="Confirm selection">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </button>
                    <button class="sfx-island-cancel-btn" style="background: rgba(255, 69, 58, 0.2); border: 1px solid rgba(255, 69, 58, 0.4); color: #ff453a; width: 24px; height: 24px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; transition: all 0.2s;" title="Cancel selection">
                        <svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                `;
                island.appendChild(actionsWrap);
            }

            const confirmBtn = actionsWrap.querySelector('.sfx-island-confirm-btn');
            const cancelBtn = actionsWrap.querySelector('.sfx-island-cancel-btn');

            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            newConfirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onConfirm) onConfirm();
            });
            newCancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onCancel) onCancel();
            });
        }
    }

    function hideProgressIsland(island) {
        if (!island) return;

        const isMainPage = window.location.href.includes('rentry.co/sin-flix') || window.location.href.includes('rentry.co/sin0flix') || window.location.href.includes('text.is/Sinflix');

        if (isMainPage) {
            // Restore search bar state
            island.classList.remove('sfx-progress-mode');

            // Restore original search icon
            const iconContainer = island.querySelector('#sfx-island-search-icon');
            if (iconContainer) {
                iconContainer.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>`;
            }

            // Restore label
            const label = island.querySelector('#sfx-island-label');
            if (label) label.textContent = 'Search';

            // Restore styles
            island.style.borderColor = '';
            island.style.background = '';

            // Re-evaluate collapsed state based on scroll/hover/focus
            const input = island.querySelector('#sfx-island-input');
            const isFocused = input === document.activeElement;
            const isScrolled = window.scrollY > 80;

            if (isFocused || !isScrolled) {
                island.classList.remove('sfx-collapsed');
            } else {
                island.classList.add('sfx-collapsed');
            }
        } else {
            // On other pages, just hide it completely
            island.style.opacity = '0';
            island.style.transform = 'translateX(-50%) scale(0.9)';
            setTimeout(() => {
                if (island.style.opacity === '0') {
                    island.style.display = 'none';
                }
            }, 300);
        }
    }

    function cancelActiveSelection() {
        document.querySelectorAll('.sfx-checkbox-header-col, .sfx-checkbox-col, .sfx-pst-checkbox-col').forEach(el => el.remove());
        const island = document.getElementById('sfx-island-wrap');
        if (island) {
            const actions = island.querySelector('.sfx-island-selection-actions');
            if (actions) actions.remove();
            if (island.className.includes('sfx-progress-mode')) {
                const label = island.querySelector('#sfx-island-label');
                if (label && label.textContent.startsWith('Selected:')) {
                    hideProgressIsland(island);
                }
            }
        }
    }

    function resolveBuzzDownloadUrlsFromDoc(doc, baseUrl) {
        const base = (baseUrl && baseUrl.startsWith('http')) ? baseUrl : 'https://buzzheavier.com';
        let anchors = Array.from(doc.querySelectorAll('a[hx-get*="/download"]'));
        const seen = new Set();
        anchors = anchors.filter(a => {
            const v = a.getAttribute('hx-get');
            if (!v || seen.has(v)) return false;
            seen.add(v);
            return true;
        });
        return anchors
            .map(anchor => anchor.getAttribute('hx-get'))
            .map(endpoint => endpoint?.replace(/&amp;/g, '&'))
            .map(endpoint => {
                try {
                    return new URL(endpoint, base).href;
                } catch {
                    return null;
                }
            })
            .filter(Boolean)
            .slice(0, 2);
    }

    function resolveBuzzDownloadUrls(pageUrl, callback) {
        if (buzzDownloadUrlsCache.has(pageUrl)) {
            callback(buzzDownloadUrlsCache.get(pageUrl));
            return;
        }

        const currentUrl = window.location.href.split('?')[0].split('#')[0].replace(/\/$/, '');
        const normalizedPageUrl = pageUrl.split('?')[0].split('#')[0].replace(/\/$/, '');

        if (normalizedPageUrl === currentUrl || !pageUrl.startsWith('http')) {
            const urls = resolveBuzzDownloadUrlsFromDoc(document, pageUrl);
            if (urls.length > 0) {
                buzzDownloadUrlsCache.set(pageUrl, urls);
                callback(urls);
                return;
            }
        }

        GM_xmlhttpRequest({
            method: "GET",
            url: pageUrl,
            onload: function(response) {
                try {
                    const doc = new DOMParser().parseFromString(response.responseText, 'text/html');
                    const urls = resolveBuzzDownloadUrlsFromDoc(doc, pageUrl);
                    if (urls.length > 0) {
                        buzzDownloadUrlsCache.set(pageUrl, urls);
                        callback(urls);
                    } else {
                        const hxMatches = Array.from(response.responseText.matchAll(/hx-get="([^"]*\/download\?t=[^"]+)"/g));
                        const urlsFallback = hxMatches.map(m => {
                            try {
                                return new URL(m[1].replace(/&amp;/g, '&'), pageUrl).href;
                            } catch {
                                return null;
                            }
                        }).filter(Boolean).slice(0, 2);

                        if (urlsFallback.length > 0) {
                            buzzDownloadUrlsCache.set(pageUrl, urlsFallback);
                            callback(urlsFallback);
                        } else {
                            callback([]);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing Buzzheavier page:", e);
                    callback([]);
                }
            },
            onerror: function(err) {
                console.error("Network error fetching Buzzheavier page:", err);
                callback([]);
            }
        });
    }

    function fetchDirectLink(pageUrl, serverIndex, callback) {
        resolveBuzzDownloadUrls(pageUrl, (urls) => {
            const downloadUrl = urls[serverIndex] || urls[0];
            if (!downloadUrl) {
                callback(null);
                return;
            }

            const htmxHeaders = {
                "HX-Request": "true",
                "hx-request": "true",
                "HX-Current-URL": pageUrl,
                "hx-current-url": pageUrl,
                "Referer": pageUrl
            };

            function extractRedirect(response) {
                const headers = response.responseHeaders || '';
                const m = headers.match(/hx-redirect:\s*([^\r\n]+)/i)
                       || headers.match(/location:\s*([^\r\n]+)/i);
                if (m && m[1]) return m[1].trim();
                const body = response.responseText || '';
                const bodyM = body.match(/["']?hx-redirect["']?\s*:\s*["']([^"']+)["']/i)
                           || body.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
                if (bodyM && bodyM[1]) return bodyM[1].trim();
                if (response.finalUrl && response.finalUrl !== downloadUrl && !response.finalUrl.includes('/download')) {
                    return response.finalUrl;
                }
                return null;
            }

            GM_xmlhttpRequest({
                method: "HEAD",
                url: downloadUrl,
                headers: htmxHeaders,
                onload: function(response) {
                    const redirect = extractRedirect(response);
                    if (redirect) {
                        callback(redirect);
                    } else {
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: downloadUrl,
                            headers: htmxHeaders,
                            onload: function(getResponse) {
                                const getRedirect = extractRedirect(getResponse);
                                if (getRedirect) {
                                    callback(getRedirect);
                                } else {
                                    callback(null);
                                }
                            },
                            onerror: function() {
                                callback(null);
                            }
                        });
                    }
                },
                onerror: function() {
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: downloadUrl,
                        headers: htmxHeaders,
                        onload: function(getResponse) {
                            const getRedirect = extractRedirect(getResponse);
                            if (getRedirect) {
                                  callback(getRedirect);
                            } else {
                                  callback(null);
                            }
                        },
                        onerror: function() {
                            callback(null);
                        }
                    });
                }
            });
        });
    }

    function resolveWithFallback(pageUrl, startServerIndex, type, elementToReset = null) {
        let currentSrv = startServerIndex;
        let attempt = 1;
        const maxAttempts = 6;

        const restoreBtn = () => {
            if (elementToReset) {
                elementToReset.disabled = false;
                elementToReset.classList.remove('bh-loading');
                if (elementToReset.dataset.origHtml) {
                    elementToReset.innerHTML = elementToReset.dataset.origHtml;
                }
            }
        };

        if (elementToReset) {
            elementToReset.disabled = true;
            elementToReset.classList.add('bh-loading');
            if (!elementToReset.dataset.origHtml) {
                elementToReset.dataset.origHtml = elementToReset.innerHTML;
            }
            elementToReset.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: sfx-spin 1s linear infinite; width: 14px; height: 14px;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg> Loading...`;
        }

        showProgressIsland(`Resolving file links...`, 'progress');

        function tryResolve() {
            if (attempt > maxAttempts) {
                showProgressIsland(`Failed: All servers offline`, 'error');
                restoreBtn();
                return;
            }

            const serverLabel = currentSrv === 0 ? "Server 1" : "Server 2";
            const cycleText = attempt > 2 ? ` (Retry ${Math.floor((attempt - 1) / 2)})` : "";
            showProgressIsland(`Trying ${serverLabel}...${cycleText}`, 'progress');

            fetchDirectLink(pageUrl, currentSrv, (directUrl) => {
                if (directUrl) {
                    if (type === 'copy') {
                        GM_setClipboard(directUrl, 'text');
                        showProgressIsland(`${serverLabel} — Copied!`, 'success');
                        restoreBtn();
                        if (elementToReset) {
                            elementToReset.innerHTML = `<svg viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: #4ade80;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!`;
                            setTimeout(restoreBtn, 2000);
                        }
                    } else if (type === 'dl') {
                        showProgressIsland(`Starting download...`, 'success');
                        const style = getSetting('sfx-buzzheavier-download-style', 'tab');
                        if (style === 'popup') {
                            window.open(directUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                        } else if (style === 'tab') {
                            if (typeof GM_openInTab === 'function') {
                                GM_openInTab(directUrl, { active: false, insert: true });
                            } else {
                                window.location.assign(directUrl);
                            }
                        } else {
                            window.location.assign(directUrl);
                        }
                        restoreBtn();
                    }
                } else {
                    attempt++;
                    currentSrv = 1 - currentSrv;
                    setTimeout(tryResolve, 500);
                }
            });
        }

        tryResolve();
    }


    function enhanceBuzzheavierContent() {
        try {
            // ALWAYS add the styling class to body on buzzheavier.com since table styling has no on/off toggle
            document.body.classList.add('sfx-bh-enhanced');

            const isEnhance = getSetting('sfx-buzzheavier-ui-enhancements', true);

            // Try by ID first (live BuzzHeavier page uses id="tbody"), fallback to first non-sfx tbody
            let tbody = document.getElementById('tbody');
            if (!tbody) {
                // find the first table tbody that isn't one of our quality sub-tbodies
                // and isn't nested inside a td (BuzzHeavier rows have nested tables)
                const allTbodies = Array.from(document.querySelectorAll('table.fs > tbody, .mx-auto > div > table > tbody'));
                tbody = allTbodies.find(tb => !tb.id.startsWith('sfx-tbody')) || null;
                if (!tbody) {
                    const fallbackTbodies = Array.from(document.querySelectorAll('table > tbody'));
                    tbody = fallbackTbodies.find(tb => !tb.id.startsWith('sfx-tbody') && !tb.closest('td')) || null;
                }
            }
            const isListPage = tbody !== null;
            const isSinglePage = !isListPage && !!document.querySelector('a[hx-get*="/download"]');

            const isFileAnchor = (a) => {
                if (!a || !a.href) return false;
                const path = a.getAttribute('href') || '';
                const href = a.href || '';
                if (href.includes('/help') || href.includes('/contact') || href.includes('/proxy') || href.includes('/faq') || href.includes('/terms') || href.includes('/privacy') || href.includes('/blog') || href.includes('/pricing') || href.includes('/speedtest') || href.includes('/developers')) {
                    return false;
                }
                return href.includes('buzzheavier.com/') || path.startsWith('/') || !path.includes('://');
            };

            const addCapsuleToRow = (row, link) => {
                const td = link.closest('td') || link.parentNode;
                if (td && !row.querySelector('.sfx-bh-row-capsule')) {
                    td.style.position = 'relative';
                    td.style.overflow = 'hidden';

                    link.style.display = 'inline-block';
                    link.style.maxWidth = 'calc(100% - 64px)';
                    link.style.overflow = 'hidden';
                    link.style.textOverflow = 'ellipsis';
                    link.style.whiteSpace = 'nowrap';
                    link.style.verticalAlign = 'middle';

                    const capsule = document.createElement('span');
                    capsule.className = 'sfx-bh-row-capsule';
                    capsule.innerHTML = `
                        <button class="sfx-bh-row-btn sfx-bh-copy" title="Copy Direct Link (Auto-Fallback)">
                            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        </button>
                        <span class="sfx-bh-row-divider"></span>
                        <button class="sfx-bh-row-btn sfx-bh-dl" title="Download File (Auto-Fallback)">
                            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        </button>
                    `;

                    capsule.querySelector('.sfx-bh-copy').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        resolveWithFallback(link.href, 0, 'copy');
                    });

                    capsule.querySelector('.sfx-bh-dl').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        resolveWithFallback(link.href, 0, 'dl');
                    });

                    td.appendChild(capsule);
                }
            };

            const removeCapsules = () => {
                document.querySelectorAll('.sfx-bh-row-capsule').forEach(el => el.remove());
                document.querySelectorAll('table tbody tr td a').forEach(link => {
                    link.style.display = '';
                    link.style.maxWidth = '';
                    link.style.overflow = '';
                    link.style.textOverflow = '';
                    link.style.whiteSpace = '';
                    link.style.verticalAlign = '';
                });
            };

            // --- Quality split helpers ---
            const extractQuality = (filename) => {
                const m = filename.match(/(\d{3,4})p/i);
                return m ? parseInt(m[1], 10) : null;
            };

            const removeQualitySplit = () => {
                cancelActiveSelection();
                document.querySelectorAll('.sfx-quality-section').forEach(el => el.remove());
                // Show the original table again
                const origTable = document.getElementById('tbody') ? document.getElementById('tbody').closest('table') : document.querySelector('table.fs') || document.querySelector('table');
                if (origTable) origTable.style.display = '';
            };

            const cancelActiveSelection = () => {
                document.querySelectorAll('.sfx-checkbox-header-col, .sfx-checkbox-col').forEach(el => el.remove());
                const island = document.getElementById('sfx-island-wrap');
                if (island) {
                    const actions = island.querySelector('.sfx-island-selection-actions');
                    if (actions) actions.remove();
                    if (island.className.includes('sfx-progress-mode') && island.querySelector('#sfx-island-label').textContent.startsWith('Selected:')) {
                        hideProgressIsland(island);
                    }
                }
            };

            const selectCustomForGroup = (table, groupRows, labelText) => {
                cancelActiveSelection();

                // Add header checkbox
                const thead = table.querySelector('thead');
                const theadTr = thead ? Array.from(thead.children).find(el => el.tagName === 'TR') : null;
                if (theadTr && !theadTr.querySelector('.sfx-checkbox-header-col')) {
                    const th = document.createElement('th');
                    th.className = 'sfx-checkbox-header-col';
                    th.style.width = '40px';
                    th.style.textAlign = 'center';
                    th.innerHTML = `<input type="checkbox" class="sfx-select-all-checkbox" style="cursor: pointer; width: 16px; height: 16px; border-radius: 4px; vertical-align: middle;">`;
                    theadTr.insertBefore(th, theadTr.firstChild);

                    th.querySelector('.sfx-select-all-checkbox').addEventListener('change', (e) => {
                        const checked = e.target.checked;
                        const tbody = table.querySelector('tbody');
                        const outerRows = tbody ? Array.from(tbody.children).filter(el => el.tagName === 'TR') : [];
                        outerRows.forEach(tr => {
                            const cb = tr.querySelector('.sfx-row-checkbox');
                            if (cb) cb.checked = checked;
                        });
                        updateSelectionCount();
                    });
                }

                // Add row checkboxes
                const tbody = table.querySelector('tbody');
                const tbodyTrs = tbody ? Array.from(tbody.children).filter(el => el.tagName === 'TR') : [];
                tbodyTrs.forEach(tr => {
                    if (!tr.querySelector('.sfx-checkbox-col')) {
                        const td = document.createElement('td');
                        td.className = 'sfx-checkbox-col';
                        td.style.textAlign = 'center';
                        td.style.verticalAlign = 'middle';
                        td.innerHTML = `<input type="checkbox" class="sfx-row-checkbox" style="cursor: pointer; width: 16px; height: 16px; border-radius: 4px; vertical-align: middle;">`;
                        tr.insertBefore(td, tr.firstChild);

                        td.querySelector('.sfx-row-checkbox').addEventListener('change', () => {
                            updateSelectionCount();
                        });
                    }
                });

                const removeCheckboxes = () => {
                    table.querySelectorAll('.sfx-checkbox-header-col, .sfx-checkbox-col').forEach(el => el.remove());
                };

                const handleCancel = () => {
                    removeCheckboxes();
                    const island = document.getElementById('sfx-island-wrap');
                    if (island) {
                        const actions = island.querySelector('.sfx-island-selection-actions');
                        if (actions) actions.remove();
                        hideProgressIsland(island);
                    }
                };

                const handleConfirm = () => {
                    const tbody = table.querySelector('tbody');
                    const outerRows = tbody ? Array.from(tbody.children).filter(el => el.tagName === 'TR') : [];
                    const selectedRows = outerRows.filter(tr => {
                        const cb = tr.querySelector('.sfx-row-checkbox');
                        return cb && cb.checked;
                    });

                    if (selectedRows.length === 0) {
                        showProgressIsland("No items selected", "error");
                        removeCheckboxes();
                        return;
                    }

                    removeCheckboxes();

                    const fileUrls = [];
                    selectedRows.forEach(row => {
                        const link = Array.from(row.querySelectorAll('a[href]')).find(isFileAnchor);
                        if (link && link.href) {
                            fileUrls.push(link.href);
                        }
                    });

                    const total = fileUrls.length;
                    let resolvedCount = 0;
                    const results = new Array(total);

                    showProgressIsland(`Resolving links: 0/${total}`, 'progress');

                    fileUrls.forEach((url, index) => {
                        fetchDirectLink(url, 0, (directUrl) => {
                            resolvedCount++;
                            results[index] = directUrl;

                            showProgressIsland(`Resolving links: ${resolvedCount}/${total}`, 'progress');

                            if (resolvedCount === total) {
                                const validLinks = results.filter(Boolean);
                                if (validLinks.length > 0) {
                                    GM_setClipboard(validLinks.join('\n'), 'text');
                                    showProgressIsland(`Copied ${validLinks.length}/${total} links!`, 'success');
                                } else {
                                    showProgressIsland(`Failed to resolve any links`, 'error');
                                }
                            }
                        });
                    });
                };

                const updateSelectionCount = () => {
                    const tbody = table.querySelector('tbody');
                    const outerRows = tbody ? Array.from(tbody.children).filter(el => el.tagName === 'TR') : [];
                    const selectedCount = outerRows.filter(tr => {
                        const cb = tr.querySelector('.sfx-row-checkbox');
                        return cb && cb.checked;
                    }).length;
                    showProgressIsland(`Selected: ${selectedCount} item${selectedCount !== 1 ? 's' : ''}`, 'selection', handleConfirm, handleCancel);
                };

                updateSelectionCount();
            };

            const parseSize = (sizeStr) => {
                const match = sizeStr.match(/^([\d.]+)\s*([a-zA-Z]+)/);
                if (!match) return 0;
                const val = parseFloat(match[1]);
                const unit = match[2].toUpperCase();
                if (unit.startsWith('G')) return val * 1024 * 1024 * 1024;
                if (unit.startsWith('M')) return val * 1024 * 1024;
                if (unit.startsWith('K')) return val * 1024;
                return val;
            };

            const formatSize = (bytes) => {
                if (bytes >= 1024 * 1024 * 1024) {
                    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
                }
                if (bytes >= 1024 * 1024) {
                    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
                }
                if (bytes >= 1024) {
                    return (bytes / 1024).toFixed(1) + ' KB';
                }
                return bytes + ' B';
            };

            const copyAllLinksForGroup = (groupRows, labelText) => {
                const fileUrls = [];
                groupRows.forEach(row => {
                    const link = Array.from(row.querySelectorAll('a[href]')).find(isFileAnchor);
                    if (link && link.href) {
                        fileUrls.push(link.href);
                    }
                });

                if (fileUrls.length === 0) {
                    showProgressIsland("No links found", "error");
                    return;
                }

                const total = fileUrls.length;
                let resolvedCount = 0;
                const results = new Array(total);

                showProgressIsland(`Resolving ${labelText} links: 0/${total}`, 'progress');

                fileUrls.forEach((url, index) => {
                    fetchDirectLink(url, 0, (directUrl) => {
                        resolvedCount++;
                        results[index] = directUrl;

                        showProgressIsland(`Resolving ${labelText} links: ${resolvedCount}/${total}`, 'progress');

                        if (resolvedCount === total) {
                            const validLinks = results.filter(Boolean);
                            if (validLinks.length > 0) {
                                GM_setClipboard(validLinks.join('\n'), 'text');
                                showProgressIsland(`Copied ${validLinks.length}/${total} links!`, 'success');
                            } else {
                                showProgressIsland(`Failed to resolve any links`, 'error');
                            }
                        }
                    });
                });
            };

            let rows = [];
            if (isListPage) {
                // First, remove any previous quality split sections and restore the original table
                removeQualitySplit();
                // Clear any existing capsules to avoid copying dead event listeners
                removeCapsules();

                rows = Array.from(tbody.children).filter(el => el.tagName === 'TR');

            // --- Quality-based table splitting ---
            const qualityGroups = new Map();
            let shouldApplyQualitySplit = false;

            if (getSetting('sfx-bh-quality-split', true)) {
                rows.forEach(row => {
                    const link = Array.from(row.querySelectorAll('a[href]')).find(isFileAnchor);
                    const filename = link ? link.textContent.trim() : '';
                    const quality = extractQuality(filename);
                    const key = quality || 0;
                    if (!qualityGroups.has(key)) qualityGroups.set(key, []);
                    qualityGroups.get(key).push(row);
                });
                shouldApplyQualitySplit = qualityGroups.size > 0;
            }

            if (shouldApplyQualitySplit) {
                // Sort qualities descending (highest first), unknown (0) last
                const sortedQualities = Array.from(qualityGroups.keys()).sort((a, b) => {
                    if (a === 0) return 1;
                    if (b === 0) return -1;
                    return b - a;
                });

                const origTable = tbody.closest('table');
                if (origTable) {
                    const container = origTable.parentElement;
                    const thead = origTable.querySelector('thead');

                    sortedQualities.forEach(quality => {
                        const groupRows = qualityGroups.get(quality);
                        const table = document.createElement('table');
                        table.className = origTable.className;

                        if (thead) {
                            const newThead = thead.cloneNode(true);
                            newThead.querySelectorAll('a').forEach(a => {
                                const span = a.querySelector('span');
                                if (span) a.parentNode.replaceChild(span, a);
                            });
                            table.appendChild(newThead);
                        }

                        const newTbody = document.createElement('tbody');
                        newTbody.id = `sfx-tbody-${quality}`;
                        groupRows.forEach(row => {
                            newTbody.appendChild(row.cloneNode(true));
                        });
                        table.appendChild(newTbody);

                        const section = document.createElement('div');
                        section.className = 'sfx-quality-section';

                        // Calculate total size for this group
                        let totalBytes = 0;
                        groupRows.forEach(row => {
                            let sizeCell = row.children ? row.children[1] : null;
                            if (sizeCell && !/^\d+(\.\d+)?\s*[a-zA-Z]+$/.test(sizeCell.textContent.trim())) {
                                sizeCell = Array.from(row.children).find(child => /^\d+(\.\d+)?\s*[a-zA-Z]+$/.test(child.textContent.trim()));
                            }
                            if (sizeCell) {
                                totalBytes += parseSize(sizeCell.textContent.trim());
                            }
                        });
                        const totalSizeFormatted = formatSize(totalBytes);

                        // Quality header
                        const header = document.createElement('div');
                        header.className = 'sfx-quality-header';
                        const label = quality === 0 ? 'Other' : `${quality}p`;

                        let copyBtnHtml = '';
                        const isCopyAllEnabled = getSetting('sfx-bh-copy-all', true);
                        const isCustomSelectEnabled = getSetting('sfx-bh-custom-select', true);

                        if (isCopyAllEnabled && isCustomSelectEnabled) {
                            copyBtnHtml = `
                                <div class="sfx-copy-dropdown-container">
                                    <button class="sfx-bh-copy-dropdown-trigger" title="Copy options">
                                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                        <span>Copy</span>
                                        <svg viewBox="0 0 24 24" class="sfx-dropdown-arrow"><path d="M7 10l5 5 5-5z"/></svg>
                                    </button>
                                    <div class="sfx-copy-dropdown-menu">
                                        <button class="sfx-dropdown-item sfx-copy-all-item">
                                            <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                            <span>Copy All Links</span>
                                        </button>
                                        <div class="sfx-dropdown-divider"></div>
                                        <button class="sfx-dropdown-item sfx-custom-select-item">
                                            <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                            <span>Select Custom</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        } else if (isCopyAllEnabled) {
                            copyBtnHtml = `
                                <button class="sfx-bh-copy-all-btn" title="Resolve and copy all direct links for ${label}">
                                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                    Copy All
                                </button>
                            `;
                        } else if (isCustomSelectEnabled) {
                            copyBtnHtml = `
                                <button class="sfx-bh-select-custom-btn" title="Select custom links for ${label}">
                                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                    Select
                                </button>
                            `;
                        }

                        header.innerHTML = `
                            <div class="sfx-quality-info">
                                <span class="sfx-quality-badge">
                                    <svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM5 15h14v3H5z"/></svg>
                                    ${label}
                                </span>
                                <span class="sfx-quality-meta">${groupRows.length} Ep${groupRows.length !== 1 ? 's' : ''}</span>
                                <span class="sfx-quality-dot"></span>
                                <span class="sfx-quality-size">${totalSizeFormatted}</span>
                            </div>
                            <div class="sfx-quality-actions" style="display: flex; align-items: center; gap: 8px;">
                                ${copyBtnHtml}
                            </div>
                        `;
                        section.appendChild(header);

                        if (isCopyAllEnabled && isCustomSelectEnabled) {
                            const container = header.querySelector('.sfx-copy-dropdown-container');
                            const trigger = container.querySelector('.sfx-bh-copy-dropdown-trigger');
                            const menu = container.querySelector('.sfx-copy-dropdown-menu');

                            trigger.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const isShown = menu.classList.contains('sfx-show');

                                document.querySelectorAll('.sfx-copy-dropdown-menu.sfx-show').forEach(m => {
                                    m.classList.remove('sfx-show');
                                    m.parentElement.classList.remove('sfx-active');
                                });

                                if (!isShown) {
                                    menu.classList.add('sfx-show');
                                    container.classList.add('sfx-active');
                                }
                            });

                            menu.querySelector('.sfx-copy-all-item').addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                menu.classList.remove('sfx-show');
                                container.classList.remove('sfx-active');
                                copyAllLinksForGroup(groupRows, label);
                            });

                            menu.querySelector('.sfx-custom-select-item').addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                menu.classList.remove('sfx-show');
                                container.classList.remove('sfx-active');
                                selectCustomForGroup(table, groupRows, label);
                            });
                        } else if (isCopyAllEnabled) {
                            const btn = header.querySelector('.sfx-bh-copy-all-btn');
                            if (btn) {
                                btn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    copyAllLinksForGroup(groupRows, label);
                                });
                            }
                        } else if (isCustomSelectEnabled) {
                            const btn = header.querySelector('.sfx-bh-select-custom-btn');
                            if (btn) {
                                btn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    selectCustomForGroup(table, groupRows, label);
                                });
                            }
                        }

                        section.appendChild(table);
                        if (container) container.insertBefore(section, origTable);
                    });

                    // Add global listener to close all dropdowns when clicking outside
                    if (!window.sfxDropdownInit) {
                        window.sfxDropdownInit = true;
                        document.addEventListener('click', () => {
                            document.querySelectorAll('.sfx-copy-dropdown-menu.sfx-show').forEach(m => {
                                m.classList.remove('sfx-show');
                                m.parentElement.classList.remove('sfx-active');
                            });
                        });
                    }

                    // Hide the original table
                    origTable.style.display = 'none';
                    console.log(`SinFlix Modifier: Split table into ${qualityGroups.size} quality groups.`);
                }
            } else {
                console.log(`SinFlix Modifier: Not splitting table. Found ${qualityGroups.size} qualities.`);
            }

            // --- Capsule enhancements (respects isEnhance toggle) ---
            if (!isEnhance) {
                removeCapsules();
            } else {
                // Add capsules to the visible rows (quality-split tables or original)
                const visibleTbodies = document.querySelectorAll('.sfx-quality-section tbody');
                const targetRows = visibleTbodies.length > 0
                    ? Array.from(document.querySelectorAll('.sfx-quality-section tbody tr'))
                    : rows;

                targetRows.forEach(row => {
                    const link = Array.from(row.querySelectorAll('a[href]')).find(isFileAnchor);
                    if (link) {
                        addCapsuleToRow(row, link);
                    }
                });
            }
        } else if (isSinglePage) {
            const downloadRow = document.querySelector('.download-row');
            const s1Btn = document.querySelector('a[hx-get*="/download"]:not([hx-get*="alt=true"])');
            const s2Btn = document.querySelector('a[hx-get*="/download"][hx-get*="alt=true"]');
            const previewBtn = document.querySelector('a[hx-get*="/preview"]');

            const s1Hx = s1Btn ? s1Btn.getAttribute('hx-get') : '';
            const s2Hx = s2Btn ? s2Btn.getAttribute('hx-get') : '';
            const previewHx = previewBtn ? previewBtn.getAttribute('hx-get') : '';

            let fileUrl = window.location.href;
            if (!fileUrl.includes('buzzheavier.com')) {
                const match = (s1Hx || '').match(/\/([a-zA-Z0-9_-]+)\/download/);
                if (match) {
                    fileUrl = `https://buzzheavier.com/${match[1]}`;
                }
            }

            if (!isEnhance) {
                if (downloadRow) {
                    downloadRow.style.display = '';

                    // Ensure native BuzzHeavier buttons work reliably even if native HTMX is blocked
                    const dlBtn = downloadRow.querySelector('.download-btn');
                    if (dlBtn && !dlBtn.dataset.sfxBound) {
                        dlBtn.dataset.sfxBound = 'true';
                        dlBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            resolveWithFallback(fileUrl, 0, 'dl', this);
                        });
                    }

                    const mirrorBtn = downloadRow.querySelector('a[hx-get*="alt=true"]');
                    if (mirrorBtn && !mirrorBtn.dataset.sfxBound) {
                        mirrorBtn.dataset.sfxBound = 'true';
                        mirrorBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            resolveWithFallback(fileUrl, 1, 'dl', this);
                        });
                    }

                    const copyBtn = downloadRow.querySelector('.copy');
                    if (copyBtn && !copyBtn.dataset.sfxBound) {
                        copyBtn.dataset.sfxBound = 'true';
                        copyBtn.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            resolveWithFallback(fileUrl, 0, 'copy', this);
                        });
                    }
                }
                const card = document.querySelector('.sfx-bh-single-card');
                if (card) card.remove();
            } else {
                if (downloadRow && !document.querySelector('.sfx-bh-single-card')) {
                    const sizeSpan = downloadRow.querySelector('.download-btn .size');
                    const fileSize = sizeSpan ? sizeSpan.textContent.trim() : 'Unknown Size';

                    const fileNameEl = document.querySelector('.file-name');
                    const fileName = fileNameEl ? fileNameEl.textContent.trim() : 'File Download';

                    downloadRow.style.display = 'none';

                    const card = document.createElement('div');
                    card.className = 'sfx-bh-single-card';

                    let serversHtml = `
                        <div class="sfx-bh-servers-container">
                            <div class="sfx-bh-server-row">
                                <div class="sfx-bh-server-info">
                                    <span class="sfx-bh-server-dot sfx-server1"></span>
                                    <span class="sfx-bh-server-name">Server 1 (High Speed)</span>
                                </div>
                                <div class="sfx-bh-server-actions">
                                    <button class="sfx-bh-action-btn sfx-download" id="sfx-s1-dl" title="Download from Server 1">
                                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>
                                        Download
                                    </button>
                                    <button class="sfx-bh-action-btn sfx-copy" id="sfx-s1-copy" title="Copy Server 1 Link">
                                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>
                                        Copy
                                    </button>
                                </div>
                            </div>
                    `;

                    if (s2Hx) {
                        serversHtml += `
                            <div class="sfx-bh-divider"></div>
                            <div class="sfx-bh-server-row">
                                <div class="sfx-bh-server-info">
                                    <span class="sfx-bh-server-dot sfx-server2"></span>
                                    <span class="sfx-bh-server-name">Server 2 (Mirror)</span>
                                </div>
                                <div class="sfx-bh-server-actions">
                                    <button class="sfx-bh-action-btn sfx-download" id="sfx-s2-dl" title="Download from Server 2">
                                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/></svg>
                                        Download
                                    </button>
                                    <button class="sfx-bh-action-btn sfx-copy" id="sfx-s2-copy" title="Copy Server 2 Link">
                                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>
                                        Copy
                                    </button>
                                </div>
                            </div>
                        `;
                    }

                    serversHtml += `</div>`;

                    let footerHtml = '';
                    if (previewHx) {
                        footerHtml = `
                            <div class="sfx-bh-card-footer">
                                <button class="sfx-bh-preview-btn" id="sfx-preview-btn">
                                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/></svg>
                                    Open in browser instead
                                </button>
                            </div>
                        `;
                    }

                    card.innerHTML = `
                        <div class="sfx-bh-card-header">
                            <span class="sfx-bh-file-title">${fileName}</span>
                            <span class="sfx-bh-file-size">${fileSize}</span>
                        </div>
                        ${serversHtml}
                        ${footerHtml}
                    `;

                    downloadRow.parentNode.insertBefore(card, downloadRow);

                    card.querySelector('#sfx-s1-dl').addEventListener('click', function(e) {
                        e.preventDefault();
                        resolveWithFallback(fileUrl, 0, 'dl', this);
                    });
                    card.querySelector('#sfx-s1-copy').addEventListener('click', function(e) {
                        e.preventDefault();
                        resolveWithFallback(fileUrl, 0, 'copy', this);
                    });

                    if (s2Hx) {
                        card.querySelector('#sfx-s2-dl').addEventListener('click', function(e) {
                            e.preventDefault();
                            resolveWithFallback(fileUrl, 1, 'dl', this);
                        });
                        card.querySelector('#sfx-s2-copy').addEventListener('click', function(e) {
                            e.preventDefault();
                            resolveWithFallback(fileUrl, 1, 'copy', this);
                        });
                    }

                    if (previewHx && card.querySelector('#sfx-preview-btn')) {
                        card.querySelector('#sfx-preview-btn').addEventListener('click', () => {
                            const previewUrl = new URL(previewHx, fileUrl).href;
                            window.location.assign(previewUrl);
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error('SinFlixModifier error inside enhanceBuzzheavierContent:', e);
        // Render a user-visible error banner on the page for debugging
        const errBanner = document.createElement('div');
        errBanner.style.cssText = 'background: #fee2e2; color: #991b1b; padding: 12px; margin: 10px 0; border: 1px solid #f87171; border-radius: 6px; font-family: monospace; font-size: 14px; z-index: 9999; position: relative;';
        errBanner.innerHTML = `<strong>SinFlix Modifier Error:</strong> ${e.message}<br><small>${e.stack.replace(/\\n/g, '<br>').substring(0, 500)}</small>`;
        const container = document.querySelector('.mx-auto') || document.body;
        if (container) container.insertBefore(errBanner, container.firstChild);
    }
}

    /* --- Transfer.it Enhancements & Link Resolution --- */
    const transferItFilesCache = new Map();
    const transferItLinksCache = new Map();

    function getTransferItHandle() {
        const pathM = window.location.pathname.match(/\/t\/([a-zA-Z0-9_-]+)/);
        if (pathM) return pathM[1];
        const hrefM = window.location.href.match(/\/t\/([a-zA-Z0-9_-]+)/);
        if (hrefM) return hrefM[1];
        const canonical = document.querySelector('link[rel="canonical"], meta[property="og:url"]');
        if (canonical) {
            const cMatch = (canonical.href || canonical.content || '').match(/\/t\/([a-zA-Z0-9_-]+)/);
            if (cMatch) return cMatch[1];
        }
        return null;
    }

    function fetchTransferItFiles(xh, callback) {
        if (transferItFilesCache.has(xh)) {
            callback(transferItFilesCache.get(xh));
            return;
        }
        const seq = Math.floor(Math.random() * 1000000);
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://bt7.api.mega.co.nz/cs?id=${seq}&x=${xh}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify([{ a: "f", c: 1, r: 1 }]),
            onload: function(res) {
                try {
                    const json = JSON.parse(res.responseText);
                    if (Array.isArray(json) && json[0] && Array.isArray(json[0].f)) {
                        const allNodes = json[0].f;
                        const fileNodes = allNodes.filter(n => n.t === 0);
                        const rootNode = allNodes.find(n => n.t === 1);
                        const result = { files: fileNodes, root: rootNode };
                        transferItFilesCache.set(xh, result);
                        callback(result);
                    } else {
                        callback(null);
                    }
                } catch (e) {
                    console.error("Error parsing Transfer.it files:", e);
                    callback(null);
                }
            },
            onerror: function(err) {
                console.error("Network error fetching Transfer.it files:", err);
                callback(null);
            }
        });
    }

    function formatTransferItDirectUrl(baseUrl, filename) {
        if (!baseUrl) return '';
        if (!filename || filename === 'File') return baseUrl;
        const cleanName = filename.replace(/[\/\\]/g, '_').trim();
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const encodedName = encodeURIComponent(cleanName);
        if (cleanBase.endsWith('/' + encodedName) || cleanBase.endsWith('/' + cleanName)) {
            return cleanBase;
        }
        return `${cleanBase}/${encodedName}`;
    }

    function getTransferItFilename(itemOrHandle) {
        if (itemOrHandle) {
            let el = null;
            if (typeof itemOrHandle === 'string') {
                el = document.getElementById(itemOrHandle) || document.querySelector(`.it-grid-item[id="${itemOrHandle}"]`);
            } else if (itemOrHandle.nodeType) {
                el = itemOrHandle;
            }
            if (el) {
                const nameEl = el.querySelector('.item-name, .md-font-size, .file-name, .title, .truncate');
                if (nameEl && nameEl.textContent.trim()) {
                    return nameEl.textContent.trim();
                }
            }
        }
        const readyBox = document.querySelector('.ready-to-download-box, .link-info');
        if (readyBox) {
            const titleEl = readyBox.querySelector('.title, .item-name');
            if (titleEl && titleEl.textContent.trim()) {
                return titleEl.textContent.trim();
            }
        }
        return '';
    }

    function resolveTransferItDirectLink(xh, nodeHandle, callback, filename) {
        const cacheKey = `${xh}:${nodeHandle}`;
        const targetFilename = filename || getTransferItFilename(nodeHandle);

        const attachName = (rawUrl) => {
            return formatTransferItDirectUrl(rawUrl, targetFilename);
        };

        if (transferItLinksCache.has(cacheKey)) {
            const cachedUrl = transferItLinksCache.get(cacheKey);
            callback(attachName(cachedUrl));
            return;
        }
        const seq = Math.floor(Math.random() * 1000000);
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://bt7.api.mega.co.nz/cs?id=${seq}&x=${xh}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify([{ a: "g", g: 1, ssl: 1, n: nodeHandle }]),
            onload: function(res) {
                try {
                    const json = JSON.parse(res.responseText);
                    if (Array.isArray(json) && json[0] && json[0].g) {
                        const directUrl = json[0].g;
                        transferItLinksCache.set(cacheKey, directUrl);
                        callback(attachName(directUrl));
                    } else {
                        const fallbackName = targetFilename || 'download';
                        const fallbackUrl = `https://bt7.api.mega.co.nz/cs/g?x=${xh}&n=${nodeHandle}&fn=${encodeURIComponent(fallbackName)}`;
                        callback(fallbackUrl);
                    }
                } catch (e) {
                    const fallbackName = targetFilename || 'download';
                    const fallbackUrl = `https://bt7.api.mega.co.nz/cs/g?x=${xh}&n=${nodeHandle}&fn=${encodeURIComponent(fallbackName)}`;
                    callback(fallbackUrl);
                }
            },
            onerror: function() {
                const fallbackName = targetFilename || 'download';
                const fallbackUrl = `https://bt7.api.mega.co.nz/cs/g?x=${xh}&n=${nodeHandle}&fn=${encodeURIComponent(fallbackName)}`;
                callback(fallbackUrl);
            }
        });
    }

    function resolveTransferItZipLink(xh, title, callback) {
        const cacheKey = `${xh}:zip`;
        if (transferItLinksCache.has(cacheKey)) {
            callback(transferItLinksCache.get(cacheKey));
            return;
        }
        const seq = Math.floor(Math.random() * 1000000);
        GM_xmlhttpRequest({
            method: "POST",
            url: `https://bt7.api.mega.co.nz/cs?id=${seq}&x=${xh}`,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify([{ a: "xi", xh: xh }]),
            onload: function(res) {
                try {
                    const json = JSON.parse(res.responseText);
                    const info = Array.isArray(json) ? json[0] : json;
                    if (info && info.z) {
                        const zipNode = info.z;
                        const zipName = encodeURIComponent((title || xh) + '.zip');
                        const zipUrl = `https://bt7.api.mega.co.nz/cs/g?x=${xh}&n=${zipNode}&fn=${zipName}`;
                        transferItLinksCache.set(cacheKey, zipUrl);
                        callback(zipUrl);
                    } else {
                        callback(null);
                    }
                } catch (e) {
                    console.error("Error resolving Transfer.it zip link:", e);
                    callback(null);
                }
            },
            onerror: function(err) {
                console.error("Network error resolving Transfer.it zip link:", err);
                callback(null);
            }
        });
    }

    function copyAllTransferItLinks(xh) {
        showProgressIsland("Fetching Transfer.it files...", "progress");
        fetchTransferItFiles(xh, (data) => {
            if (!data || !data.files || data.files.length === 0) {
                showProgressIsland("No files found in transfer", "error");
                return;
            }
            const files = data.files;
            const total = files.length;
            showProgressIsland(`Resolving links: 0/${total}`, "progress");

            const seq = Math.floor(Math.random() * 1000000);
            const batchReq = files.map(f => ({ a: "g", g: 1, ssl: 1, n: f.h }));

            GM_xmlhttpRequest({
                method: "POST",
                url: `https://bt7.api.mega.co.nz/cs?id=${seq}&x=${xh}`,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(batchReq),
                onload: function(res) {
                    try {
                        const responses = JSON.parse(res.responseText);
                        const urls = [];
                        if (Array.isArray(responses)) {
                            responses.forEach((item, idx) => {
                                const fileObj = files[idx];
                                const nodeHandle = fileObj.h;
                                const fn = getTransferItFilename(nodeHandle) || `file_${idx + 1}`;
                                if (item && item.g) {
                                    transferItLinksCache.set(`${xh}:${nodeHandle}`, item.g);
                                    urls.push(formatTransferItDirectUrl(item.g, fn));
                                } else {
                                    urls.push(`https://bt7.api.mega.co.nz/cs/g?x=${xh}&n=${nodeHandle}&fn=${encodeURIComponent(fn)}`);
                                }
                            });
                        }
                        if (urls.length > 0) {
                            GM_setClipboard(urls.join('\n'), 'text');
                            showProgressIsland(`Copied ${urls.length} links successfully!`, "success");
                        } else {
                            showProgressIsland("Failed to resolve links", "error");
                        }
                    } catch (e) {
                        showProgressIsland("Error resolving bulk links", "error");
                    }
                },
                onerror: function() {
                    showProgressIsland("Network error resolving links", "error");
                }
            });
        });
    }

    function copyZippedTransferItLink(xh) {
        const titleEl = document.querySelector('.ready-to-download-box .title, .link-info .title');
        const title = titleEl ? titleEl.textContent.trim() : 'Transfer';
        showProgressIsland("Resolving Zip link...", "progress");
        resolveTransferItZipLink(xh, title, (zipUrl) => {
            if (zipUrl) {
                GM_setClipboard(zipUrl, 'text');
                showProgressIsland("Copied Zip download link!", "success");
            } else {
                showProgressIsland("No Zip link available", "error");
            }
        });
    }

    function handleTransferItCopyAction(xh, nodeHandle, filename, btnEl) {
        const safeName = filename || getTransferItFilename(nodeHandle) || 'File';
        showProgressIsland(`Resolving link: ${safeName}...`, "progress");
        resolveTransferItDirectLink(xh, nodeHandle, (directUrl) => {
            if (directUrl) {
                GM_setClipboard(directUrl, 'text');
                showProgressIsland(`Copied link: ${safeName}`, "success");
                if (btnEl) {
                    btnEl.classList.add('sfx-copied');
                    const origSvg = btnEl.innerHTML;
                    btnEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
                    setTimeout(() => {
                        btnEl.classList.remove('sfx-copied');
                        btnEl.innerHTML = origSvg;
                    }, 1500);
                }
            } else {
                showProgressIsland("Failed to resolve link", "error");
            }
        }, safeName);
    }

    function enhanceTransferItContent() {
        const xh = getTransferItHandle();
        if (!xh) return;

        const isEnhance = getSetting('sfx-transferit-ui-enhancements', true);
        const isCopyAll = getSetting('sfx-transferit-copy-all', true);

        if (!isEnhance) {
            document.querySelectorAll('.sfx-ti-copy-btn, .sfx-ti-summary-actions, .sfx-ti-row-capsule').forEach(el => el.remove());
            return;
        }

        // Remove top "download all" icon in header
        const topDownloadAllBtns = document.querySelectorAll('.grid-header .js-download-all, .info-header .js-download-all');
        topDownloadAllBtns.forEach(btn => {
            const parentHeader = btn.closest('.info-header');
            btn.remove();
            if (parentHeader) {
                const linkName = parentHeader.querySelector('.link-name');
                if (!linkName || !linkName.textContent.trim()) {
                    parentHeader.style.display = 'none';
                }
            }
        });

        // 1. Summary Card Enhancement
        const readyBox = document.querySelector('.ready-to-download-box');
        if (readyBox) {
            const footer = readyBox.querySelector('footer');
            if (footer && !readyBox.querySelector('.sfx-ti-summary-actions')) {
                const summaryActions = document.createElement('div');
                summaryActions.className = 'sfx-ti-summary-actions';
                summaryActions.innerHTML = `
                    ${isCopyAll ? `
                    <button class="sfx-ti-summary-btn sfx-copy-all" title="Copy All Direct Links">
                        <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                        Copy All Links
                    </button>` : ''}
                    <button class="sfx-ti-summary-btn sfx-copy-zip" title="Copy Zipped Link">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                        Copy Zipped Link
                    </button>
                `;

                const copyAllBtn = summaryActions.querySelector('.sfx-copy-all');
                if (copyAllBtn) {
                    copyAllBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyAllTransferItLinks(xh);
                    });
                }

                const copyZipBtn = summaryActions.querySelector('.sfx-copy-zip');
                if (copyZipBtn) {
                    copyZipBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        copyZippedTransferItLink(xh);
                    });
                }

                footer.parentNode.insertBefore(summaryActions, footer.nextSibling);
            }
        }

        // 2. File Listing View: Toolbar above grid if present
        const scrollArea = document.querySelector('.desktop-scroll-area');
        const grid = scrollArea ? scrollArea.querySelector('.it-grid') : null;
        if (grid && !scrollArea.querySelector('.sfx-ti-summary-actions')) {
            const gridToolbar = document.createElement('div');
            gridToolbar.className = 'sfx-ti-summary-actions';
            gridToolbar.innerHTML = `
                ${isCopyAll ? `
                <button class="sfx-ti-summary-btn sfx-copy-all" title="Copy All Direct Links">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    Copy All Links
                </button>` : ''}
                <button class="sfx-ti-summary-btn sfx-copy-zip" title="Copy Zipped Link">
                    <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Copy Zipped Link
                </button>
            `;

            gridToolbar.querySelector('.sfx-copy-all')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyAllTransferItLinks(xh);
            });

            gridToolbar.querySelector('.sfx-copy-zip')?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyZippedTransferItLink(xh);
            });

            grid.parentNode.insertBefore(gridToolbar, grid);
        }

        // 3. File Grid Items Enhancement: Single Copy Button matching official Download UI
        const gridItems = document.querySelectorAll('.it-grid-item');
        gridItems.forEach(item => {
            if (item.querySelector('.sfx-ti-copy-btn')) return;

            const nodeHandle = item.id;
            if (!nodeHandle) return;

            const filename = getTransferItFilename(item) || 'File';
            const dlBtn = item.querySelector('.js-download');
            const dataBody = item.querySelector('.item-data-body') || item;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'it-button sm-size ghost sfx-ti-copy-btn';
            copyBtn.setAttribute('aria-label', 'Copy Link');
            copyBtn.title = `Copy Direct Link: ${filename}`;
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
            `;

            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const currentName = getTransferItFilename(item) || filename;
                handleTransferItCopyAction(xh, nodeHandle, currentName, copyBtn);
            });

            if (dlBtn && dlBtn.parentNode) {
                dlBtn.parentNode.insertBefore(copyBtn, dlBtn);
            } else {
                dataBody.appendChild(copyBtn);
            }
        });
    }

    function init() {
        const host = window.location.hostname;
        const isBuzzheavier = host.includes('buzzheavier.com') ||
                              document.querySelector('meta[name="application-name"][content="buzzheavier.com"]') !== null ||
                              document.querySelector('.download-row a[hx-get*="/download"]') !== null;

        if (isBuzzheavier) {
            try {
                let bhObserver = null;
                let bhDebounce = null;

                function runEnhance() {
                    if (bhObserver) bhObserver.disconnect();
                    try {
                        enhanceBuzzheavierContent();
                    } catch(e) {
                        console.error('SinFlixModifier error on buzzheavier.com:', e);
                    } finally {
                        if (bhObserver) {
                            bhObserver.observe(document.body, { childList: true, subtree: true });
                        }
                    }
                }

                // Expose runEnhance so settings toggles can call it
                bhRunEnhance = runEnhance;

                bhObserver = new MutationObserver((mutations) => {
                    const ignore = mutations.every(m => {
                        const target = m.target;
                        const el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
                        if (!el) return false;

                        // If the mutation happened directly on document.body, check if the added/removed nodes are our ignored wrappers
                        if (target === document.body) {
                            const nodes = Array.from(m.addedNodes).concat(Array.from(m.removedNodes));
                            const allIgnored = nodes.every(node => {
                                if (node.nodeType !== Node.ELEMENT_NODE) return true; // ignore text nodes, comments etc.
                                return node.id === 'sfx-island-wrap' ||
                                       node.id === 'sfx-back-to-top' ||
                                       node.classList.contains('sfx-quality-section');
                            });
                            if (allIgnored) return true;
                        }

                        return el.closest('#sfx-island-wrap') ||
                               el.closest('#sfx-back-to-top') ||
                               el.closest('.sfx-quality-section') ||
                               el.closest('.sfx-bh-single-card') ||
                               el.closest('.sfx-bh-row-capsule');
                    });
                    if (ignore) return;

                    clearTimeout(bhDebounce);
                    bhDebounce = setTimeout(runEnhance, 120);
                });

                runEnhance();
                bhObserver.observe(document.body, { childList: true, subtree: true });

                // First time visit notice
                const alertSeen = GM_getValue('sfx-bh-alert-seen', false);
                if (!alertSeen) {
                    GM_setValue('sfx-bh-alert-seen', true);
                    setTimeout(() => {
                        alert("Notice: If you are using uBlock Origin or other adblockers, please consider disabling them on BuzzHeavier to get the full experience (preventing API request blocks)!");
                        showProgressIsland("Adblock Notice: Disable uBlock Origin for best experience", "warning");
                    }, 1000);
                }
            } catch(e) {
                console.error('SinFlixModifier error on buzzheavier.com:', e);
            }
            return;
        }

        const isTransferIt = host.includes('transfer.it') ||
                             document.querySelector('meta[name="apple-mobile-web-app-title"][content*="Transfer"]') !== null;

        if (isTransferIt) {
            try {
                let tiObserver = null;
                let tiDebounce = null;

                function runEnhance() {
                    if (tiObserver) tiObserver.disconnect();
                    try {
                        enhanceTransferItContent();
                    } catch(e) {
                        console.error('SinFlixModifier error on transfer.it:', e);
                    } finally {
                        if (tiObserver) {
                            tiObserver.observe(document.body, { childList: true, subtree: true });
                        }
                    }
                }

                tiRunEnhance = runEnhance;

                tiObserver = new MutationObserver((mutations) => {
                    const ignore = mutations.every(m => {
                        const target = m.target;
                        const el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
                        if (!el) return false;

                        if (target === document.body) {
                            const nodes = Array.from(m.addedNodes).concat(Array.from(m.removedNodes));
                            const allIgnored = nodes.every(node => {
                                if (node.nodeType !== Node.ELEMENT_NODE) return true;
                                return node.id === 'sfx-island-wrap' ||
                                       node.classList?.contains('sfx-ti-copy-btn') ||
                                       node.classList?.contains('sfx-ti-summary-actions');
                            });
                            if (allIgnored) return true;
                        }

                        return el.closest('#sfx-island-wrap') ||
                               el.closest('.sfx-ti-copy-btn') ||
                               el.closest('.sfx-ti-summary-actions');
                    });
                    if (ignore) return;

                    clearTimeout(tiDebounce);
                    tiDebounce = setTimeout(runEnhance, 120);
                });

                runEnhance();
                tiObserver.observe(document.body, { childList: true, subtree: true });
            } catch(e) {
                console.error('SinFlixModifier error on transfer.it:', e);
            }
            return;
        }


        if (host.includes('pst.moe')) {
            try {
                if (getSetting('sfx-pst-open-same-tab', true)) {
                    document.addEventListener('click', (e) => {
                        if (!getSetting('sfx-pst-open-same-tab', true)) return;
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

                        const anchor = e.target.closest('a[href]');
                        if (!anchor) return;

                        const rawHref = anchor.getAttribute('href');
                        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

                        anchor.target = '_self';
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = anchor.href;
                    }, true);
                }

                enhancePstMoeContent();
                // Apply dark mode on load if enabled
                if (getSetting('sfx-pst-dark-mode', false)) applyPstDarkMode(true);
            } catch(e) { console.error('SinFlixModifier error on pst.moe:', e); }
            return;
        }

        const isDarklabSite = host.includes('darklab.sh') || host.includes('0g.gg') ||
                              window.location.href.includes('darklab.sh') || window.location.href.includes('0g.gg') ||
                              (document.querySelector('#prettyprint, #prettymessage, #cleartext') !== null && !host.includes('pst.moe'));

        if (isDarklabSite) {
            try {
                if (getSetting('sfx-darklab-dark-mode', false)) applyPstDarkMode(true);

                if (getSetting('sfx-darklab-open-same-tab', true)) {
                    document.addEventListener('click', (e) => {
                        if (!getSetting('sfx-darklab-open-same-tab', true)) return;
                        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

                        const anchor = e.target.closest('a[href]');
                        if (!anchor) return;

                        const rawHref = anchor.getAttribute('href');
                        if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;

                        anchor.target = '_self';
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = anchor.href;
                    }, true);
                }

                function tryEnhancePrivateBin() {
                    const pre = document.querySelector('#prettyprint, #cleartext, pre');
                    if (!pre) return false;

                    const text = (pre.textContent || '').trim();
                    if (!text || text === '+++ no document text +++') return false;

                    const hasMega = text.includes('mega.nz');

                    if (!hasMega) {
                        // On 0g.gg / darklab: quality-wise UI and partition must show ONLY for mega links!
                        // If no mega links: show original view with linkified URLs and same-tab opening
                        if (getSetting('sfx-darklab-dark-mode', false)) {
                            applyPstDarkMode(true);
                        }
                        const parent = pre.parentElement;
                        if (parent) {
                            parent.classList.remove('hidden');
                            parent.style.display = 'block';
                            const existing = parent.querySelector('.sfx-pst-container');
                            if (existing) existing.remove();
                        }
                        pre.style.display = '';
                        linkifyAndSetupAnchors(pre, getSetting('sfx-darklab-open-same-tab', true));
                        return true;
                    }

                    if (document.querySelector('.sfx-pst-container.sfx-ready')) return true;

                    const ok = enhancePstMoeContent(pre);
                    if (ok && getSetting('sfx-darklab-dark-mode', false)) {
                        applyPstDarkMode(true);
                    }
                    return ok;
                }

                if (!tryEnhancePrivateBin()) {
                    const observer = new MutationObserver(() => {
                        tryEnhancePrivateBin();
                    });
                    observer.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });

                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (tryEnhancePrivateBin() || attempts > 60) {
                            if (attempts > 60) {
                                clearInterval(interval);
                            }
                        }
                    }, 250);
                }
            } catch(e) { console.error('SinFlixModifier error on darklab.sh / 0g.gg:', e); }
            return;
        }

        if (host.includes('fileditchfiles.me')) {
            try { handleFileDitchPage(); } catch(e) { console.error('SinFlixModifier error on fileditchfiles.me:', e); }
            return;
        }

        if (host.includes('fetchrr.io')) {
            try { handleFetchrrPage(); } catch(e) { console.error('SinFlixModifier error on fetchrr.io:', e); }
            return;
        }

        if (host.includes('mega.nz')) {
            try { showMegaFetchrrPill(); } catch(e) { console.error('SinFlixModifier error on mega.nz:', e); }
            return;
        }

        const content = document.querySelector('.entry-text article');
        if (content) {
            if (getSetting('sfx-move-ongoing-top', false)) {
                reorderSections();
            }
            enhanceDayHeaders(content);
            enhancePageContent(content);
            setupCompletedDramasFilter(content);
        }
        // Create and append the dynamic island wrap
        const wrap = document.createElement('div');
        wrap.id = 'sfx-island-wrap';
        wrap.innerHTML = `
            <!-- Default View -->
            <div id="sfx-island-default-view">
                <div id="sfx-island-search-icon">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </div>
                <span id="sfx-island-label">Search</span>
                <input id="sfx-island-input" type="text" placeholder="Search page..." autocomplete="off" spellcheck="false" />
                <button id="sfx-island-search-clear" title="Clear search">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                </button>
                <span id="sfx-island-count">0/0</span>
                <button class="sfx-island-nav" id="sfx-island-prev" title="Previous match" disabled>
                    <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
                </button>
                <button class="sfx-island-nav" id="sfx-island-next" title="Next match" disabled>
                    <svg viewBox="0 0 24 24"><path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.42z"/></svg>
                </button>
                <div class="sfx-island-divider"></div>
                <button class="sfx-island-action" id="sfx-island-chat" title="SinFlix Chat">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                </button>
                <button class="sfx-island-action" id="sfx-island-settings" title="Settings">
                    <svg viewBox="0 0 24 24"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                </button>
            </div>

            <!-- Settings View -->
            <div id="sfx-island-settings-view">
                <div class="sfx-settings-header">
                    <span>Settings</span>
                    <button class="sfx-island-action" id="sfx-island-settings-close" title="Close Settings">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                </div>
                <div class="sfx-settings-divider"></div>
                <div class="sfx-settings-scroll-container">
                    <!-- SECTION: GENERAL -->
                    <div class="sfx-settings-section-title">General Layout</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Back to Top Button</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-back-to-top">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Move Ongoing to Top</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-move-ongoing">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-select-row">
                            <span class="sfx-select-label">Chat Box Style</span>
                            <select id="sfx-select-chat-style">
                                <option value="tab">New Tab</option>
                                <option value="popup">Popup Window</option>
                            </select>
                        </div>
                    </div>

                    <!-- SECTION: DRAMA OPTIONS -->
                    <div class="sfx-settings-section-title">Drama Title Click Options</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Enable Options Popover</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-drama-search">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-select-row">
                            <span class="sfx-select-label">Search Option Style</span>
                            <select id="sfx-select-drama-style">
                                <option value="tab">New Tab</option>
                                <option value="popup">Popup Window</option>
                            </select>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-input-row">
                            <span class="sfx-input-label">Google Search Suffix</span>
                            <input type="text" id="sfx-input-google-suffix" placeholder="e.g. TV Series" />
                        </div>
                    </div>

                    <!-- SECTION: THEMOVIEDB -->
                    <div class="sfx-settings-section-title">TheMovieDB</div>
                    <div class="sfx-settings-group" id="sfx-settings-group-tmdb">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Enable TheMovieDB</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-tmdb-enabled">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-input-row sfx-input-wide">
                            <span class="sfx-input-label">Read Access Token</span>
                            <input type="password" id="sfx-input-tmdb-read-token" placeholder="Bearer eyJhbGciOi..." title="API Read Access Token (v4 auth)" />
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-input-row sfx-input-wide">
                            <span class="sfx-input-label">API Key</span>
                            <input type="text" id="sfx-input-tmdb-api-key" placeholder="API Key (v3 auth)" title="API Key (v3 auth)" />
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-btn-row">
                            <button class="sfx-settings-save-btn" id="sfx-save-tmdb-btn" type="button" title="Save TMDb credentials immediately">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                                <span id="sfx-save-tmdb-btn-text">Save Credentials</span>
                            </button>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-guide-card">
                            <div class="sfx-settings-guide-title">
                                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                <span>How to get credentials</span>
                            </div>
                            <ol class="sfx-settings-guide-list">
                                <li>Create a free account on <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">themoviedb.org</a></li>
                                <li>Go to <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">themoviedb.org/settings/api</a> to request or view your credentials</li>
                                <li>Paste your <b>API Read Access Token</b> or <b>API Key</b> above</li>
                            </ol>
                        </div>
                    </div>

                    <!-- SECTION: DOWNLOADS -->
                    <div class="sfx-settings-section-title">Download Enhancements</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-settings-select-row">
                            <span class="sfx-select-label">Download Link Style</span>
                            <select id="sfx-select-download-style">
                                <option value="tab">New Tab</option>
                                <option value="popup">Popup Window</option>
                            </select>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Mega &rarr; Fetchrr Pill</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-mega-fetchrr">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-select-row">
                            <span class="sfx-select-label">Mega/Fetchrr Style</span>
                            <select id="sfx-select-mega-fetchrr-style">
                                <option value="tab">New Tab</option>
                                <option value="popup">Popup Window</option>
                                <option value="self">Same Page</option>
                            </select>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-select-row">
                            <span class="sfx-select-label">FileDitch Action Style</span>
                            <select id="sfx-select-fileditch-style">
                                <option value="popup">Popup Window</option>
                                <option value="tab">New Tab</option>
                            </select>
                        </div>
                    </div>

                    <!-- SECTION: BUZZHEAVIER OPTIONS -->
                    <div class="sfx-settings-section-title">BuzzHeavier Options</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">BuzzHeavier Link Conversion</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-buzzheavier">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">BuzzHeavier Download UI</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-buzzheavier-ui">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">BuzzHeavier Quality Split</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-buzzheavier-split">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">BuzzHeavier Copy All Links</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-buzzheavier-copy-all">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">BuzzHeavier Custom Select</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-buzzheavier-custom-select">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-settings-notice" style="padding: 10px; margin: 8px; border-radius: 8px; background: rgba(255, 159, 10, 0.08); border: 1px solid rgba(255, 159, 10, 0.15); font-size: 11px; color: #ff9f0a; line-height: 1.4; text-align: left;">
                            <strong>Adblock Notice:</strong> If you use uBlock Origin or other adblockers, please consider turning them off on BuzzHeavier / SinFlix to get the full experience (prevents extension-blocking of API requests).
                        </div>
                    </div>

                    <!-- SECTION: TRANSFER.IT OPTIONS -->
                    <div class="sfx-settings-section-title">Transfer.it Options</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Transfer.it Copy Buttons</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-transferit-ui" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Transfer.it Copy All Links</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-transferit-copy-all" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- SECTION: PST.MOE OPTIONS -->
                    <div class="sfx-settings-section-title">pst.moe Options</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Dark Background</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-pst-dark">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">pst.moe Copy Options</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-pst-copy-options" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Open Links in Same Tab</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-pst-same-tab" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- SECTION: DARKLAB OPTIONS -->
                    <div class="sfx-settings-section-title">p.darklab.sh / 0g.gg Options</div>
                    <div class="sfx-settings-group">
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Dark Background</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-darklab-dark">
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">p.darklab.sh / 0g.gg Copy Options</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-darklab-copy-options" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                        <div class="sfx-settings-row-divider"></div>
                        <div class="sfx-switch-row">
                            <span class="sfx-switch-label">Open Links in Same Tab</span>
                            <label class="sfx-switch">
                                <input type="checkbox" id="sfx-toggle-darklab-same-tab" checked>
                                <span class="sfx-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        setupIslandEvents(wrap);

        // Create and append the popover menu to body
        const popover = document.createElement('div');
        popover.id = 'sfx-popover-menu';
        popover.innerHTML = `
            <div class="sfx-popover-header">
                <span class="sfx-popover-title">Options</span>
                <button class="sfx-popover-copy-btn" id="sfx-popover-copy" title="Copy Drama Name">
                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
            </div>
            <div class="sfx-popover-divider"></div>
            <div class="sfx-popover-search-row">
                <span class="sfx-popover-search-label">Search with</span>
                <div class="sfx-popover-icons">
                    <button class="sfx-popover-icon-btn" id="sfx-popover-google" title="Search Google">
                        <svg viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
                    </button>
                    <button class="sfx-popover-icon-btn" id="sfx-popover-mdl" title="Search MyDramaList">
                        <svg viewBox="0 0 48 48" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M38.5 5.5h-29a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h29a4 4 0 0 0 4-4v-29a4 4 0 0 0-4-4"/><path fill="none" d="M9.5 29.591V18.396l5.604 11.208l5.604-11.191v11.191m2.382 0V18.396h2.521a4.903 4.903 0 0 1 4.903 4.904v1.4a4.903 4.903 0 0 1-4.903 4.904zm9.806-11.208v11.208H38.5"/></svg>
                    </button>
                    <button class="sfx-popover-icon-btn" id="sfx-popover-imdb" title="Search IMDb">
                        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-label="IMDb" role="img"><rect width="512" height="512" rx="15%" fill="#f5c518"/><path fill="#000000" d="M104 328V184H64v144zM189 184l-9 67-5-36-5-31h-50v144h34v-95l14 95h25l13-97v97h34V184zM256 328V184h62c15 0 26 11 26 25v94c0 14-11 25-26 25zm47-118l-9-1v94c5 0 9-1 10-3 2-2 2-8 2-18v-56-12l-3-4zM419 220h3c14 0 26 11 26 25v58c0 14-12 25-26 25h-3c-8 0-16-4-21-11l-2 9h-36V184h38v46c5-6 13-10 21-10zm-8 70v-34l-1-11c-1-2-4-3-6-3s-5 1-6 3v57c1 2 4 3 6 3s6-1 6-3l1-12z"/></svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(popover);

        let activeDramaName = '';
        let activeDramaElement = null;

        function hidePopover() {
            popover.classList.remove('sfx-show');
            setTimeout(() => {
                popover.style.display = 'none';
            }, 150);
        }

        function openSearchLink(url) {
            const style = getSetting('sfx-drama-search-open-style', 'tab');
            if (style === 'popup') {
                const w = 900, h = 650;
                const left = Math.round((screen.width - w) / 2);
                const top = Math.round((screen.height - h) / 2);
                window.open(url, '_blank', `width=${w},height=${h},left=${left},top=${top},menubar=no,toolbar=no,status=no,location=yes`);
            } else {
                window.open(url, '_blank');
            }
        }

        popover.querySelector('#sfx-popover-google').addEventListener('click', (e) => {
            e.stopPropagation();
            const suffix = getSetting('sfx-google-search-suffix', 'TV Series');
            const query = (activeDramaName + ' ' + suffix).trim();
            openSearchLink('https://www.google.com/search?q=' + encodeURIComponent(query));
            hidePopover();
        });

        popover.querySelector('#sfx-popover-mdl').addEventListener('click', (e) => {
            e.stopPropagation();
            openSearchLink('https://mydramalist.com/search?q=' + encodeURIComponent(activeDramaName) + '&adv=titles&ty=68&co=3&so=relevance');
            hidePopover();
        });

        popover.querySelector('#sfx-popover-imdb').addEventListener('click', (e) => {
            e.stopPropagation();
            openSearchLink('https://www.imdb.com/find?q=' + encodeURIComponent(activeDramaName));
            hidePopover();
        });

        popover.querySelector('#sfx-popover-copy').addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(activeDramaName);
            } else {
                navigator.clipboard.writeText(activeDramaName);
            }
            const btn = popover.querySelector('#sfx-popover-copy');
            const origHTML = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="#30d158" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
            btn.title = 'Copied!';
            setTimeout(() => {
                btn.innerHTML = origHTML;
                btn.title = 'Copy Drama Name';
                hidePopover();
            }, 700);
        });

        // ==========================================
        // TheMovieDB Glassmorphism Modal Integration
        // ==========================================
        const tmdbDataCache = new Map();
        const tmdbPersonCache = new Map();
        let tmdbModalEl = null;
        let activeTmdbCopyText = '';
        let currentMediaData = null;
        let currentPersonData = null;
        const tmdbNavStack = [];
        let activeTmdbIsPerson = false;

        const K_DRAMA_ALIASES = {
            'goblin': 'Guardian: The Lonely and Great God',
            'moon lovers': 'Moon Lovers: Scarlet Heart Ryeo',
            'scarlet heart ryeo': 'Moon Lovers: Scarlet Heart Ryeo',
            'scarlet heart: ryeo': 'Moon Lovers: Scarlet Heart Ryeo',
            'dp': 'D.P.',
            'd.p': 'D.P.',
            'd.p.': 'D.P.',
            'the penthouse': 'The Penthouse: War in Life',
            'penthouse': 'The Penthouse: War in Life'
        };

        const escapeHtml = str => String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        function stripPunct(s) {
            return (s || '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        }

        function stripThe(s) {
            return (s || '').replace(/^the\s+/, '');
        }

        function isExactTitleMatch(item, query) {
            if (!item) return false;
            const n = (item.name || item.title || '');
            const o = (item.original_name || item.original_title || '');
            const nNorm = stripPunct(n);
            const oNorm = stripPunct(o);
            const qNorm = stripPunct(query);
            if (nNorm === qNorm || oNorm === qNorm) return true;
            if (stripThe(nNorm) === stripThe(qNorm)) return true;
            return false;
        }

        function isItemKorean(item) {
            if (!item) return false;
            return (Array.isArray(item.origin_country) && item.origin_country.includes('KR')) ||
                   item.original_language === 'ko';
        }

        function scoreTmdbItem(item, query, targetYear) {
            if (!item) return -1;
            const name = (item.name || item.title || '').trim().toLowerCase();
            const cleanQuery = query.trim().toLowerCase();

            let score = 0;
            const isKorean = isItemKorean(item);
            if (isKorean) score += 2000;
            else score -= 500;

            if (isExactTitleMatch(item, query)) {
                score += 1000;
            } else if (name.startsWith(cleanQuery + ' ') || name.endsWith(' ' + cleanQuery)) {
                score += 300;
            } else if (name.includes(cleanQuery)) {
                score += 150;
            }

            const releaseDate = item.first_air_date || item.release_date || '';
            const itemYear = releaseDate.slice(0, 4);
            if (targetYear && itemYear) {
                if (itemYear === targetYear) score += 500;
                else if (Math.abs(parseInt(itemYear, 10) - parseInt(targetYear, 10)) <= 1) score += 150;
                else score -= 100;
            }

            if (item.media_type === 'tv' || (!item.media_type && item.first_air_date)) score += 50;
            score += Math.min(item.popularity || 0, 80);
            return score;
        }

        function pickBestKoreanMatch(results, query, year) {
            if (!Array.isArray(results) || results.length === 0) return null;
            const scored = results.map(r => ({ item: r, score: scoreTmdbItem(r, query, year) }));
            scored.sort((a, b) => b.score - a.score);
            return scored[0] && scored[0].score > 0 ? scored[0].item : null;
        }

        function findBestTrailer(videos) {
            if (!Array.isArray(videos) || videos.length === 0) return null;
            const ytVideos = videos.filter(v => v.site === 'YouTube' && v.key);
            if (ytVideos.length === 0) return null;
            const officialTrailer = ytVideos.find(v => v.type === 'Trailer' && v.official);
            if (officialTrailer) return officialTrailer;
            const anyTrailer = ytVideos.find(v => v.type === 'Trailer');
            if (anyTrailer) return anyTrailer;
            const officialTeaser = ytVideos.find(v => v.type === 'Teaser' && v.official);
            if (officialTeaser) return officialTeaser;
            const anyTeaser = ytVideos.find(v => v.type === 'Teaser');
            if (anyTeaser) return anyTeaser;
            return ytVideos[0];
        }

        async function fetchTmdbDetails(dramaName) {
            if (tmdbDataCache.has(dramaName)) {
                return tmdbDataCache.get(dramaName);
            }

            const { readToken, apiKey } = getTmdbCredentials();

            if (!readToken && !apiKey) {
                throw new Error('Missing TheMovieDB credentials');
            }

            const headers = { 'Accept': 'application/json' };
            if (readToken) {
                headers['Authorization'] = `Bearer ${readToken}`;
            }

            // Extract year if present in dramaName, e.g., "(2024)"
            let cleanName = dramaName.trim();
            const yearMatch = cleanName.match(/\((\d{4})\)/);
            const year = yearMatch ? yearMatch[1] : null;
            cleanName = cleanName.replace(/\(\d{4}\)/g, '').replace(/\[.*?\]/g, '').trim();

            // Check alias dictionary
            const lowerClean = cleanName.toLowerCase();
            const effectiveQuery = K_DRAMA_ALIASES[lowerClean] || cleanName;

            let searchRes = null;

            async function trySearch(url) {
                try {
                    const raw = await makeSfxRequest(url, headers);
                    return JSON.parse(raw);
                } catch (e) {
                    return null;
                }
            }

            // 1. Try search/tv page 1 (Prioritizing Korean drama matches)
            let tvUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(effectiveQuery)}&include_adult=false`;
            if (apiKey) tvUrl += `&api_key=${encodeURIComponent(apiKey)}`;
            if (year) tvUrl += `&first_air_date_year=${year}`;

            const parsedTv1 = await trySearch(tvUrl);
            let best = parsedTv1 ? pickBestKoreanMatch(parsedTv1.results, effectiveQuery, year) : null;

            // 2. If page 1 had no Korean match and total_pages > 1, check page 2
            if ((!best || !isItemKorean(best)) && parsedTv1 && parsedTv1.total_pages > 1) {
                const parsedTv2 = await trySearch(tvUrl + '&page=2');
                if (parsedTv2) {
                    const best2 = pickBestKoreanMatch(parsedTv2.results, effectiveQuery, year);
                    if (isItemKorean(best2)) {
                        best = best2;
                    }
                }
            }

            // 3. If no Korean match, try stripping season / sequel suffixes (e.g. "Penthouse S03" -> "Penthouse", "Taxi Driver 2" -> "Taxi Driver")
            if (!best || !isItemKorean(best)) {
                const stripped = effectiveQuery.replace(/\s+s\d+$/i, '').replace(/\s+season\s+\d+$/i, '').replace(/\s+\d+$/, '').trim();
                if (stripped && stripped !== effectiveQuery) {
                    let stripUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(stripped)}&include_adult=false`;
                    if (apiKey) stripUrl += `&api_key=${encodeURIComponent(apiKey)}`;
                    const parsedStrip = await trySearch(stripUrl);
                    if (parsedStrip) {
                        const bestStrip = pickBestKoreanMatch(parsedStrip.results, stripped, year);
                        if (isItemKorean(bestStrip)) {
                            best = bestStrip;
                        }
                    }
                }
            }

            // 4. Fallback to search/multi if no Korean TV match, or if TV match was not an exact title match (e.g. Korean movies like "Parasite")
            if (!best || !isItemKorean(best) || !isExactTitleMatch(best, effectiveQuery)) {
                let multiUrl = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(effectiveQuery)}&include_adult=false`;
                if (apiKey) multiUrl += `&api_key=${encodeURIComponent(apiKey)}`;
                const parsedMulti = await trySearch(multiUrl);
                if (parsedMulti) {
                    const bestMulti = pickBestKoreanMatch(parsedMulti.results, effectiveQuery, year);
                    if (bestMulti && isItemKorean(bestMulti)) {
                        if (!best || !isItemKorean(best) || isExactTitleMatch(bestMulti, effectiveQuery)) {
                            best = bestMulti;
                        }
                    }
                }
            }

            if (best) {
                const mediaType = best.media_type === 'movie' ? 'movie' : (best.first_air_date ? 'tv' : (best.media_type || 'tv'));
                searchRes = { id: best.id, mediaType };
            }

            if (!searchRes) {
                return null;
            }

            // 5. Fetch full details with credits, images, external_ids, videos, alternative_titles, recommendations, similar
            const detailType = searchRes.mediaType === 'movie' ? 'movie' : 'tv';
            let detailUrl = `https://api.themoviedb.org/3/${detailType}/${searchRes.id}?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar`;
            if (apiKey) detailUrl += `&api_key=${encodeURIComponent(apiKey)}`;

            const rawDetail = await makeSfxRequest(detailUrl, headers);
            const detailData = JSON.parse(rawDetail);
            detailData._mediaType = detailType;
            detailData._cleanName = cleanName;
            detailData._searchedYear = year;

            tmdbDataCache.set(dramaName, detailData);
            return detailData;
        }

        async function fetchTmdbMediaById(id, mediaType = 'tv') {
            const cacheKey = `${mediaType}:${id}`;
            if (tmdbDataCache.has(cacheKey)) {
                return tmdbDataCache.get(cacheKey);
            }

            const { readToken, apiKey } = getTmdbCredentials();

            if (!readToken && !apiKey) {
                throw new Error('Missing TheMovieDB credentials');
            }

            const headers = { 'Accept': 'application/json' };
            if (readToken) {
                headers['Authorization'] = `Bearer ${readToken}`;
            }

            const detailType = mediaType === 'movie' ? 'movie' : 'tv';
            let detailUrl = `https://api.themoviedb.org/3/${detailType}/${id}?append_to_response=credits,images,external_ids,videos,alternative_titles,recommendations,similar`;
            if (apiKey) detailUrl += `&api_key=${encodeURIComponent(apiKey)}`;

            const rawDetail = await makeSfxRequest(detailUrl, headers);
            const detailData = JSON.parse(rawDetail);
            detailData._mediaType = detailType;
            detailData._cleanName = detailData.name || detailData.title || '';
            const relDate = detailData.first_air_date || detailData.release_date || '';
            detailData._searchedYear = relDate ? relDate.slice(0, 4) : '';

            tmdbDataCache.set(cacheKey, detailData);
            return detailData;
        }

        async function fetchTmdbPerson(personId) {
            if (tmdbPersonCache.has(personId)) {
                return tmdbPersonCache.get(personId);
            }

            const { readToken, apiKey } = getTmdbCredentials();

            if (!readToken && !apiKey) {
                throw new Error('Missing TheMovieDB credentials');
            }

            const headers = { 'Accept': 'application/json' };
            if (readToken) {
                headers['Authorization'] = `Bearer ${readToken}`;
            }

            let personUrl = `https://api.themoviedb.org/3/person/${personId}?append_to_response=combined_credits,external_ids`;
            if (apiKey) personUrl += `&api_key=${encodeURIComponent(apiKey)}`;

            const raw = await makeSfxRequest(personUrl, headers);
            const personData = JSON.parse(raw);

            tmdbPersonCache.set(personId, personData);
            return personData;
        }

        function findDramaOnSinFlix(title) {
            if (!title) return null;

            // Strategy 0: Direct match with active element clicked from the page
            if (activeDramaElement && activeDramaName) {
                const cleanCurrent = stripThe(stripPunct(title));
                const cleanActive = stripThe(stripPunct(activeDramaName));
                if (cleanCurrent && cleanActive && (cleanCurrent === cleanActive || cleanCurrent.includes(cleanActive) || cleanActive.includes(cleanCurrent))) {
                    if (document.body.contains(activeDramaElement)) {
                        return activeDramaElement;
                    }
                }
            }

            const cleanTarget = stripThe(stripPunct(title));
            if (!cleanTarget) return null;

            // Strategy 1: Find matching .sfx-drama-title elements
            const dramaTitleEls = Array.from(document.querySelectorAll('.sfx-drama-title'));
            for (const el of dramaTitleEls) {
                const nameAttr = el.getAttribute('data-name') || el.textContent || '';
                const cleanName = stripThe(stripPunct(nameAttr));
                if (cleanName === cleanTarget) return el;
                if (cleanName && (cleanName.startsWith(cleanTarget) || cleanTarget.startsWith(cleanName))) {
                    return el;
                }
            }

            // Strategy 2: Check alternative titles and original title from currentMediaData
            if (currentMediaData) {
                const alts = [];
                if (currentMediaData.original_name) alts.push(currentMediaData.original_name);
                if (currentMediaData.original_title) alts.push(currentMediaData.original_title);
                if (currentMediaData.alternative_titles) {
                    const list = currentMediaData.alternative_titles.results || currentMediaData.alternative_titles.titles || [];
                    list.forEach(item => { if (item.title) alts.push(item.title); });
                }
                for (const alt of alts) {
                    const cleanAlt = stripThe(stripPunct(alt));
                    if (!cleanAlt) continue;
                    for (const el of dramaTitleEls) {
                        const nameAttr = el.getAttribute('data-name') || el.textContent || '';
                        const cleanName = stripThe(stripPunct(nameAttr));
                        if (cleanName === cleanAlt || (cleanName && (cleanName.includes(cleanAlt) || cleanAlt.includes(cleanName)))) {
                            return el;
                        }
                    }
                }
            }

            // Strategy 3: Fallback to table row links / cells on the page
            const links = Array.from(document.querySelectorAll('a, td, p, li'));
            for (const el of links) {
                const text = el.textContent || '';
                const cleanText = stripThe(stripPunct(text));
                if (cleanText === cleanTarget || (cleanText && cleanText.includes(cleanTarget))) {
                    return el.closest('tr') || el;
                }
            }

            return null;
        }

        async function fetchRottenTomatoesRating(title, year, isTv = true, imdbId = null, extraData = {}) {
            if (!title) return null;

            const RT_ALGOLIA_URL = 'https://79frdp12pn-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(4.14.2)%3B%20Browser%20(lite)&x-algolia-api-key=175588f6e5f8319b27702e4cc4013561&x-algolia-application-id=79FRDP12PN';

            function normalizeRtStr(str) {
                return (str || '')
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            function wordSimilarity(a, b) {
                const wordsA = new Set(normalizeRtStr(a).split(' ').filter(Boolean));
                const wordsB = new Set(normalizeRtStr(b).split(' ').filter(Boolean));
                if (!wordsA.size || !wordsB.size) return 0;
                let common = 0;
                for (const w of wordsA) {
                    if (wordsB.has(w)) common++;
                }
                return (2 * common) / (wordsA.size + wordsB.size);
            }

            function scoreRtHit(hit, targetTitle, targetYear, targetCast = []) {
                if (!hit || !hit.title) return { score: -999, isExact: false };
                let score = 0;
                const normTarget = normalizeRtStr(targetTitle);
                const normHit = normalizeRtStr(hit.title);
                const akaList = Array.isArray(hit.aka) ? hit.aka.map(normalizeRtStr) : [];

                let isExact = false;
                if (normHit === normTarget) {
                    score += 100;
                    isExact = true;
                } else if (akaList.includes(normTarget)) {
                    score += 90;
                    isExact = true;
                } else {
                    const sim = wordSimilarity(hit.title, targetTitle);
                    score += Math.round(sim * 60);
                }

                if (targetYear && hit.releaseYear) {
                    const diff = Math.abs(Number(targetYear) - Number(hit.releaseYear));
                    if (diff === 0) score += 30;
                    else if (diff === 1) score += 20;
                    else if (diff === 2) score += 5;
                    else if (diff > 3) score -= 60;
                }

                if (targetCast.length && hit.cast && Array.isArray(hit.cast)) {
                    const hitCastNames = hit.cast.map(c => normalizeRtStr(c.name || ''));
                    let matches = 0;
                    for (const actor of targetCast) {
                        const normActor = normalizeRtStr(actor);
                        if (hitCastNames.some(hn => hn === normActor || hn.includes(normActor))) matches++;
                    }
                    score += matches * 30;
                }

                if (hit.rottenTomatoes && (hit.rottenTomatoes.criticsScore !== undefined || hit.rottenTomatoes.audienceScore !== undefined)) {
                    score += 15;
                }

                return { score, isExact };
            }

            // Build search candidates
            const queriesToTry = [title];
            if (title.includes(':')) {
                const sub = title.split(':')[0].trim();
                if (sub && !queriesToTry.includes(sub)) queriesToTry.push(sub);
            }
            if (title.includes('-')) {
                const sub = title.split('-')[0].trim();
                if (sub && !queriesToTry.includes(sub)) queriesToTry.push(sub);
            }
            if (extraData && extraData.altTitles && Array.isArray(extraData.altTitles)) {
                for (const alt of extraData.altTitles) {
                    if (alt && !queriesToTry.includes(alt) && queriesToTry.length < 6) {
                        queriesToTry.push(alt);
                    }
                }
            }

            const targetCast = (extraData && extraData.cast && Array.isArray(extraData.cast)) ? extraData.cast : [];
            let bestHit = null;
            let bestScore = -999;

            for (const q of queriesToTry) {
                try {
                    const typeFilter = isTv ? 2 : 1;
                    const postPayload = JSON.stringify({
                        requests: [
                            {
                                indexName: 'content_rt',
                                query: q.trim(),
                                params: `filters=typeId%20%3D%20${typeFilter}%20AND%20isEmsSearchable%20%3D%201&hitsPerPage=10`
                            }
                        ]
                    });

                    const resRaw = await makeSfxRequest(RT_ALGOLIA_URL, {
                        'Content-Type': 'application/json'
                    }, 'POST', postPayload);

                    const parsed = JSON.parse(resRaw);
                    const hits = (parsed.results && parsed.results[0] && Array.isArray(parsed.results[0].hits))
                        ? parsed.results[0].hits
                        : [];

                    let foundExact = false;
                    for (const h of hits) {
                        const r1 = scoreRtHit(h, title, year, targetCast);
                        const r2 = scoreRtHit(h, q, year, targetCast);
                        const higher = r1.score >= r2.score ? r1 : r2;
                        if (higher.score > bestScore) {
                            bestScore = higher.score;
                            bestHit = h;
                        }
                        if (higher.isExact && higher.score >= 130) {
                            foundExact = true;
                        }
                    }

                    if (foundExact) {
                        break;
                    }
                } catch (e) {}
            }

            if (bestHit && bestScore >= 45) {
                const url = bestHit.vanity
                    ? `https://www.rottentomatoes.com/${isTv ? 'tv' : 'm'}/${bestHit.vanity}`
                    : `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
                let tomatometer = (bestHit.rottenTomatoes && typeof bestHit.rottenTomatoes.criticsScore === 'number')
                    ? `${bestHit.rottenTomatoes.criticsScore}%`
                    : null;
                let audience = (bestHit.rottenTomatoes && typeof bestHit.rottenTomatoes.audienceScore === 'number')
                    ? `${bestHit.rottenTomatoes.audienceScore}%`
                    : null;
                let averageRating = null;
                let reviewsCount = null;
                let freshCount = null;
                let rottenCount = null;

                if (bestHit.vanity) {
                    try {
                        const pageHtml = await makeSfxRequest(url);
                        if (pageHtml) {
                            const scMatch = pageHtml.match(/<script[^>]*id="media-scorecard-json"[^>]*>([\s\S]*?)<\/script>/);
                            if (scMatch) {
                                const scData = JSON.parse(scMatch[1].trim());
                                const cs = scData.criticsScore || {};
                                const aud = scData.audienceScore || {};
                                if (cs.scorePercent || cs.score) tomatometer = cs.scorePercent || (cs.score + '%');
                                if (aud.scorePercent || aud.score) audience = aud.scorePercent || (aud.score + '%');
                                if (cs.averageRating) averageRating = cs.averageRating;
                                if (cs.reviewCount || cs.ratingCount) reviewsCount = cs.reviewCount || cs.ratingCount;
                                if (cs.likedCount !== undefined && cs.likedCount !== null) freshCount = cs.likedCount;
                                if (cs.notLikedCount !== undefined && cs.notLikedCount !== null) rottenCount = cs.notLikedCount;
                            } else {
                                const ldMatch = pageHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
                                if (ldMatch) {
                                    for (const m of ldMatch) {
                                        try {
                                            const j = JSON.parse(m.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, ''));
                                            if (j && j.aggregateRating) {
                                                if (j.aggregateRating.ratingValue) tomatometer = `${j.aggregateRating.ratingValue}%`;
                                                if (j.aggregateRating.reviewCount) reviewsCount = j.aggregateRating.reviewCount;
                                                break;
                                            }
                                        } catch (e) {}
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }

                if (tomatometer || audience || bestHit.vanity) {
                    return {
                        title: bestHit.title,
                        url,
                        tomatometer,
                        audience,
                        averageRating,
                        reviewsCount,
                        freshCount,
                        rottenCount
                    };
                }
            }

            // Direct slug guess fallback
            const rtSlug = normalizeRtStr(title).replace(/\s+/g, '_');
            if (rtSlug) {
                try {
                    const directUrl = `https://www.rottentomatoes.com/${isTv ? 'tv' : 'm'}/${rtSlug}`;
                    const pageHtml = await makeSfxRequest(directUrl);
                    if (pageHtml) {
                        const scMatch = pageHtml.match(/<script[^>]*id="media-scorecard-json"[^>]*>([\s\S]*?)<\/script>/);
                        if (scMatch) {
                            const scData = JSON.parse(scMatch[1].trim());
                            const cs = scData.criticsScore || {};
                            const aud = scData.audienceScore || {};
                            const tomatometer = cs.scorePercent || (cs.score ? cs.score + '%' : null);
                            const audience = aud.scorePercent || (aud.score ? aud.score + '%' : null);
                            if (tomatometer || audience) {
                                return {
                                    title,
                                    url: directUrl,
                                    tomatometer,
                                    audience,
                                    averageRating: cs.averageRating || null,
                                    reviewsCount: cs.reviewCount || cs.ratingCount || null,
                                    freshCount: (cs.likedCount !== undefined && cs.likedCount !== null) ? cs.likedCount : null,
                                    rottenCount: (cs.notLikedCount !== undefined && cs.notLikedCount !== null) ? cs.notLikedCount : null
                                };
                            }
                        }
                    }
                } catch (e) {}
            }

            // OMDb Fallback for Rotten Tomatoes score
            if (imdbId) {
                try {
                    const omdbRaw = await makeSfxRequest(`https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`);
                    const omdbData = JSON.parse(omdbRaw);
                    if (omdbData && Array.isArray(omdbData.Ratings)) {
                        const rtEntry = omdbData.Ratings.find(r => r.Source === 'Rotten Tomatoes');
                        if (rtEntry && rtEntry.Value) {
                            return {
                                url: `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`,
                                tomatometer: rtEntry.Value,
                                audience: null
                            };
                        }
                    }
                } catch (e) {}
            }

            return null;
        }

        async function fetchImdbRating(imdbId) {
            if (!imdbId) return null;

            // 1. Cinemeta TV series
            try {
                const raw = await makeSfxRequest(`https://v3-cinemeta.strem.io/meta/series/${imdbId}.json`);
                const data = JSON.parse(raw);
                if (data && data.meta && data.meta.imdbRating && data.meta.imdbRating !== 'N/A') {
                    return {
                        rating: data.meta.imdbRating,
                        url: `https://www.imdb.com/title/${imdbId}/`
                    };
                }
            } catch (e) {}

            // 2. Cinemeta movie
            try {
                const raw = await makeSfxRequest(`https://v3-cinemeta.strem.io/meta/movie/${imdbId}.json`);
                const data = JSON.parse(raw);
                if (data && data.meta && data.meta.imdbRating && data.meta.imdbRating !== 'N/A') {
                    return {
                        rating: data.meta.imdbRating,
                        url: `https://www.imdb.com/title/${imdbId}/`
                    };
                }
            } catch (e) {}

            // 3. OMDb fallback
            try {
                const raw = await makeSfxRequest(`https://www.omdbapi.com/?i=${imdbId}&apikey=trilogy`);
                const data = JSON.parse(raw);
                if (data && data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
                    return {
                        rating: data.imdbRating,
                        url: `https://www.imdb.com/title/${imdbId}/`
                    };
                }
            } catch (e) {}

            return {
                rating: null,
                url: `https://www.imdb.com/title/${imdbId}/`
            };
        }

        function updateTmdbBackBtn() {
            if (!tmdbModalEl) return;
            const backBtn = tmdbModalEl.querySelector('#sfx-tmdb-back-btn');
            if (backBtn) {
                backBtn.style.display = (tmdbNavStack.length > 0 || activeTmdbIsPerson) ? 'inline-flex' : 'none';
            }
        }

        function stopTmdbMedia() {
            if (!tmdbModalEl) return;
            const playerBox = tmdbModalEl.querySelector('#sfx-tmdb-trailer-player-box');
            if (playerBox) playerBox.innerHTML = '';
            const trailerModal = tmdbModalEl.querySelector('#sfx-tmdb-trailer-modal');
            if (trailerModal) trailerModal.classList.remove('sfx-open');
            const iframes = tmdbModalEl.querySelectorAll('iframe');
            iframes.forEach(f => f.remove());
        }

        function openTmdbTrailerModal(videoKey, trailerTitle) {
            if (!tmdbModalEl || !videoKey) return;
            const isLocalFile = location.protocol === 'file:' || location.origin === 'null';
            if (isLocalFile) {
                if (typeof GM_openInTab !== 'undefined') {
                    GM_openInTab(`https://www.youtube.com/watch?v=${videoKey}`, { active: true });
                } else {
                    window.open(`https://www.youtube.com/watch?v=${videoKey}`, '_blank');
                }
                return;
            }

            const playerBox = tmdbModalEl.querySelector('#sfx-tmdb-trailer-player-box');
            const trailerModal = tmdbModalEl.querySelector('#sfx-tmdb-trailer-modal');

            if (playerBox) {
                const originParam = (location.protocol.startsWith('http') && location.origin && location.origin !== 'null')
                    ? `&origin=${encodeURIComponent(location.origin)}`
                    : '';
                const embedUrl = `https://www.youtube.com/embed/${videoKey}?autoplay=1&playsinline=1&rel=0${originParam}`;
                playerBox.innerHTML = `
                    <iframe class="sfx-tmdb-trailer-iframe" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                `;
            }
            if (trailerModal) {
                trailerModal.classList.add('sfx-open');
            }
        }

        function getInitials(name) {
            if (!name) return '??';
            const parts = name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        function getInitialsBg(name) {
            let hash = 0;
            for (let i = 0; i < (name || '').length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const h = Math.abs(hash) % 360;
            return `hsl(${h}, 35%, 28%)`;
        }

        function goBackTmdb() {
            if (tmdbNavStack.length === 0) {
                closeTmdbModal();
                return;
            }
            stopTmdbMedia();
            const prev = tmdbNavStack.pop();
            updateTmdbBackBtn();

            if (prev.type === 'media') {
                renderMediaView(prev.data, false);
            } else if (prev.type === 'person') {
                renderPersonView(prev.data, false);
            }
        }

        function resetTmdbModalScroll(modalWrap) {
            if (!modalWrap) return;
            const scrollLayer = modalWrap.querySelector('#sfx-tmdb-scroll-layer');
            if (scrollLayer) scrollLayer.scrollTop = 0;
            const scrollBody = modalWrap.querySelector('.sfx-tmdb-scroll-body');
            if (scrollBody) scrollBody.scrollTop = 0;
            modalWrap.scrollTop = 0;
            modalWrap.classList.remove('sfx-header-scrolled');
        }

        function resetMediaState(modalWrap) {
            if (!modalWrap) return;

            // Immediately clear hero card backdrop to prevent flashing previous drama
            const heroCard = modalWrap.querySelector('#sfx-media-hero-card');
            if (heroCard) {
                heroCard.style.backgroundImage = 'none';
            }
            const heroBg = modalWrap.querySelector('#sfx-media-hero-bg');
            if (heroBg) {
                heroBg.style.backgroundImage = 'none';
            }

            // Immediately clear poster image
            const posterImg = modalWrap.querySelector('#sfx-media-poster-img');
            if (posterImg) {
                posterImg.removeAttribute('src');
                posterImg.style.display = 'none';
            }

            // Ensure ambient background is completely cleared & deactivated
            const ambientBg = modalWrap.querySelector('#sfx-tmdb-ambient-bg');
            if (ambientBg) {
                ambientBg.style.backgroundImage = 'none';
                ambientBg.classList.remove('sfx-active');
            }

            // Clear sticky header media thumb & hide header bar
            const headerMediaThumb = modalWrap.querySelector('#sfx-header-media-thumb');
            if (headerMediaThumb) {
                headerMediaThumb.innerHTML = '';
            }
            const mediaHeaderBar = modalWrap.querySelector('#sfx-media-header-bar');
            if (mediaHeaderBar) {
                mediaHeaderBar.classList.remove('sfx-show');
            }

            // Clear text fields
            const heroTitleEl = modalWrap.querySelector('#sfx-media-hero-title');
            if (heroTitleEl) heroTitleEl.textContent = '';
            const heroYearEl = modalWrap.querySelector('#sfx-media-hero-year');
            if (heroYearEl) heroYearEl.textContent = '';
            const metaLineEl = modalWrap.querySelector('#sfx-media-meta-line');
            if (metaLineEl) metaLineEl.innerHTML = '';
            const taglineEl = modalWrap.querySelector('#sfx-media-tagline');
            if (taglineEl) {
                taglineEl.textContent = '';
                taglineEl.style.display = 'none';
            }

            // Clear ratings
            const userScoreVal = modalWrap.querySelector('#sfx-user-score-val');
            if (userScoreVal) userScoreVal.textContent = '--';
            const userScoreRing = modalWrap.querySelector('#sfx-user-score-ring');
            if (userScoreRing) userScoreRing.setAttribute('stroke-dasharray', '0 100');
            const rtVal = modalWrap.querySelector('#sfx-rt-val');
            if (rtVal) rtVal.textContent = '--';
            const imdbVal = modalWrap.querySelector('#sfx-imdb-val');
            if (imdbVal) imdbVal.textContent = '--';

            // Clear trailer button
            const playTrailerBtn = modalWrap.querySelector('#sfx-play-trailer-btn');
            if (playTrailerBtn) playTrailerBtn.style.display = 'none';

            // Clear synopsis
            const snippetEl = modalWrap.querySelector('#sfx-media-overview-snippet');
            if (snippetEl) snippetEl.textContent = '';
            const moreBtn = modalWrap.querySelector('#sfx-media-overview-more');
            if (moreBtn) moreBtn.style.display = 'none';

            // Clear crew
            const creatorBlock = modalWrap.querySelector('#sfx-media-creator-block');
            if (creatorBlock) creatorBlock.style.display = 'none';
            const creatorVal = modalWrap.querySelector('#sfx-media-creator-val');
            if (creatorVal) creatorVal.textContent = '';

            // Clear cast, seasons, gallery & recommendations
            const castList = modalWrap.querySelector('#sfx-tmdb-cast-list');
            if (castList) castList.innerHTML = '';
            const seasonsList = modalWrap.querySelector('#sfx-tmdb-seasons-list');
            if (seasonsList) seasonsList.innerHTML = '';
            const seasonsSection = modalWrap.querySelector('#sfx-tmdb-seasons-section');
            if (seasonsSection) seasonsSection.style.display = 'none';
            const gallery = modalWrap.querySelector('#sfx-tmdb-gallery');
            if (gallery) gallery.innerHTML = '';
            const galleryContainer = modalWrap.querySelector('#sfx-tmdb-gallery-container');
            if (galleryContainer) galleryContainer.style.display = 'none';
            const recsList = modalWrap.querySelector('#sfx-tmdb-recs-list');
            if (recsList) recsList.innerHTML = '';
            const recsSection = modalWrap.querySelector('#sfx-tmdb-recommendations-section');
            if (recsSection) recsSection.style.display = 'none';

            // Clear download links & hide cards
            const dlSinflix = modalWrap.querySelector('#sfx-tmdb-dl-sinflix');
            if (dlSinflix) dlSinflix.style.display = 'none';
            const dlDramaday = modalWrap.querySelector('#sfx-tmdb-dl-dramaday');
            if (dlDramaday) {
                dlDramaday.removeAttribute('href');
                dlDramaday.style.display = 'none';
            }
            const dlExtto = modalWrap.querySelector('#sfx-tmdb-dl-extto');
            if (dlExtto) {
                dlExtto.removeAttribute('href');
                dlExtto.style.display = 'none';
            }

            // Clear hero MDL dropdown state
            const heroMdlMenu = modalWrap.querySelector('#sfx-hero-mdl-menu');
            if (heroMdlMenu) heroMdlMenu.style.display = 'none';

            // Clear credentials empty state
            const credsEmpty = modalWrap.querySelector('#sfx-tmdb-creds-empty');
            if (credsEmpty) credsEmpty.style.display = 'none';

            // Mark as loading to hide Google and MyDramaList buttons while fetching details
            modalWrap.classList.add('sfx-loading');
        }

        function openPopupWindow(url, width = 960, height = 720) {
            const left = Math.round((screen.width - width) / 2);
            const top = Math.round((screen.height - height) / 2);
            return window.open(url, '_blank', `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no,location=yes`);
        }

        function copyTextToClipboard(text) {
            if (!text) return false;
            let copied = false;
            if (typeof GM_setClipboard !== 'undefined') {
                try {
                    GM_setClipboard(text, 'text');
                    copied = true;
                } catch (e) {
                    copied = false;
                }
            }
            if (!copied && navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    navigator.clipboard.writeText(text);
                    copied = true;
                } catch (e) {
                    copied = false;
                }
            }
            if (!copied) {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = text;
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    copied = document.execCommand('copy');
                    document.body.removeChild(ta);
                } catch (e) {
                    // ignore
                }
            }
            return copied;
        }

        function parseMdlSearchResults(html) {
            const results = [];
            if (!html || typeof html !== 'string') return results;

            // 1. Browser DOMParser if available
            if (typeof DOMParser !== 'undefined') {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const cards = doc.querySelectorAll('div[id^="mdl-"]');
                    cards.forEach(card => {
                        const titleLink = card.querySelector('h6.title a, h6.text-primary a, h6 a');
                        if (!titleLink) return;

                        let href = titleLink.getAttribute('href') || '';
                        if (href && href.startsWith('/')) {
                            href = 'https://mydramalist.com' + href;
                        }
                        const title = titleLink.textContent.trim();
                        const mutedEl = card.querySelector('.text-muted');
                        const muted = mutedEl ? mutedEl.textContent.trim() : '';
                        const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/) || title.match(/\b(19\d\d|20\d\d)\b/);
                        const year = yearMatch ? yearMatch[1] : '';
                        const idMatch = (card.id || '').match(/mdl-(\d+)/);
                        const id = idMatch ? idMatch[1] : '';

                        if (href && !href.includes('/people/') && !href.includes('/article/')) {
                            results.push({ id, title, url: href, year, muted });
                        }
                    });
                    if (results.length > 0) return results;
                } catch (e) {
                    console.warn('[SinFlix] DOMParser error, using regex fallback:', e);
                }
            }

            // 2. Primary regex on mdl- cards
            const cardRegex = /<div id="mdl-(\d+)" class="box"[\s\S]*?(?=<div id="mdl-\d+" class="box"|<div class="m-t-nav|<div class="footer|<div class="col-lg-4|$)/g;
            let m;
            while ((m = cardRegex.exec(html)) !== null) {
                const id = m[1];
                const cardHtml = m[0];
                const titleMatch = cardHtml.match(/<h6 class="[^"]*title[^"]*"><a href="([^"]*)">([^<]*)<\/a>/i);
                if (!titleMatch) continue;

                let url = titleMatch[1];
                if (url && url.startsWith('/')) {
                    url = 'https://mydramalist.com' + url;
                }
                const title = titleMatch[2].trim();
                const mutedMatch = cardHtml.match(/<span class="text-muted">([^<]*)<\/span>/i);
                const muted = mutedMatch ? mutedMatch[1].trim() : '';
                const yearMatch = muted.match(/\b(19\d\d|20\d\d)\b/) || title.match(/\b(19\d\d|20\d\d)\b/);
                const year = yearMatch ? yearMatch[1] : '';

                if (url && !url.includes('/people/') && !url.includes('/article/')) {
                    results.push({ id, title, url, year, muted });
                }
            }

            // 3. Fallback regex on any drama title link
            if (results.length === 0) {
                const titleRegex = /<h6 class="[^"]*title[^"]*"><a href="([^"]*)">([^<]*)<\/a>/gi;
                let tm;
                while ((tm = titleRegex.exec(html)) !== null) {
                    let url = tm[1];
                    if (url && url.startsWith('/')) {
                        url = 'https://mydramalist.com' + url;
                    }
                    const title = tm[2].trim();
                    const yearMatch = title.match(/\b(19\d\d|20\d\d)\b/);
                    const year = yearMatch ? yearMatch[1] : '';
                    if (url && !url.includes('/people/') && !url.includes('/article/')) {
                        results.push({ id: '', title, url, year, muted: '' });
                    }
                }
            }

            return results;
        }

        function normalizeMdlTitle(t) {
            return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        }

        function getMdlSearchQuery(title) {
            if (!title) return '';
            return title
                .replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]/g, '')
                .replace(/\bS(\d{1,2})\b/gi, 'Season $1')
                .replace(/[^\w\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function isMultiSeasonTv(mediaData) {
            if (!mediaData) return false;
            const isTv = !mediaData.title && (!!mediaData.name || mediaData.media_type === 'tv');
            if (!isTv) return false;
            const regularSeasons = (mediaData.seasons && Array.isArray(mediaData.seasons))
                ? mediaData.seasons.filter(s => s && s.season_number > 0)
                : [];
            if (regularSeasons.length >= 2) return true;
            if (typeof mediaData.number_of_seasons === 'number' && mediaData.number_of_seasons >= 2) return true;
            return false;
        }

        function findMatchingMdlResult(results, targetTitle, targetYear, extraTitles = []) {
            if (!results || results.length === 0) return null;

            // Extract and resolve target year
            let targetY = null;
            if (targetYear) {
                const ym = String(targetYear).match(/\b(19\d\d|20\d\d)\b/);
                if (ym) targetY = parseInt(ym[1], 10);
            }
            if (!targetY && targetTitle) {
                const ym = String(targetTitle).match(/\b(19\d\d|20\d\d)\b/);
                if (ym) targetY = parseInt(ym[1], 10);
            }

            // Target titles to match against
            const normTarget = normalizeMdlTitle(targetTitle);
            const allTargets = [];
            if (normTarget) allTargets.push(normTarget);

            if (Array.isArray(extraTitles)) {
                extraTitles.forEach(t => {
                    const n = normalizeMdlTitle(t);
                    if (n && !allTargets.includes(n)) allTargets.push(n);
                    if (t && !targetY) {
                        const ym = String(t).match(/\b(19\d\d|20\d\d)\b/);
                        if (ym) targetY = parseInt(ym[1], 10);
                    }
                });
            }

            // Stripped version without 4-digit years for clean title comparison
            const cleanTargets = allTargets
                .map(t => t.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim())
                .filter(Boolean);
            const candidateTargets = Array.from(new Set([...allTargets, ...cleanTargets]));

            function getTitleWords(norm) {
                if (!norm) return [];
                return norm.split(/\s+/).filter(w => w.length > 0);
            }

            function computeNameScore(normItem, normTgt) {
                if (!normItem || !normTgt) return 0;
                if (normItem === normTgt) return 100;

                // Starts with or ends with exact title
                if (normItem.startsWith(normTgt + ' ') || normTgt.startsWith(normItem + ' ')) {
                    return 85;
                }

                const itemWords = getTitleWords(normItem);
                const targetWords = getTitleWords(normTgt);
                if (itemWords.length === 0 || targetWords.length === 0) return 0;

                const matchingWords = targetWords.filter(tw => itemWords.includes(tw));
                const targetWordRatio = matchingWords.length / targetWords.length;
                const itemWordRatio = matchingWords.length / itemWords.length;

                if (targetWordRatio === 1) {
                    return 75 + Math.round(itemWordRatio * 15);
                }
                if (targetWords.length === 1 && matchingWords.length === 1) {
                    return 50 + Math.round(itemWordRatio * 20);
                }
                if (targetWordRatio >= 0.5) {
                    return Math.round(targetWordRatio * 50);
                }
                if (normItem.includes(normTgt) || normTgt.includes(normItem)) {
                    return 35;
                }
                return 0;
            }

            // Score each candidate: Name matching first, and ALWAYS considering the year
            const scored = results.map((item, index) => {
                const normItem = normalizeMdlTitle(item.title);
                const cleanItem = normItem.replace(/\b(19\d\d|20\d\d)\b/g, '').replace(/\s+/g, ' ').trim();

                let bestNameScore = 0;
                for (const tgt of candidateTargets) {
                    const s1 = computeNameScore(normItem, tgt);
                    const s2 = computeNameScore(cleanItem, tgt);
                    const s = Math.max(s1, s2);
                    if (s > bestNameScore) bestNameScore = s;
                }

                if (bestNameScore <= 0) {
                    return { item, index, score: -999, nameScore: 0, yearScore: 0, matchedOn: 'none' };
                }

                // ALWAYS CONSIDER THE YEAR after the name
                let yearScore = 0;
                let yearMatchStatus = 'none';
                let itemY = null;
                if (item.year) {
                    const ym = String(item.year).match(/\b(19\d\d|20\d\d)\b/);
                    if (ym) itemY = parseInt(ym[1], 10);
                }
                if (!itemY && item.muted) {
                    const ym = String(item.muted).match(/\b(19\d\d|20\d\d)\b/);
                    if (ym) itemY = parseInt(ym[1], 10);
                }
                if (!itemY && item.title) {
                    const ym = String(item.title).match(/\b(19\d\d|20\d\d)\b/);
                    if (ym) itemY = parseInt(ym[1], 10);
                }

                if (targetY) {
                    if (itemY) {
                        const diff = Math.abs(itemY - targetY);
                        if (diff === 0) {
                            // Exact year match: strong priority boost
                            yearScore = 80;
                            yearMatchStatus = 'exact';
                        } else if (diff === 1) {
                            // Boundary / release year close match (+/- 1 year)
                            yearScore = 40;
                            yearMatchStatus = 'close';
                        } else {
                            // Year mismatch penalty ensures year-matched candidate wins
                            yearScore = -50 - Math.min(diff * 5, 40);
                            yearMatchStatus = 'mismatch';
                        }
                    } else {
                        // Item year missing or TBA: slight penalty compared to confirmed year match
                        yearScore = -15;
                        yearMatchStatus = 'missing';
                    }
                } else {
                    yearScore = 0;
                    yearMatchStatus = 'unspecified';
                }

                // Earlier search results from MDL get a small tie-breaker bonus
                const positionBonus = Math.max(0, (results.length - index) * 0.5);
                const totalScore = bestNameScore + yearScore + positionBonus;

                let matchedOn = 'name';
                if (yearMatchStatus === 'exact' || yearMatchStatus === 'close') {
                    matchedOn = bestNameScore >= 70 ? 'both' : 'year';
                }

                return {
                    item,
                    index,
                    score: totalScore,
                    nameScore: bestNameScore,
                    yearScore,
                    positionBonus,
                    yearMatchStatus,
                    matchedOn
                };
            });

            // Filter out items without valid name match
            const validCandidates = scored.filter(s => s.score > 0 && s.nameScore >= 35);
            if (validCandidates.length === 0) {
                // Fallback: if year mismatch penalized all below 0, pick candidate with strongest name match
                const fallbackCandidates = scored.filter(s => s.nameScore >= 50);
                if (fallbackCandidates.length > 0) {
                    fallbackCandidates.sort((a, b) => b.nameScore - a.nameScore);
                    return { item: fallbackCandidates[0].item, matchedOn: 'name' };
                }
                return null;
            }

            validCandidates.sort((a, b) => b.score - a.score);
            return {
                item: validCandidates[0].item,
                matchedOn: validCandidates[0].matchedOn
            };
        }

        const mdlSearchCache = new Map();
        const mdlInFlightPromises = new Map();

        function fetchMdlSearch(cleanQuery) {
            return new Promise((resolve, reject) => {
                const searchUrl = 'https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery);
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: searchUrl,
                        headers: {
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                            'Accept-Language': 'en-US,en;q=0.9'
                        },
                        timeout: 15000,
                        onload: function(response) {
                            if (response.status >= 200 && response.status < 400) {
                                resolve({
                                    html: response.responseText || '',
                                    finalUrl: response.finalUrl || searchUrl,
                                    status: response.status
                                });
                            } else {
                                reject(new Error(`HTTP ${response.status}`));
                            }
                        },
                        onerror: (err) => reject(err),
                        ontimeout: () => reject(new Error('Request timed out'))
                    });
                } else if (typeof fetch !== 'undefined') {
                    fetch(searchUrl, { headers: { 'Accept': 'text/html' } })
                        .then(async (res) => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}`);
                            const text = await res.text();
                            resolve({ html: text, finalUrl: res.url || searchUrl, status: res.status });
                        })
                        .catch(reject);
                } else {
                    reject(new Error('No request mechanism available'));
                }
            });
        }

        async function resolveMdlDrama(targetTitle, targetYear, mediaId = null, mediaData = null) {
            let resolvedYear = targetYear ? String(targetYear).trim() : '';
            if (!resolvedYear && mediaData) {
                const rawY = mediaData.first_air_date || mediaData.release_date || '';
                if (rawY) resolvedYear = rawY.slice(0, 4);
            }
            if (!resolvedYear && targetTitle) {
                const ym = String(targetTitle).match(/\b(19\d\d|20\d\d)\b/);
                if (ym) resolvedYear = ym[1];
            }

            const cleanQuery = getMdlSearchQuery(targetTitle);
            if (!cleanQuery) return null;

            const cacheKey = (cleanQuery.toLowerCase() + '_' + (resolvedYear || '')).trim();
            if (mdlSearchCache.has(cacheKey)) {
                return mdlSearchCache.get(cacheKey);
            }
            if (mdlInFlightPromises.has(cacheKey)) {
                return await mdlInFlightPromises.get(cacheKey);
            }

            const searchPromise = (async () => {
                try {
                    const searchUrl = 'https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery);
                    const res = await fetchMdlSearch(cleanQuery);
                    const rawHtml = res.html || '';

                    // Check if server redirected directly to a drama page
                    if (res.finalUrl && !res.finalUrl.includes('/search') && /mydramalist\.com\/\d+-/.test(res.finalUrl)) {
                        const directOutcome = {
                            matched: { url: res.finalUrl, title: cleanQuery, year: resolvedYear || '' },
                            firstResult: { url: res.finalUrl, title: cleanQuery, year: resolvedYear || '' },
                            allResults: [{ url: res.finalUrl, title: cleanQuery, year: resolvedYear || '' }],
                            searchUrl
                        };
                        mdlSearchCache.set(cacheKey, directOutcome);
                        return directOutcome;
                    }

                    const extraTitles = [];
                    if (mediaData) {
                        if (mediaData.name) extraTitles.push(mediaData.name);
                        if (mediaData.title) extraTitles.push(mediaData.title);
                        if (mediaData.original_name) extraTitles.push(mediaData.original_name);
                        if (mediaData.original_title) extraTitles.push(mediaData.original_title);
                    }
                    if (targetTitle && !extraTitles.includes(targetTitle)) {
                        extraTitles.push(targetTitle);
                    }

                    let results = parseMdlSearchResults(rawHtml);

                    // If zero results and title had multiple words, try searching first word / prefix
                    if (results.length === 0 && cleanQuery.includes(' ')) {
                        const shortQuery = cleanQuery.split(' ')[0].trim();
                        if (shortQuery.length >= 3) {
                            try {
                                const fallbackRes = await fetchMdlSearch(shortQuery);
                                const fallbackResults = parseMdlSearchResults(fallbackRes.html || '');
                                if (fallbackResults.length > 0) {
                                    results = fallbackResults;
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    }

                    const matched = findMatchingMdlResult(results, cleanQuery, resolvedYear, extraTitles);

                    const outcome = {
                        matched: matched ? matched.item : null,
                        firstResult: results.length > 0 ? results[0] : null,
                        allResults: results,
                        searchUrl
                    };

                    mdlSearchCache.set(cacheKey, outcome);
                    return outcome;
                } catch (e) {
                    console.error('[SinFlix] resolveMdlDrama error:', e);
                    return {
                        matched: null,
                        firstResult: null,
                        allResults: [],
                        searchUrl: 'https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery)
                    };
                } finally {
                    mdlInFlightPromises.delete(cacheKey);
                }
            })();

            mdlInFlightPromises.set(cacheKey, searchPromise);
            return await searchPromise;
        }

        function createTmdbModal() {
            if (tmdbModalEl) return tmdbModalEl;

            const modalWrap = document.createElement('div');
            modalWrap.id = 'sfx-tmdb-modal-backdrop';
            modalWrap.innerHTML = `
                <div class="sfx-tmdb-ambient-bg" id="sfx-tmdb-ambient-bg"></div>
                <div class="sfx-tmdb-ambient-overlay"></div>
                <div class="sfx-tmdb-scroll-layer" id="sfx-tmdb-scroll-layer">
                    <div id="sfx-tmdb-modal-card" role="dialog" aria-modal="true">
                        <!-- Top Header -->
                        <div class="sfx-tmdb-header">
                            <div class="sfx-tmdb-title-group">
                                <button class="sfx-tmdb-back-btn" id="sfx-tmdb-back-btn" title="Go Back" style="display: none;">
                                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                                </button>
                                <div class="sfx-header-person-thumb" id="sfx-header-person-thumb"></div>
                                <div class="sfx-header-media-thumb" id="sfx-header-media-thumb"></div>
                                <h2 class="sfx-tmdb-title" id="sfx-tmdb-title">
                                    <span class="sfx-tmdb-title-text"></span>
                                    <span class="sfx-tmdb-year" id="sfx-tmdb-year"></span>
                                </h2>
                                <button class="sfx-tmdb-copy-btn" id="sfx-tmdb-copy-btn" title="Copy Name">
                                    <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                </button>
                            </div>
                            <div class="sfx-tmdb-header-actions">
                                <div class="sfx-header-search-capsule" id="sfx-tmdb-search-capsule">
                                    <button class="sfx-popover-icon-btn" id="sfx-tmdb-google" title="Search Google">
                                        <svg viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
                                    </button>
                                    <button class="sfx-popover-icon-btn" id="sfx-tmdb-mdl" title="Search MyDramaList">
                                        <svg viewBox="0 0 48 48" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="M38.5 5.5h-29a4 4 0 0 0-4 4v29a4 4 0 0 0 4 4h29a4 4 0 0 0 4-4v-29a4 4 0 0 0-4-4"/><path fill="none" d="M9.5 29.591V18.396l5.604 11.208l5.604-11.191v11.191m2.382 0V18.396h2.521a4.903 4.903 0 0 1 4.903 4.904v1.4a4.903 4.903 0 0 1-4.903 4.904zm9.806-11.208v11.208H38.5"/></svg>
                                    </button>
                                </div>
                                <button class="sfx-tmdb-close-btn" id="sfx-tmdb-close" title="Close">
                                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                </button>
                            </div>
                        </div>

                        <div class="sfx-tmdb-divider"></div>

                        <!-- Scroll Body -->
                        <div class="sfx-tmdb-scroll-body">
                            <!-- Upgraded Loading Skeleton -->
                            <div class="sfx-tmdb-loading" id="sfx-tmdb-loading">
                                <div class="sfx-skeleton-hero-card">
                                    <div class="sfx-skeleton-poster">
                                        <div class="sfx-skeleton-shimmer"></div>
                                        <div class="sfx-skeleton-poster-icon">
                                            <svg viewBox="0 0 24 24" width="36" height="36" fill="rgba(255,255,255,0.15)">
                                                <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="sfx-skeleton-body">
                                        <div class="sfx-skeleton-title-bar">
                                            <div class="sfx-skeleton-shimmer"></div>
                                        </div>
                                        <div class="sfx-skeleton-meta-bar">
                                            <div class="sfx-skeleton-shimmer"></div>
                                        </div>
                                        <div class="sfx-skeleton-scores-row">
                                            <div class="sfx-skeleton-score-circle">
                                                <div class="sfx-skeleton-shimmer"></div>
                                            </div>
                                            <div class="sfx-skeleton-score-pill">
                                                <div class="sfx-skeleton-shimmer"></div>
                                            </div>
                                            <div class="sfx-skeleton-score-pill">
                                                <div class="sfx-skeleton-shimmer"></div>
                                            </div>
                                            <div class="sfx-skeleton-trailer-pill">
                                                <div class="sfx-skeleton-shimmer"></div>
                                            </div>
                                        </div>
                                        <div class="sfx-skeleton-desc-lines">
                                            <div class="sfx-skeleton-desc-line full"><div class="sfx-skeleton-shimmer"></div></div>
                                            <div class="sfx-skeleton-desc-line three-quarters"><div class="sfx-skeleton-shimmer"></div></div>
                                            <div class="sfx-skeleton-desc-line half"><div class="sfx-skeleton-shimmer"></div></div>
                                        </div>
                                        <div class="sfx-skeleton-status-row">
                                            <div class="sfx-loading-pulse-ring">
                                                <div class="sfx-loading-pulse-core"></div>
                                            </div>
                                            <span id="sfx-tmdb-loading-text">Fetching TheMovieDB info...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Media Content Area -->
                            <div class="sfx-tmdb-content" id="sfx-tmdb-content" style="display: none;">
                                <!-- 1. Media Hero Backdrop Card -->
                                <div class="sfx-media-hero-card" id="sfx-media-hero-card">
                                    <div class="sfx-media-hero-bg" id="sfx-media-hero-bg"></div>
                                    <div class="sfx-media-hero-overlay"></div>
                                    <div class="sfx-media-hero-body">
                                        <div class="sfx-media-poster-wrap">
                                            <img class="sfx-media-poster-img" id="sfx-media-poster-img" src="" alt="" />
                                        </div>
                                        <div class="sfx-media-details">
                                            <div class="sfx-media-title-row">
                                                <h1 class="sfx-media-main-title" id="sfx-media-hero-title"></h1>
                                                <span class="sfx-media-release-year" id="sfx-media-hero-year"></span>
                                            </div>
                                            <div class="sfx-media-meta-line" id="sfx-media-meta-line"></div>
                                            
                                            <!-- Scores & Trailer Row -->
                                            <div class="sfx-media-scores-actions-row">
                                                <!-- TMDB User Score -->
                                                <a class="sfx-user-score-wrap" id="sfx-tmdb-tmdb-card" target="_blank" rel="noopener noreferrer" title="View on TheMovieDB">
                                                    <div class="sfx-user-score-circle">
                                                        <svg class="sfx-user-score-svg" viewBox="0 0 36 36">
                                                            <path class="sfx-circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                            <path class="sfx-circle-bar" id="sfx-user-score-bar" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                                        </svg>
                                                        <div class="sfx-user-score-val" id="sfx-user-score-val">--</div>
                                                    </div>
                                                    <span class="sfx-user-score-lbl">User<br>Score</span>
                                                </a>

                                                <!-- Rotten Tomatoes (borderless) -->
                                                <a class="sfx-hero-score-badge" id="sfx-tmdb-rt-card" target="_blank" rel="noopener noreferrer" title="View on Rotten Tomatoes">
                                                    <div class="sfx-hero-score-icon">
                                                        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 28'><mask id='sfx-rt-mask-a' fill='#fff'><path fill-rule='evenodd' d='M.048.322h26.22v27.63H.049z'/></mask><mask id='sfx-rt-mask-b' fill='#fff'><path fill-rule='evenodd' d='M.048.006h23.575v20.746H.048z'/></mask><g fill='none' fill-rule='evenodd'><path fill='#fa3108' d='m15.392 8.057-.126-.009'/><path fill='#00912d' d='M15.768 6.58c.765-.067 2.437-.029 3.254.772.048.049.006.16-.064.14-1.196-.322-3.063 1.266-4.272.24-.033.3-.304 1.748-2.37 1.534-.049-.005-.068-.06-.032-.09.32-.272.713-1.025.376-1.506-1.051.698-1.595.728-3.534-.112-.063-.027-.025-.13.05-.147.402-.09 1.36-.438 2.218-.6a3 3 0 0 1 .48-.052c-.89-.212-1.276-.396-1.862-.393-.064 0-.096-.08-.05-.124.916-.88 2.577-.926 3.377-.27l-.717-1.497.872-.131.43 1.516c.907-.994 2.31-.893 2.783-.025.028.051-.018.112-.076.102-.476-.081-.801.315-.87.642z'/><path fill='gold' d='M4.567 20.714c-1.1-1.34-1.813-3.012-1.936-4.977-.212-3.405.951-6.607 5.482-8.218.004.015-.003.032.013.04-.063-.028-.025-.131.05-.148.402-.09 1.36-.439 2.218-.6a3 3 0 0 1 .48-.053c-.89-.21-1.276-.395-1.862-.392-.064 0-.096-.08-.05-.124.916-.881 2.577-.926 3.377-.27l-.717-1.498.872-.13.43 1.516c.907-.994 2.31-.893 2.783-.025.028.051-.018.112-.076.102-.476-.081-.801.315-.87.642l.007.002c.765-.068 2.437-.03 3.254.771-.057-.054-.125-.098-.19-.146 3.265 1.02 5.53 3.348 5.772 7.223.154 2.474-.654 4.607-2.055 6.261.425.061.849.132 1.273.203a12.48 12.48 0 0 0 2.816-7.923C25.638 6.2 20.137.898 13.115.898S.593 6.201.593 12.97c0 2.975 1.031 5.745 2.817 7.928q.577-.097 1.157-.184' mask='url(#sfx-rt-mask-a)' transform='translate(1)'/><path fill='#fa6e0f' d='M3.41 20.898A12.48 12.48 0 0 1 .593 12.97C.593 6.2 6.093.898 13.115.898S25.638 6.201 25.638 12.97c0 2.97-1.032 5.739-2.816 7.923.212.035.425.063.638.101a13.04 13.04 0 0 0 2.753-8.024c0-7.235-5.864-12.648-13.098-12.648S.017 5.735.017 12.97A13.03 13.03 0 0 0 2.775 21c.211-.038.423-.066.635-.102' mask='url(#sfx-rt-mask-a)' transform='translate(1)'/><path fill='#0ac855' d='M20.4 26.229c1.431.09 2.626.796 3.346 1.753.024.024.058.024.068-.004a8.8 8.8 0 0 0 .19-3.124q.003-.016.025-.022a7 7 0 0 1 2.209-.316c.042.005.041-.037-.004-.08a8.35 8.35 0 0 0-2.988-1.846 251 251 0 0 0-1.141 3.297c-.007.021-.037.034-.067.028z' mask='url(#sfx-rt-mask-a)' transform='translate(1)'/><path fill='#0b4902' d='m23.038 25.915-1.638.314s.02-.15.085-.563c.845.12 1.553.25 1.553.25'/><path fill='#fa3200' d='M4.577 13.512a59.3 59.3 0 0 1 16.972-.022c1.4-1.654 2.21-3.787 2.055-6.261-.242-3.875-2.507-6.203-5.771-7.223.064.048.132.092.189.146.048.049.006.16-.064.14-1.196-.322-3.063 1.266-4.272.24-.033.3-.304 1.748-2.37 1.534-.049-.005-.068-.06-.032-.09.32-.272.713-1.026.376-1.506-1.051.698-1.595.728-3.534-.112C8.11.351 8.116.334 8.113.32 3.583 1.93 2.419 5.132 2.63 8.537a8.56 8.56 0 0 0 1.946 4.975' mask='url(#sfx-rt-mask-b)' transform='translate(1 7.2)'/><path fill='#0ac855' d='M4.23 18.715c-.03.006-.06-.007-.067-.028a248 248 0 0 0-1.145-3.3 8.3 8.3 0 0 0-2.984 1.85c-.044.042-.045.084-.003.079a7 7 0 0 1 2.209.316q.022.005.024.022a8.8 8.8 0 0 0 .19 3.124c.01.028.045.028.068.004.721-.957 1.914-1.664 3.346-1.753z' mask='url(#sfx-rt-mask-b)' transform='translate(1 7.2)'/><path fill='#00912d' d='M23.038 25.915a51.8 51.8 0 0 0-17.808 0c-.03.006-.06-.007-.067-.028a250 250 0 0 0-1.68-4.795c-.009-.022.016-.048.054-.054a59.2 59.2 0 0 1 21.194 0c.038.006.063.032.054.054a251 251 0 0 0-1.68 4.795c-.007.021-.037.034-.067.028'/><path fill='#0b4902' d='m5.23 25.915 1.638.314-.086-.563c-.844.12-1.552.25-1.552.25'/></g></svg>
                                                    </div>
                                                    <div class="sfx-hero-score-details">
                                                        <span class="sfx-hero-score-val" id="sfx-tmdb-rt-score">--</span>
                                                        <span class="sfx-hero-score-subval" id="sfx-tmdb-rt-subval" style="display:none;"></span>
                                                    </div>
                                                </a>

                                                <!-- IMDb (borderless) -->
                                                <a class="sfx-hero-score-badge" id="sfx-tmdb-imdb-card" target="_blank" rel="noopener noreferrer" title="View on IMDb">
                                                    <div class="sfx-hero-score-icon">
                                                        <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                                                            <rect width="512" height="512" rx="15%" fill="#f5c518"/>
                                                            <path fill="#000000" d="M104 328V184H64v144zM189 184l-9 67-5-36-5-31h-50v144h34v-95l14 95h25l13-97v97h34V184zM256 328V184h62c15 0 26 11 26 25v94c0 14-11 25-26 25zm47-118l-9-1v94c5 0 9-1 10-3 2-2 2-8 2-18v-56-12l-3-4zM419 220h3c14 0 26 11 26 25v58c0 14-12 25-26 25h-3c-8 0-16-4-21-11l-2 9h-36V184h38v46c5-6 13-10 21-10zm-8 70v-34l-1-11c-1-2-4-3-6-3s-5 1-6 3v57c1 2 4 3 6 3s6-1 6-3l1-12z"/>
                                                        </svg>
                                                    </div>
                                                    <div class="sfx-hero-score-details">
                                                        <span class="sfx-hero-score-val" id="sfx-tmdb-imdb-score">--</span>
                                                        <span class="sfx-hero-score-subval">IMDb</span>
                                                    </div>
                                                </a>

                                                <!-- Search Actions (Google & MDL) -->
                                                <div class="sfx-hero-search-actions">
                                                    <!-- Google Search Button -->
                                                    <button class="sfx-hero-action-badge" id="sfx-hero-google-btn" type="button" title="Search on Google">
                                                        <svg viewBox="-3 0 262 262" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><path d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027" fill="#4285F4"/><path d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1" fill="#34A853"/><path d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782" fill="#FBBC05"/><path d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251" fill="#EB4335"/></svg>
                                                    </button>

                                                    <!-- MyDramaList Dropdown Button & Menu -->
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

                                            <div class="sfx-media-tagline" id="sfx-media-tagline" style="display: none;"></div>

                                            <div class="sfx-media-overview-wrap">
                                                <h3 class="sfx-media-overview-heading">Overview</h3>
                                                <p class="sfx-media-overview-text">
                                                    <span id="sfx-media-overview-snippet"></span>
                                                    <button class="sfx-media-more-btn" id="sfx-media-overview-more" style="display: none;">... MORE</button>
                                                </p>
                                            </div>

                                            <div class="sfx-media-crew" id="sfx-media-crew"></div>
                                        </div>
                                    </div>
                                </div>

                                <!-- 2. Cast & Crew Section -->
                                <div class="sfx-tmdb-section" id="sfx-tmdb-cast-section">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">Cast & Crew ›</span>
                                    </div>
                                    <div class="sfx-tmdb-cast-scroll-container">
                                        <div class="sfx-tmdb-cast-list" id="sfx-tmdb-cast-list"></div>
                                    </div>
                                </div>

                                <!-- Seasons Section (Shown if drama has more than Season 1) -->
                                <div class="sfx-tmdb-section" id="sfx-tmdb-seasons-section" style="display: none;">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">Seasons</span>
                                        <span class="sfx-season-section-count" id="sfx-season-count"></span>
                                    </div>
                                    <div class="sfx-tmdb-seasons-scroll-container">
                                        <div class="sfx-tmdb-seasons-list" id="sfx-tmdb-seasons-list"></div>
                                    </div>
                                </div>

                                <!-- 3. Images Section (Moved under Cast) -->
                                <div class="sfx-tmdb-section" id="sfx-tmdb-images-section">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">Images</span>
                                    </div>
                                    <div class="sfx-tmdb-gallery-container">
                                        <div class="sfx-tmdb-gallery" id="sfx-tmdb-gallery"></div>
                                    </div>
                                </div>

                                <!-- 4. Download Section -->
                                <div class="sfx-tmdb-section" id="sfx-tmdb-download-section">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">Download</span>
                                    </div>
                                    <div class="sfx-tmdb-download-grid">
                                        <a class="sfx-tmdb-download-card sfx-dl-card-sinflix" id="sfx-tmdb-dl-sinflix" role="button" tabindex="0" title="Go to drama on rentry.co/sin0flix">
                                            <div class="sfx-dl-icon-badge" style="background: rgba(48, 209, 88, 0.15); border: 1px solid rgba(48, 209, 88, 0.35); color: #30d158;">SX</div>
                                            <div class="sfx-dl-info">
                                                <span class="sfx-dl-name">rentry.co/sin0flix</span>
                                                <span class="sfx-dl-desc">On-page releases & download links</span>
                                            </div>
                                            <span class="sfx-dl-arrow">↓</span>
                                        </a>
                                        <a class="sfx-tmdb-download-card" id="sfx-tmdb-dl-dramaday" target="_blank" rel="noopener noreferrer" title="Search on dramaday.me">
                                            <div class="sfx-dl-icon-badge" style="background: rgba(255, 69, 58, 0.15); color: #ff453a;">DD</div>
                                            <div class="sfx-dl-info">
                                                <span class="sfx-dl-name">dramaday.me</span>
                                                <span class="sfx-dl-desc">Direct download links & batches</span>
                                            </div>
                                            <span class="sfx-dl-arrow">↗</span>
                                        </a>
                                        <a class="sfx-tmdb-download-card" id="sfx-tmdb-dl-extto" target="_blank" rel="noopener noreferrer" title="Search on ext.to">
                                            <div class="sfx-dl-icon-badge" style="background: rgba(10, 132, 255, 0.15); color: #0a84ff;">XT</div>
                                            <div class="sfx-dl-info">
                                                <span class="sfx-dl-name">ext.to</span>
                                                <span class="sfx-dl-desc">Torrents & magnet releases</span>
                                            </div>
                                            <span class="sfx-dl-arrow">↗</span>
                                        </a>
                                    </div>
                                    <div class="sfx-tmdb-sinflix-msg" id="sfx-tmdb-sinflix-msg" style="display: none;"></div>
                                </div>

                                <!-- Recommendations / Suggestions Section (Korean only) -->
                                <div class="sfx-tmdb-section" id="sfx-tmdb-recommendations-section" style="display: none;">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">More Like This</span>
                                        <span class="sfx-rec-section-count" id="sfx-rec-count"></span>
                                    </div>
                                    <div class="sfx-tmdb-recs-scroll-container">
                                        <div class="sfx-tmdb-recs-list" id="sfx-tmdb-recs-list"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Person Profile Area (Apple TV+ Style) -->
                            <div class="sfx-tmdb-person-view" id="sfx-tmdb-person-view" style="display: none;">
                                <div class="sfx-person-hero-card" id="sfx-person-hero-card">
                                    <div class="sfx-person-photo-wrap" id="sfx-person-photo-wrap"></div>
                                    <div class="sfx-person-info">
                                        <h2 class="sfx-person-name" id="sfx-person-name"></h2>
                                        <div class="sfx-person-meta-text" id="sfx-person-meta"></div>
                                        <div class="sfx-person-bio-wrap">
                                            <span class="sfx-person-bio" id="sfx-person-bio"></span>
                                            <button class="sfx-bio-more-btn" id="sfx-bio-more-btn" style="display: none;">... MORE</button>
                                        </div>
                                    </div>
                                </div>

                                <!-- TV Series / Dramas Scroller -->
                                <div class="sfx-tmdb-section" id="sfx-person-tv-section">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">TV Series / Dramas</span>
                                        <span class="sfx-person-section-count" id="sfx-person-tv-count"></span>
                                    </div>
                                    <div class="sfx-credit-scroll-container" id="sfx-person-tv-container">
                                        <div class="sfx-credit-list" id="sfx-person-tv-list"></div>
                                    </div>
                                </div>

                                <!-- Movies Scroller -->
                                <div class="sfx-tmdb-section" id="sfx-person-movies-section">
                                    <div class="sfx-tmdb-section-header">
                                        <span class="sfx-tmdb-section-title">Movies</span>
                                        <span class="sfx-person-section-count" id="sfx-person-movies-count"></span>
                                    </div>
                                    <div class="sfx-credit-scroll-container" id="sfx-person-movies-container">
                                        <div class="sfx-credit-list" id="sfx-person-movies-list"></div>
                                    </div>
                                </div>
                            </div>

                            <!-- Empty State: Not Found -->
                            <div class="sfx-tmdb-empty" id="sfx-tmdb-empty" style="display: none;">
                                <div class="sfx-tmdb-empty-title">No Matching Title Found on TheMovieDB</div>
                                <div class="sfx-tmdb-empty-desc">We couldn't locate this drama on TheMovieDB. You can try searching directly using the search providers above.</div>
                            </div>

                            <!-- Empty State: Missing Credentials -->
                            <div class="sfx-tmdb-empty sfx-tmdb-creds-empty" id="sfx-tmdb-creds-empty" style="display: none;">
                                <div class="sfx-tmdb-creds-icon">
                                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#30d158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <div class="sfx-tmdb-empty-title">TheMovieDB API Credentials Required</div>
                                <div class="sfx-tmdb-empty-desc">To unlock drama posters, trailers, cast lists, user ratings, and suggestions, please add your free TheMovieDB credentials.</div>
                                <div class="sfx-tmdb-creds-box">
                                    <ol class="sfx-tmdb-creds-steps">
                                        <li>Create a free account on <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">themoviedb.org</a></li>
                                        <li>Go to <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">themoviedb.org/settings/api</a> to generate your credentials</li>
                                        <li>Paste your <b>API Read Access Token</b> or <b>API Key</b> in Settings</li>
                                    </ol>
                                    <button class="sfx-tmdb-open-settings-action" id="sfx-tmdb-modal-settings-btn" type="button">
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>
                                        <span>Open Settings</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Apple TV+ Style Person Biography Pop-up Modal -->
                <div class="sfx-tmdb-bio-modal-backdrop" id="sfx-tmdb-bio-modal">
                    <div class="sfx-tmdb-bio-modal-card">
                        <button class="sfx-tmdb-bio-close" id="sfx-tmdb-bio-close" title="Close">
                            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                        <h3 class="sfx-tmdb-bio-title" id="sfx-tmdb-bio-title"></h3>
                        <div class="sfx-tmdb-bio-content" id="sfx-tmdb-bio-content"></div>
                    </div>
                </div>

                <!-- Play Trailer Pop-up Modal (Borderless, Video Only) -->
                <div class="sfx-tmdb-trailer-modal-backdrop" id="sfx-tmdb-trailer-modal">
                    <div class="sfx-tmdb-trailer-modal-card">
                        <button class="sfx-tmdb-trailer-modal-close" id="sfx-tmdb-trailer-close" title="Close">
                            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                        <div class="sfx-tmdb-trailer-player-box" id="sfx-tmdb-trailer-player-box"></div>
                    </div>
                </div>

                <!-- Media Overview Pop-up Modal -->
                <div class="sfx-tmdb-bio-modal-backdrop" id="sfx-tmdb-synopsis-modal">
                    <div class="sfx-tmdb-bio-modal-card">
                        <button class="sfx-tmdb-bio-close" id="sfx-tmdb-synopsis-close" title="Close">
                            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                        <h3 class="sfx-tmdb-bio-title" id="sfx-tmdb-synopsis-title"></h3>
                        <div class="sfx-tmdb-bio-content" id="sfx-tmdb-synopsis-content"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalWrap);
            tmdbModalEl = modalWrap;

            // Events inside modal
            const backBtn = modalWrap.querySelector('#sfx-tmdb-back-btn');
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                goBackTmdb();
            });

            const closeBtn = modalWrap.querySelector('#sfx-tmdb-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTmdbModal();
            });

            const scrollLayer = modalWrap.querySelector('#sfx-tmdb-scroll-layer');

            // Sticky header scroll listener for transitions
            if (scrollLayer) {
                scrollLayer.addEventListener('scroll', () => {
                    const isScrolled = scrollLayer.scrollTop > 75;
                    modalWrap.classList.toggle('sfx-header-scrolled', isScrolled);
                }, { passive: true });
            }

            // Horizontal mouse wheel scrolling for galleries and horizontal credit lists
            // Only convert deltaY to horizontal scroll if Shift is pressed so normal vertical page scroll is NEVER trapped
            const galleryScroll = modalWrap.querySelector('#sfx-tmdb-gallery');
            const castScroll = modalWrap.querySelector('.sfx-tmdb-cast-scroll-container');
            const seasonsScroll = modalWrap.querySelector('.sfx-tmdb-seasons-scroll-container');
            const recsScroll = modalWrap.querySelector('.sfx-tmdb-recs-scroll-container');
            const personTvScroll = modalWrap.querySelector('#sfx-person-tv-container');
            const personMoviesScroll = modalWrap.querySelector('#sfx-person-movies-container');
            [galleryScroll, castScroll, seasonsScroll, recsScroll, personTvScroll, personMoviesScroll].forEach(container => {
                if (!container) return;
                container.addEventListener('wheel', (e) => {
                    if (e.shiftKey && e.deltaY !== 0) {
                        container.scrollLeft += e.deltaY;
                        e.preventDefault();
                    }
                }, { passive: false });
            });

            // Copy button
            const copyBtn = modalWrap.querySelector('#sfx-tmdb-copy-btn');
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const textToCopy = activeTmdbCopyText || activeDramaName;
                if (typeof GM_setClipboard !== 'undefined') {
                    GM_setClipboard(textToCopy);
                } else {
                    navigator.clipboard.writeText(textToCopy);
                }
                const orig = copyBtn.innerHTML;
                copyBtn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="#30d158" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
                copyBtn.title = 'Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = orig;
                    copyBtn.title = 'Copy Name';
                }, 800);
            });

            // Modal Open Settings button (shown when credentials are not configured)
            const modalSettingsBtn = modalWrap.querySelector('#sfx-tmdb-modal-settings-btn');
            if (modalSettingsBtn) {
                modalSettingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    closeTmdbModal();
                    const islandWrap = document.getElementById('sfx-island-wrap');
                    if (islandWrap) {
                        islandWrap.classList.add('sfx-settings-open');
                        islandWrap.classList.remove('sfx-collapsed');
                        const tmdbGroup = islandWrap.querySelector('#sfx-settings-group-tmdb');
                        if (tmdbGroup) {
                            tmdbGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        const tokenInput = islandWrap.querySelector('#sfx-input-tmdb-read-token');
                        if (tokenInput) {
                            setTimeout(() => tokenInput.focus(), 300);
                        }
                    }
                });
            }

            // Header Search buttons (fallback if ever displayed)
            const hdrGoogle = modalWrap.querySelector('#sfx-tmdb-google');
            if (hdrGoogle) {
                hdrGoogle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (activeTmdbIsPerson && currentPersonData) {
                        openPopupWindow('https://www.google.com/search?q=' + encodeURIComponent(currentPersonData.name), 960, 680);
                    } else {
                        const currentTitle = currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName;
                        const isMovie = currentMediaData && currentMediaData._mediaType === 'movie';
                        const suffix = isMovie ? 'Movie' : getSetting('sfx-google-search-suffix', 'TV Series');
                        const query = (currentTitle + ' ' + suffix).trim();
                        openPopupWindow('https://www.google.com/search?q=' + encodeURIComponent(query), 960, 680);
                    }
                });
            }

            const hdrMdl = modalWrap.querySelector('#sfx-tmdb-mdl');
            if (hdrMdl) {
                hdrMdl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (activeTmdbIsPerson && currentPersonData) {
                        openPopupWindow('https://mydramalist.com/search?q=' + encodeURIComponent(currentPersonData.name) + '&adv=people', 960, 720);
                    } else {
                        const currentTitle = currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName;
                        const isMovie = currentMediaData && currentMediaData._mediaType === 'movie';
                        const mdlFilter = isMovie ? '&adv=titles&ty=77' : '&adv=titles&ty=68&co=3&so=relevance';
                        openPopupWindow('https://mydramalist.com/search?q=' + encodeURIComponent(currentTitle) + mdlFilter, 960, 720);
                    }
                });
            }

            // Hero Rating Section Search Actions (Google & MyDramaList before Play Trailer)
            const heroGoogleBtn = modalWrap.querySelector('#sfx-hero-google-btn');
            if (heroGoogleBtn) {
                heroGoogleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const currentTitle = activeTmdbIsPerson && currentPersonData ? currentPersonData.name : (currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName);
                    const isMovie = currentMediaData && currentMediaData._mediaType === 'movie';
                    const suffix = activeTmdbIsPerson ? '' : (isMovie ? 'Movie' : getSetting('sfx-google-search-suffix', 'TV Series'));
                    const query = (currentTitle + ' ' + suffix).trim();
                    openPopupWindow('https://www.google.com/search?q=' + encodeURIComponent(query), 960, 680);
                });
            }

            const heroMdlBtn = modalWrap.querySelector('#sfx-hero-mdl-btn');
            const heroMdlMenu = modalWrap.querySelector('#sfx-hero-mdl-menu');
            if (heroMdlBtn && heroMdlMenu) {
                heroMdlBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = heroMdlMenu.style.display === 'flex';
                    heroMdlMenu.style.display = isOpen ? 'none' : 'flex';
                });
            }

            const heroMdlCopy = modalWrap.querySelector('#sfx-hero-mdl-copy');
            if (heroMdlCopy) {
                heroMdlCopy.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (heroMdlMenu) heroMdlMenu.style.display = 'none';

                    // If TV show has 2 or more seasons, do not allow to copy the link in MyDramaList
                    if (isMultiSeasonTv(currentMediaData)) {
                        showProgressIsland('Copy disabled: TV show has 2 or more seasons', 'error');
                        return;
                    }

                    const title = currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName;
                    const rawYear = currentMediaData ? (currentMediaData.first_air_date || currentMediaData.release_date || '') : '';
                    let year = rawYear ? rawYear.slice(0, 4) : '';
                    if (!year && title) {
                        const ym = String(title).match(/\b(19\d\d|20\d\d)\b/);
                        if (ym) year = ym[1];
                    }
                    if (!year && activeDramaName) {
                        const ym = String(activeDramaName).match(/\b(19\d\d|20\d\d)\b/);
                        if (ym) year = ym[1];
                    }

                    showProgressIsland('Searching MyDramaList...', 'progress');

                    try {
                        const res = await resolveMdlDrama(title, year, currentMediaData ? currentMediaData.id : null, currentMediaData);
                        const target = res && (res.matched || res.firstResult);
                        if (target && target.url) {
                            copyTextToClipboard(target.url);
                            showProgressIsland('Copied drama link!', 'success');
                        } else {
                            showProgressIsland('No matching drama found on MyDramaList', 'error');
                        }
                    } catch (err) {
                        console.error('[SinFlix] MDL copy error:', err);
                        showProgressIsland('Failed to find drama on MyDramaList', 'error');
                    }
                });
            }

            const heroMdlVisit = modalWrap.querySelector('#sfx-hero-mdl-visit');
            if (heroMdlVisit) {
                heroMdlVisit.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (heroMdlMenu) heroMdlMenu.style.display = 'none';

                    const isMultiSeason = isMultiSeasonTv(currentMediaData);

                    const title = currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName;
                    const rawYear = currentMediaData ? (currentMediaData.first_air_date || currentMediaData.release_date || '') : '';
                    let year = rawYear ? rawYear.slice(0, 4) : '';
                    if (!year && title) {
                        const ym = String(title).match(/\b(19\d\d|20\d\d)\b/);
                        if (ym) year = ym[1];
                    }
                    if (!year && activeDramaName) {
                        const ym = String(activeDramaName).match(/\b(19\d\d|20\d\d)\b/);
                        if (ym) year = ym[1];
                    }

                    const cleanQuery = getMdlSearchQuery(title);
                    const searchPageUrl = 'https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery);

                    // If TV show has 2 or more seasons, go to search results instead of drama page
                    if (isMultiSeason) {
                        openPopupWindow(searchPageUrl, 960, 720);
                        return;
                    }

                    const cacheKey = (cleanQuery.toLowerCase() + '_' + (year || '')).trim();
                    const cached = mdlSearchCache.get(cacheKey);

                    if (cached && (cached.matched || cached.firstResult)) {
                        const target = cached.matched || cached.firstResult;
                        openPopupWindow(target.url, 960, 720);
                        return;
                    }

                    // Open popup immediately so browser popup blocker does not block it during await
                    const popupWin = openPopupWindow('about:blank', 960, 720);

                    try {
                        const res = await resolveMdlDrama(title, year, currentMediaData ? currentMediaData.id : null, currentMediaData);
                        const target = res && (res.matched || res.firstResult);
                        const destination = target && target.url ? target.url : (res && res.searchUrl ? res.searchUrl : ('https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery)));
                        if (popupWin && !popupWin.closed) {
                            popupWin.location.href = destination;
                        } else {
                            openPopupWindow(destination, 960, 720);
                        }
                    } catch (err) {
                        const fallback = 'https://mydramalist.com/search?q=' + encodeURIComponent(cleanQuery);
                        if (popupWin && !popupWin.closed) {
                            popupWin.location.href = fallback;
                        } else {
                            openPopupWindow(fallback, 960, 720);
                        }
                    }
                });
            }

            // Dismiss hero MDL menu on click outside
            document.addEventListener('click', (e) => {
                const heroMdlWrap = document.getElementById('sfx-hero-mdl-wrap');
                const menu = document.getElementById('sfx-hero-mdl-menu');
                if (menu && menu.style.display === 'flex') {
                    if (!heroMdlWrap || !heroMdlWrap.contains(e.target)) {
                        menu.style.display = 'none';
                    }
                }
            });

            // Apple TV+ Style Person Biography Pop-up Modal wiring
            const bioModal = modalWrap.querySelector('#sfx-tmdb-bio-modal');
            const bioCloseBtn = modalWrap.querySelector('#sfx-tmdb-bio-close');
            const bioMoreBtn = modalWrap.querySelector('#sfx-bio-more-btn');

            if (bioMoreBtn && bioModal) {
                bioMoreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bioModal.classList.add('sfx-open');
                });
            }

            if (bioCloseBtn && bioModal) {
                bioCloseBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bioModal.classList.remove('sfx-open');
                });
            }

            if (bioModal) {
                bioModal.addEventListener('click', (e) => {
                    if (e.target === bioModal) {
                        e.stopPropagation();
                        bioModal.classList.remove('sfx-open');
                    }
                });
            }

            // Trailer modal events
            const trailerModal = modalWrap.querySelector('#sfx-tmdb-trailer-modal');
            const trailerClose = modalWrap.querySelector('#sfx-tmdb-trailer-close');
            if (trailerClose && trailerModal) {
                trailerClose.addEventListener('click', (e) => {
                    e.stopPropagation();
                    stopTmdbMedia();
                });
            }
            if (trailerModal) {
                trailerModal.addEventListener('click', (e) => {
                    if (e.target === trailerModal) {
                        e.stopPropagation();
                        stopTmdbMedia();
                    }
                });
            }

            // Synopsis modal events
            const synopsisModal = modalWrap.querySelector('#sfx-tmdb-synopsis-modal');
            const synopsisClose = modalWrap.querySelector('#sfx-tmdb-synopsis-close');
            if (synopsisClose && synopsisModal) {
                synopsisClose.addEventListener('click', (e) => {
                    e.stopPropagation();
                    synopsisModal.classList.remove('sfx-open');
                });
            }
            if (synopsisModal) {
                synopsisModal.addEventListener('click', (e) => {
                    if (e.target === synopsisModal) {
                        e.stopPropagation();
                        synopsisModal.classList.remove('sfx-open');
                    }
                });
            }

            // SinFlix download option (rentry.co/sin0flix)
            const dlSinflix = modalWrap.querySelector('#sfx-tmdb-dl-sinflix');
            const sinflixMsg = modalWrap.querySelector('#sfx-tmdb-sinflix-msg');
            if (dlSinflix) {
                const handleGoToDrama = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    const targetTitle = currentMediaData ? (currentMediaData.name || currentMediaData.title || activeDramaName) : activeDramaName;
                    const found = findDramaOnSinFlix(targetTitle);
                    if (found) {
                        closeTmdbModal();
                        setTimeout(() => {
                            found.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            found.classList.add('sfx-drama-spotlight');
                            setTimeout(() => {
                                found.classList.remove('sfx-drama-spotlight');
                            }, 2600);
                        }, 120);
                    } else {
                        const onSinflix = window.location.href.includes('rentry.co/sin-flix') || window.location.href.includes('rentry.co/sin0flix') || window.location.href.includes('text.is/Sinflix');
                        if (!onSinflix) {
                            window.open('https://rentry.co/sin0flix', '_blank', 'noopener,noreferrer');
                        } else if (sinflixMsg) {
                            sinflixMsg.textContent = '⚠️ Drama not found on current page';
                            sinflixMsg.style.display = 'block';
                            setTimeout(() => {
                                sinflixMsg.style.display = 'none';
                            }, 4000);
                        }
                    }
                };

                dlSinflix.addEventListener('click', handleGoToDrama);
                dlSinflix.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleGoToDrama(e);
                    }
                });
            }

            return modalWrap;
        }

        function onTmdbKeydown(e) {
            if (e.key === 'Escape') {
                const trailerModal = tmdbModalEl ? tmdbModalEl.querySelector('#sfx-tmdb-trailer-modal') : null;
                if (trailerModal && trailerModal.classList.contains('sfx-open')) {
                    stopTmdbMedia();
                    return;
                }
                const synopsisModal = tmdbModalEl ? tmdbModalEl.querySelector('#sfx-tmdb-synopsis-modal') : null;
                if (synopsisModal && synopsisModal.classList.contains('sfx-open')) {
                    synopsisModal.classList.remove('sfx-open');
                    return;
                }
                const bioModal = tmdbModalEl ? tmdbModalEl.querySelector('#sfx-tmdb-bio-modal') : null;
                if (bioModal && bioModal.classList.contains('sfx-open')) {
                    bioModal.classList.remove('sfx-open');
                    return;
                }
                closeTmdbModal();
            }
        }

        function closeTmdbModal() {
            if (!tmdbModalEl || !tmdbModalEl.classList.contains('sfx-open')) return;

            stopTmdbMedia();
            resetMediaState(tmdbModalEl);

            tmdbModalEl.classList.add('sfx-closing');
            window.removeEventListener('keydown', onTmdbKeydown);

            setTimeout(() => {
                tmdbModalEl.classList.remove('sfx-open', 'sfx-closing', 'sfx-actor-mode', 'sfx-header-scrolled', 'sfx-loading');
                const bioModal = tmdbModalEl.querySelector('#sfx-tmdb-bio-modal');
                if (bioModal) bioModal.classList.remove('sfx-open');
                const synopsisModal = tmdbModalEl.querySelector('#sfx-tmdb-synopsis-modal');
                if (synopsisModal) synopsisModal.classList.remove('sfx-open');
                const trailerModal = tmdbModalEl.querySelector('#sfx-tmdb-trailer-modal');
                if (trailerModal) trailerModal.classList.remove('sfx-open');
                resetMediaState(tmdbModalEl);
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }, 280);
        }

        async function loadAndRenderPersonView(personId, personName) {
            const modalWrap = createTmdbModal();
            stopTmdbMedia();

            // Push current media onto navigation stack if leaving media view
            if (!activeTmdbIsPerson && currentMediaData) {
                tmdbNavStack.push({ type: 'media', data: currentMediaData });
            }

            const titleTextEl = modalWrap.querySelector('.sfx-tmdb-title-text');
            const yearEl = modalWrap.querySelector('#sfx-tmdb-year');
            const loadingEl = modalWrap.querySelector('#sfx-tmdb-loading');
            const loadingTextEl = modalWrap.querySelector('#sfx-tmdb-loading-text');
            const contentEl = modalWrap.querySelector('#sfx-tmdb-content');
            const personViewEl = modalWrap.querySelector('#sfx-tmdb-person-view');
            const emptyEl = modalWrap.querySelector('#sfx-tmdb-empty');

            titleTextEl.textContent = personName;
            titleTextEl.title = personName;
            yearEl.textContent = '';
            activeTmdbCopyText = personName;
            resetTmdbModalScroll(modalWrap);
            loadingTextEl.textContent = `Fetching profile for ${personName}...`;
            modalWrap.classList.add('sfx-loading');
            loadingEl.style.display = 'flex';
            contentEl.style.display = 'none';
            personViewEl.style.display = 'none';
            emptyEl.style.display = 'none';

            updateTmdbBackBtn();

            try {
                const personData = await fetchTmdbPerson(personId);
                if (!personData) {
                    loadingEl.style.display = 'none';
                    modalWrap.classList.remove('sfx-loading');
                    emptyEl.style.display = 'flex';
                    return;
                }
                renderPersonView(personData, false);
            } catch (err) {
                console.error('TMDB Person profile error:', err);
                loadingEl.style.display = 'none';
                modalWrap.classList.remove('sfx-loading');
                emptyEl.style.display = 'flex';
            }
        }

        function renderPersonView(personData, pushToStack = false) {
            const modalWrap = createTmdbModal();
            stopTmdbMedia();

            if (pushToStack) {
                if (!activeTmdbIsPerson && currentMediaData) {
                    tmdbNavStack.push({ type: 'media', data: currentMediaData });
                } else if (activeTmdbIsPerson && currentPersonData) {
                    tmdbNavStack.push({ type: 'person', data: currentPersonData });
                }
            }

            activeTmdbIsPerson = true;
            currentPersonData = personData;
            modalWrap.classList.add('sfx-actor-mode');
            modalWrap.classList.remove('sfx-header-scrolled', 'sfx-loading');
            updateTmdbBackBtn();

            // Set ambient background artwork from profile photo with full blur
            const ambientBg = modalWrap.querySelector('#sfx-tmdb-ambient-bg');
            if (ambientBg) {
                if (personData.profile_path) {
                    ambientBg.style.backgroundImage = `url("https://image.tmdb.org/t/p/w780${personData.profile_path}")`;
                    ambientBg.classList.add('sfx-active');
                } else {
                    ambientBg.classList.remove('sfx-active');
                }
            }

            const titleTextEl = modalWrap.querySelector('.sfx-tmdb-title-text');
            const yearEl = modalWrap.querySelector('#sfx-tmdb-year');
            const loadingEl = modalWrap.querySelector('#sfx-tmdb-loading');
            const contentEl = modalWrap.querySelector('#sfx-tmdb-content');
            const personViewEl = modalWrap.querySelector('#sfx-tmdb-person-view');
            const emptyEl = modalWrap.querySelector('#sfx-tmdb-empty');

            titleTextEl.textContent = personData.name;
            titleTextEl.title = personData.name;
            yearEl.textContent = '';
            activeTmdbCopyText = personData.name;

            // Small header person thumb (32px circular) for header on scroll
            const headerThumb = modalWrap.querySelector('#sfx-header-person-thumb');
            if (headerThumb) {
                if (personData.profile_path) {
                    headerThumb.innerHTML = `<img src="https://image.tmdb.org/t/p/w185${personData.profile_path}" alt="${escapeHtml(personData.name)}" />`;
                } else {
                    headerThumb.innerHTML = `<div class="sfx-header-person-thumb-fallback" style="font-size:16px;color:rgba(255,255,255,0.6);">👤</div>`;
                }
            }

            loadingEl.style.display = 'none';
            contentEl.style.display = 'none';
            emptyEl.style.display = 'none';
            personViewEl.style.display = 'flex';

            // Profile photo (140px circular)
            const photoWrap = modalWrap.querySelector('#sfx-person-photo-wrap');
            if (personData.profile_path) {
                const photoUrl = `https://image.tmdb.org/t/p/w300${personData.profile_path}`;
                photoWrap.innerHTML = `<img class="sfx-person-photo" src="${photoUrl}" alt="${escapeHtml(personData.name)}" loading="lazy" />`;
            } else {
                photoWrap.innerHTML = `<div class="sfx-person-photo" style="display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:48px;">👤</div>`;
            }

            // Name
            modalWrap.querySelector('#sfx-person-name').textContent = personData.name;

            // Clean metadata items (no emojis, no country, no birthplace, no department)
            // Only show death info if deceased: "YYYY-MM-DD (age X) · died YYYY-MM-DD"
            const metaContainer = modalWrap.querySelector('#sfx-person-meta');
            let metaText = '';

            if (personData.deathday) {
                if (personData.birthday) {
                    const birthDate = new Date(personData.birthday);
                    const deathDate = new Date(personData.deathday);
                    let age = deathDate.getFullYear() - birthDate.getFullYear();
                    const m = deathDate.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && deathDate.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    metaText = `${personData.birthday} (age ${age}) · died ${personData.deathday}`;
                } else {
                    metaText = `died ${personData.deathday}`;
                }
            }

            metaContainer.textContent = metaText;
            metaContainer.style.display = metaText ? 'block' : 'none';

            // Biography & Apple TV+ Modal setup
            const bioEl = modalWrap.querySelector('#sfx-person-bio');
            const bioMoreBtn = modalWrap.querySelector('#sfx-bio-more-btn');
            const bioModal = modalWrap.querySelector('#sfx-tmdb-bio-modal');
            const bioTitle = modalWrap.querySelector('#sfx-tmdb-bio-title');
            const bioContent = modalWrap.querySelector('#sfx-tmdb-bio-content');

            if (bioModal) bioModal.classList.remove('sfx-open');
            if (bioTitle) bioTitle.textContent = personData.name;

            const fullBio = (personData.biography || '').trim();
            if (fullBio) {
                if (fullBio.length > 220) {
                    const truncated = fullBio.slice(0, 220).replace(/\s+\S*$/, '');
                    bioEl.textContent = truncated;
                    bioMoreBtn.style.display = 'inline';
                } else {
                    bioEl.textContent = fullBio;
                    bioMoreBtn.style.display = 'none';
                }
                if (bioContent) bioContent.textContent = fullBio;
            } else {
                bioEl.textContent = 'No biography available for this person.';
                if (bioContent) bioContent.textContent = 'No biography available for this person.';
                bioMoreBtn.style.display = 'none';
            }

            // Credits handling: separate TV and Movies, deduplicate, sort by date / popularity
            const rawCredits = (personData.combined_credits && personData.combined_credits.cast) ? personData.combined_credits.cast : [];
            const seen = new Set();
            const deduped = [];
            for (const item of rawCredits) {
                const key = `${item.media_type || 'tv'}:${item.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    deduped.push(item);
                }
            }

            function getCreditDate(item) {
                return item.first_air_date || item.release_date || '';
            }

            function compareCreditsLatestToOldest(a, b) {
                const dateA = getCreditDate(a);
                const dateB = getCreditDate(b);
                if (dateA && dateB) {
                    if (dateA !== dateB) return dateB.localeCompare(dateA);
                } else if (dateA && !dateB) {
                    return -1;
                } else if (!dateA && dateB) {
                    return 1;
                }
                return (b.popularity || 0) - (a.popularity || 0);
            }

            const tvCredits = deduped.filter(c => c.media_type === 'tv');
            const movieCredits = deduped.filter(c => c.media_type === 'movie');
            tvCredits.sort(compareCreditsLatestToOldest);
            movieCredits.sort(compareCreditsLatestToOldest);

            // Render helper for credit lists
            function renderCreditCards(containerEl, list) {
                containerEl.innerHTML = list.map(c => {
                    const posterUrl = c.poster_path ? `https://image.tmdb.org/t/p/w342${c.poster_path}` : '';
                    const title = c.name || c.title || 'Untitled';
                    const date = c.first_air_date || c.release_date || '';
                    const year = date ? date.slice(0, 4) : '';
                    const character = c.character || '';
                    return `
                        <div class="sfx-credit-card" data-media-id="${c.id}" data-media-type="${c.media_type || 'tv'}" title="${escapeHtml(title)}">
                            <div class="sfx-credit-poster-wrap">
                                ${posterUrl
                                    ? `<img class="sfx-credit-poster" src="${posterUrl}" alt="${escapeHtml(title)}" loading="lazy" />`
                                    : `<div class="sfx-credit-poster" style="display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);font-size:32px;">🎬</div>`
                                }
                                ${year ? `<span class="sfx-credit-year-badge">${year}</span>` : ''}
                            </div>
                            <span class="sfx-credit-title">${escapeHtml(title)}</span>
                            ${character ? `<span class="sfx-credit-char">${escapeHtml(character)}</span>` : ''}
                        </div>
                    `;
                }).join('');

                // Click event on cards
                containerEl.querySelectorAll('.sfx-credit-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const mediaId = card.getAttribute('data-media-id');
                        const mediaType = card.getAttribute('data-media-type');
                        loadMediaById(mediaId, mediaType);
                    });
                });
            }

            // TV section
            const tvSection = modalWrap.querySelector('#sfx-person-tv-section');
            const tvList = modalWrap.querySelector('#sfx-person-tv-list');
            const tvCount = modalWrap.querySelector('#sfx-person-tv-count');
            if (tvCredits.length > 0) {
                tvCount.textContent = `(${tvCredits.length})`;
                renderCreditCards(tvList, tvCredits);
                tvSection.style.display = 'block';
            } else {
                tvSection.style.display = 'none';
            }

            // Movies section
            const movieSection = modalWrap.querySelector('#sfx-person-movies-section');
            const movieList = modalWrap.querySelector('#sfx-person-movies-list');
            const movieCount = modalWrap.querySelector('#sfx-person-movies-count');
            if (movieCredits.length > 0) {
                movieCount.textContent = `(${movieCredits.length})`;
                renderCreditCards(movieList, movieCredits);
                movieSection.style.display = 'block';
            } else {
                movieSection.style.display = 'none';
            }

            resetTmdbModalScroll(modalWrap);
        }

        async function loadMediaById(mediaId, mediaType = 'tv') {
            const modalWrap = createTmdbModal();
            stopTmdbMedia();

            // Push current state onto navigation stack
            if (activeTmdbIsPerson && currentPersonData) {
                tmdbNavStack.push({ type: 'person', data: currentPersonData });
            } else if (!activeTmdbIsPerson && currentMediaData) {
                tmdbNavStack.push({ type: 'media', data: currentMediaData });
            }

            resetTmdbModalScroll(modalWrap);
            resetMediaState(modalWrap);
            const loadingEl = modalWrap.querySelector('#sfx-tmdb-loading');
            const loadingTextEl = modalWrap.querySelector('#sfx-tmdb-loading-text');
            const contentEl = modalWrap.querySelector('#sfx-tmdb-content');
            const personViewEl = modalWrap.querySelector('#sfx-tmdb-person-view');
            const emptyEl = modalWrap.querySelector('#sfx-tmdb-empty');

            loadingTextEl.textContent = 'Fetching details...';
            loadingEl.style.display = 'flex';
            contentEl.style.display = 'none';
            personViewEl.style.display = 'none';
            emptyEl.style.display = 'none';

            updateTmdbBackBtn();

            try {
                const mediaData = await fetchTmdbMediaById(mediaId, mediaType);
                if (!mediaData) {
                    loadingEl.style.display = 'none';
                    modalWrap.classList.remove('sfx-loading');
                    emptyEl.style.display = 'flex';
                    return;
                }
                renderMediaView(mediaData, false);
            } catch (err) {
                console.error('TMDB load media error:', err);
                loadingEl.style.display = 'none';
                modalWrap.classList.remove('sfx-loading');
                emptyEl.style.display = 'flex';
            }
        }

        function renderMediaView(data, pushToStack = false) {
            const modalWrap = createTmdbModal();
            stopTmdbMedia();
            resetMediaState(modalWrap);

            if (pushToStack) {
                if (activeTmdbIsPerson && currentPersonData) {
                    tmdbNavStack.push({ type: 'person', data: currentPersonData });
                } else if (!activeTmdbIsPerson && currentMediaData) {
                    tmdbNavStack.push({ type: 'media', data: currentMediaData });
                }
            }

            activeTmdbIsPerson = false;
            currentMediaData = data;
            const renderId = data.id;
            modalWrap.classList.remove('sfx-actor-mode', 'sfx-header-scrolled');
            updateTmdbBackBtn();

            const title = data.name || data.title || activeDramaName;
            const releaseDate = data.first_air_date || data.release_date || '';
            const year = releaseDate ? releaseDate.slice(0, 4) : (data._searchedYear || '');
            const isMovie = data._mediaType === 'movie';
            const isTv = !isMovie;

            // Top Sticky Header Elements
            const titleTextEl = modalWrap.querySelector('.sfx-tmdb-title-text');
            const yearEl = modalWrap.querySelector('#sfx-tmdb-year');
            const headerMediaThumb = modalWrap.querySelector('#sfx-header-media-thumb');

            titleTextEl.textContent = title;
            titleTextEl.title = title;
            if (year) {
                yearEl.textContent = `(${year})`;
                activeTmdbCopyText = `${title} (${year})`;
            } else {
                yearEl.textContent = '';
                activeTmdbCopyText = title;
            }

            if (headerMediaThumb) {
                headerMediaThumb.innerHTML = '';
                if (data.poster_path) {
                    const thumbImg = new Image();
                    const thumbUrl = `https://image.tmdb.org/t/p/w92${data.poster_path}`;
                    thumbImg.onload = () => {
                        if (currentMediaData && currentMediaData.id === renderId) {
                            headerMediaThumb.innerHTML = `<img src="${thumbUrl}" alt="${escapeHtml(title)}" />`;
                        }
                    };
                    thumbImg.src = thumbUrl;
                }
            }

            // Container visibility
            const loadingEl = modalWrap.querySelector('#sfx-tmdb-loading');
            const contentEl = modalWrap.querySelector('#sfx-tmdb-content');
            const personViewEl = modalWrap.querySelector('#sfx-tmdb-person-view');
            const emptyEl = modalWrap.querySelector('#sfx-tmdb-empty');
            const sinflixMsg = modalWrap.querySelector('#sfx-tmdb-sinflix-msg');

            loadingEl.style.display = 'none';
            modalWrap.classList.remove('sfx-loading');
            personViewEl.style.display = 'none';
            emptyEl.style.display = 'none';
            contentEl.style.display = 'flex';
            if (sinflixMsg) sinflixMsg.style.display = 'none';

            // In TV and Movie view, the backdrop is rendered strictly inside .sfx-media-hero-card.
            // Ambient background is deactivated to completely prevent any backdrop bleed around the card.
            const ambientBg = modalWrap.querySelector('#sfx-tmdb-ambient-bg');
            if (ambientBg) {
                ambientBg.style.backgroundImage = 'none';
                ambientBg.classList.remove('sfx-active');
            }

            // 1. Hero Card Backdrop Artwork & Poster (preloaded so previous drama's image never flashes)
            const heroCard = modalWrap.querySelector('#sfx-media-hero-card');
            if (heroCard) heroCard.style.backgroundImage = 'none';
            const heroBg = modalWrap.querySelector('#sfx-media-hero-bg');
            const backdropPath = data.backdrop_path || (data.images && data.images.backdrops && data.images.backdrops[0] && data.images.backdrops[0].file_path);
            if (heroBg) {
                heroBg.style.backgroundImage = 'none';
                if (backdropPath) {
                    const bgUrl = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
                    const bgPreload = new Image();
                    bgPreload.onload = () => {
                        if (currentMediaData && currentMediaData.id === renderId) {
                            heroBg.style.backgroundImage = `url("${bgUrl}")`;
                        }
                    };
                    bgPreload.src = bgUrl;
                }
            } else if (heroCard) {
                if (backdropPath) {
                    const bgUrl = `https://image.tmdb.org/t/p/w1280${backdropPath}`;
                    const bgPreload = new Image();
                    bgPreload.onload = () => {
                        if (currentMediaData && currentMediaData.id === renderId) {
                            heroCard.style.backgroundImage = `url("${bgUrl}")`;
                        }
                    };
                    bgPreload.src = bgUrl;
                }
            }

            const posterImg = modalWrap.querySelector('#sfx-media-poster-img');
            if (posterImg) {
                posterImg.removeAttribute('src');
                posterImg.style.display = 'none';
                if (data.poster_path) {
                    const posterUrl = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
                    const pPreload = new Image();
                    pPreload.onload = () => {
                        if (currentMediaData && currentMediaData.id === renderId) {
                            posterImg.src = posterUrl;
                            posterImg.alt = title;
                            posterImg.style.display = 'block';
                        }
                    };
                    pPreload.src = posterUrl;
                }
            }

            // Hero Title & Year
            const heroTitleEl = modalWrap.querySelector('#sfx-media-hero-title');
            const heroYearEl = modalWrap.querySelector('#sfx-media-hero-year');
            if (heroTitleEl) {
                heroTitleEl.textContent = title;
                heroTitleEl.title = title;
            }
            if (heroYearEl) {
                heroYearEl.textContent = year ? `(${year})` : '';
            }

            // Single-line Metadata: Genres · Episodes/Runtime · Status
            const metaLineEl = modalWrap.querySelector('#sfx-media-meta-line');
            if (metaLineEl) {
                const metaParts = [];
                if (data.genres && Array.isArray(data.genres) && data.genres.length > 0) {
                    metaParts.push(data.genres.map(g => g.name).join(', '));
                }
                if (data.number_of_episodes) {
                    metaParts.push(`${data.number_of_episodes} eps`);
                } else if (data.runtime) {
                    const hrs = Math.floor(data.runtime / 60);
                    const mins = data.runtime % 60;
                    metaParts.push(hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`);
                }
                if (data.status) {
                    metaParts.push(data.status);
                }
                metaLineEl.innerHTML = metaParts.map(p => `<span>${escapeHtml(p)}</span>`).join('<span class="sfx-meta-bullet">·</span>');
            }

            // 2. TMDB User Score Circular Progress Ring
            const userScoreBar = modalWrap.querySelector('#sfx-user-score-bar');
            const userScoreVal = modalWrap.querySelector('#sfx-user-score-val');
            const tmdbCard = modalWrap.querySelector('#sfx-tmdb-tmdb-card');
            if (tmdbCard) {
                tmdbCard.href = `https://www.themoviedb.org/${data._mediaType || 'tv'}/${data.id}`;
            }
            if (typeof data.vote_average === 'number' && data.vote_average > 0) {
                const scorePercent = Math.round(data.vote_average * 10);
                if (userScoreVal) {
                    userScoreVal.innerHTML = `${scorePercent}<span class="sfx-score-pct">%</span>`;
                }
                if (userScoreBar) {
                    userScoreBar.setAttribute('stroke-dasharray', `${scorePercent}, 100`);
                    let strokeColor = '#db2360';
                    if (scorePercent >= 70) {
                        strokeColor = '#21d07a';
                    } else if (scorePercent >= 40) {
                        strokeColor = '#d2d531';
                    }
                    userScoreBar.style.stroke = strokeColor;
                }
            } else {
                if (userScoreVal) userScoreVal.textContent = 'NR';
                if (userScoreBar) {
                    userScoreBar.setAttribute('stroke-dasharray', '0, 100');
                    userScoreBar.style.stroke = 'rgba(255, 255, 255, 0.2)';
                }
            }

            // 3. Play Trailer Button (opens Trailer Popup Modal) & MDL Prefetch
            const trailer = findBestTrailer(data.videos && data.videos.results);
            const playTrailerBtn = modalWrap.querySelector('#sfx-play-trailer-btn');
            if (playTrailerBtn) {
                if (trailer && trailer.key) {
                    playTrailerBtn.style.display = 'inline-flex';
                    playTrailerBtn.onclick = (e) => {
                        e.stopPropagation();
                        openTmdbTrailerModal(trailer.key, trailer.name || title);
                    };
                } else {
                    playTrailerBtn.style.display = 'none';
                }
            }

            // Background prefetch MyDramaList direct link for instant copy / visit
            const mdlPrefetchTitle = data.name || data.title || title;
            let mdlPrefetchYear = (data.first_air_date || data.release_date || '').slice(0, 4);
            if (!mdlPrefetchYear && mdlPrefetchTitle) {
                const ym = String(mdlPrefetchTitle).match(/\b(19\d\d|20\d\d)\b/);
                if (ym) mdlPrefetchYear = ym[1];
            }
            resolveMdlDrama(mdlPrefetchTitle, mdlPrefetchYear, data.id, data).catch(() => {});

            // Update MyDramaList menu items based on whether this is a multi-season TV show
            const heroMdlCopy = modalWrap.querySelector('#sfx-hero-mdl-copy');
            const heroMdlVisit = modalWrap.querySelector('#sfx-hero-mdl-visit');
            const isMultiSeason = isMultiSeasonTv(data);
            if (heroMdlCopy) {
                if (isMultiSeason) {
                    heroMdlCopy.classList.add('sfx-disabled');
                    heroMdlCopy.style.opacity = '0.45';
                    heroMdlCopy.title = 'Copy disabled for multi-season TV shows (separate MDL entries per season)';
                } else {
                    heroMdlCopy.classList.remove('sfx-disabled');
                    heroMdlCopy.style.opacity = '1';
                    heroMdlCopy.title = 'Copy drama link';
                }
            }
            if (heroMdlVisit) {
                if (isMultiSeason) {
                    heroMdlVisit.title = 'Search on MyDramaList in popup';
                } else {
                    heroMdlVisit.title = 'Visit site in popup';
                }
            }

            // 4. Tagline
            const taglineEl = modalWrap.querySelector('#sfx-media-tagline');
            if (taglineEl) {
                if (data.tagline && data.tagline.trim()) {
                    taglineEl.textContent = `"${data.tagline.trim()}"`;
                    taglineEl.style.display = 'block';
                } else {
                    taglineEl.style.display = 'none';
                }
            }

            // 5. Overview & Full Synopsis Popup Modal
            const snippetEl = modalWrap.querySelector('#sfx-media-overview-snippet');
            const moreBtn = modalWrap.querySelector('#sfx-media-overview-more');
            const overviewText = data.overview ? data.overview.trim() : 'No overview available for this title.';
            const OVERVIEW_LIMIT = 240;

            if (overviewText.length > OVERVIEW_LIMIT) {
                const truncated = overviewText.slice(0, OVERVIEW_LIMIT).replace(/\s+\S*$/, '') + '...';
                if (snippetEl) snippetEl.textContent = truncated;
                if (moreBtn) {
                    moreBtn.style.display = 'inline';
                    moreBtn.onclick = (e) => {
                        e.stopPropagation();
                        const synopsisModal = modalWrap.querySelector('#sfx-tmdb-synopsis-modal');
                        const synopsisTitle = modalWrap.querySelector('#sfx-tmdb-synopsis-title');
                        const synopsisContent = modalWrap.querySelector('#sfx-tmdb-synopsis-content');
                        if (synopsisTitle) synopsisTitle.textContent = title;
                        if (synopsisContent) synopsisContent.textContent = overviewText;
                        if (synopsisModal) synopsisModal.classList.add('sfx-open');
                    };
                }
            } else {
                if (snippetEl) snippetEl.textContent = overviewText;
                if (moreBtn) moreBtn.style.display = 'none';
            }

            // 6. Creator / Director
            const crewEl = modalWrap.querySelector('#sfx-media-crew');
            if (crewEl) {
                let crewHtml = '';
                if (data.created_by && Array.isArray(data.created_by) && data.created_by.length > 0) {
                    crewHtml = data.created_by.map(c => `
                        <div class="sfx-crew-member">
                            <span class="sfx-crew-name">${escapeHtml(c.name)}</span>
                            <span class="sfx-crew-job">Creator</span>
                        </div>
                    `).join('');
                } else if (data.credits && data.credits.crew && Array.isArray(data.credits.crew) && data.credits.crew.length > 0) {
                    const directors = data.credits.crew.filter(c => c.job === 'Director');
                    if (directors.length > 0) {
                        crewHtml = directors.map(d => `
                            <div class="sfx-crew-member">
                                <span class="sfx-crew-name">${escapeHtml(d.name)}</span>
                                <span class="sfx-crew-job">Director</span>
                            </div>
                        `).join('');
                    }
                }
                crewEl.innerHTML = crewHtml;
                crewEl.style.display = crewHtml ? 'flex' : 'none';
            }

            // 7. Cast & Crew (Top Cast with 80px circular avatars & initials fallback)
            const castSection = modalWrap.querySelector('#sfx-tmdb-cast-section');
            const castListEl = modalWrap.querySelector('#sfx-tmdb-cast-list');
            const cast = (data.credits && data.credits.cast) ? data.credits.cast : [];
            if (cast.length > 0) {
                const topCast = cast.slice(0, 18);
                castListEl.innerHTML = topCast.map(c => {
                    const photoUrl = c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '';
                    const initials = getInitials(c.name);
                    const initialsBg = getInitialsBg(c.name);
                    const avatarTag = photoUrl
                        ? `<img class="sfx-tmdb-cast-photo" src="${photoUrl}" alt="${escapeHtml(c.name)}" loading="lazy" />`
                        : `<div class="sfx-tmdb-cast-photo" style="background: ${initialsBg};">${initials}</div>`;
                    return `
                        <div class="sfx-tmdb-cast-item" data-person-id="${c.id}" data-person-name="${escapeHtml(c.name)}" title="${escapeHtml(c.name)} as ${escapeHtml(c.character || 'Cast')}">
                            ${avatarTag}
                            <span class="sfx-tmdb-cast-name">${escapeHtml(c.name)}</span>
                            <span class="sfx-tmdb-cast-char">${escapeHtml(c.character || '')}</span>
                        </div>
                    `;
                }).join('');

                castListEl.querySelectorAll('.sfx-tmdb-cast-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const personId = item.getAttribute('data-person-id');
                        const personName = item.getAttribute('data-person-name');
                        loadAndRenderPersonView(personId, personName);
                    });
                });

                castSection.style.display = 'block';
            } else {
                castSection.style.display = 'none';
            }

            // 7b. Seasons Section (Under Cast & Crew, only if drama has more than Season 1)
            const seasonsSection = modalWrap.querySelector('#sfx-tmdb-seasons-section');
            const seasonsListEl = modalWrap.querySelector('#sfx-tmdb-seasons-list');
            const seasonsCountEl = modalWrap.querySelector('#sfx-season-count');
            const regularSeasons = (data.seasons && Array.isArray(data.seasons))
                ? data.seasons.filter(s => s && s.season_number > 0)
                : [];

            if (isTv && regularSeasons.length > 1) {
                if (seasonsCountEl) seasonsCountEl.textContent = `(${regularSeasons.length} Seasons)`;
                seasonsListEl.innerHTML = regularSeasons.map(s => {
                    const posterUrl = s.poster_path ? `https://image.tmdb.org/t/p/w342${s.poster_path}` : (data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : '');
                    const seasonYear = s.air_date ? s.air_date.slice(0, 4) : '';
                    const epText = s.episode_count ? `${s.episode_count} eps` : '';
                    const metaStr = [seasonYear, epText].filter(Boolean).join(' · ');
                    const posterInner = posterUrl
                        ? `<img class="sfx-season-poster" src="${posterUrl}" alt="${escapeHtml(s.name || `Season ${s.season_number}`)}" loading="lazy" />`
                        : `<div class="sfx-season-poster-fallback">📺</div>`;
                    const badge = (typeof s.vote_average === 'number' && s.vote_average > 0)
                        ? `<div class="sfx-season-badge">★ ${s.vote_average.toFixed(1)}</div>`
                        : '';
                    return `
                        <div class="sfx-season-card" title="${escapeHtml(s.name || `Season ${s.season_number}`)}${s.overview ? `\n\n${escapeHtml(s.overview)}` : ''}">
                            <div class="sfx-season-poster-wrap">
                                ${posterInner}
                                ${badge}
                            </div>
                            <span class="sfx-season-title">${escapeHtml(s.name || `Season ${s.season_number}`)}</span>
                            <span class="sfx-season-meta">${escapeHtml(metaStr)}</span>
                        </div>
                    `;
                }).join('');
                seasonsSection.style.display = 'block';
            } else {
                if (seasonsSection) seasonsSection.style.display = 'none';
            }

            // 8. Images Gallery (Moved UNDER Cast / Seasons)
            const gallerySection = modalWrap.querySelector('#sfx-tmdb-images-section');
            const galleryEl = modalWrap.querySelector('#sfx-tmdb-gallery');
            const backdrops = (data.images && data.images.backdrops) ? data.images.backdrops : [];
            const imagesToShow = [];
            backdrops.forEach(b => {
                if (b.file_path && imagesToShow.length < 15) {
                    imagesToShow.push(`https://image.tmdb.org/t/p/w780${b.file_path}`);
                }
            });
            if (imagesToShow.length === 0 && data.backdrop_path) {
                imagesToShow.push(`https://image.tmdb.org/t/p/w780${data.backdrop_path}`);
            }

            if (imagesToShow.length > 0) {
                galleryEl.innerHTML = imagesToShow.map(url => `
                    <img class="sfx-tmdb-gallery-item" src="${url}" alt="${escapeHtml(title)}" loading="lazy" />
                `).join('');
                gallerySection.style.display = 'block';
            } else {
                gallerySection.style.display = 'none';
            }

            // 8b. Recommendations / Suggestions Section (After Image Section, Korean only)
            const recsSection = modalWrap.querySelector('#sfx-tmdb-recommendations-section');
            const recsListEl = modalWrap.querySelector('#sfx-tmdb-recs-list');
            const recsCountEl = modalWrap.querySelector('#sfx-rec-count');

            const rawRecs = (data.recommendations && data.recommendations.results) || [];
            const rawSimilar = (data.similar && data.similar.results) || [];
            const combinedRecs = [...rawRecs, ...rawSimilar];
            const seenRecIds = new Set();
            const filteredRecs = [];

            for (const item of combinedRecs) {
                if (!item || !item.id || seenRecIds.has(item.id) || item.id === data.id) continue;
                seenRecIds.add(item.id);
                const lang = item.original_language;
                // Suggestions MUST be Korean ('ko') only - no English or other language contents
                if (lang === 'ko') {
                    if (item.poster_path) {
                        filteredRecs.push(item);
                    }
                }
            }

            if (filteredRecs.length > 0) {
                const displayRecs = filteredRecs.slice(0, 20);
                if (recsCountEl) recsCountEl.textContent = `(${displayRecs.length})`;
                recsListEl.innerHTML = displayRecs.map(r => {
                    const posterUrl = `https://image.tmdb.org/t/p/w342${r.poster_path}`;
                    const recTitle = r.name || r.title || 'Untitled';
                    const recDate = r.first_air_date || r.release_date || '';
                    const recYear = recDate ? recDate.slice(0, 4) : '';
                    const langLabel = 'KR';
                    const scoreBadge = (typeof r.vote_average === 'number' && r.vote_average > 0)
                        ? `<div class="sfx-rec-score-badge">${Math.round(r.vote_average * 10)}%</div>`
                        : '';
                    const recMediaType = r.media_type || (r.first_air_date ? 'tv' : 'movie');

                    return `
                        <div class="sfx-rec-card" data-rec-id="${r.id}" data-media-type="${recMediaType}" title="${escapeHtml(recTitle)}${recYear ? ` (${recYear})` : ''}">
                            <div class="sfx-rec-poster-wrap">
                                <img class="sfx-rec-poster" src="${posterUrl}" alt="${escapeHtml(recTitle)}" loading="lazy" />
                                <div class="sfx-rec-lang-badge">${langLabel}</div>
                                ${scoreBadge}
                            </div>
                            <span class="sfx-rec-title">${escapeHtml(recTitle)}</span>
                            <span class="sfx-rec-meta">${escapeHtml(recYear)}</span>
                        </div>
                    `;
                }).join('');

                recsListEl.querySelectorAll('.sfx-rec-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const recId = card.getAttribute('data-rec-id');
                        const recType = card.getAttribute('data-media-type');
                        loadMediaById(recId, recType);
                    });
                });

                recsSection.style.display = 'block';
            } else {
                if (recsSection) recsSection.style.display = 'none';
            }

            // 9. Download Section:
            // For drama: do not show dramaday and ext.to (only show rentry.co/sin0flix)
            // For movies: show only dramaday and ext.to with imdb_id browse link (do not show sinflix)
            const imdbId = (data.external_ids && data.external_ids.imdb_id) || data.imdb_id || null;
            const downloadSection = modalWrap.querySelector('#sfx-tmdb-download-section');
            if (downloadSection) {
                downloadSection.style.display = 'block';
                const dlSinflix = modalWrap.querySelector('#sfx-tmdb-dl-sinflix');
                const dlDramaday = modalWrap.querySelector('#sfx-tmdb-dl-dramaday');
                const dlExtto = modalWrap.querySelector('#sfx-tmdb-dl-extto');

                if (isMovie) {
                    // Movies: show only other 2 options (dramaday and ext.to), do not show sinflix
                    if (dlSinflix) dlSinflix.style.display = 'none';
                    if (dlDramaday) {
                        dlDramaday.style.display = 'flex';
                        dlDramaday.href = `https://dramaday.me/?s=${encodeURIComponent(title)}`;
                    }
                    if (dlExtto) {
                        dlExtto.style.display = 'flex';
                        if (imdbId) {
                            dlExtto.href = `https://ext.to/browse/?imdb_id=${encodeURIComponent(imdbId)}`;
                        } else {
                            dlExtto.href = `https://ext.to/search/?q=${encodeURIComponent(title)}`;
                        }
                    }
                } else {
                    // Drama: do not show dramaday and ext.to, show only rentry.co/sin0flix
                    if (dlSinflix) dlSinflix.style.display = 'flex';
                    if (dlDramaday) dlDramaday.style.display = 'none';
                    if (dlExtto) dlExtto.style.display = 'none';
                }
            }

            // 10. Async Fetch RT and IMDb Ratings (Borderless Badges)
            const rtScoreEl = modalWrap.querySelector('#sfx-tmdb-rt-score');
            const rtSubvalEl = modalWrap.querySelector('#sfx-tmdb-rt-subval');
            const rtCard = modalWrap.querySelector('#sfx-tmdb-rt-card');
            const imdbScoreEl = modalWrap.querySelector('#sfx-tmdb-imdb-score');
            const imdbCard = modalWrap.querySelector('#sfx-tmdb-imdb-card');
            const searchCleanTitle = data._cleanName || title;

            // Extra metadata for RT matching
            const altTitles = [];
            if (data.alternative_titles) {
                const list = data.alternative_titles.results || data.alternative_titles.titles || [];
                list.forEach(item => {
                    if (item.title && !altTitles.includes(item.title)) {
                        altTitles.push(item.title);
                    }
                });
            }
            const topCastNames = (data.credits && data.credits.cast)
                ? data.credits.cast.slice(0, 5).map(c => c.name)
                : [];
            const extraRtData = {
                originalTitle: data.original_name || data.original_title || '',
                cleanName: searchCleanTitle,
                cast: topCastNames,
                altTitles: altTitles
            };

            if (rtCard) rtCard.href = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(searchCleanTitle)}`;
            if (imdbCard) {
                if (imdbId) {
                    imdbCard.href = `https://www.imdb.com/title/${imdbId}/`;
                } else {
                    imdbCard.href = `https://www.imdb.com/find?q=${encodeURIComponent(searchCleanTitle)}`;
                }
            }

            if (rtScoreEl) rtScoreEl.textContent = '--';
            if (rtSubvalEl) rtSubvalEl.style.display = 'none';
            if (imdbScoreEl) imdbScoreEl.textContent = '--';

            fetchRottenTomatoesRating(searchCleanTitle, year, isTv, imdbId, extraRtData).then(rtInfo => {
                if (rtInfo && (rtInfo.tomatometer || rtInfo.audience)) {
                    if (rtInfo.tomatometer) {
                        if (rtScoreEl) rtScoreEl.textContent = rtInfo.tomatometer;
                    } else if (rtInfo.audience) {
                        if (rtScoreEl) rtScoreEl.textContent = rtInfo.audience;
                    }
                    if (rtInfo.audience && rtInfo.tomatometer) {
                        if (rtSubvalEl) {
                            rtSubvalEl.textContent = `🍿 ${rtInfo.audience}`;
                            rtSubvalEl.style.display = 'block';
                        }
                    }
                    if (rtInfo.url && rtCard) {
                        rtCard.href = rtInfo.url;
                    }
                } else {
                    if (rtScoreEl) rtScoreEl.textContent = 'N/A';
                    if (rtInfo && rtInfo.url && rtCard) {
                        rtCard.href = rtInfo.url;
                    }
                }
            }).catch(() => {
                if (rtScoreEl) rtScoreEl.textContent = 'N/A';
            });

            if (imdbId) {
                fetchImdbRating(imdbId).then(imdbInfo => {
                    if (imdbInfo && imdbInfo.rating && imdbInfo.rating !== 'N/A') {
                        if (imdbScoreEl) imdbScoreEl.textContent = imdbInfo.rating;
                    } else {
                        if (imdbScoreEl) imdbScoreEl.textContent = 'N/A';
                    }
                    if (imdbInfo && imdbInfo.url && imdbCard) {
                        imdbCard.href = imdbInfo.url;
                    }
                }).catch(() => {
                    if (imdbScoreEl) imdbScoreEl.textContent = 'N/A';
                });
            } else {
                if (imdbScoreEl) imdbScoreEl.textContent = 'N/A';
            }

            resetTmdbModalScroll(modalWrap);
        }

        async function openTmdbModal(dramaName) {
            const modalWrap = createTmdbModal();
            activeDramaName = dramaName;
            activeTmdbCopyText = dramaName;

            // Reset navigation stack & view states
            tmdbNavStack.length = 0;
            currentMediaData = null;
            currentPersonData = null;
            activeTmdbIsPerson = false;
            updateTmdbBackBtn();

            // Clear previous media state (backdrops, posters, header thumbs, texts) immediately
            resetMediaState(modalWrap);

            // Lock body & html scroll
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            // Keydown listener
            window.addEventListener('keydown', onTmdbKeydown);

            // Reset UI to loading state
            const titleTextEl = modalWrap.querySelector('.sfx-tmdb-title-text');
            const yearEl = modalWrap.querySelector('#sfx-tmdb-year');
            const loadingEl = modalWrap.querySelector('#sfx-tmdb-loading');
            const loadingTextEl = modalWrap.querySelector('#sfx-tmdb-loading-text');
            const contentEl = modalWrap.querySelector('#sfx-tmdb-content');
            const personViewEl = modalWrap.querySelector('#sfx-tmdb-person-view');
            const emptyEl = modalWrap.querySelector('#sfx-tmdb-empty');
            const credsEmptyEl = modalWrap.querySelector('#sfx-tmdb-creds-empty');

            titleTextEl.textContent = dramaName;
            titleTextEl.title = dramaName;
            yearEl.textContent = '';
            loadingTextEl.textContent = 'Fetching TheMovieDB info...';
            loadingEl.style.display = 'flex';
            contentEl.style.display = 'none';
            personViewEl.style.display = 'none';
            emptyEl.style.display = 'none';
            if (credsEmptyEl) credsEmptyEl.style.display = 'none';

            stopTmdbMedia();

            resetTmdbModalScroll(modalWrap);

            // Open smoothly
            modalWrap.classList.remove('sfx-closing');
            modalWrap.classList.add('sfx-open');

            const { readToken, apiKey } = getTmdbCredentials();
            if (!readToken && !apiKey) {
                loadingEl.style.display = 'none';
                modalWrap.classList.remove('sfx-loading');
                if (credsEmptyEl) credsEmptyEl.style.display = 'flex';
                return;
            }

            try {
                const data = await fetchTmdbDetails(dramaName);
                if (!data) {
                    loadingEl.style.display = 'none';
                    modalWrap.classList.remove('sfx-loading');
                    emptyEl.style.display = 'flex';
                    return;
                }

                renderMediaView(data, false);

            } catch (err) {
                console.error('TheMovieDB load error:', err);
                loadingEl.style.display = 'none';
                modalWrap.classList.remove('sfx-loading');
                emptyEl.style.display = 'flex';
            }
        }

        // Click handler to open the options popover or TheMovieDB modal when title is clicked
        document.addEventListener('click', (e) => {
            const titleEl = e.target.closest('.sfx-drama-title');
            if (titleEl) {
                e.stopPropagation();
                activeDramaName = titleEl.getAttribute('data-name');
                activeDramaElement = titleEl;

                const tmdbEnabled = getSetting('sfx-tmdb-enabled', false);
                if (tmdbEnabled) {
                    openTmdbModal(activeDramaName);
                    return;
                }

                const titleLabel = popover.querySelector('.sfx-popover-title');
                if (titleLabel) {
                    titleLabel.textContent = activeDramaName;
                    titleLabel.title = activeDramaName;
                }

                popover.style.display = 'flex';
                setTimeout(() => {
                    popover.classList.add('sfx-show');
                }, 10);

                const rect = titleEl.getBoundingClientRect();
                const menuWidth = 224;
                const menuHeight = 68;
                let left = rect.left + window.scrollX + (rect.width / 2) - (menuWidth / 2);
                let top = rect.bottom + window.scrollY + 6;

                const viewportWidth = window.innerWidth;
                if (left < 10) left = 10;
                if (left + menuWidth > viewportWidth - 10) left = viewportWidth - menuWidth - 10;

                if (rect.bottom + menuHeight > window.innerHeight - 10) {
                    top = rect.top + window.scrollY - menuHeight - 6;
                }

                popover.style.left = `${left}px`;
                popover.style.top = `${top}px`;
            } else {
                if (popover.classList.contains('sfx-show') && !e.target.closest('#sfx-popover-menu')) {
                    hidePopover();
                }
            }
        });

        // Create and append the back-to-top button
        const topBtn = document.createElement('button');
        topBtn.id = 'sfx-back-to-top';
        topBtn.title = 'Back to Top';
        topBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M18 15l-6-6-6 6"/></svg>`;
        document.body.appendChild(topBtn);

        // Bind click event
        topBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Trigger initial visibility
        updateBackToTopVisibility();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();