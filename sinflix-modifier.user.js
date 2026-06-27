// ==UserScript==
// @name         Sinflix Modifier
// @namespace    https://greasyfork.org/en/users/1490967-asurpbs
// @version      26.06.27.19
// @description  Enhances SinFlix pages with Google & MyDramaList search icons, BuzzHeavier ID auto-linking, back-to-top button, inline search, customizable section ordering, and a SinFlix chat button. On pst.moe: clickable links and copy-all-links per resolution. On mega.nz file/folder pages: Dynamic Island pill that opens Fetchrr.io with the link pre-filled. On fetchrr.io: auto-fills the mega link and clicks Parse.
// @license      MIT
// @author       asurpbs
// @match        https://rentry.co/sin-flix
// @match        https://text.is/Sinflix
// @match        https://pst.moe/paste/*
// @match        https://*.pst.moe/paste/*
// @match        https://buzzheavier.com/*
// @match        https://*.buzzheavier.com/*
// @match        https://mega.nz/*
// @match        https://*.mega.nz/*
// @match        https://fetchrr.io/*
// @match        https://*.fetchrr.io/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @run-at       document-start
// @updateURL https://raw.githubusercontent.com/mthlpbs/sinflix-modifier/refs/heads/main/sinflix-modifier.user.js
// @downloadURL https://raw.githubusercontent.com/mthlpbs/sinflix-modifier/refs/heads/main/sinflix-modifier.user.js
// @copyright    2026, mthlpbs (https://greasyfork.org/en/users/1490967-asurpbs)
// ==/UserScript==

