// ==UserScript==
// @name         Sinflix Modifier
// @namespace    hhttps://openuserjs.org/users/asurpbs
// @version      26.4.07
// @description  Enhances SinFlix pages with Google & MyDramaList search icons, BuzzHeavier ID auto-linking, back-to-top button, inline search, customizable section ordering, and a SinFlix chat button. On pst.moe: clickable links, copy-all-links per resolution, and Mega.nz bypass circles (click to instantly bypass & download, or copy all bypass links). On mega.nz file pages: floating bypass download button that skips Mega quota limits.
// @license      MIT
// @author       asurpbs
// @match        https://rentry.co/sin-flix
// @match        https://text.is/Sinflix
// @match        https://pst.moe/paste/*
// @match        https://buzzheavier.com/*
// @match        https://mega.nz/file/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @updateURL https://openuserjs.org/meta/asurpbs/Sinflix_Modifier.meta.js
// @downloadURL https://openuserjs.org/install/asurpbs/Sinflix_Modifier.user.js
// @copyright    2026, asurpbs (https://openuserjs.org/users/asurpbs)
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
        chatBoxOpenStyle: GM_getValue('chatBoxOpenStyle', 'tab'),
        // NEW: pst.moe enhancements
        pstMoeEnhancements: GM_getValue('pstMoeEnhancements', true),
        // NEW: Google search keyword suffix
        googleSearchSuffix: GM_getValue('googleSearchSuffix', 'TV Series'),
        // NEW: Buzzheavier enhancements
        buzzheavierEnhancements: GM_getValue('buzzheavierEnhancements', false),
        buzzSplitQuality: GM_getValue('buzzSplitQuality', false),
        buzzDirectDownload: GM_getValue('buzzDirectDownload', false),
        buzzCopyLinks: GM_getValue('buzzCopyLinks', false),
        // NEW: Mega.nz bypass
        megaBypass: GM_getValue('megaBypass', true),
        // NEW: Mega.nz floating download button
        megaNzButton: GM_getValue('megaNzButton', true)
    };

    // --- Style Definitions ---
    GM_addStyle(`
        /* --- Buzzheavier Tool Buttons --- */
        .bh-actions {
            display: inline-flex;
            gap: 4px;
            margin-left: 12px;
            vertical-align: middle;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }
        .bh-actions.single-page {
            opacity: 0.9;
            margin-left: 8px;
        }
        .bh-actions.single-page:hover {
            opacity: 1;
        }
        tr.editable:hover .bh-actions {
            opacity: 1;
        }
        .bh-btn {
            cursor: pointer;
            border: none;
            background: transparent;
            padding: 4px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: inherit;
            transition: all 0.2s ease;
        }
        .bh-actions.single-page .bh-btn {
            color: #ccc;
            padding: 6px;
        }
        .bh-btn:hover {
            background-color: rgba(255, 255, 255, 0.15);
            transform: scale(1.1);
            color: #fff;
            box-shadow: 0 0 8px rgba(0,0,0,0.2);
        }
        .bh-btn.play-btn:hover { color: #4ade80; }
        .bh-btn.copy-btn:hover { color: #60a5fa; }
        .bh-btn.dl-btn:hover   { color: #f472b6; }
        .bh-btn svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
            stroke: currentColor;
            stroke-width: 0;
        }
        .bh-actions.single-page .bh-btn svg {
            width: 20px;
            height: 20px;
        }
        .bh-btn.loading svg {
            animation: spin 0.8s linear infinite;
            fill: #fbbf24;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

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

        /* --- Mega Bypass Circle --- */
        .sinflix-mega-circle {
            display: inline-block;
            width: 13px;
            height: 13px;
            border-radius: 50%;
            background: #9aa0a6;
            cursor: pointer;
            vertical-align: middle;
            margin-left: 5px;
            opacity: 0.5;
            transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
            flex-shrink: 0;
        }
        .sinflix-mega-circle:hover {
            opacity: 1;
            transform: scale(1.25);
            background: #34a853;
        }
        .sinflix-mega-bypass-header {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin: 6px 0;
        }
        .sinflix-copy-bypass-btn {
            background: #2a2b2c;
            color: #e8eaed;
            border: 1px solid #9aa0a6;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            transition: all 0.2s;
        }
        .sinflix-copy-bypass-btn:hover {
            background: #34a853;
            border-color: #34a853;
            color: white;
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

        /* --- Settings Button --- */
        #kdrama-settings-button {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            z-index: 10001;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(6px);
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.3s ease;
        }
        .dark-mode #kdrama-settings-button {
            background: rgba(50, 50, 50, 0.4);
        }
        #kdrama-settings-button:hover {
            background: rgba(255, 255, 255, 0.35);
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

		.kdrama-circle {
			display: inline-block;
			width: 16px;
			height: 16px;
			border-radius: 50%;
			border: none;
			cursor: pointer;
			box-shadow: 0 0 6px rgba(0,0,0,0.2);
			vertical-align: middle;
			/* Make circles dimmed by default */
			opacity: 0.35;
			/* Add smooth transition for opacity */
			transition: transform 0.2s ease, opacity 0.2s ease;
			margin-right: 4px;
		}
		.kdrama-circle:hover {
			transform: scale(1.2);
			/* Make circles bright on hover */
			opacity: 1;
		}
        .google-circle {
            background: linear-gradient(90deg, #1A73E8 0%, #186F65 100%);
        }
        .mdl-circle {
            background: linear-gradient(90deg, #F0F2F5 0%, #E8EEF2 100%);
            border: 2px solid #5C88DA;
            box-shadow: 0 0 6px 2px rgba(75, 0, 130, 0.6);
        }
        .kdrama-circle-container {
            display: inline-flex;
            margin-right: 6px;
            vertical-align: middle;
        }

        /* --- Floating Buttons (Back to Top & Search) --- */
        .kdrama-float-button {
            position: fixed;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border: 1px solid rgba(255, 255, 255, 0.2);
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
            opacity: 0; /* Initially hidden, except for search button */
            pointer-events: none; /* Disable interaction when hidden */
            right: 20px;
        }
        .kdrama-float-button.show {
            opacity: 1;
            pointer-events: auto; /* Enable interaction when shown */
        }
        .kdrama-float-button:hover {
            background: rgba(50, 50, 50, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.35);
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
            transform: translateX(-50%);
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

        /* --- Search Modal --- */
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

    // --- Helper: convert a mega.nz URL to the bypass download URL ---
    function getMegaBypassUrl(megaUrl) {
        // Uses the wldbs workers API: base64-encode the URL, no extra fetch needed
        return `https://mega.wldbs.workers.dev/download?url=${btoa(megaUrl)}`;
    }

    // --- Helper: trigger background download without full page navigation ---
    function triggerDownload(url) {
        const a = document.createElement('a');
        a.href = url;
        // Using download attribute with empty string hints the browser to save it
        a.download = '';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        // Small delay to ensure the browser processes the click before removal
        setTimeout(() => document.body.removeChild(a), 100);
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

                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'sinflix-copy-btn';
                    copyBtn.dataset.res = currentResolution;
                    copyBtn.textContent = 'Copy All Links';
                    resSpan.appendChild(copyBtn);

                    if (config.megaBypass) {
                        resSpan.appendChild(document.createTextNode(' '));
                        const bypassBtn = document.createElement('button');
                        bypassBtn.className = 'sinflix-copy-bypass-btn';
                        bypassBtn.dataset.bypassRes = currentResolution;
                        bypassBtn.textContent = 'Copy Bypass Links';
                        resSpan.appendChild(bypassBtn);
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

                    // Append bypass circle for mega links
                    if (config.megaBypass && cleanUrl.includes('mega.nz/file/')) {
                        const circle = document.createElement('span');
                        circle.className = 'sinflix-mega-circle';
                        circle.title = 'Bypass & download via mega.wldbs.workers.dev';
                        circle.dataset.megaUrl = cleanUrl;
                        fragment.appendChild(circle);
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

        // --- Copy All Links buttons ---
        document.querySelectorAll('.sinflix-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const res = e.target.getAttribute('data-res');
                const links = resolutionLinks[res];
                if (links && links.length > 0) {
                    const textToCopy = links.join('\n');
                    showNotification('Copying links. This may take a moment...', 'info');
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showNotification('All links copied successfully!', 'success');
                        const oldText = e.target.innerText;
                        e.target.innerText = 'Copied!';
                        setTimeout(() => {
                            e.target.innerText = oldText;
                        }, 2000);
                    }).catch(() => {
                        showNotification('Failed to copy links!', 'error');
                    });
                }
            });
        });

        // --- Mega bypass: Copy All Bypass Links buttons ---
        if (config.megaBypass) {
            document.querySelectorAll('.sinflix-copy-bypass-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const res = e.target.getAttribute('data-bypass-res');
                    const megaLinks = resolutionMegaLinks[res];
                    if (!megaLinks || megaLinks.length === 0) {
                        showNotification('No Mega links found in this section.', 'error');
                        return;
                    }
                    const bypassLinks = megaLinks.map(url => getMegaBypassUrl(url));
                    const textToCopy = bypassLinks.join('\n');
                    showNotification('Copying bypass links...', 'info');
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        showNotification(`${bypassLinks.length} bypass link(s) copied!`, 'success');
                        const oldText = e.target.innerText;
                        e.target.innerText = 'Copied!';
                        setTimeout(() => { e.target.innerText = oldText; }, 2000);
                    }).catch(() => {
                        showNotification('Failed to copy bypass links!', 'error');
                    });
                });
            });

            // --- Mega bypass: grey circle click → trigger bypass download ---
            document.querySelectorAll('.sinflix-mega-circle').forEach(circle => {
                circle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const megaUrl = circle.getAttribute('data-mega-url');
                    if (!megaUrl) return;
                    const bypassUrl = getMegaBypassUrl(megaUrl);
                    showNotification('Download started…', 'success', 2000);
                    triggerDownload(bypassUrl);
                });
            });
        }

        return true;
    }

    // --- Buzzheavier Enhancements ---
    function enhanceBuzzheavierContent() {
        if (!config.buzzheavierEnhancements) return false;
        if (!window.location.hostname.includes('buzzheavier.com')) return false;

        const isHomePage = window.location.pathname.length > 1 && !window.location.pathname.endsWith('/download') && document.querySelector('#tbody');
        const isSinglePage = document.querySelector('#preview') && document.querySelector('a[href$="/download"]');

        const ICONS = {
            play: '<svg viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"/></svg>',
            copy: '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
            downloadSimple: '<svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
            check: '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
            loading: '<svg viewBox="0 0 24 24"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>'
        };



        const fetchDirectLink = (url, callback) => {
            const domain = new URL(url).origin;
            const downloadUrl = url.replace(/\/$/, '') + '/download';
            GM_xmlhttpRequest({
                method: "HEAD",
                url: downloadUrl,
                headers: {
                    "hx-current-url": url,
                    "hx-request": "true",
                    "referer": url
                },
                onload: function(response) {
                    let redirectPath = null;
                    const headers = response.responseHeaders;
                    const headerMatch = headers.match(/hx-redirect:\s*(.*)/i);
                    if (headerMatch && headerMatch[1]) {
                        redirectPath = headerMatch[1].trim();
                    }
                    if (redirectPath) {
                        let finalUrl = redirectPath.startsWith('http') ? redirectPath : domain + redirectPath;
                        callback(finalUrl);
                    } else {
                        showNotification("Failed to obtain direct link.", "error");
                        callback(null);
                    }
                },
                onerror: function(err) {
                    showNotification("Network error obtaining link.", "error");
                    callback(null);
                }
            });
        };

        const handleAction = (type, pageUrl, btnElement) => {
            if (btnElement.classList.contains('loading')) return;
            const originalIcon = btnElement.innerHTML;
            btnElement.innerHTML = ICONS.loading;
            btnElement.classList.add('loading');

            fetchDirectLink(pageUrl, (directUrl) => {
                btnElement.classList.remove('loading');
                if (!directUrl) {
                    btnElement.innerHTML = originalIcon;
                    return;
                }
                if (type === 'copy') {
                    navigator.clipboard.writeText(directUrl).then(() => {
                        btnElement.innerHTML = ICONS.check;
                        setTimeout(() => { btnElement.innerHTML = originalIcon; }, 2000);
                    });
                } else if (type === 'download') {
                    btnElement.innerHTML = originalIcon;
                    window.location.assign(directUrl);
                }
            });
        };

        const createActionBtn = (icon, title, type, fileUrl, extraClass) => {
            const btn = document.createElement('button');
            btn.className = `bh-btn ${extraClass || ''}`;
            btn.title = title;
            btn.innerHTML = icon;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAction(type, fileUrl, btn);
            };
            return btn;
        };

        const copyLinks = (linksArray, btnElement) => {
            if (!linksArray || linksArray.length === 0) return;
            showNotification('Copying links... Please wait!', 'info');

            let directLinks = [];
            let processed = 0;
            let total = linksArray.length;

            linksArray.forEach(pageUrl => {
                fetchDirectLink(pageUrl, (directUrl) => {
                    processed++;
                    if (directUrl) {
                        directLinks.push(directUrl);
                    }
                    if (processed === total) {
                        if (directLinks.length > 0) {
                            navigator.clipboard.writeText(directLinks.join('\n')).then(() => {
                                showNotification('All direct links copied successfully!', 'success');
                                const oldText = btnElement.innerText;
                                btnElement.innerText = 'Copied!';
                                setTimeout(() => btnElement.innerText = oldText, 2000);
                            }).catch(() => {
                                showNotification('Failed to copy links!', 'error');
                            });
                        } else {
                            showNotification('No direct links found!', 'error');
                        }
                    }
                });
            });
        };

        if (isHomePage) {
            const tbody = document.querySelector('#tbody');
            if (tbody && config.buzzSplitQuality) {
                const rows = Array.from(tbody.querySelectorAll('tr.editable'));
                const qualities = { '1080p': [], '720p': [], '540p': [], '480p': [], 'Other': [] };

                rows.forEach(row => {
                    const linkEl = row.querySelector('a[href^="/"]');
                    if (!linkEl) return;

                    const name = linkEl.innerText.toLowerCase();
                    let matched = false;
                    for (const q of Object.keys(qualities)) {
                        if (q !== 'Other' && name.includes(q)) {
                            qualities[q].push(row);
                            matched = true;
                            break;
                        }
                    }
                    if (!matched) qualities['Other'].push(row);
                });

                const parentTable = tbody.closest('table');
                const container = parentTable.parentNode;
                const headerRow = parentTable.querySelector('thead').outerHTML;
                const tableClass = parentTable.className;

                parentTable.style.display = 'none';

                Object.keys(qualities).forEach(key => {
                    if (qualities[key].length > 0) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'w-full relative shadow overflow-hidden sm:rounded-lg overflow-x-auto my-6';

                        let copyAllBtnHtml = '';
                        if (config.buzzCopyLinks) {
                            copyAllBtnHtml = `<button class="sinflix-copy-btn btn btn-sm btn-outline-primary float-right" data-q="${key}">Copy Links</button>`;
                        }

                        wrapper.innerHTML = `
                            <h3 class="p-3 text-lg font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                                ${key}
                                ${copyAllBtnHtml}
                            </h3>
                            <table class="${tableClass}" style="margin-top: 0">
                                ${headerRow}
                                <tbody id="tbody-${key}">
                                </tbody>
                            </table>
                        `;
                        container.insertBefore(wrapper, parentTable);

                        const newTbody = wrapper.querySelector(`#tbody-${key}`);
                        const linksForQuality = [];

                        qualities[key].forEach(row => {
                            newTbody.appendChild(row);
                            const linkEl = row.querySelector('a[href^="/"]');
                            if (!linkEl) return;

                            const fileUrl = linkEl.href;
                            linksForQuality.push(fileUrl);

                            if (!row.querySelector('.bh-actions')) {
                                const actionsContainer = document.createElement('div');
                                actionsContainer.className = 'bh-actions';

                                if (config.buzzCopyLinks) {
                                    actionsContainer.appendChild(createActionBtn(ICONS.copy, 'Copy Direct Link', 'copy', fileUrl, 'copy-btn'));
                                }
                                if (config.buzzDirectDownload) {
                                    actionsContainer.appendChild(createActionBtn(ICONS.downloadSimple, 'Direct Download', 'download', fileUrl, 'dl-btn'));
                                }
                                linkEl.parentNode.appendChild(actionsContainer);
                            }
                        });

                        const copyBtn = wrapper.querySelector(`.sinflix-copy-btn[data-q="${key}"]`);
                        if (copyBtn) {
                            copyBtn.addEventListener('click', function() {
                                copyLinks(linksForQuality, this);
                            });
                        }
                    }
                });
            } else if (tbody) {
                const rows = Array.from(tbody.querySelectorAll('tr.editable'));
                const allLinks = [];

                rows.forEach(row => {
                    const linkEl = row.querySelector('a[href^="/"]');
                    if (!linkEl) return;
                    const fileUrl = linkEl.href;
                    allLinks.push(fileUrl);

                    if (!row.querySelector('.bh-actions')) {
                        const actionsContainer = document.createElement('div');
                        actionsContainer.className = 'bh-actions';

                        if (config.buzzCopyLinks) {
                            actionsContainer.appendChild(createActionBtn(ICONS.copy, 'Copy Direct Link', 'copy', fileUrl, 'copy-btn'));
                        }
                        if (config.buzzDirectDownload) {
                            actionsContainer.appendChild(createActionBtn(ICONS.downloadSimple, 'Direct Download', 'download', fileUrl, 'dl-btn'));
                        }
                        linkEl.parentNode.appendChild(actionsContainer);
                    }
                });

                if (config.buzzCopyLinks) {
                    const parentTable = tbody.closest('table');
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'sinflix-copy-btn btn btn-sm bg-blue-600 text-white px-3 py-1 rounded my-2';
                    copyBtn.innerText = 'Copy All Links';
                    copyBtn.onclick = function() { copyLinks(allLinks, this); };
                    parentTable.parentNode.insertBefore(copyBtn, parentTable);
                }
            }
        } else if (isSinglePage) {
            const dlBtn = document.querySelector('a.gay-button') || document.querySelector('a[href$="/download"]');
            if (dlBtn && !document.querySelector('.bh-actions.single-page')) {
                const fileUrl = window.location.href;
                const container = document.createElement('div');
                container.className = 'bh-actions single-page';

                if (config.buzzCopyLinks) {
                    container.appendChild(createActionBtn(ICONS.copy, 'Copy Direct Link', 'copy', fileUrl, 'copy-btn'));
                }
                if (dlBtn.parentNode) {
                    dlBtn.parentNode.insertBefore(container, dlBtn.nextSibling);
                }
            }
        }

        return true;
    }
    // --- Main Processing Function ---
    function enhancePageContent() {
        const content = document.querySelector('.entry-text article');
        if (!content) {
            console.log('Sinflix Modifier: Content not found, retrying...');
            return false;
        }
        const currentVersion = 'v6.4.1_selective_popup';
        if (content.dataset.enhancedv === currentVersion) {
            console.log(`Sinflix Modifier: Content already enhanced (${currentVersion}). Skipping.`);
            return true;
        }
        console.log(`Sinflix Modifier (${currentVersion}): Processing...`);
        content.dataset.enhancedv = currentVersion;

        // NEW: Reorder sections FIRST, before any other processing
        if (config.moveCurrentlyAiringToTop) {
            reorderSections();
        }

        const buzzRegex = /\b(?![a-zA-Z]{12}\b)([a-zA-Z0-9]{12})\b/g;

        if (config.showGoogleCircle || config.showMdlCircle) {
            document.querySelectorAll('.kdrama-circle-container').forEach(el => el.remove());
            const textNodes = [];
            const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
                acceptNode: n => (!n.parentNode.closest('a, .kdrama-highlight, .kdrama-search-icon, .kdrama-circle-container') && n.nodeValue.trim().length > 0) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
            });
            let node;
            while (node = walker.nextNode()) textNodes.push(node);

            textNodes.forEach(textNode => {
                let fullText = textNode.textContent.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (m, p1) => {
                    try { return String.fromCharCode(parseInt(p1, 16)); } catch(e) { return m; }
                });
                const lines = fullText.split('\n');
                let fragment = document.createDocumentFragment();
                let lastOffset = 0;
                let processedAnyLine = false;

                lines.forEach(line => {
                    const dramaName = extractDramaName(line);
                    if (dramaName) {
                        const lineStartIndex = fullText.indexOf(line, lastOffset);
                        if (lineStartIndex > lastOffset) fragment.appendChild(document.createTextNode(fullText.substring(lastOffset, lineStartIndex)));

                        const container = document.createElement('span');
                        container.className = 'kdrama-circle-container';

                        if (config.showGoogleCircle) {
                            const searchQuery = `${dramaName} ${config.googleSearchSuffix}`.trim();
                            const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
                            const googleCircle = document.createElement('span');
                            googleCircle.className = 'kdrama-circle google-circle';
                            googleCircle.title = `Search '${dramaName}' on Google`;
                            googleCircle.onclick = (e) => {
                                e.stopPropagation();
                                //  USE SETTING: Check which style the user prefers
                                if (config.linkOpenStyle === 'popup') {
                                    openInCenter(googleUrl, 'sinflix_Google Search');
                                } else {
                                    window.open(googleUrl, '_blank');
                                }
                            };
                            container.appendChild(googleCircle);
                        }

                        if (config.showMdlCircle) {
                            const mdlUrl = `https://mydramalist.com/search?q=${encodeURIComponent(dramaName)}&adv=titles&ty=68&co=3&so=relevance`;
                            const mdlCircle = document.createElement('span');
                            mdlCircle.className = 'kdrama-circle mdl-circle';
                            mdlCircle.title = `Search '${dramaName}' on MyDramaList\nCtrl+Click to copy first result link`;
                            mdlCircle.onclick = async (e) => {
                                e.stopPropagation();

                                // Check if Ctrl key is pressed
                                if (e.ctrlKey) {
                                    showNotification('Getting the link...', 'info');
                                    const firstResultUrl = await getMdlFirstResultUrl(mdlUrl, dramaName);

                                    if (firstResultUrl) {
                                        const success = await copyToClipboard(firstResultUrl);
                                        if (success) {
                                            showNotification('Link copied to clipboard!', 'success');
                                        } else {
                                            showNotification('Failed to copy link to clipboard', 'error');
                                        }
                                    } else {
                                        showNotification('No results found for this drama', 'error');
                                    }
                                    return;
                                }

                                // Normal click behavior - Load page in background and get first result
                                loadMdlPageAndOpenFirstResult(mdlUrl, dramaName);
                            };
                            container.appendChild(mdlCircle);
                        }
                        fragment.appendChild(container);
                        fragment.appendChild(document.createTextNode(line));
                        processedAnyLine = true;
                    } else {
                        const lineStartIndex = fullText.indexOf(line, lastOffset);
                        if (lineStartIndex > lastOffset) fragment.appendChild(document.createTextNode(fullText.substring(lastOffset, lineStartIndex)));
                        fragment.appendChild(document.createTextNode(line));
                    }
                    fragment.appendChild(document.createTextNode('\n'));
                    lastOffset = fullText.indexOf(line, lastOffset) + line.length + 1;
                });
                if (lastOffset < fullText.length) fragment.appendChild(document.createTextNode(fullText.substring(lastOffset)));
                if (processedAnyLine && textNode.parentNode) textNode.parentNode.replaceChild(fragment, textNode);
            });
        }

        if (config.convertBuzzheavierLinks) {
             const linkWalker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentNode.nodeName !== 'A' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
             const linkNodes = [];
             let n;
             while (n = linkWalker.nextNode()) {
                 buzzRegex.lastIndex = 0;
                 if (buzzRegex.test(n.textContent)) linkNodes.push(n);
             }
             linkNodes.forEach(node => {
                 if (!document.body.contains(node) || node.parentNode.nodeName === 'A') return;
                 const fragment = document.createDocumentFragment();
                 const text = node.textContent;
                 let lastIndex = 0;
                 buzzRegex.lastIndex = 0;
                 let match;
                 while ((match = buzzRegex.exec(text)) !== null) {
                     if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                     const link = document.createElement('a');
                     link.href = `https://buzzheavier.com/${match[1]}`;
                     link.textContent = link.href;
                     link.target = '_blank';
                     fragment.appendChild(link);
                     lastIndex = match.index + match[0].length;
                 }
                 if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                 if (fragment.hasChildNodes() && node.parentNode) node.parentNode.replaceChild(fragment, node);
             });
        }

        // NEW: Process existing links to apply special behavior only to specific links
        const existingLinks = content.querySelectorAll('a[href]');
        existingLinks.forEach(link => {
            // Skip links that are already processed or are internal links
            if (link.dataset.sinflixProcessed || link.href.startsWith('#') || link.href.startsWith('javascript:')) return;

            link.dataset.sinflixProcessed = 'true';

            // Special handling for SinFlix chat box link
            if (link.href.includes('my.cbox.ws/sin-flix')) {
                // Remove existing target and click handlers
                link.removeAttribute('target');

                // Add new click handler based on chat box preference
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (config.chatBoxOpenStyle === 'popup') {
                        openInCenter(link.href, 'sinflix_chat');
                    } else {
                        window.open(link.href, '_blank');
                    }
                });
            }
            // For all other links, leave them as they are (normal behavior)
        });

        console.log('Sinflix Modifier: Processing complete. ✨');

        // Mark content as processed to show all headers
        content.classList.add('sinflix-processed');

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
        document.body.appendChild(settingsButton);

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
                                <div class="kdrama-toggle-label">Mega.nz Link Bypass</div>
                                <div class="kdrama-toggle-description">Add grey ● circle next to each Mega link to bypass & download instantly. Also adds "Copy Bypass Links" per section.</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-mega-bypass" ${config.megaBypass ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- Mega.nz Section -->
                    <div class="kdrama-settings-section">
                        <h3 class="kdrama-section-title">
                            <svg class="section-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                            Mega.nz
                        </h3>

                        <div class="kdrama-toggle-item">
                            <div class="kdrama-toggle-info">
                                <div class="kdrama-toggle-label">Bypass Download Button</div>
                                <div class="kdrama-toggle-description">Show a floating button on mega.nz file pages to download via bypass instantly</div>
                            </div>
                            <label class="kdrama-toggle-switch">
                                <input type="checkbox" id="setting-mega-nz-btn" ${config.megaNzButton ? 'checked' : ''}>
                                <span class="kdrama-toggle-slider"></span>
                            </label>
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
        document.querySelector(`input[name="linkStyle"][value="${config.linkOpenStyle}"]`).checked = true;
        document.querySelector(`input[name="chatBoxStyle"][value="${config.chatBoxOpenStyle}"]`).checked = true;

        const saveButton = document.getElementById('kdrama-save-button');
        const closeBtn = document.getElementById('kdrama-settings-close');

        settingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.style.display = 'flex';
            // Add a small delay for the animation
            setTimeout(() => modal.classList.add('show'), 10);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => modal.style.display = 'none', 200);
            }
        });

        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('show');
            setTimeout(() => modal.style.display = 'none', 200);
        });

        // Additional escape key handler for settings modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                modal.classList.remove('show');
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
            GM_setValue('megaBypass', document.getElementById('setting-mega-bypass').checked);
            GM_setValue('megaNzButton', document.getElementById('setting-mega-nz-btn').checked);

            //  NEW: Save the selected radio button values
            const selectedStyle = document.querySelector('input[name="linkStyle"]:checked').value;
            GM_setValue('linkOpenStyle', selectedStyle);

            const selectedChatBoxStyle = document.querySelector('input[name="chatBoxStyle"]:checked').value;
            GM_setValue('chatBoxOpenStyle', selectedChatBoxStyle);

            GM_setValue('googleSearchSuffix', document.getElementById('setting-google-suffix').value);

            // NEW: Buzzheavier Save
            GM_setValue('buzzheavierEnhancements', document.getElementById('setting-buzz-main').checked);
            GM_setValue('buzzSplitQuality', document.getElementById('setting-buzz-split').checked);
            GM_setValue('buzzDirectDownload', document.getElementById('setting-buzz-dl').checked);
            GM_setValue('buzzCopyLinks', document.getElementById('setting-buzz-copy').checked);

            const customSchemeEl = document.getElementById('setting-buzz-custom-scheme');
            if (customSchemeEl) GM_setValue('buzzCustomScheme', customSchemeEl.value);

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

        // NEW: Create chat box button if enabled
        let chatBtn = null;
        if (config.showChatBoxButton) {
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

        window.addEventListener('scroll', () => {
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

    // --- Mega.nz Floating Bypass Button ---
    function enhanceMegaNzPage() {
        if (!config.megaNzButton) return;
        if (!window.location.hostname.includes('mega.nz')) return;
        // Only act on file pages
        if (!window.location.href.includes('/file/')) return;

        GM_addStyle(`
            #sinflix-mega-bypass-btn {
                position: fixed;
                bottom: 28px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 99999;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 0 24px;
                height: 48px;
                border-radius: 24px;
                border: 1px solid rgba(217, 39, 46, 0.45);
                background: rgba(28, 28, 28, 0.92);
                backdrop-filter: blur(14px);
                -webkit-backdrop-filter: blur(14px);
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.2px;
                cursor: pointer;
                white-space: nowrap;
                box-shadow: 0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
                transition: background 0.2s ease, border-color 0.2s ease,
                            box-shadow 0.2s ease, transform 0.15s ease;
                user-select: none;
            }
            #sinflix-mega-bypass-btn:hover {
                background: rgba(217, 39, 46, 0.88);
                border-color: rgba(217, 39, 46, 0.9);
                box-shadow: 0 6px 28px rgba(217,39,46,0.35), 0 2px 8px rgba(0,0,0,0.4);
                transform: translateX(-50%) translateY(-2px);
            }
            #sinflix-mega-bypass-btn:active {
                transform: translateX(-50%) translateY(0px);
                box-shadow: 0 2px 12px rgba(217,39,46,0.25);
            }
            #sinflix-mega-bypass-btn .sfx-mega-icon {
                width: 18px;
                height: 18px;
                opacity: 0.9;
                flex-shrink: 0;
            }
            #sinflix-mega-bypass-btn .sfx-mega-badge {
                font-size: 10px;
                font-weight: 700;
                color: #d9272e;
                background: rgba(217,39,46,0.15);
                border: 1px solid rgba(217,39,46,0.35);
                border-radius: 4px;
                padding: 1px 5px;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
        `);

        const btn = document.createElement('button');
        btn.id = 'sinflix-mega-bypass-btn';
        btn.title = 'Download via bypass — skips Mega quota limits';
        btn.innerHTML = `
            <svg class="sfx-mega-icon" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download</span>
            <span class="sfx-mega-badge">Bypass</span>`;

        // Wait for body to be ready then append
        const appendBtn = () => document.body && document.body.appendChild(btn);
        if (document.body) appendBtn();
        else document.addEventListener('DOMContentLoaded', appendBtn);

        btn.addEventListener('click', () => {
            const bypassUrl = getMegaBypassUrl(window.location.href);
            showNotification('Download started…', 'success', 2500);
            triggerDownload(bypassUrl);
        });
    }

    // --- Enhanced Initialization ---
    function initialize() {
        if (window.location.hostname === 'pst.moe') {
            try {
                enhancePstMoeContent();
            } catch (e) {
                console.error('Sinflix Modifier error during pst.moe enhancement:', e);
            }
            // For pst.moe, we just setup the UI and stop rentry-specific logic
            createSettingsUI();
            return;
        }

        if (window.location.hostname.includes('mega.nz')) {
            try {
                enhanceMegaNzPage();
            } catch (e) {
                console.error('Sinflix Modifier error during mega.nz enhancement:', e);
            }
            // No settings gear on mega.nz — keep the page clean
            return;
        }

        if (window.location.hostname.includes('buzzheavier.com')) {
            try {
                enhanceBuzzheavierContent();
            } catch (e) {
                console.error('Sinflix Modifier error during buzzheavier enhancement:', e);
            }
            createSettingsUI();
            return;
        }

        // Immediate content enhancement - no delay
        try {
            enhancePageContent();
        } catch (e) {
            console.error('Sinflix Modifier error during immediate enhancement:', e);
        }



        createSettingsUI();
        createFloatingButtons();

        const settingsModal = document.getElementById('kdrama-settings-modal');
        window.addEventListener('scroll', () => {
            if (settingsModal && settingsModal.style.display === 'flex') {
                if (document.activeElement !== document.getElementById('kdrama-search-input')) {
                    settingsModal.style.display = 'none';
                }
            }
        });

        // Single late-fallback retry in case the MutationObserver missed the content
        // (e.g. content was already in the DOM but not yet observed). Fires after
        // the page is fully interactive to avoid blocking early user input.
        setTimeout(() => {
            try {
                enhancePageContent();
            } catch (e) {
                console.error('Sinflix Modifier error during fallback enhancement:', e);
            }
        }, 1200);

        if (typeof MutationObserver !== 'undefined') {
            // Debounce: wait 150ms after the last mutation before processing.
            // This prevents dozens of expensive TreeWalker scans from firing
            // back-to-back during the initial page load, which would block
            // the main thread and make clicks unresponsive.
            let mutationTimer = null;
            const debouncedEnhance = () => {
                clearTimeout(mutationTimer);
                mutationTimer = setTimeout(() => {
                    try {
                        enhancePageContent();
                    } catch (e) {
                        console.error('Sinflix Modifier error during MutationObserver processing:', e);
                    }
                }, 150);
            };

            const observer = new MutationObserver((mutations) => {
                let shouldProcess = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        if (mutation.target.closest('.entry-text article') || mutation.target.matches('.entry-text article')) {
                            shouldProcess = true;
                        }
                    }
                });

                if (shouldProcess) {
                    debouncedEnhance();
                }
            });

            const content = document.querySelector('.entry-text article');
            if (content) {
                observer.observe(content, { childList: true, subtree: true });
                // Also process immediately if content already exists
                try {
                    enhancePageContent();
                } catch (e) {
                    console.error('Sinflix Modifier error during immediate content processing:', e);
                }
            } else {
                const bodyObserver = new MutationObserver((mutations, obs) => {
                    if (document.querySelector('.entry-text article')) {
                        obs.disconnect();
                        const foundContent = document.querySelector('.entry-text article');
                        observer.observe(foundContent, { childList: true, subtree: true });
                        debouncedEnhance();
                    }
                });
                bodyObserver.observe(document.body, { childList: true, subtree: true });
            }
        }
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