(function() {
    'use strict';

    // --- Configuration ---
    const config = {
        showGoogleCircle: GM_getValue('showGoogleCircle', true),
        showMdlCircle: GM_getValue('showMdlCircle', true),
        convertBuzzheavierLinks: GM_getValue('convertBuzzheavierLinks', true),
        showBackToTopButton: GM_getValue('showBackToTopButton', true),
        // NEW: Add setting for link opening style, defaulting to 'popup'
        linkOpenStyle: GM_getValue('linkOpenStyle', 'popup'),
        // NEW: Add setting for moving Currently Airing to top
        moveCurrentlyAiringToTop: GM_getValue('moveCurrentlyAiringToTop', false),
        // NEW: Add setting for SinFlix chat box button
        showChatBoxButton: GM_getValue('showChatBoxButton', true),
        // NEW: Add setting for chat box opening style, defaulting to 'tab'
        chatBoxOpenStyle: GM_getValue('chatBoxOpenStyle', 'popup'),
        // NEW: Add setting for download link opening style, defaulting to 'tab'
        downloadLinkOpenStyle: GM_getValue('downloadLinkOpenStyle', 'tab'),
        // NEW: pst.moe enhancements
        pstMoeEnhancements: GM_getValue('pstMoeEnhancements', true),
        // NEW: Google search keyword suffix
        googleSearchSuffix: GM_getValue('googleSearchSuffix', 'TV Series'),
        // NEW: Buzzheavier enhancements
        buzzheavierEnhancements: GM_getValue('buzzheavierEnhancements', true),
        buzzSplitQuality: GM_getValue('buzzSplitQuality', true),
        buzzDirectDownload: GM_getValue('buzzDirectDownload', true),
        buzzCopyLinks: GM_getValue('buzzCopyLinks', true),
        // Mega.nz → Fetchrr.io pill
        megaFetchrr: GM_getValue('megaFetchrr', true),
        megaFetchrrOpenStyle: GM_getValue('megaFetchrrOpenStyle', 'tab'),
        // NEW: Top search bar with Dynamic Island animation
        showTopSearchBar: GM_getValue('showTopSearchBar', true)
    };

    // --- One-time migration: reset stale BuzzHeavier settings stored as false
    // from an older version where these defaulted to false. Runs once per browser.
    const BUZZ_SETTINGS_VERSION = '3'; // bump this whenever defaults change
    if (GM_getValue('buzzSettingsVersion', '') !== BUZZ_SETTINGS_VERSION) {
        GM_setValue('buzzheavierEnhancements', true);
        GM_setValue('buzzSplitQuality', true);
        GM_setValue('buzzDirectDownload', true);
        GM_setValue('buzzCopyLinks', true);
        GM_setValue('buzzSettingsVersion', BUZZ_SETTINGS_VERSION);
        // Update live config so this page benefits immediately
        config.buzzheavierEnhancements = true;
        config.buzzSplitQuality = true;
        config.buzzDirectDownload = true;
        config.buzzCopyLinks = true;
    }

    // --- Style Definitions ---
    GM_addStyle(`
        /* --- Buzzheavier Server Capsules --- */
        @keyframes bh-spin {
            to { transform: rotate(360deg); }
        }
        .bh-capsule-wrap {
            position: absolute;
            right: 6px;
            top: 50%;
            transform: translateY(-50%);
            display: inline-flex;
            align-items: center;
            gap: 5px;
            flex-shrink: 0;
            z-index: 5;
        }
        .bh-capsule {
            display: inline-flex;
            align-items: center;
            gap: 0;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            height: 20px;
        }
        .bh-capsule-s1 {
            border: 1px solid rgba(66, 133, 244, 0.45);
            background: rgba(66, 133, 244, 0.05);
        }
        .bh-capsule-s2 {
            border: 1px solid rgba(52, 168, 83, 0.45);
            background: rgba(52, 168, 83, 0.05);
        }
        /* --- Buzzheavier Legend --- */
        .bh-legend-fixed {
            position: absolute;
            top: 15px;
            right: 20px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            font-size: 12px;
            font-weight: normal;
            color: #9aa0a6;
            user-select: none;
            z-index: 1000;
        }
        @media (max-width: 640px) {
            .bh-legend-fixed {
                position: relative;
                top: 0;
                right: 0;
                margin: 10px auto;
                justify-content: center;
                width: fit-content;
            }
        }
        .bh-cap-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 20px;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            color: rgba(200, 200, 200, 0.7);
            transition: background 0.15s ease, color 0.15s ease;
            flex-shrink: 0;
        }
        .bh-cap-btn + .bh-cap-btn {
            border-left: 1px solid rgba(255,255,255,0.08);
        }
        .bh-cap-btn svg {
            width: 11px;
            height: 11px;
            fill: currentColor;
            display: block;
            flex-shrink: 0;
        }
        .bh-capsule-s1 .bh-cap-btn:hover {
            background: rgba(66, 133, 244, 0.25);
            color: #7eb8ff;
        }
        .bh-capsule-s2 .bh-cap-btn:hover {
            background: rgba(52, 168, 83, 0.25);
            color: #6dd98a;
        }
        .bh-cap-btn.bh-loading svg {
            animation: bh-spin 0.7s linear infinite;
            opacity: 0.6;
        }
        .bh-cap-btn.bh-copied {
            color: #4ade80 !important;
        }

        /* --- pst.moe Enhancements --- */
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

        /* --- Mega Fetchrr Dot --- */
        .sinflix-mega-fetchrr-dot {
            display: inline-block;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #00c261;
            cursor: pointer;
            vertical-align: middle;
            margin-left: 5px;
            opacity: 0.55;
            transition: opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
            flex-shrink: 0;
        }
        .sinflix-mega-fetchrr-dot:hover {
            opacity: 1;
            transform: scale(1.3);
            box-shadow: 0 0 6px rgba(0, 194, 97, 0.7);
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

        /* --- Prevent section flash on load --- */
        .entry-text article h4 {
            opacity: 0;
            transition: opacity 0.1s ease-in-out;
        }
        .entry-text article h4.sinflix-visible {
            opacity: 1;
        }
        .entry-text article.sinflix-processed h4 {
            opacity: 1;
        }

        /* --- Rentry content box rounded corners --- */
        .col-12.long-words {
            border-radius: 12px;
            overflow: hidden;
        }
        .entry-text {
            border-radius: 12px;
            overflow: hidden;
        }

        /* --- Settings Button --- */
        /* Settings button is inside the search capsule when capsule is ON */
        #kdrama-settings-button {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            z-index: 10001;
            background: rgba(50, 50, 50, 0.4);
            backdrop-filter: blur(6px);
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.3s ease;
            will-change: transform;
            transform: translateZ(0);
        }
        #kdrama-settings-button:hover {
            background: rgba(80, 80, 80, 0.6);
        }

        /* --- Modal Styles --- */
        #kdrama-settings-modal {
            display: none;
            position: fixed;
            z-index: 10002;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            justify-content: center;
            align-items: center;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            opacity: 0;
            transition: opacity 0.2s ease-out;
            overscroll-behavior: contain;
            overflow: hidden;
        }
        #kdrama-settings-modal.show {
            opacity: 1;
        }
        .kdrama-modal-content {
            background: #202124;
            color: #e8eaed;
            padding: 0;
            border-radius: 8px;
            width: 95%;
            max-width: 520px;
            max-height: 90vh;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            border: 1px solid #3c4043;
            position: relative;
            overflow: hidden;
            transform: scale(0.9);
            transition: transform 0.2s ease-out;
        }
        #kdrama-settings-modal.show .kdrama-modal-content {
            transform: scale(1);
        }

        .kdrama-modal-header {
            background: #2d2e30;
            color: #e8eaed;
            padding: 16px 20px;
            border-radius: 8px 8px 0 0;
            position: relative;
            border-bottom: 1px solid #3c4043;
        }
        .kdrama-modal-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #e8eaed;
        }
        .kdrama-modal-header .header-icon {
            width: 20px;
            height: 20px;
        }
        #kdrama-settings-close {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            width: 28px;
            height: 28px;
            border-radius: 4px;
            background: transparent;
            border: none;
            color: #9aa0a6;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, color 0.2s ease;
        }
        #kdrama-settings-close:hover {
            background: #3c4043;
            color: #e8eaed;
        }

        .kdrama-modal-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
            background: #202124;
            overscroll-behavior: contain;
        }
        .kdrama-modal-body::-webkit-scrollbar {
            width: 8px;
        }
        .kdrama-modal-body::-webkit-scrollbar-track {
            background: #2d2e30;
            border-radius: 4px;
        }
        .kdrama-modal-body::-webkit-scrollbar-thumb {
            background: #5f6368;
            border-radius: 4px;
        }
        .kdrama-modal-body::-webkit-scrollbar-thumb:hover {
            background: #80868b;
        }

        /* Settings Sections */
        .kdrama-settings-section {
            margin-bottom: 32px;
        }
        .kdrama-settings-section:last-child {
            margin-bottom: 0;
        }
        .kdrama-section-title {
            font-size: 16px;
            font-weight: 500;
            color: #9aa0a6;
            margin: 0 0 12px 0;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .kdrama-section-title .section-icon {
            width: 16px;
            height: 16px;
        }

        .kdrama-toggle-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #2d2e30;
            border-radius: 6px;
            margin-bottom: 8px;
            border: 1px solid #3c4043;
            transition: all 0.2s ease;
        }
        .kdrama-toggle-item:last-child {
            margin-bottom: 0;
        }
        .kdrama-toggle-item:hover {
            background: #35363a;
            border-color: #5f6368;
        }

        .kdrama-toggle-info {
            flex: 1;
        }
        .kdrama-toggle-label {
            font-size: 14px;
            font-weight: 500;
            margin: 0 0 2px 0;
            color: #e8eaed;
        }
        .kdrama-toggle-description {
            font-size: 12px;
            color: #9aa0a6;
            margin: 0;
            line-height: 1.3;
        }

        /* Custom Toggle Switch */
        .kdrama-toggle-switch {
            position: relative;
            width: 50px;
            height: 26px;
            margin-left: 16px;
        }
        .kdrama-toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .kdrama-toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #5f6368;
            transition: 0.3s;
            border-radius: 26px;
        }
        .kdrama-toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 4px;
            bottom: 4px;
            background-color: #ffffff;
            transition: 0.3s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .kdrama-toggle-switch input:checked + .kdrama-toggle-slider {
            background: #1a73e8;
        }
        .kdrama-toggle-switch input:checked + .kdrama-toggle-slider:before {
            transform: translateX(24px);
        }

        .kdrama-text-input {
            width: 100%;
            background: #3c4043;
            border: 1px solid #5f6368;
            color: #e8eaed;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
            transition: all 0.2s ease;
            font-family: inherit;
        }
        .kdrama-text-input:focus {
            outline: none;
            border-color: #1a73e8;
            background: #202124;
        }

        .kdrama-radio-group {
            background: #2d2e30;
            border-radius: 6px;
            padding: 16px;
            border: 1px solid #3c4043;
            margin-bottom: 16px;
        }
        .kdrama-radio-group-title {
            font-size: 14px;
            font-weight: 500;
            color: #e8eaed;
            margin: 0 0 12px 0;
        }
        .kdrama-radio-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .kdrama-radio-option {
            position: relative;
        }
        .kdrama-radio-option input[type="radio"] {
            opacity: 0;
            position: absolute;
            width: 100%;
            height: 100%;
            margin: 0;
            cursor: pointer;
        }
        .kdrama-radio-option-label {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            background: #3c4043;
            border: 1px solid #5f6368;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 13px;
            font-weight: 400;
            color: #e8eaed;
        }
        .kdrama-radio-option input:checked + .kdrama-radio-option-label {
            background: #1a73e8;
            border-color: #1a73e8;
            color: white;
        }
        .kdrama-radio-option-label:hover {
            background: #484a4d;
            border-color: #80868b;
        }
        .kdrama-radio-option input:checked + .kdrama-radio-option-label:hover {
            background: #1557b0;
            border-color: #1557b0;
        }
        .kdrama-radio-option-icon {
            width: 14px;
            height: 14px;
        }

        .kdrama-modal-footer {
            padding: 16px 20px;
            background: #2d2e30;
            border-radius: 0 0 8px 8px;
            border-top: 1px solid #3c4043;
        }
        #kdrama-save-button {
            background: #1a73e8;
            color: white;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s ease;
        }
        #kdrama-save-button:hover {
            background: #1557b0;
        }
        #kdrama-save-button:active {
            background: #1142a0;
        }

        .kdrama-circle-container {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            margin-right: 5px;
            vertical-align: middle;
            position: relative;
            top: -1px;
        }
        .kdrama-circle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            border-radius: 7px;
            border: none;
            cursor: pointer;
            font-size: 10px;
            font-weight: 700;
            font-family: "Segoe UI", system-ui, sans-serif;
            letter-spacing: -0.2px;
            line-height: 1;
            opacity: 0.28;
            transition: opacity 0.18s ease, transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
            user-select: none;
            flex-shrink: 0;
        }
        .kdrama-circle:hover {
            opacity: 1;
            transform: scale(1.18);
        }
        .google-circle {
            background: rgba(66, 133, 244, 0.15);
            color: #4285f4;
            border: 1px solid rgba(66, 133, 244, 0.3);
        }
        .google-circle::after { content: "G"; }
        .google-circle:hover {
            background: #4285f4;
            color: #fff;
            border-color: #4285f4;
            box-shadow: 0 2px 8px rgba(66, 133, 244, 0.45);
        }
        .mdl-circle {
            background: rgba(0, 150, 136, 0.12);
            color: #00897b;
            border: 1px solid rgba(0, 150, 136, 0.28);
        }
        .mdl-circle::after { content: "M"; }
        .mdl-circle:hover {
            background: #00897b;
            color: #fff;
            border-color: #00897b;
            box-shadow: 0 2px 8px rgba(0, 150, 136, 0.45);
        }

        /* --- Floating Buttons (Back to Top & Search) --- */
        .kdrama-float-button {
            position: fixed;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            outline: none !important;
            background: rgba(30, 30, 30, 0.4);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10003;
            user-select: none;
            transition: background-color 0.3s ease, opacity 0.3s ease, border 0.3s ease, bottom 0.5s cubic-bezier(0.4, 0.0, 0.2, 1);
            opacity: 0;
            pointer-events: none;
            right: 20px;
            /* GPU-promote to compositor layer so backdrop-filter blur is
               computed off the main thread — prevents scroll-frame repaints */
            will-change: transform;
            transform: translateZ(0);
        }
        .kdrama-float-button.show {
            opacity: 1;
            pointer-events: auto; /* Enable interaction when shown */
        }
        .kdrama-float-button:hover,
        .kdrama-float-button:focus,
        .kdrama-float-button:active {
            background: rgba(50, 50, 50, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.35) !important;
            outline: none !important;
            transform: scale(1.05);
            transition: background-color 0.3s ease, opacity 0.3s ease, border 0.3s ease, bottom 0.5s cubic-bezier(0.4, 0.0, 0.2, 1), transform 0.2s ease;
        }
        #kdrama-back-to-top {
            bottom: 30px;
        }
        #kdrama-search-button {
            bottom: 30px; /* Will be dynamically positioned */
        }
        #kdrama-chat-button {
            bottom: 84px; /* Will be dynamically positioned */
        }

        /* --- Floating Notification --- */
        .kdrama-notification {
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
        .kdrama-notification.show {
            opacity: 1;
            transform: translateX(-50%) translateY(10px);
        }
        .kdrama-notification.success {
            background: rgba(34, 139, 34, 0.9);
            border-color: rgba(34, 139, 34, 0.3);
        }
        .kdrama-notification.error {
            background: rgba(220, 20, 60, 0.9);
            border-color: rgba(220, 20, 60, 0.3);
        }
        .kdrama-notification.info {
            background: rgba(30, 144, 255, 0.9);
            border-color: rgba(30, 144, 255, 0.3);
        }

        /* --- Top Search Bar (Dynamic Island) --- */
        #sfx-top-searchbar-wrap {
            position: fixed;
            top: 14px;
            left: 50%;
            transform: translateX(-50%) translateZ(0);
            z-index: 10006;
            /* Dynamic Island pill shape */
            width: min(560px, calc(100vw - 32px));
            height: 48px;
            border-radius: 28px;
            background: rgba(18, 18, 22, 0.82);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255,255,255,0.13);
            box-shadow: 0 4px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 10px;
            overflow: hidden;
            cursor: text;
            /* GPU-promote via will-change so backdrop-filter compositing is
               off the main thread and never stalls scroll rendering */
            will-change: transform;
            /* Transition for all morphing */
            transition:
                width 0.55s cubic-bezier(0.34, 1.38, 0.64, 1),
                height 0.55s cubic-bezier(0.34, 1.38, 0.64, 1),
                border-radius 0.55s cubic-bezier(0.34, 1.38, 0.64, 1),
                background 0.4s ease,
                box-shadow 0.4s ease,
                top 0.55s cubic-bezier(0.34, 1.38, 0.64, 1),
                opacity 0.35s ease;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed {
            width: 192px;
            height: 34px;
            border-radius: 17px;
            border: 1px solid rgba(255,255,255,0.07);
            background: rgba(22, 22, 26, 0.72);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            cursor: pointer;
            box-shadow: none;
            padding: 0 14px 0 10px;
            justify-content: center;
            gap: 6px;
            overflow: hidden;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed:hover {
            background: rgba(38, 38, 44, 0.82);
            border-color: rgba(255,255,255,0.13);
            transform: translateX(-50%) translateZ(0) scale(1.03);
        }
        #sfx-top-searchbar-wrap.sfx-expanding {
            /* Briefly scale up a touch during expansion */
        }
        #sfx-top-search-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: rgba(255,255,255,0.55);
            pointer-events: none;
            transition: color 0.3s ease;
        }
        #sfx-top-searchbar-wrap:hover #sfx-top-search-icon {
            color: rgba(255,255,255,0.85);
        }
        /* Collapsed: icon stays in normal flex flow, centred by justify-content on parent */
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-icon {
            color: rgba(255,255,255,0.38);
            flex-shrink: 0;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-icon svg {
            width: 13px;
            height: 13px;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed:hover #sfx-top-search-icon {
            color: rgba(255,255,255,0.65);
        }
        /* Collapsed label */
        #sfx-top-search-label {
            font-size: 12px;
            font-weight: 400;
            font-family: "Segoe UI", system-ui, sans-serif;
            color: rgba(255,255,255,0.32);
            white-space: nowrap;
            letter-spacing: 0.3px;
            /* Hidden in expanded state — use max-width so transition works (auto is not animatable) */
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            pointer-events: none;
            transition: opacity 0.35s ease, max-width 0.45s cubic-bezier(0.34, 1.38, 0.64, 1);
        }
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-label {
            max-width: 100px;
            opacity: 1;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed:hover #sfx-top-search-label {
            color: rgba(255,255,255,0.62);
        }
        #sfx-top-search-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 15px;
            font-family: "Segoe UI", system-ui, sans-serif;
            caret-color: #a78bfa;
            min-width: 0;
            transition: opacity 0.3s ease, width 0.4s ease;
        }
        #sfx-top-search-input::placeholder {
            color: rgba(255,255,255,0.38);
        }
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-input {
            opacity: 0;
            pointer-events: none;
            width: 0;
            overflow: hidden;
            flex: none;
            padding: 0;
            margin: 0;
        }
        #sfx-top-search-count {
            font-size: 12px;
            color: rgba(255,255,255,0.45);
            white-space: nowrap;
            flex-shrink: 0;
            transition: opacity 0.3s ease, width 0.4s ease;
        }
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-count {
            opacity: 0;
            pointer-events: none;
            width: 0;
            overflow: hidden;
            flex: none;
            padding: 0;
            margin: 0;
        }
        .sfx-top-nav-btn {
            background: none;
            border: none;
            color: rgba(255,255,255,0.55);
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.2s, color 0.2s, opacity 0.3s, width 0.4s;
        }
        .sfx-top-nav-btn:hover:not(:disabled) {
            background: rgba(255,255,255,0.12);
            color: #fff;
        }
        .sfx-top-nav-btn:disabled { opacity: 0.25; cursor: not-allowed; }
        #sfx-top-searchbar-wrap.sfx-collapsed .sfx-top-nav-btn {
            opacity: 0;
            pointer-events: none;
            width: 0;
            overflow: hidden;
            flex: none;
            padding: 0;
            margin: 0;
        }
        #sfx-top-search-close {
            background: none;
            border: none;
            color: rgba(255,255,255,0.45);
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            flex-shrink: 0;
            padding: 0 2px;
            transition: color 0.2s, opacity 0.3s, width 0.4s;
        }
        #sfx-top-search-close:hover { color: #fff; }
        #sfx-top-searchbar-wrap.sfx-collapsed #sfx-top-search-close {
            opacity: 0;
            pointer-events: none;
            width: 0;
            overflow: hidden;
            flex: none;
            padding: 0;
            margin: 0;
        }

        /* --- Capsule action buttons (settings + chat) --- */
        .sfx-cap-sep {
            display: none;
        }
        .sfx-cap-action {
            background: none !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            -webkit-appearance: none;
            color: rgba(255,255,255,0.38);
            width: 26px;
            height: 26px;
            border-radius: 0 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
            padding: 0;
            transition: color 0.18s ease;
        }
        .sfx-cap-action:hover,
        .sfx-cap-action:focus,
        .sfx-cap-action:active {
            background: none !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            color: rgba(255,255,255,0.85);
        }
        .sfx-cap-action svg {
            width: 14px;
            height: 14px;
        }
        /* In expanded state: shrink separator+actions slightly so they don't dominate */
        #sfx-top-searchbar-wrap:not(.sfx-collapsed) .sfx-cap-sep {
            height: 14px;
        }
        #kdrama-search-modal {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            z-index: 10004;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 -4px 15px rgba(0,0,0,0.3);
            padding: 15px 20px;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s ease-in-out;
        }
        #kdrama-search-modal.show {
            opacity: 1;
            pointer-events: auto;
        }
        .kdrama-search-controls {
            position: relative;
            width: calc(100% - 60px);
            max-width: 500px;
            display: flex;
            align-items: center;
            background-color: transparent;
            border-radius: 8px;
        }
        .kdrama-search-input-wrapper {
            position: relative;
            flex-grow: 1;
            display: flex;
            align-items: center;
        }
        #kdrama-search-input {
            width: 100%;
            padding: 12px 15px 12px 40px;
            border: none;
            border-radius: 8px;
            background-color: #333;
            color: white;
            font-size: 16px;
            outline: none;
            box-sizing: border-box;
        }
        #kdrama-search-input:focus {
            outline: 1px solid #0078D4;
        }
        #kdrama-search-input::placeholder {
            color: #bbb;
        }
        .kdrama-search-icon {
            position: absolute;
            left: 12px;
            color: #bbb;
            font-size: 18px;
            pointer-events: none;
        }
        .kdrama-search-nav-buttons {
            display: flex;
            align-items: center;
            margin-left: 10px;
            gap: 5px;
        }
        .kdrama-search-nav-button {
            background: none;
            border: none;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            opacity: 0.7;
            transition: background-color 0.2s, opacity 0.2s;
        }
        .kdrama-search-nav-button:hover:not(:disabled) {
            background-color: rgba(255, 255, 255, 0.1);
            opacity: 1;
        }
        .kdrama-search-nav-button:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }
        #kdrama-search-close {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            margin-left: 15px;
            line-height: 1;
            opacity: 0.7;
            transition: opacity 0.2s;
        }
        #kdrama-search-close:hover {
            opacity: 1;
        }

        /* --- Highlight style --- */
        .kdrama-highlight {
            background-color: #FFEB3B;
            color: black;
            font-weight: bold;
            padding: 2px 0;
            border-radius: 2px;
        }
        .kdrama-highlight.current {
            background-color: #4CAF50;
            color: white;
            box-shadow: 0 0 8px rgba(76, 175, 80, 0.8);
        }
        code .kdrama-highlight {
            background-color: #383131;
            color: #e0aeb4;
        }
        code .kdrama-highlight.current {
            background-color: #6a5e5e;
            color: #e0aeb4;
        }

        /* --- BuzzHeavier Copy Progress Pill --- */
        #bh-copy-pill {
            position: fixed;
            top: 14px;
            left: 50%;
            z-index: 10010;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 16px 0 20px;
            height: 44px;
            border-radius: 22px;
            background: rgba(16, 16, 20, 0.92);
            backdrop-filter: blur(22px) saturate(180%);
            -webkit-backdrop-filter: blur(22px) saturate(180%);
            border: 1px solid rgba(255,255,255,0.11);
            box-shadow: 0 6px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,0,0,0.3);
            color: #e8eaed;
            font-family: "Segoe UI", system-ui, sans-serif;
            font-size: 13px;
            white-space: nowrap;
            will-change: transform, opacity;
            pointer-events: none;
            opacity: 0;
            transform: translateX(-50%) translateY(-72px) translateZ(0);
            transition:
                opacity 0.3s ease,
                transform 0.5s cubic-bezier(0.34, 1.38, 0.64, 1),
                border-color 0.35s ease,
                box-shadow 0.35s ease;
        }
        /* Enable interactions only while the pill is visible */
        #bh-copy-pill.bh-pill-visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0px) translateZ(0);
            pointer-events: auto;
        }
        #bh-copy-pill.bh-pill-success {
            border-color: rgba(52, 168, 83, 0.55);
            box-shadow: 0 6px 32px rgba(52,168,83,0.28), 0 0 0 1px rgba(0,0,0,0.25);
        }
        #bh-copy-pill.bh-pill-error {
            border-color: rgba(234, 67, 53, 0.55);
            box-shadow: 0 6px 32px rgba(234,67,53,0.28), 0 0 0 1px rgba(0,0,0,0.25);
        }
        #bh-copy-pill .bh-pill-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            flex-shrink: 0;
            color: rgba(255,255,255,0.65);
            transition: color 0.3s ease;
        }
        #bh-copy-pill .bh-pill-icon svg {
            width: 15px;
            height: 15px;
            display: block;
        }
        #bh-copy-pill .bh-pill-icon.bh-pill-spinning svg {
            animation: bh-spin 0.7s linear infinite;
        }
        #bh-copy-pill.bh-pill-success .bh-pill-icon { color: #34a853; }
        #bh-copy-pill.bh-pill-error   .bh-pill-icon { color: #ea4335; }
        #bh-copy-pill .bh-pill-label {
            font-size: 13px;
            font-weight: 500;
            color: rgba(255,255,255,0.88);
            letter-spacing: 0.1px;
            transition: color 0.3s ease;
        }
        #bh-copy-pill .bh-pill-sep {
            width: 1px;
            height: 14px;
            background: rgba(255,255,255,0.1);
            flex-shrink: 0;
        }
        #bh-copy-pill .bh-pill-progress-wrap {
            width: 78px;
            height: 3px;
            background: rgba(255,255,255,0.08);
            border-radius: 2px;
            overflow: hidden;
            flex-shrink: 0;
        }
        #bh-copy-pill .bh-pill-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #4285f4, #7c4dff);
            border-radius: 2px;
            transition: width 0.38s cubic-bezier(0.4,0,0.2,1), background 0.35s ease;
        }
        #bh-copy-pill.bh-pill-success .bh-pill-bar {
            background: linear-gradient(90deg, #34a853, #00bcd4);
        }
        #bh-copy-pill.bh-pill-error .bh-pill-bar {
            background: linear-gradient(90deg, #ea4335, #ff6d00);
        }
        #bh-copy-pill .bh-pill-count {
            font-size: 11px;
            font-weight: 700;
            color: rgba(255,255,255,0.38);
            letter-spacing: 0.3px;
            min-width: 38px;
            text-align: right;
            transition: color 0.3s ease;
        }
        #bh-copy-pill.bh-pill-success .bh-pill-count { color: rgba(52,168,83,0.7); }
        #bh-copy-pill.bh-pill-error   .bh-pill-count { color: rgba(234,67,53,0.7); }
        #bh-copy-pill.bh-pill-cancelled .bh-pill-count { color: rgba(255,160,0,0.7); }
        #bh-copy-pill.bh-pill-cancelled .bh-pill-bar {
            background: linear-gradient(90deg, #ffa000, #ff6d00);
        }
        #bh-copy-pill.bh-pill-cancelled .bh-pill-icon { color: #ffa000; }
        /* Cancel button inside the pill */
        #bh-copy-pill .bh-pill-cancel {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            margin-left: 4px;
            border-radius: 50%;
            border: none;
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.45);
            cursor: pointer;
            flex-shrink: 0;
            padding: 0;
            transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease;
        }
        #bh-copy-pill .bh-pill-cancel:hover {
            background: rgba(234, 67, 53, 0.28);
            color: #ea4335;
            transform: scale(1.12);
        }
        #bh-copy-pill .bh-pill-cancel:active { transform: scale(0.92); }
        #bh-copy-pill .bh-pill-cancel svg {
            width: 11px;
            height: 11px;
            display: block;
            pointer-events: none;
        }
        /* Hide cancel button in terminal states */
        #bh-copy-pill.bh-pill-success .bh-pill-cancel,
        #bh-copy-pill.bh-pill-error   .bh-pill-cancel,
        #bh-copy-pill.bh-pill-cancelled .bh-pill-cancel {
            display: none;
        }
        /* --- Server selection state --- */
        #bh-copy-pill.bh-pill-server-select .bh-pill-sep,
        #bh-copy-pill.bh-pill-server-select .bh-pill-progress-wrap,
        #bh-copy-pill.bh-pill-server-select .bh-pill-count,
        #bh-copy-pill.bh-pill-server-select .bh-pill-cancel {
            display: none;
        }
        #bh-copy-pill .bh-pill-srv {
            display: none;
            gap: 7px;
            align-items: center;
            margin-left: 2px;
        }
        #bh-copy-pill.bh-pill-server-select .bh-pill-srv { display: flex; }
        #bh-copy-pill .bh-pill-srv-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 13px;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.14);
            background: rgba(255,255,255,0.07);
            color: rgba(255,255,255,0.85);
            font-size: 12px;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.17s ease, border-color 0.17s ease, transform 0.13s ease;
        }
        #bh-copy-pill .bh-pill-srv-btn:hover {
            background: rgba(255,255,255,0.13);
            border-color: rgba(255,255,255,0.28);
            transform: scale(1.06);
        }
        #bh-copy-pill .bh-pill-srv-btn:active { transform: scale(0.96); }
        #bh-copy-pill .bh-pill-srv-btn[data-srv="0"]:hover {
            border-color: rgba(107,165,245,0.7);
            background: rgba(107,165,245,0.12);
        }
        #bh-copy-pill .bh-pill-srv-btn[data-srv="1"]:hover {
            border-color: rgba(93,186,114,0.7);
            background: rgba(93,186,114,0.12);
        }
        .bh-srv-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
        .bh-srv-dot-0 { background: #6ba5f5; }
        .bh-srv-dot-1 { background: #5dba72; }
    `);

    // --- Enhanced Drama Detection Patterns ---
    const dramaPatterns = [
        // Pattern for lines with (reup) or (redo) prefix, broken by HTML tags.
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[/,
        // NEW: Pattern for drama names followed by mixed brackets like (AMZN...] with episode info
        /^(?:\(reup\)|\(redo\))?\s*([^([]+?)\s*[\[(][^\])]*[\])][\s\S]*?\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)\s*-/i,
        // NEW: Pattern for lines WITHOUT a prefix, broken by HTML tags.
        /^([a-zA-Z0-9][^[]*?)\s*\[/,
        // NEW: Pattern for drama names followed by "- coming soon"
        /^(?:\(reup\)|\(redo\))?\s*([^-]+?)\s*-\s*coming\s+soon/i,
        // NEW: Pattern for drama names followed by just "-" (nothing or whitespace after)
        /^(?:\(reup\)|\(redo\))?\s*([^-]+?)\s*-\s*$/,
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)\s*-/i,
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?(?:\s+S\d+)?)\s*\[.*?\]\s*\(\d+ep\)\s*-/i,
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\(e\d+\s+of\s+\d+\)\s*-/i,
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\(.*?ep.*?\)\s*-/i,
        /^(?:\(reup\)|\(redo\))?\s*([^[]+?)\s*\[.*?\]\s*\((?:e?\d+(?:\s+of\s+\d+)?|\d+)ep\)/i
    ];

    // --- Helper function to extract drama name ---
    function extractDramaName(text) {
        const cleanText = text.trim();
        if (cleanText.length < 10) return null;
        
        // Fast pre-filter: SinFlix drama lines must contain '[', '(', '-', or 'soon'
        const lower = cleanText.toLowerCase();
        if (!cleanText.includes('[') && !cleanText.includes('(') && !cleanText.includes('-') && !lower.includes('soon')) {
            return null;
        }

        for (const pattern of dramaPatterns) {
            const match = cleanText.match(pattern);
            if (match && match[1]) {
                let dramaName = match[1].trim().replace(/:$/, '').trim().replace(/\s+/g, ' ');
                // Allow drama names as short as 1 character (like "M" or "DP")
                if (dramaName.length > 0 && dramaName.length < 200) return dramaName;
            }
        }
        return null;
    }

    // --- Helper function to open windows in the center of the screen ---
    function openInCenter(url, title) {
        const popWidth = 1000,
            popHeight = 700;

        // Get the actual screen dimensions
        const screenWidth = window.screen.availWidth || window.screen.width;
        const screenHeight = window.screen.availHeight || window.screen.height;

        // Calculate center position
        const left = Math.round((screenWidth / 2) - (popWidth / 2));
        const top = Math.round((screenHeight / 2) - (popHeight / 2));

        // Ensure the window doesn't go off-screen
        const finalLeft = Math.max(0, left);
        const finalTop = Math.max(0, top);

        const features = `width=${popWidth},height=${popHeight},top=${finalTop},left=${finalLeft},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
        window.open(url, title, features);
    }

    // --- Helper function to show floating notifications ---
    function showNotification(message, type = 'info', duration = 3000) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.kdrama-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `kdrama-notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Auto-remove after specified duration
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }

    // --- Helper function to copy text to clipboard ---
    async function copyToClipboard(text) {
        try {
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(text);
                return true;
            }
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            return false;
        }
    }

    // --- Function to get MDL first result URL for copying ---
    async function getMdlFirstResultUrl(searchUrl, dramaName) {
        try {
            // Show loading indicator
            const circles = document.querySelectorAll('.mdl-circle');
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '0.5';
                    circle.style.cursor = 'wait';
                }
            });

            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: searchUrl,
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Cache-Control': 'no-cache'
                    },
                    onload: function(response) {
                        resolve(response);
                    },
                    onerror: function(error) {
                        reject(error);
                    },
                    ontimeout: function() {
                        reject(new Error('Request timed out'));
                    }
                });
            });

            // Reset circle appearance
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '';
                    circle.style.cursor = 'pointer';
                }
            });

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const htmlText = response.responseText;
            const resultMatch = htmlText.match(/<div[^>]+id="mdl-\d+"[^>]*>[\s\S]*?<h6[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/);

            if (resultMatch) {
                return `https://mydramalist.com${resultMatch[1]}`;
            } else {
                // Fallback: try simpler regex patterns
                const simpleMatch = htmlText.match(/<a[^>]+href="(\/\d+-[^"]+)"[^>]*>[^<]*<\/a>/);
                if (simpleMatch) {
                    return `https://mydramalist.com${simpleMatch[1]}`;
                }
            }

            return null;
        } catch (error) {
            // Reset circle appearance
            const circles = document.querySelectorAll('.mdl-circle');
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '';
                    circle.style.cursor = 'pointer';
                }
            });

            console.error('Sinflix Modifier: Error getting MDL first result:', error);
            return null;
        }
    }

    // --- Function to load MDL page in background and open first result ---
    async function loadMdlPageAndOpenFirstResult(searchUrl, dramaName) {
        try {
            // Show loading indicator (update circle appearance)
            const circles = document.querySelectorAll('.mdl-circle');
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '0.5';
                    circle.style.cursor = 'wait';
                }
            });

            // Use GM_xmlhttpRequest with optimizations for speed
            const response = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: searchUrl,
                    timeout: 5000, // Reduced timeout to 5 seconds
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Cache-Control': 'no-cache'
                    },
                    onload: function(response) {
                        resolve(response);
                    },
                    onerror: function(error) {
                        reject(error);
                    },
                    ontimeout: function() {
                        reject(new Error('Request timed out'));
                    },
                    // Speed optimization: Only process first few KB of response
                    onprogress: function(response) {
                        // If we've received enough data and found what we need, we can stop
                        if (response.responseText && response.responseText.length > 10000) {
                            // Try to find the first result in the partial response
                            const partialMatch = response.responseText.match(/<h6[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/);
                            if (partialMatch) {
                                // Found it early! Create a mock response
                                const mockResponse = {
                                    status: 200,
                                    responseText: response.responseText,
                                    firstResultFound: partialMatch[1]
                                };
                                resolve(mockResponse);
                                return;
                            }
                        }
                    }
                });
            });

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            let firstResultUrl = null;

            // Check if we found the result during onprogress
            if (response.firstResultFound) {
                firstResultUrl = `https://mydramalist.com${response.firstResultFound}`;
            } else {
                // Fast parsing using regex instead of DOMParser for better performance
                const htmlText = response.responseText;

                // Look for the first result using optimized regex
                const resultMatch = htmlText.match(/<div[^>]+id="mdl-\d+"[^>]*>[\s\S]*?<h6[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/);

                if (resultMatch) {
                    firstResultUrl = `https://mydramalist.com${resultMatch[1]}`;
                } else {
                    // Fallback: try simpler regex patterns
                    const simpleMatch = htmlText.match(/<a[^>]+href="(\/\d+-[^"]+)"[^>]*>[^<]*<\/a>/);
                    if (simpleMatch) {
                        firstResultUrl = `https://mydramalist.com${simpleMatch[1]}`;
                    }
                }
            }

            // Reset circle appearance
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '';
                    circle.style.cursor = 'pointer';
                }
            });

            if (firstResultUrl) {
                // Open first result in popup
                if (config.linkOpenStyle === 'popup') {
                    openInCenter(firstResultUrl, `sinflix_mdl_${dramaName}`);
                } else {
                    window.open(firstResultUrl, '_blank');
                }
            } else {
                // No results found, fallback to search page
                console.log('Sinflix Modifier: No results found on MDL, opening search page');
                if (config.linkOpenStyle === 'popup') {
                    openInCenter(searchUrl, 'sinflix_mdl_search');
                } else {
                    window.open(searchUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('Sinflix Modifier: Error loading MDL page:', error);

            // Reset circle appearance and fallback to search page
            const circles = document.querySelectorAll('.mdl-circle');
            circles.forEach(circle => {
                if (circle.title.includes(dramaName)) {
                    circle.style.opacity = '';
                    circle.style.cursor = 'pointer';
                }
            });

            // Fallback to opening search page
            if (config.linkOpenStyle === 'popup') {
                openInCenter(searchUrl, 'sinflix_mdl_search');
            } else {
                window.open(searchUrl, '_blank');
            }
        }
    }

    // --- Helper: open a mega.nz link in Fetchrr.io ---
    // Stores the URL in GM storage, then opens https://fetchrr.io/.
    // The script auto-fills the input when fetchrr.io loads.
    function openMegaInFetchrr(megaUrl, openStyle) {
        const style = openStyle || config.megaFetchrrOpenStyle || 'tab';
        GM_setValue('pendingMegaLink', megaUrl);
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

    // --- Fetchrr.io: auto-fill mega link on page load ---
    function handleFetchrrPage() {
        const pending = GM_getValue('pendingMegaLink', '');
        if (!pending) return;
        // Clear immediately to avoid re-filling on refresh
        GM_setValue('pendingMegaLink', '');

        function fillAndParse() {
            const input = document.getElementById('mega-link');
            if (!input) return false;

            // React controls this input — we must use the native setter to
            // trigger React's synthetic onChange handler, then dispatch events.
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, 'value'
            ).set;
            nativeSetter.call(input, pending);

            // Fire both 'input' and 'change' so React registers the new value
            input.dispatchEvent(new Event('input',  { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Give React a tick to re-render (enables the Parse button)
            setTimeout(() => {
                const btn = document.querySelector('button.cds--btn--primary:not([disabled])');
                if (btn) {
                    btn.click();
                } else {
                    // Button still disabled — try once more after another tick
                    setTimeout(() => {
                        const btn2 = document.querySelector('button.cds--btn--primary');
                        if (btn2) btn2.click();
                    }, 300);
                }
            }, 150);
            return true;
        }

        // Try immediately if DOM is already ready, else wait for it
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // React apps may still be mounting — poll briefly
                let attempts = 0;
                const t = setInterval(() => {
                    if (fillAndParse() || ++attempts > 20) clearInterval(t);
                }, 200);
            });
        } else {
            let attempts = 0;
            const t = setInterval(() => {
                if (fillAndParse() || ++attempts > 20) clearInterval(t);
            }, 200);
        }
    }

    // --- pst.moe Enhancements ---
    function enhancePstMoeContent() {
        if (!config.pstMoeEnhancements) return false;
        if (window.location.hostname !== 'pst.moe') return false;

        const preElement = document.querySelector('pre');
        if (!preElement) return false;

        // Guard against double-processing
        if (preElement.dataset.sinflixProcessed) return true;
        preElement.dataset.sinflixProcessed = 'true';

        const resolutionLinks = {};
        const resolutionMegaLinks = {};
        let currentResolution = null;

        // URL regex — matches http(s) URLs up to whitespace
        const linkRegex = /(https?:\/\/[^\s]+)/g;

        // --- Pre-scan: detect which resolution sections contain mega.nz links ---
        // This determines which header buttons to render before the DOM is built.
        const resolutionsWithMega = new Set();
        const resolutionsWithLinks = new Set();
        const resolutionMegaLinksMap = {};
        {
            let scanRes = null;
            const scanLines = preElement.textContent.split('\n');
            for (const scanLine of scanLines) {
                const rMatch = scanLine.trim().match(/^---\s+(.*?)\s+---/);
                if (rMatch) { scanRes = rMatch[1]; continue; }
                if (!scanRes) continue;
                const urlMatch = scanLine.match(/(https?:\/\/[^\s]+)/g);
                if (urlMatch) {
                    resolutionsWithLinks.add(scanRes);
                    const megaUrls = urlMatch.filter(u => u.includes('mega.nz/file/'));
                    if (megaUrls.length > 0) {
                        resolutionsWithMega.add(scanRes);
                        if (!resolutionMegaLinksMap[scanRes]) resolutionMegaLinksMap[scanRes] = [];
                        resolutionMegaLinksMap[scanRes].push(...megaUrls);
                    }
                }
            }
        }

        /**
         * Process a plain-text string and return a DocumentFragment containing:
         *  - resolution-header <span> elements (with Copy buttons) for "--- ... ---" lines
         *  - <a> elements for URLs (+ optional mega bypass circles)
         *  - plain Text nodes for everything else
         * Preserves all original whitespace / newlines.
         */
        function processTextContent(text) {
            const fragment = document.createDocumentFragment();
            const lines = text.split('\n');

            lines.forEach((line, lineIdx) => {
                // --- Resolution header line ---
                const resMatch = line.trim().match(/^---\s+(.*?)\s+---/);
                if (resMatch) {
                    currentResolution = resMatch[1];
                    if (!resolutionLinks[currentResolution]) resolutionLinks[currentResolution] = [];
                    if (!resolutionMegaLinks[currentResolution]) resolutionMegaLinks[currentResolution] = [];

                    const resSpan = document.createElement('span');
                    resSpan.className = 'sinflix-res-header';

                    const textNode = document.createTextNode(line.trim() + ' ');
                    resSpan.appendChild(textNode);

                    // Show mega.nz copy buttons when section has mega links
                    if (resolutionsWithMega.has(currentResolution)) {
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'sinflix-copy-btn';
                        copyBtn.dataset.res = currentResolution;
                        copyBtn.textContent = 'Copy All Links';
                        resSpan.appendChild(copyBtn);
                    }

                    fragment.appendChild(resSpan);
                    fragment.appendChild(document.createTextNode('\n'));
                    return;
                }

                // --- Normal line: split on URLs ---
                linkRegex.lastIndex = 0;
                let lastIndex = 0;
                let match;
                while ((match = linkRegex.exec(line)) !== null) {
                    // Text before the URL
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(line.slice(lastIndex, match.index)));
                    }

                    const rawUrl = match[0];
                    const cleanUrl = rawUrl.replace(/"/g, '%22');

                    // Track links per resolution
                    if (currentResolution) {
                        resolutionLinks[currentResolution].push(cleanUrl);
                        if (cleanUrl.includes('mega.nz/file/')) {
                            resolutionMegaLinks[currentResolution].push(cleanUrl);
                        }
                    }

                    // Create <a> element
                    const anchor = document.createElement('a');
                    anchor.href = cleanUrl;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    anchor.textContent = rawUrl;
                    fragment.appendChild(anchor);

                    // Append Fetchrr pill trigger for mega links
                    if (config.megaFetchrr && (cleanUrl.includes('mega.nz/file/') || cleanUrl.includes('mega.nz/folder/'))) {
                        const circle = document.createElement('span');
                        circle.className = 'sinflix-mega-fetchrr-dot';
                        circle.title = 'Open in Fetchrr.io — direct mirror download';
                        circle.dataset.megaUrl = cleanUrl;
                        fragment.appendChild(circle);
                    }

                    // Append download circle for FileDitch links
                    if (config.showFdCircle && cleanUrl.includes('fileditchfiles.me')) {
                        const dlCircle = document.createElement('span');
                        dlCircle.className = 'sinflix-fd-dl-circle';
                        dlCircle.title = '\u2b07 Download via FileDitch (auto-clicks download & closes)';
                        dlCircle.dataset.fdUrl = cleanUrl;
                        fragment.appendChild(dlCircle);
                    }

                    lastIndex = match.index + match[0].length;
                }

                // Remaining text after last URL (or the whole line if no URL)
                if (lastIndex < line.length) {
                    fragment.appendChild(document.createTextNode(line.slice(lastIndex)));
                }

                // Re-add the newline that split() removed (skip after very last line)
                if (lineIdx < lines.length - 1) {
                    fragment.appendChild(document.createTextNode('\n'));
                }
            });

            return fragment;
        }

        // Walk child nodes of <pre>, replacing only Text nodes.
        // Element nodes (Pygments <span class="gu"> etc.) are left untouched.
        const childNodes = Array.from(preElement.childNodes);
        for (const node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                const fragment = processTextContent(node.textContent);
                preElement.replaceChild(fragment, node);
            }
            // Element nodes: leave as-is to preserve syntax highlighting
        }

        if (config.showFdCircle) {
            document.querySelectorAll('.sinflix-fd-dl-circle').forEach(circle => {
                circle.addEventListener('click', () => {
                    if (circle.classList.contains('fd-loading')) return;
                    circle.classList.add('fd-loading');
                    const w = window.open(circle.dataset.fdUrl + '#sfx=dl', '_blank',
                        'width=900,height=650,menubar=no,toolbar=no,status=no,location=yes');
                    showNotification('Opening FileDitch\u2026 will auto-download & close.', 'info', 5000);
                    setTimeout(() => circle.classList.remove('fd-loading'), 18000);
                    if (!w) showNotification('Popup blocked! Allow popups for pst.moe.', 'error', 6000);
                });
            });
        }

        document.querySelectorAll('.sinflix-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const res = e.target.getAttribute('data-res');
                // Copy only the mega.nz links from this section
                const megaLinks = resolutionMegaLinksMap[res] || [];
                if (megaLinks.length > 0) {
                    showNotification('Copying links...', 'info');
                    copyToClipboard(megaLinks.join('\n')).then((success) => {
                        if (success) {
                            showNotification(`${megaLinks.length} link(s) copied!`, 'success');
                            const oldText = e.target.innerText;
                            e.target.innerText = 'Copied!';
                            setTimeout(() => { e.target.innerText = oldText; }, 2000);
                        } else {
                            showNotification('Failed to copy links!', 'error');
                        }
                    });
                }
            });
        });

        // --- Fetchrr dot click → open mega link in Fetchrr.io ---
        if (config.megaFetchrr) {
            document.querySelectorAll('.sinflix-mega-fetchrr-dot').forEach(dot => {
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const megaUrl = dot.getAttribute('data-mega-url');
                    if (!megaUrl) return;
                    openMegaInFetchrr(megaUrl);
                    showNotification('Opening Fetchrr.io…', 'info', 2000);
                });
            });
        }

        return true;
    }

    // --- Buzzheavier Enhancements ---
    const buzzDownloadUrlsCache = new Map();

    function resolveBuzzDownloadUrlsFromDoc(doc, baseUrl) {
        // Use broad selector first (hx-get*="/download"), then narrow with .gay-button if needed.
        // BuzzHeavier may change class names; hx-get attribute is the reliable signal.
        let anchors = Array.from(doc.querySelectorAll('a[hx-get*="/download"]'));
        // De-duplicate by hx-get value (avoid counting the same endpoint twice)
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
                    return new URL(endpoint, baseUrl).href;
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

        if (normalizedPageUrl === currentUrl) {
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
                        // Fallback to regex extraction
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
                showNotification("Failed to resolve download URL.", "error");
                callback(null);
                return;
            }

            const htmxHeaders = {
                "hx-current-url": pageUrl,
                "hx-request": "true",
                "referer": pageUrl
            };

            // Helper: extract redirect URL from response headers or body
            function extractRedirect(response) {
                const headers = response.responseHeaders || '';
                const m = headers.match(/hx-redirect:\s*([^\r\n]+)/i)
                       || headers.match(/location:\s*([^\r\n]+)/i);
                if (m && m[1]) return m[1].trim();
                // Some servers embed HX-Redirect in the response body as a meta tag or JSON
                const body = response.responseText || '';
                const bodyM = body.match(/["']?hx-redirect["']?\s*:\s*["']([^"']+)["']/i)
                           || body.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
                if (bodyM && bodyM[1]) return bodyM[1].trim();
                return null;
            }

            // Try HEAD first (fast, low bandwidth)
            GM_xmlhttpRequest({
                method: "HEAD",
                url: downloadUrl,
                headers: htmxHeaders,
                onload: function(response) {
                    const redirect = extractRedirect(response);
                    if (redirect) {
                        callback(redirect);
                    } else {
                        // HEAD gave no redirect – fall back to GET (some servers require it)
                        GM_xmlhttpRequest({
                            method: "GET",
                            url: downloadUrl,
                            headers: htmxHeaders,
                            onload: function(getResponse) {
                                const getRedirect = extractRedirect(getResponse);
                                if (getRedirect) {
                                    callback(getRedirect);
                                } else {
                                    showNotification("Failed to obtain direct link.", "error");
                                    callback(null);
                                }
                            },
                            onerror: function() {
                                showNotification("Network error obtaining direct link.", "error");
                                callback(null);
                            }
                        });
                    }
                },
                onerror: function() {
                    // HEAD blocked entirely – try GET directly
                    GM_xmlhttpRequest({
                        method: "GET",
                        url: downloadUrl,
                        headers: htmxHeaders,
                        onload: function(getResponse) {
                            const getRedirect = extractRedirect(getResponse);
                            if (getRedirect) {
                                callback(getRedirect);
                            } else {
                                showNotification("Network error obtaining direct link.", "error");
                                callback(null);
                            }
                        },
                        onerror: function() {
                            showNotification("Network error obtaining direct link.", "error");
                            callback(null);
                        }
                    });
                }
            });
        });
    }

    // --- BuzzHeavier Copy-All Progress Pill ---
    // A dynamic island-style pill: server picker → live progress → success/error, with cancel.
    const buzzPill = (() => {
        const SVG_SPIN     = `<svg viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor"/></svg>`;
        const SVG_CHECK    = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>`;
        const SVG_CROSS    = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/></svg>`;
        const SVG_STOP     = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/></svg>`;
        const SVG_COPY_ICO = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>`;

        let pill         = null;
        let dismissTimer = null;
        let cancelled    = false;
        let cancelCb     = null;
        let _selectCb    = null;

        function getOrCreate() {
            if (pill && document.body.contains(pill)) return pill;
            pill = document.createElement('div');
            pill.id = 'bh-copy-pill';
            pill.innerHTML = `
                <div class="bh-pill-icon" id="bh-pill-icon"></div>
                <span class="bh-pill-label" id="bh-pill-label"></span>
                <div class="bh-pill-srv" id="bh-pill-srv">
                    <button class="bh-pill-srv-btn" data-srv="0"><span class="bh-srv-dot bh-srv-dot-0"></span>Server 1</button>
                    <button class="bh-pill-srv-btn" data-srv="1"><span class="bh-srv-dot bh-srv-dot-1"></span>Server 2</button>
                </div>
                <div class="bh-pill-sep"></div>
                <div class="bh-pill-progress-wrap"><div class="bh-pill-bar" id="bh-pill-bar"></div></div>
                <span class="bh-pill-count" id="bh-pill-count"></span>
                <button class="bh-pill-cancel" id="bh-pill-cancel" title="Cancel">${SVG_STOP}</button>
            `;
            pill.querySelectorAll('.bh-pill-srv-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const idx = parseInt(btn.dataset.srv, 10);
                    pill.classList.remove('bh-pill-server-select');
                    if (typeof _selectCb === 'function') {
                        const cb = _selectCb;
                        _selectCb = null;
                        cb(idx);
                    }
                });
            });
            pill.querySelector('#bh-pill-cancel').addEventListener('click', (e) => {
                e.stopPropagation();
                if (cancelled) return;
                cancelled = true;
                if (typeof cancelCb === 'function') cancelCb();
                _setState('cancelled', 'Cancelled', 0, 0);
                dismissTimer = setTimeout(hide, 2000);
            });
            document.body.appendChild(pill);
            return pill;
        }

        function _setState(state, label, done, total) {
            const p   = getOrCreate();
            const ico = p.querySelector('#bh-pill-icon');
            const lbl = p.querySelector('#bh-pill-label');
            const bar = p.querySelector('#bh-pill-bar');
            const cnt = p.querySelector('#bh-pill-count');
            p.classList.remove('bh-pill-success', 'bh-pill-error', 'bh-pill-cancelled', 'bh-pill-server-select');
            ico.classList.remove('bh-pill-spinning');
            if (state === 'progress') {
                ico.innerHTML = SVG_SPIN;
                ico.classList.add('bh-pill-spinning');
                lbl.textContent = label || 'Fetching…';
                const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
                bar.style.width = pct + '%';
                cnt.textContent = total > 0 ? `${done} / ${total}` : '';
            } else if (state === 'success') {
                p.classList.add('bh-pill-success');
                ico.innerHTML = SVG_CHECK;
                lbl.textContent = label || 'Copied!';
                bar.style.width = '100%';
                cnt.textContent = total > 0 ? `${total} link${total !== 1 ? 's' : ''}` : '';
            } else if (state === 'error') {
                p.classList.add('bh-pill-error');
                ico.innerHTML = SVG_CROSS;
                lbl.textContent = label || 'Failed';
                bar.style.width = '100%';
                cnt.textContent = '';
            } else if (state === 'cancelled') {
                p.classList.add('bh-pill-cancelled');
                ico.innerHTML = SVG_CROSS;
                lbl.textContent = label || 'Cancelled';
                cnt.textContent = '';
            }
            p.classList.add('bh-pill-visible');
        }

        function show(state, label, done, total) {
            if (cancelled && state === 'progress') return;
            clearTimeout(dismissTimer);
            _setState(state, label, done, total);
            if (state === 'success') dismissTimer = setTimeout(hide, 3000);
            if (state === 'error')   dismissTimer = setTimeout(hide, 3500);
        }

        function showServerSelect(onSelect) {
            clearTimeout(dismissTimer);
            cancelled = false;
            _selectCb = onSelect;
            const p   = getOrCreate();
            const ico = p.querySelector('#bh-pill-icon');
            const lbl = p.querySelector('#bh-pill-label');
            p.classList.remove('bh-pill-success', 'bh-pill-error', 'bh-pill-cancelled');
            ico.classList.remove('bh-pill-spinning');
            ico.innerHTML   = SVG_COPY_ICO;
            lbl.textContent = 'Copy from:';
            p.classList.add('bh-pill-server-select', 'bh-pill-visible');
        }

        function hide() {
            if (!pill) return;
            pill.classList.remove('bh-pill-visible');
        }

        function onCancel(cb) { cancelled = false; cancelCb = cb; }
        function isCancelled() { return cancelled; }

        return { show, hide, showServerSelect, onCancel, isCancelled };
    })();

    function enhanceBuzzheavierContent() {
        if (!config.buzzheavierEnhancements) return false;
        if (!window.location.hostname.includes('buzzheavier.com')) return false;

        // Inject global legend at top right of the site
        if (!document.querySelector('.bh-legend-fixed')) {
            const legend = document.createElement('div');
            legend.className = 'bh-legend-fixed';
            legend.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #6ba5f5;"></span>
                    Server 1
                </span>
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #5dba72;"></span>
                    Server 2
                </span>
            `;
            if (document.body) {
                document.body.insertBefore(legend, document.body.firstChild);
            }
        }

        // File-link helpers — exclude obvious nav/header anchors by requiring a path
        // that looks like a file ID (not just '/', '/pricing', etc.).
        const FILE_LINK_RE = /^\/[a-zA-Z0-9_-]{4,}(\?|$)/;
        const isFileAnchor = (a) => {
            if (!a || !a.href) return false;
            const path = a.getAttribute('href') || '';
            // Absolute buzzheavier or localhost URLs are always file links
            if (a.href.includes('buzzheavier.com/') && path.length > 1) return true;
            if (a.href.includes('localhost:')) return true;
            // Root-relative path must match the file-ID pattern
            return path.startsWith('/') && FILE_LINK_RE.test(path) && !path.startsWith('//');
        };

        const getFileLink = (parent) => {
            const anchors = parent.querySelectorAll('a[href]');
            for (const a of anchors) if (isFileAnchor(a)) return a;
            return null;
        };

        const getFileLinks = (parent) => {
            return [...new Set(
                Array.from(parent.querySelectorAll('a[href]')).filter(isFileAnchor)
            )];
        };

        // Find the main file-list tbody: prefer #tbody, fall back to any tbody that
        // contains at least one row with a file anchor.
        // Cache the found tbody via a dataset attribute so repeated observer calls
        // always reference the same element (not one of the quality-split tbodies).
        let mainTbody = document.querySelector('#tbody[data-sfx-main]')
            || document.querySelector('table tbody[data-sfx-main]');

        if (!mainTbody) {
            // Look for #tbody first (fast path)
            const byId = document.querySelector('#tbody');
            if (byId && getFileLink(byId.querySelector('tr'))) {
                mainTbody = byId;
            } else {
                // Scan every tbody, skip ones we injected (id starts with 'tbody-')
                for (const tb of document.querySelectorAll('table tbody')) {
                    if (tb.id && tb.id.startsWith('tbody-')) continue; // our quality tbody
                    const firstRow = tb.querySelector('tr');
                    if (firstRow && getFileLink(firstRow)) {
                        mainTbody = tb;
                        break;
                    }
                }
            }
            if (mainTbody) mainTbody.dataset.sfxMain = '1';
        }

        const isHomePage = mainTbody !== null
            && window.location.pathname.length > 1
            && !window.location.pathname.endsWith('/download');

        // Single-file page: has an HTMX download endpoint but no multi-row table
        const isSinglePage = !isHomePage && !!document.querySelector('a[hx-get*="/download"]');

        const handleAction = (type, pageUrl, btnElement, serverIndex) => {
            if (btnElement.classList.contains('bh-loading')) return;

            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = ICON_SPIN;
            btnElement.classList.add('bh-loading');

            fetchDirectLink(pageUrl, serverIndex, (directUrl) => {
                btnElement.classList.remove('bh-loading');
                btnElement.innerHTML = originalHTML;

                if (!directUrl) return;

                if (type === 'copy') {
                    copyToClipboard(directUrl).then((success) => {
                        if (success) {
                            btnElement.innerHTML = ICON_CHECK;
                            btnElement.classList.add('bh-copied');
                            setTimeout(() => {
                                btnElement.innerHTML = originalHTML;
                                btnElement.classList.remove('bh-copied');
                            }, 2000);
                            showNotification('Direct link copied!', 'success');
                        } else {
                            showNotification('Failed to copy link!', 'error');
                        }
                    });
                } else if (type === 'dl') {
                    window.location.assign(directUrl);
                }
            });
        };

        const ICON_COPY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
        const ICON_DL   = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
        const ICON_SPIN = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`;
        const ICON_CHECK= `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

        const createCapBtn = (icon, title, type, fileUrl, serverIndex) => {
            const btn = document.createElement('button');
            btn.className = 'bh-cap-btn';
            btn.title = title;
            btn.innerHTML = icon;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction(type, fileUrl, btn, serverIndex);
            };
            return btn;
        };

        const createCapsule = (fileUrl, serverIndex) => {
            const serverNumber = serverIndex + 1;
            const cap = document.createElement('span');
            cap.className = `bh-capsule bh-capsule-s${serverNumber}`;

            if (config.buzzCopyLinks) {
                cap.appendChild(createCapBtn(ICON_COPY, `Copy direct link – Server ${serverNumber}`, 'copy', fileUrl, serverIndex));
            }
            if (config.buzzDirectDownload) {
                cap.appendChild(createCapBtn(ICON_DL, `Download – Server ${serverNumber}`, 'dl', fileUrl, serverIndex));
            }
            // Return null when no features are enabled (avoid injecting empty capsules)
            return cap.children.length > 0 ? cap : null;
        };

        const addCapsulesToRow = (row) => {
            // Skip if neither copy nor download feature is enabled
            if (!config.buzzCopyLinks && !config.buzzDirectDownload) return;
            const linkEl = getFileLink(row);
            if (!linkEl) return;
            if (row.querySelector('.bh-capsule-wrap')) return;

            const fileUrl = linkEl.href;
            const cap0 = createCapsule(fileUrl, 0);
            const cap1 = createCapsule(fileUrl, 1);
            if (!cap0 && !cap1) return; // nothing to inject

            const wrap = document.createElement('span');
            wrap.className = 'bh-capsule-wrap';
            if (cap0) wrap.appendChild(cap0);
            if (cap1) wrap.appendChild(cap1);

            // Absolutely-position the wrap inside the Name <td>.
            // We must NOT let it be inline (that breaks table layout in Firefox).
            const td = linkEl.closest('td') || linkEl.parentNode;
            if (td) {
                td.style.position = 'relative';
                td.style.overflow = 'hidden'; // keep buttons clipped to cell

                // Truncate link text so it never overlaps the buttons
                linkEl.style.display = 'inline-block';
                linkEl.style.maxWidth = 'calc(100% - 92px)';
                linkEl.style.overflow = 'hidden';
                linkEl.style.textOverflow = 'ellipsis';
                linkEl.style.whiteSpace = 'nowrap';
                linkEl.style.verticalAlign = 'middle';

                td.appendChild(wrap);
            }
        };

        const copyLinks = (linksArray, btnElement) => {
            if (!linksArray || linksArray.length === 0) return;

            const origText = btnElement ? btnElement.innerText : '';

            // Disable button immediately so it can't be double-clicked
            if (btnElement) {
                btnElement.disabled      = true;
                btnElement.style.opacity = '0.5';
            }

            const restoreBtn = () => {
                if (!btnElement) return;
                btnElement.disabled      = false;
                btnElement.style.opacity = '';
                btnElement.innerText     = origText;
            };

            // Register cancel handler — also resets cancelled flag for a fresh run
            buzzPill.onCancel(restoreBtn);

            // Phase 1: show server picker in the pill
            buzzPill.showServerSelect((serverIndex) => {
                // Phase 2: user picked a server — start fetching
                const total     = linksArray.length;
                let processed   = 0;
                let directLinks = [];

                buzzPill.show('progress', 'Fetching links…', 0, total);

                linksArray.forEach(pageUrl => {
                    fetchDirectLink(pageUrl, serverIndex, (directUrl) => {
                        // Drop results that arrive after cancellation
                        if (buzzPill.isCancelled()) return;

                        processed++;
                        if (directUrl) directLinks.push(directUrl);

                        buzzPill.show('progress', 'Fetching links…', processed, total);

                        if (processed === total) {
                            restoreBtn();

                            if (directLinks.length > 0) {
                                copyToClipboard(directLinks.join('\n')).then((success) => {
                                    if (success) {
                                        const srvLabel = serverIndex === 0 ? 'Server 1' : 'Server 2';
                                        buzzPill.show('success', `${srvLabel} — copied!`, directLinks.length, directLinks.length);
                                        if (btnElement) {
                                            btnElement.innerText = '✓ Copied!';
                                            setTimeout(() => { btnElement.innerText = origText; }, 2200);
                                        }
                                    } else {
                                        buzzPill.show('error', 'Clipboard write failed', 0, 0);
                                    }
                                });
                            } else {
                                buzzPill.show('error', 'No direct links found', 0, 0);
                            }
                        }
                    });
                });
            });
        };

        const processRows = (rows) => {
            rows.forEach(row => {
                if (row.classList.contains('sfx-processed')) return;
                row.classList.add('sfx-processed');

                const linkEl = getFileLink(row);
                if (!linkEl) return;

                const fileUrl = linkEl.href;
                
                if (config.buzzSplitQuality) {
                    // textContent is more reliable than innerText in Firefox
                    const name = (linkEl.textContent || linkEl.innerText || '').toLowerCase();
                    let quality = 'Other';
                    for (const q of ['1080p', '720p', '540p', '480p']) {
                        if (name.includes(q)) {
                            quality = q;
                            break;
                        }
                    }

                    let targetTbody = document.getElementById(`tbody-${quality}`);
                    if (!targetTbody) {
                        const parentTable = mainTbody ? mainTbody.closest('table') : document.querySelector('table');
                        if (!parentTable) {
                            addCapsulesToRow(row); // no table to split, just add buttons
                            return;
                        }
                        const container = parentTable.parentNode;
                        const theadEl = parentTable.querySelector('thead');
                        const headerRow = theadEl ? theadEl.outerHTML : '';
                        const tableClass = parentTable.className;

                        const wrapper = document.createElement('div');
                        wrapper.className = 'w-full relative shadow overflow-hidden sm:rounded-lg overflow-x-auto my-6';

                        let copyAllBtnHtml = '';
                        if (config.buzzCopyLinks) {
                            copyAllBtnHtml = `<button class="sinflix-copy-btn btn btn-sm btn-outline-primary float-right" data-q="${quality}">Copy Links</button>`;
                        }

                        wrapper.innerHTML = `
                            <h3 class="p-3 text-lg font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                ${quality}
                                ${copyAllBtnHtml}
                            </h3>
                            <table class="${tableClass}" style="margin-top: 0">
                                ${headerRow}
                                <tbody id="tbody-${quality}">
                                </tbody>
                            </table>
                        `;
                        container.insertBefore(wrapper, parentTable);
                        targetTbody = wrapper.querySelector(`#tbody-${quality}`);

                        const copyBtn = wrapper.querySelector(`.sinflix-copy-btn[data-q="${quality}"]`);
                        if (copyBtn) {
                            copyBtn.addEventListener('click', function() {
                                const links = getFileLinks(targetTbody).map(a => a.href);
                                copyLinks(links, this);
                            });
                        }
                    }

                    targetTbody.appendChild(row);
                }

                addCapsulesToRow(row);
            });
        };

        if (isHomePage) {
            // Select ALL rows inside the detected tbody — no class dependency
            const rows = Array.from(
                (mainTbody || document).querySelectorAll('tr:not(.sfx-processed)')
            ).filter(row => {
                if (mainTbody && row.parentNode !== mainTbody) return false;
                return getFileLink(row) !== null;
            });

            // Only process if there are actual file rows — prevents hiding the table
            // on empty first load (HTMX loads rows async, so we wait for the observer
            // to fire again once HTMX has populated the tbody).
            if (rows.length > 0) {
                // Hide original table only AFTER we have rows to move (quality split).
                // Hiding early on an empty tbody causes Firefox to never show quality sections.
                if (mainTbody && config.buzzSplitQuality && !mainTbody.dataset.sfxHidden) {
                    const parentTable = mainTbody.closest('table');
                    if (parentTable) {
                        parentTable.style.display = 'none';
                        mainTbody.dataset.sfxHidden = '1';
                    }
                }
                processRows(rows);
            }

            if (!config.buzzSplitQuality && mainTbody && config.buzzCopyLinks) {
                const parentTable = mainTbody.closest('table');
                if (parentTable && !parentTable.parentNode.querySelector('.sinflix-copy-all-btn')) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'sinflix-copy-all-btn sinflix-copy-btn btn btn-sm bg-blue-600 text-white px-3 py-1 rounded my-2';
                    copyBtn.innerText = 'Copy All Links';
                    copyBtn.onclick = function() {
                        const links = getFileLinks(mainTbody).map(a => a.href);
                        copyLinks(links, this);
                    };
                    parentTable.parentNode.insertBefore(copyBtn, parentTable);
                }
            }
        } else if (isSinglePage) {
            // On single-file pages inject one combined capsule-wrap after the FIRST server button
            if (config.buzzCopyLinks || config.buzzDirectDownload) {
                // Prefer the non-alt server button; fall back to any download button
                const firstDlBtn = document.querySelector('a[hx-get*="/download"]:not([hx-get*="alt=true"])')
                                || document.querySelector('a[hx-get*="/download"]');
                if (firstDlBtn && !firstDlBtn.parentNode.querySelector('.bh-capsule-wrap')) {
                    const fileUrl = window.location.href;
                    const cap0 = createCapsule(fileUrl, 0);
                    const cap1 = createCapsule(fileUrl, 1);
                    if (cap0 || cap1) {
                        const wrap = document.createElement('span');
                        wrap.className = 'bh-capsule-wrap';
                        if (cap0) wrap.appendChild(cap0);
                        if (cap1) wrap.appendChild(cap1);
                        firstDlBtn.parentNode.appendChild(wrap);
                    }
                }
            }
        }

        return true;
    }
    // --- Main Processing Function ---
    function enhancePageContentSync() {
        const content = document.querySelector('.entry-text article');
        if (!content) {
            console.log('Sinflix Modifier: Content not found.');
            return false;
        }

        const currentVersion = 'v6.4.4_sync_single_pass';
        if (content.dataset.enhancedv === currentVersion) {
            return true;
        }
        content.dataset.enhancedv = currentVersion;

        console.log(`Sinflix Modifier (${currentVersion}): Processing synchronously...`);

        // 1. Move currently airing if set
        if (config.moveCurrentlyAiringToTop) {
            reorderSections();
        }

        // 2. Patch existing links target attribute for better native UX
        const existingLinks = content.querySelectorAll('a[href]');
        existingLinks.forEach(link => {
            if (link.dataset.sinflixProcessed || link.href.startsWith('#') || link.href.startsWith('javascript:')) return;
            link.dataset.sinflixProcessed = 'true';
            
            const isDownloadLink = link.href.includes('buzzheavier.com') 
                                || link.href.includes('mega.nz') 
                                || link.href.includes('mega.co.nz') 
                                || link.href.includes('pst.moe')
                                || link.href.includes('pixeldrain.com')
                                || link.href.includes('ok.ru');
            if (isDownloadLink) {
                if (config.downloadLinkOpenStyle !== 'popup') {
                    if (link.getAttribute('target') !== '_blank') {
                        link.setAttribute('target', '_blank');
                    }
                }
            }
        });

        // 3. Setup BuzzHeavier regex
        const buzzRegex = /\b(?![a-zA-Z]{12}\b)([a-zA-Z0-9]{12})\b/g;

        // 4. Process all text nodes for Circle injection and BuzzHeavier link conversion in one pass
        const textNodes = [];
        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
            acceptNode: function(n) {
                const parent = n.parentNode;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (['A', 'SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return NodeFilter.FILTER_REJECT;
                if (parent.closest('a, .kdrama-highlight, .kdrama-search-icon, .kdrama-circle-container')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return n.nodeValue.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });

        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        // Process function
        function processTextNodeSync(textNode) {
            const fullText = textNode.textContent;
            
            // Fast pattern checks
            buzzRegex.lastIndex = 0;
            const hasBuzzId = buzzRegex.test(fullText);
            const mightHaveDrama = fullText.includes('[') || fullText.includes('-') || /ep/i.test(fullText);
            
            if (!hasBuzzId && !mightHaveDrama) return;

            const lines = fullText.split('\n');
            const fragment = document.createDocumentFragment();
            let modified = false;

            lines.forEach((line, lineIdx) => {
                let lineFragment = null;

                // A. Check for drama name & inject circles
                const dramaName = extractDramaName(line);
                if (dramaName && (config.showGoogleCircle || config.showMdlCircle)) {
                    lineFragment = document.createDocumentFragment();
                    modified = true;

                    const container = document.createElement('span');
                    container.className = 'kdrama-circle-container';

                    if (config.showGoogleCircle) {
                        const searchQuery = (dramaName + ' ' + config.googleSearchSuffix).trim();
                        const googleUrl = 'https://www.google.com/search?q=' + encodeURIComponent(searchQuery);
                        const googleCircle = document.createElement('span');
                        googleCircle.className = 'kdrama-circle google-circle';
                        googleCircle.title = `Search '${dramaName}' on Google`;
                        googleCircle.onclick = (e) => {
                            e.stopPropagation();
                            if (config.linkOpenStyle === 'popup') {
                                openInCenter(googleUrl, 'sinflix_Google Search');
                            } else {
                                window.open(googleUrl, '_blank');
                            }
                        };
                        container.appendChild(googleCircle);
                    }

                    if (config.showMdlCircle) {
                        const mdlUrl = 'https://mydramalist.com/search?q=' + encodeURIComponent(dramaName) + '&adv=titles&ty=68&co=3&so=relevance';
                        const mdlCircle = document.createElement('span');
                        mdlCircle.className = 'kdrama-circle mdl-circle';
                        mdlCircle.title = `Search '${dramaName}' on MyDramaList\nCtrl+Click to copy first result link`;
                        mdlCircle.onclick = async (e) => {
                            e.stopPropagation();
                            if (e.ctrlKey) {
                                showNotification('Getting the link...', 'info');
                                const firstResultUrl = await getMdlFirstResultUrl(mdlUrl, dramaName);
                                if (firstResultUrl) {
                                    const success = await copyToClipboard(firstResultUrl);
                                    showNotification(success ? 'Link copied to clipboard!' : 'Failed to copy link to clipboard', success ? 'success' : 'error');
                                } else {
                                    showNotification('No results found for this drama', 'error');
                                }
                                return;
                            }
                            loadMdlPageAndOpenFirstResult(mdlUrl, dramaName);
                        };
                        container.appendChild(mdlCircle);
                    }

                    lineFragment.appendChild(container);
                }

                // B. Convert Buzzheavier IDs to links
                let linePartsFrag = null;
                if (config.convertBuzzheavierLinks) {
                    buzzRegex.lastIndex = 0;
                    let lastIdx = 0;
                    let match;

                    while ((match = buzzRegex.exec(line)) !== null) {
                        if (!linePartsFrag) {
                            linePartsFrag = document.createDocumentFragment();
                            modified = true;
                        }
                        if (match.index > lastIdx) {
                            linePartsFrag.appendChild(document.createTextNode(line.slice(lastIdx, match.index)));
                        }

                        const link = document.createElement('a');
                        link.href = 'https://buzzheavier.com/' + match[1];
                        link.textContent = link.href;
                        link.target = '_blank';
                        linePartsFrag.appendChild(link);

                        lastIdx = match.index + match[0].length;
                    }

                    if (linePartsFrag) {
                        if (lastIdx < line.length) {
                            linePartsFrag.appendChild(document.createTextNode(line.slice(lastIdx)));
                        }
                    }
                }

                // C. Assemble the line, preserving original text content when no link was matched
                if (lineFragment) {
                    if (linePartsFrag) {
                        lineFragment.appendChild(linePartsFrag);
                    } else {
                        lineFragment.appendChild(document.createTextNode(line));
                    }
                    fragment.appendChild(lineFragment);
                } else {
                    if (linePartsFrag) {
                        fragment.appendChild(linePartsFrag);
                    } else {
                        fragment.appendChild(document.createTextNode(line));
                    }
                }

                // Newline (not on very last line)
                if (lineIdx < lines.length - 1) {
                    fragment.appendChild(document.createTextNode('\n'));
                }
            });

            if (modified && textNode.parentNode) {
                textNode.parentNode.replaceChild(fragment, textNode);
            }
        }

        // Process all nodes in small asynchronous batches to keep the main thread/scrolling completely responsive
        let index = 0;
        function processNextBatch() {
            const batchSize = 40; // Process 40 text nodes per batch (~3ms) to prevent long-task blocking
            const end = Math.min(index + batchSize, textNodes.length);
            for (; index < end; index++) {
                processTextNodeSync(textNodes[index]);
            }
            if (index < textNodes.length) {
                setTimeout(processNextBatch, 0); // Yield to the browser
            } else {
                content.classList.add('sinflix-processed');
                console.log('Sinflix Modifier: Synchronous processing complete. ✨');
            }
        }
        processNextBatch();

        return true;
    }

    // --- Immediate early reordering function ---
    function tryEarlyReorder() {
        if (!config.moveCurrentlyAiringToTop) return;

        const content = document.querySelector('.entry-text article');
        if (content && content.dataset.sectionsReordered !== 'true') {
            reorderSections();
        }
    }

    // --- Section Reordering Function ---
    function reorderSections() {
        const content = document.querySelector('.entry-text article');
        if (!content) {
            console.log('Sinflix Modifier: Content not found for reordering');
            return;
        }

        // Check if already reordered to avoid duplicate processing
        if (content.dataset.sectionsReordered === 'true') {
            return;
        }

        try {
            // Find all h4 elements that represent section headers
            const headersNodeList = content.querySelectorAll('h4');
            const headers = Array.from(headersNodeList);
            let currentlyAiringHeader = null;
            let insertBeforeHeader = null;

            // Find the "Currently Airing" header
            for (const header of headers) {
                if (header.textContent.trim().toLowerCase().includes('currently airing')) {
                    currentlyAiringHeader = header;
                    break;
                }
            }

            if (!currentlyAiringHeader) {
                console.log('Sinflix Modifier: "Currently Airing" section not found');
                headers.forEach(h => h.classList.add('sinflix-visible'));
                content.dataset.sectionsReordered = 'true';
                return;
            }

            // Find the insertion point dynamically:
            // The first h4 that is NOT the page-title header (index 0) and NOT Currently Airing.
            // This works regardless of what the second section is named.
            const firstH4 = headers[0];
            for (const header of headers) {
                if (header === firstH4) continue;          // skip page title
                if (header === currentlyAiringHeader) continue; // skip itself
                insertBeforeHeader = header;
                break;
            }

            if (!insertBeforeHeader) {
                console.log('Sinflix Modifier: No valid insertion point found for reordering');
                headers.forEach(h => h.classList.add('sinflix-visible'));
                content.dataset.sectionsReordered = 'true';
                return;
            }

            // Check if Currently Airing is already before the insertion point
            const airingIndex = headers.indexOf(currentlyAiringHeader);
            const insertIndex = headers.indexOf(insertBeforeHeader);

            if (airingIndex < insertIndex) {
                console.log('Sinflix Modifier: Currently Airing is already at the top');
                content.dataset.sectionsReordered = 'true';
                headers.forEach(h => h.classList.add('sinflix-visible'));
                return;
            }

            // Collect all content belonging to the "Currently Airing" section
            // (everything between the h4 and the next h4)
            const currentlyAiringContent = [];
            let currentElement = currentlyAiringHeader.nextElementSibling;
            while (currentElement && currentElement.tagName !== 'H4') {
                currentlyAiringContent.push(currentElement);
                currentElement = currentElement.nextElementSibling;
            }

            // Remove "Currently Airing" section from its current position
            currentlyAiringHeader.remove();
            currentlyAiringContent.forEach(el => el.remove());

            // Re-insert before the target section
            const parentElement = insertBeforeHeader.parentNode;
            parentElement.insertBefore(currentlyAiringHeader, insertBeforeHeader);

            let insertAfter = currentlyAiringHeader;
            currentlyAiringContent.forEach(el => {
                parentElement.insertBefore(el, insertAfter.nextSibling);
                insertAfter = el;
            });

            // Add a visual separator after the moved section if one doesn't already exist
            if (insertAfter.nextSibling && insertAfter.nextSibling.tagName !== 'HR') {
                const separator = document.createElement('hr');
                parentElement.insertBefore(separator, insertAfter.nextSibling);
            }

            // Mark as reordered to prevent duplicate processing
            content.dataset.sectionsReordered = 'true';

            // Reveal all headers now that reordering is complete
            content.querySelectorAll('h4').forEach(h => h.classList.add('sinflix-visible'));

            console.log('Sinflix Modifier: Successfully moved "Currently Airing" section to top');
        } catch (error) {
            console.error('Sinflix Modifier: Error reordering sections:', error);
            // Show all headers in case of error
            content.querySelectorAll('h4').forEach(h => h.classList.add('sinflix-visible'));
        }
    }

    // --- Settings UI ---
    function createSettingsUI() {
        const settingsButton = document.createElement('div');
        settingsButton.id = 'kdrama-settings-button';
        settingsButton.innerHTML = `<svg fill="currentColor" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
        // Only show the fixed settings button when the top search capsule is OFF
        if (!config.showTopSearchBar) {
            document.body.appendChild(settingsButton);
        }

        const modal = document.createElement('div');
        modal.id = 'kdrama-settings-modal';
        modal.innerHTML = `
            <div class="kdrama-modal-content">
                <div class="kdrama-modal-header">
                    <h2>
                        <svg class="header-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                        </svg>
                        SinFlix Modifier Settings
                    </h2>
                    <button id="kdrama-settings-close">&times;</button>
                </div>

                <div class="kdrama-modal-body">
                    <!-- Features Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Features
                        </h3>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Google Search Icons</div>
                                <div class="kdrama-toggle-description">Show blue circle icons for Google search next to drama titles</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-google" ${config.showGoogleCircle ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-setting-item" style="margin-bottom: 20px;">
                            <div class="kdrama-toggle-info" style="margin-bottom: 8px;">
                                <div class="kdrama-toggle-label">Google Search Keyword Suffix</div>
                                <div class="kdrama-toggle-description">Appended to title when searching (e.g. "TV Series")</div>
                            </div>
                            <input type="text" id="setting-google-suffix" class="kdrama-text-input" value="${config.googleSearchSuffix.replace(/"/g, '&quot;')}" placeholder="TV Series">
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">MyDramaList Search Icons</div>
                                <div class="kdrama-toggle-description">Show purple circle icons for MyDramaList search next to drama titles</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-mdl" ${config.showMdlCircle ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">BuzzHeavier Link Conversion</div>
                                <div class="kdrama-toggle-description">Automatically convert BuzzHeavier IDs to clickable links</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-buzz" ${config.convertBuzzheavierLinks ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Interface Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                            </svg>
                            Interface
                        </h3>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Back to Top Button</div>
                                <div class="kdrama-toggle-description">Show floating button to quickly scroll to top of page</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-back-to-top" ${config.showBackToTopButton ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">SinFlix Chat Button</div>
                                <div class="kdrama-toggle-description">Show floating button for quick access to SinFlix community chat</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-chat-box" ${config.showChatBoxButton ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Move "Currently Airing" to Top</div>
                                <div class="kdrama-toggle-description">Automatically move the Currently Airing section to the top of the page</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-move-airing" ${config.moveCurrentlyAiringToTop ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Top Search Bar</div>
                                <div class="kdrama-toggle-description">Show a Dynamic Island-style search bar at the top. Morphs into a circle icon after 5s or on scroll</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-top-searchbar" ${config.showTopSearchBar ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- pst.moe Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            pst.moe
                        </h3>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Enable pst.moe Enhancements</div>
                                <div class="kdrama-toggle-description">Convert links into hyperlinks and add "Copy All Links" option</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-pstmoe" ${config.pstMoeEnhancements ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Mega.nz → Fetchrr.io</div>
                                <div class="kdrama-toggle-description">Show a ● dot next to each Mega link (on pst.moe) and a floating pill on mega.nz pages — click to mirror the link via Fetchrr.io for a direct, unthrottled download.</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-mega-fetchrr" ${config.megaFetchrr ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

${'showFdCircle' in config ? `
                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">FileDitch Download Circles</div>
                                <div class="kdrama-toggle-description">Show an orange &#9679; circle next to each fileditchfiles.me link. Clicking opens the page, auto-clicks the download button, and closes the window.</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-fd-resolve" ${config.showFdCircle ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>
                    </div>` : '</div>'}

                    <!-- Mega.nz Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                            Mega.nz
                        </h3>

                        <div class="kdrama-radio-group">
                            <div class="kdrama-radio-group-title">Fetchrr.io Mirror Opening Style</div>
                            <div class="kdrama-radio-options">
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="megaFetchrrStyle" value="tab" id="mega-fetchrr-tab" ${config.megaFetchrrOpenStyle === 'tab' ? 'checked' : ''}>
                                    <label for="mega-fetchrr-tab" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.89-2-2-2zm0 14H5V8h14v10z"/></svg>
                                        New Tab
                                    </label>
                                </div>
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="megaFetchrrStyle" value="popup" id="mega-fetchrr-popup" ${config.megaFetchrrOpenStyle === 'popup' ? 'checked' : ''}>
                                    <label for="mega-fetchrr-popup" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1z"/></svg>
                                        Popup Window
                                    </label>
                                </div>
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="megaFetchrrStyle" value="self" id="mega-fetchrr-self" ${config.megaFetchrrOpenStyle === 'self' ? 'checked' : ''}>
                                    <label for="mega-fetchrr-self" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                                        Same Window
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Buzzheavier Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                            Buzzheavier
                        </h3>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Enable Buzzheavier Features</div>
                                <div class="kdrama-toggle-description">Master switch for Buzzheavier enhancements</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-buzz-main" ${config.buzzheavierEnhancements ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Split by Quality</div>
                                <div class="kdrama-toggle-description">Divide folder table into multiple tables based on resolution</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-buzz-split" ${config.buzzSplitQuality ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Direct Download Links</div>
                                <div class="kdrama-toggle-description">Add direct download button next to file links</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-buzz-dl" ${config.buzzDirectDownload ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Copy Links Button</div>
                                <div class="kdrama-toggle-description">Add button to copy all download links from table/page</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-buzz-copy" ${config.buzzCopyLinks ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>

                    </div>

                    <!-- Link Behavior Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                            </svg>
                            Link Behavior
                        </h3>

                        <div class="kdrama-radio-group">
                            <div class="kdrama-radio-group-title">Search Circle Icons Opening Style</div>
                            <div class="kdrama-radio-options">
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="linkStyle" value="popup" id="link-popup">
                                    <label for="link-popup" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm6 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v11z"/>
                                        </svg>
                                        Popup Window
                                    </label>
                                </div>
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="linkStyle" value="tab" id="link-tab">
                                    <label for="link-tab" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                        </svg>
                                        New Tab
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="kdrama-radio-group" style="margin-top: 16px;">
                            <div class="kdrama-radio-group-title">Chat Box Opening Style</div>
                            <div class="kdrama-radio-options">
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="chatBoxStyle" value="popup" id="chat-popup">
                                    <label for="chat-popup" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm6 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v11z"/>
                                        </svg>
                                        Popup Window
                                    </label>
                                </div>
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="chatBoxStyle" value="tab" id="chat-tab">
                                    <label for="chat-tab" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                        </svg>
                                        New Tab
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="kdrama-radio-group" style="margin-top: 16px;">
                            <div class="kdrama-radio-group-title">Download Links Opening Style</div>
                            <div class="kdrama-radio-options">
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="downloadLinkStyle" value="popup" id="dl-link-popup">
                                    <label for="dl-link-popup" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 7h-3V6a4 4 0 0 0-8 0v1H5a1 1 0 0 0-1 1v11a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8a1 1 0 0 0-1-1zM10 6a2 2 0 0 1 4 0v1h-4V6zm6 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V9h2v1a1 1 0 0 0 2 0V9h4v1a1 1 0 0 0 2 0V9h2v11z"/>
                                        </svg>
                                        Popup Window
                                    </label>
                                </div>
                                <div class="kdrama-radio-option">
                                    <input type="radio" name="downloadLinkStyle" value="tab" id="dl-link-tab">
                                    <label for="dl-link-tab" class="kdrama-radio-option-label">
                                        <svg class="kdrama-radio-option-icon" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                                        </svg>
                                        New Tab
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="kdrama-modal-footer">
                    <button id="kdrama-save-button">
                        <svg style="width: 18px; height: 18px; margin-right: 8px; vertical-align: middle;" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/>
                        </svg>
                        Save Settings & Refresh
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        //  NEW: Set the correct radio button based on saved config
        const linkStyleEl = document.querySelector(`input[name="linkStyle"][value="${config.linkOpenStyle}"]`);
        if (linkStyleEl) linkStyleEl.checked = true;
        const chatStyleEl = document.querySelector(`input[name="chatBoxStyle"][value="${config.chatBoxOpenStyle}"]`);
        if (chatStyleEl) chatStyleEl.checked = true;
        const dlStyleEl = document.querySelector(`input[name="downloadLinkStyle"][value="${config.downloadLinkOpenStyle}"]`);
        if (dlStyleEl) dlStyleEl.checked = true;

        const saveButton = document.getElementById('kdrama-save-button');
        const closeBtn = document.getElementById('kdrama-settings-close');

        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // lock page scroll while modal is open
            // Add a small delay for the animation
            setTimeout(() => modal.classList.add('show'), 10);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                document.body.style.overflow = ''; // restore page scroll
                setTimeout(() => modal.style.display = 'none', 200);
            }
        });

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');
            document.body.style.overflow = ''; // restore page scroll
            setTimeout(() => modal.style.display = 'none', 200);
        });

        // Additional escape key handler for settings modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.classList.remove('show');
                document.body.style.overflow = ''; // restore page scroll
                setTimeout(() => modal.style.display = 'none', 200);
                e.preventDefault();
            }
        });

        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            // Save checkbox values
            GM_setValue('showGoogleCircle', document.getElementById('setting-google').checked);
            GM_setValue('showMdlCircle', document.getElementById('setting-mdl').checked);
            GM_setValue('convertBuzzheavierLinks', document.getElementById('setting-buzz').checked);
            GM_setValue('showBackToTopButton', document.getElementById('setting-back-to-top').checked);
            GM_setValue('moveCurrentlyAiringToTop', document.getElementById('setting-move-airing').checked);
            GM_setValue('showChatBoxButton', document.getElementById('setting-chat-box').checked);
            GM_setValue('pstMoeEnhancements', document.getElementById('setting-pstmoe').checked);
            GM_setValue('megaFetchrr', document.getElementById('setting-mega-fetchrr').checked);
            const megaFetchrrStyleEl = document.querySelector('input[name="megaFetchrrStyle"]:checked');
            if (megaFetchrrStyleEl) GM_setValue('megaFetchrrOpenStyle', megaFetchrrStyleEl.value);
            const fdEl = document.getElementById('setting-fd-resolve');
            if (fdEl) GM_setValue('showFdCircle', fdEl.checked);

            //  NEW: Save the selected radio button values
            const selectedStyleEl = document.querySelector('input[name="linkStyle"]:checked');
            if (selectedStyleEl) GM_setValue('linkOpenStyle', selectedStyleEl.value);

            const selectedChatBoxStyleEl = document.querySelector('input[name="chatBoxStyle"]:checked');
            if (selectedChatBoxStyleEl) GM_setValue('chatBoxOpenStyle', selectedChatBoxStyleEl.value);

            const selectedDlLinkStyleEl = document.querySelector('input[name="downloadLinkStyle"]:checked');
            if (selectedDlLinkStyleEl) GM_setValue('downloadLinkOpenStyle', selectedDlLinkStyleEl.value);

            GM_setValue('googleSearchSuffix', document.getElementById('setting-google-suffix').value);

            // NEW: Buzzheavier Save
            GM_setValue('buzzheavierEnhancements', document.getElementById('setting-buzz-main').checked);
            GM_setValue('buzzSplitQuality', document.getElementById('setting-buzz-split').checked);
            GM_setValue('buzzDirectDownload', document.getElementById('setting-buzz-dl').checked);
            GM_setValue('buzzCopyLinks', document.getElementById('setting-buzz-copy').checked);

            const customSchemeEl = document.getElementById('setting-buzz-custom-scheme');
            if (customSchemeEl) GM_setValue('buzzCustomScheme', customSchemeEl.value);

            // NEW: Top search bar toggle
            GM_setValue('showTopSearchBar', document.getElementById('setting-top-searchbar').checked);

            location.reload();
        });
    }

    // --- Floating Action Buttons (Back to Top & Search) ---
    let highlightedElements = [];
    let currentMatchIndex = -1;

    function createFloatingButtons() {
        const backToTopBtn = document.createElement('button');
        backToTopBtn.id = 'kdrama-back-to-top';
        backToTopBtn.className = 'kdrama-float-button';
        backToTopBtn.setAttribute('aria-label', 'Back to top');
        backToTopBtn.title = 'Back to top';
        backToTopBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="6 15 12 9 18 15"></polyline></svg>`;
        document.body.appendChild(backToTopBtn);

        // Chat button: only show as floating button when top search capsule is OFF
        let chatBtn = null;
        if (config.showChatBoxButton && !config.showTopSearchBar) {
            chatBtn = document.createElement('button');
            chatBtn.id = 'kdrama-chat-button';
            chatBtn.className = 'kdrama-float-button show';
            chatBtn.setAttribute('aria-label', 'Open SinFlix Chat');
            chatBtn.title = 'SinFlix Chat';
            chatBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>`;
            document.body.appendChild(chatBtn);
        }

        function updateButtonPositions() {
            const baseBottom = 30;
            const buttonSpacing = 54;

            // Position chat button if enabled
            if (config.showChatBoxButton && chatBtn) {
                chatBtn.style.bottom = `${baseBottom}px`;
            }

            // Position back-to-top button at the top of the stack (it will handle its own visibility)
            const topPosition = config.showChatBoxButton ? baseBottom + buttonSpacing : baseBottom;
            backToTopBtn.style.bottom = `${topPosition}px`;
        }

        function updateButtonPositionsWithAnimation() {
            const baseBottom = 30;
            const buttonSpacing = 54;
            let currentBottom = baseBottom;

            // Calculate positions based on visible buttons
            const isBackToTopVisible = backToTopBtn.classList.contains('show');

            if (isBackToTopVisible) {
                // Back-to-top is visible, so other buttons move up
                backToTopBtn.style.bottom = `${currentBottom}px`;
                currentBottom += buttonSpacing;
            }

            // Chat button position (if enabled)
            if (config.showChatBoxButton && chatBtn) {
                chatBtn.style.bottom = `${currentBottom}px`;
            }
        }
        updateButtonPositions();

        // Throttle scroll handler with rAF to avoid blocking the main thread on every scroll pixel.
        let bttRafPending = false;
        window.addEventListener('scroll', () => {
            if (bttRafPending) return;
            bttRafPending = true;
            requestAnimationFrame(() => {
                bttRafPending = false;
                const scrollThreshold = 200;
                const shouldShowBackToTop = window.scrollY > scrollThreshold && config.showBackToTopButton;
                const isCurrentlyShowing = backToTopBtn.classList.contains('show');

                if (shouldShowBackToTop && !isCurrentlyShowing) {
                    // Show back-to-top button and animate other buttons
                    backToTopBtn.classList.add('show');
                    updateButtonPositionsWithAnimation();
                } else if (!shouldShowBackToTop && isCurrentlyShowing) {
                    // Hide back-to-top button and animate other buttons
                    backToTopBtn.classList.remove('show');
                    updateButtonPositionsWithAnimation();
                }
            });
        }, { passive: true });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // NEW: Add chat button click handler
        if (config.showChatBoxButton && chatBtn) {
            chatBtn.addEventListener('click', () => {
                const chatUrl = 'https://my.cbox.ws/sin-flix';
                if (config.chatBoxOpenStyle === 'popup') {
                    openInCenter(chatUrl, 'sinflix_chat');
                } else {
                    window.open(chatUrl, '_blank');
                }
            });
        }
    }

    // --- Top Search Bar (Dynamic Island) ---
    function createTopSearchBar() {
        if (!config.showTopSearchBar) return;

        // The wrapper pill/circle
        const wrap = document.createElement('div');
        wrap.id = 'sfx-top-searchbar-wrap';

        // Search icon
        const iconEl = document.createElement('span');
        iconEl.id = 'sfx-top-search-icon';
        iconEl.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
        wrap.appendChild(iconEl);

        // Collapsed label (hidden when expanded, visible when collapsed)
        const labelEl = document.createElement('span');
        labelEl.id = 'sfx-top-search-label';
        labelEl.textContent = 'Search';
        wrap.appendChild(labelEl);

        // Text input
        const input = document.createElement('input');
        input.id = 'sfx-top-search-input';
        input.type = 'text';
        input.placeholder = 'Search on page…';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('spellcheck', 'false');
        wrap.appendChild(input);

        // Match counter
        const counter = document.createElement('span');
        counter.id = 'sfx-top-search-count';
        wrap.appendChild(counter);

        // Prev / Next buttons
        const prevBtn = document.createElement('button');
        prevBtn.className = 'sfx-top-nav-btn';
        prevBtn.title = 'Previous match';
        prevBtn.disabled = true;
        prevBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
        wrap.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'sfx-top-nav-btn';
        nextBtn.title = 'Next match';
        nextBtn.disabled = true;
        nextBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>`;
        wrap.appendChild(nextBtn);

        // Close / collapse button
        const closeBtn = document.createElement('button');
        closeBtn.id = 'sfx-top-search-close';
        closeBtn.title = 'Dismiss search bar';
        closeBtn.innerHTML = '&times;';
        wrap.appendChild(closeBtn);

        // Separator between search controls and utility icons
        const capSep = document.createElement('span');
        capSep.className = 'sfx-cap-sep';
        wrap.appendChild(capSep);

        // Settings icon button (inside capsule)
        const capSettings = document.createElement('button');
        capSettings.className = 'sfx-cap-action';
        capSettings.title = 'Settings';
        capSettings.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/></svg>`;
        capSettings.addEventListener('click', (e) => {
            e.stopPropagation();
            const modal = document.getElementById('kdrama-settings-modal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden'; // lock page scroll while modal is open
                setTimeout(() => modal.classList.add('show'), 10);
            }
        });
        wrap.appendChild(capSettings);

        // Chat icon button (inside capsule, only if enabled)
        if (config.showChatBoxButton) {
            const capChat = document.createElement('button');
            capChat.className = 'sfx-cap-action';
            capChat.title = 'SinFlix Chat';
            capChat.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path></svg>`;
            capChat.addEventListener('click', (e) => {
                e.stopPropagation();
                const chatUrl = 'https://my.cbox.ws/sin-flix';
                if (config.chatBoxOpenStyle === 'popup') {
                    openInCenter(chatUrl, 'sinflix_chat');
                } else {
                    window.open(chatUrl, '_blank');
                }
            });
            wrap.appendChild(capChat);
        }

        document.body.appendChild(wrap);

        // ---- State: start collapsed ----
        let isCollapsed = true;
        wrap.classList.add('sfx-collapsed');
        let sfxHighlights = [];
        let sfxCurrentIdx = -1;

        // ---- Collapse / expand helpers ----
        function collapse() {
            if (isCollapsed) return;
            isCollapsed = true;
            wrap.classList.add('sfx-collapsed');
            input.blur();
        }

        function expand() {
            if (!isCollapsed) return;
            isCollapsed = false;
            wrap.classList.remove('sfx-collapsed');
            // Small bounce feedback
            wrap.classList.add('sfx-expanding');
            setTimeout(() => wrap.classList.remove('sfx-expanding'), 600);
            // Focus input after animation settles
            setTimeout(() => input.focus(), 200);
        }

        // ---- Search highlight logic ----
        function clearSfxHighlights() {
            sfxHighlights.forEach(el => {
                const parent = el.parentNode;
                if (parent) {
                    parent.replaceChild(document.createTextNode(el.textContent), el);
                    parent.normalize();
                }
            });
            sfxHighlights = [];
            sfxCurrentIdx = -1;
        }

        function runSfxSearch(query) {
            clearSfxHighlights();

            if (!query || query.length < 1) {
                counter.textContent = '';
                prevBtn.disabled = true;
                nextBtn.disabled = true;
                return;
            }

            const lq = query.toLowerCase();

            // Only search inside the article content (drama list)
            const article = document.querySelector('.entry-text article');
            if (!article) {
                counter.textContent = 'No content';
                return;
            }

            // Walk text nodes inside the article, skipping links and script/style
            const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT, {
                acceptNode: n => {
                    const el = n.parentElement;
                    if (!el) return NodeFilter.FILTER_REJECT;
                    const tag = el.tagName;
                    if (['SCRIPT','STYLE','NOSCRIPT','A'].includes(tag)) return NodeFilter.FILTER_REJECT;
                    if (el.closest('a')) return NodeFilter.FILTER_REJECT; // skip nested link text
                    return n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            });

            const textNodes = [];
            let node;
            while ((node = walker.nextNode())) textNodes.push(node);

            textNodes.forEach(tn => {
                const fullText = tn.textContent;
                // Process line by line — only highlight within drama name lines
                const lines = fullText.split('\n');
                let anyMatch = false;
                const frag = document.createDocumentFragment();

                lines.forEach((line, lineIdx) => {
                    const dramaName = extractDramaName(line);
                    if (dramaName && dramaName.toLowerCase().includes(lq)) {
                        // This line has a drama name that matches — highlight occurrences of query
                        const lLine = line.toLowerCase();
                        let last = 0;
                        let pos = lLine.indexOf(lq);
                        while (pos !== -1) {
                            if (pos > last) frag.appendChild(document.createTextNode(line.slice(last, pos)));
                            const mark = document.createElement('mark');
                            mark.className = 'kdrama-highlight';
                            mark.textContent = line.slice(pos, pos + lq.length);
                            frag.appendChild(mark);
                            sfxHighlights.push(mark);
                            last = pos + lq.length;
                            pos = lLine.indexOf(lq, last);
                        }
                        if (last < line.length) frag.appendChild(document.createTextNode(line.slice(last)));
                        anyMatch = true;
                    } else {
                        frag.appendChild(document.createTextNode(line));
                    }
                    // Re-add the newline between lines (but not after the very last)
                    if (lineIdx < lines.length - 1) frag.appendChild(document.createTextNode('\n'));
                });

                if (anyMatch && tn.parentNode) tn.parentNode.replaceChild(frag, tn);
            });

            if (sfxHighlights.length === 0) {
                counter.textContent = 'No results';
                prevBtn.disabled = true;
                nextBtn.disabled = true;
            } else {
                sfxCurrentIdx = 0;
                jumpToSfxMatch(0);
                prevBtn.disabled = false;
                nextBtn.disabled = false;
            }
        }

        function jumpToSfxMatch(idx) {
            sfxHighlights.forEach((el, i) => el.classList.toggle('current', i === idx));
            const el = sfxHighlights[idx];
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                counter.textContent = `${idx + 1} / ${sfxHighlights.length}`;
            }
        }

        // ---- Events ----
        let searchDebounce = null;
        const triggerSearch = () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => runSfxSearch(input.value.trim()), 280);
        };

        input.addEventListener('input', triggerSearch);

        // Collapse on blur only when no active search results.
        // While results are shown the user needs the bar to navigate between them.
        input.addEventListener('blur', e => {
            if (sfxHighlights.length > 0) return;      // keep open while navigating results
            if (wrap.contains(e.relatedTarget)) return; // keep open when focusing bar buttons
            collapse();
        });

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                if (sfxHighlights.length === 0) return;
                sfxCurrentIdx = e.shiftKey
                    ? (sfxCurrentIdx - 1 + sfxHighlights.length) % sfxHighlights.length
                    : (sfxCurrentIdx + 1) % sfxHighlights.length;
                jumpToSfxMatch(sfxCurrentIdx);
            } else if (e.key === 'Escape') {
                collapse();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (sfxHighlights.length === 0) return;
            sfxCurrentIdx = (sfxCurrentIdx - 1 + sfxHighlights.length) % sfxHighlights.length;
            jumpToSfxMatch(sfxCurrentIdx);
            input.focus();
        });

        nextBtn.addEventListener('click', () => {
            if (sfxHighlights.length === 0) return;
            sfxCurrentIdx = (sfxCurrentIdx + 1) % sfxHighlights.length;
            jumpToSfxMatch(sfxCurrentIdx);
            input.focus();
        });

        closeBtn.addEventListener('click', e => {
            e.stopPropagation();
            clearSfxHighlights();
            input.value = '';
            counter.textContent = '';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            collapse();
        });

        // Clicking the collapsed circle expands it
        wrap.addEventListener('click', e => {
            if (isCollapsed) {
                expand();
            }
        });

        // Collapse on user scroll only when no active search results.
        // Throttled with rAF to avoid heavy CSS transition repaints on every scroll event.
        let scrollListenerActive = false;
        let sfxScrollRafPending = false;
        setTimeout(() => { scrollListenerActive = true; }, 300);
        window.addEventListener('scroll', () => {
            if (!scrollListenerActive) return;
            if (isCollapsed) return;
            if (sfxScrollRafPending) return;
            sfxScrollRafPending = true;
            requestAnimationFrame(() => {
                sfxScrollRafPending = false;
                if (sfxHighlights.length > 0) return; // keep open while navigating results
                if (!isCollapsed) collapse();
            });
        }, { passive: true });

        // Clicking anywhere outside the bar always collapses it (even with active results).
        document.addEventListener('click', e => {
            if (!isCollapsed && !wrap.contains(e.target)) {
                collapse();
            }
        }, { capture: true, passive: true });
    }


    // --- FileDitch page handler: auto-clicks the download button and closes the popup ---
    // Runs on fileditchfiles.me when the page is opened by the orange circle button.
    function handleFileDitchPage() {
        if (!window.location.hostname.includes('fileditchfiles.me')) return;
        if (!window.opener) return;

        function tryClick() {
            const btn = document.querySelector('a.btn.btn-main[download], a.btn-main[download]');
            if (!btn || !btn.href) return false;
            btn.click();
            setTimeout(() => { try { window.close(); } catch(_) {} }, 3000);
            return true;
        }

        if (!tryClick()) {
            // Button not in DOM yet — wait for it
            const obs = new MutationObserver(() => {
                if (tryClick()) obs.disconnect();
            });
            obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
            // Give up after 15s and close
            setTimeout(() => { obs.disconnect(); try { window.close(); } catch(_) {} }, 15000);
        }
    }

    // --- Mega.nz → Fetchrr.io Pill ---
    function showMegaFetchrrPill() {
        if (!config.megaFetchrr) return;
        if (!window.location.hostname.includes('mega.nz')) return;
        // Act on both /file/ and /folder/ pages
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
            // Animate in after a short delay so the transition fires
            requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('sfx-pill-visible')));
        };
        if (document.body) appendPill();
        else document.addEventListener('DOMContentLoaded', appendPill);

        pill.addEventListener('click', () => {
            openMegaInFetchrr(window.location.href);
        });
    }

    // --- Enhanced Initialization ---
    function initialize() {
        if (window.location.hostname.includes('pst.moe')) {
            try {
                enhancePstMoeContent();
            } catch (e) {
                console.error('Sinflix Modifier error during pst.moe enhancement:', e);
            }
            // For pst.moe, we just setup the UI and stop rentry-specific logic
            createSettingsUI();
            return;
        }

        if (window.location.hostname.includes('fileditchfiles.me')) {
            try { handleFileDitchPage(); } catch(e) {
                console.error('Sinflix Modifier error on fileditchfiles.me:', e);
            }
            return;
        }

        if (window.location.hostname.includes('fetchrr.io')) {
            try {
                handleFetchrrPage();
            } catch (e) {
                console.error('Sinflix Modifier error on fetchrr.io:', e);
            }
            return;
        }

        if (window.location.hostname.includes('mega.nz')) {
            try {
                showMegaFetchrrPill();
            } catch (e) {
                console.error('Sinflix Modifier error during mega.nz pill:', e);
            }
            // No settings gear on mega.nz — keep the page clean
            return;
        }

        if (window.location.hostname.includes('buzzheavier.com')) {
            try {
                enhanceBuzzheavierContent();

                // Debounced MutationObserver for HTMX SPA navigation & dynamic rendering.
                let buzzObserverTimer = null;
                const runBuzzEnhance = (mutations) => {
                    // Check if called by MutationObserver; if so, verify mutations list
                    if (mutations && Array.isArray(mutations)) {
                        let hasTable = false;
                        for (const m of mutations) {
                            if (m.type === 'childList') {
                                for (const node of m.addedNodes) {
                                    if (node.nodeType === 1) { // ELEMENT_NODE
                                        const tag = node.localName;
                                        if (tag === 'tr' && node.classList.contains('sfx-processed')) {
                                            continue;
                                        }
                                        if (tag === 'tr' || tag === 'tbody' || tag === 'table' || node.querySelector('tr:not(.sfx-processed), tbody, table')) {
                                            hasTable = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (hasTable) break;
                        }
                        if (!hasTable) return;
                    }

                    clearTimeout(buzzObserverTimer);
                    buzzObserverTimer = setTimeout(() => {
                        try {
                            enhanceBuzzheavierContent();
                        } catch (e) {
                            console.error('Sinflix Modifier error during buzzheavier observer processing:', e);
                        }
                    }, 30);
                };

                const observer = new MutationObserver(runBuzzEnhance);
                observer.observe(document.body, { childList: true, subtree: true });

                // Also listen for HTMX events
                document.body.addEventListener('htmx:afterSwap', () => runBuzzEnhance());
                document.body.addEventListener('htmx:afterSettle', () => runBuzzEnhance());
            } catch (e) {
                console.error('Sinflix Modifier error during buzzheavier enhancement:', e);
            }
            createSettingsUI();
            return;
        }

        // --- Content Enhancement ---
        try {
            enhancePageContentSync();
        } catch (e) {
            console.error('Sinflix Modifier error during initial enhancement:', e);
        }

        createSettingsUI();
        createFloatingButtons();
        createTopSearchBar();

        // Global capture click delegation to handle download and chat links (handles dynamic updates too)
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link || !link.href) return;

            // 1. Chat link check
            if (link.href.includes('my.cbox.ws/sin-flix')) {
                e.preventDefault();
                e.stopPropagation();
                if (config.chatBoxOpenStyle === 'popup') {
                    openInCenter(link.href, 'sinflix_chat');
                } else {
                    window.open(link.href, '_blank');
                }
                return;
            }

            // 2. Download links check
            const isDownloadLink = link.href.includes('buzzheavier.com')
                                || link.href.includes('mega.nz')
                                || link.href.includes('mega.co.nz')
                                || link.href.includes('pst.moe')
                                || link.href.includes('pixeldrain.com')
                                || link.href.includes('ok.ru');

            if (isDownloadLink) {
                if (config.downloadLinkOpenStyle === 'popup') {
                    e.preventDefault();
                    e.stopPropagation();
                    openInCenter(link.href, 'sinflix_download');
                } else {
                    if (link.getAttribute('target') !== '_blank') {
                        link.setAttribute('target', '_blank');
                    }
                }
            }
        }, { capture: true });

        // Close settings modal on window scroll — but NOT when scrolling
        // inside the modal's own scrollable body (that would make the modal
        // close itself whenever the user scrolls the settings list).
        const settingsModal = document.getElementById('kdrama-settings-modal');
        const settingsModalBody = settingsModal ? settingsModal.querySelector('.kdrama-modal-body') : null;
        let modalScrollRafPending = false;
        window.addEventListener('scroll', (e) => {
            if (!settingsModal || settingsModal.style.display !== 'flex') return;
            // If the scroll originated from inside the modal body, ignore it
            if (settingsModalBody && settingsModalBody.contains(e.target)) return;
            if (modalScrollRafPending) return;
            modalScrollRafPending = true;
            requestAnimationFrame(() => {
                modalScrollRafPending = false;
                if (settingsModal && settingsModal.style.display === 'flex') {
                    if (document.activeElement !== document.getElementById('kdrama-search-input')) {
                        settingsModal.style.display = 'none';
                        settingsModal.classList.remove('show');
                        // Restore body scroll when modal closes via scroll
                        document.body.style.overflow = '';
                    }
                }
            });
        }, { passive: true });
    }

    // Initialize the script — single entry point to avoid main-thread contention.
    // Previously, enhancePageContent() was fired 5+ times simultaneously
    // (script-start, readystatechange, DOMContentLoaded, setInterval × N),
    // blocking the main thread for 1-2 s and making clicks/scrolls unresponsive.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
// ---