// ==UserScript==
// @name         SinFlix Modifier
// @namespace    https://greasyfork.org/en/users/1490967-asurpbs
// @version      26.06.28.01
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

    // Module-level reference to buzzheavier's debounced enhance runner (set in init())
    let bhRunEnhance = null;

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
            opacity: 0;
            pointer-events: none;
            width: 0;
            flex: none;
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
            opacity: 0;
            pointer-events: none;
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
            opacity: 0;
            pointer-events: none;
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
            opacity: 0;
            pointer-events: none;
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
            opacity: 0;
            pointer-events: none;
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
            opacity: 0;
            pointer-events: none;
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

        /* --- Single Popover Menu --- */
        #sfx-popover-menu {
            position: absolute;
            z-index: 10001;
            display: none;
            flex-direction: column;
            width: 200px;
            background: rgba(15, 15, 20, 0.88);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 14px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.25);
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            padding: 8px;
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
        .sfx-popover-title {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.45);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 4px 8px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sfx-popover-divider {
            height: 0.5px;
            background: rgba(255, 255, 255, 0.12);
            margin: 6px 0;
        }
        .sfx-popover-btn {
            background: transparent !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 8px 10px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255, 255, 255, 0.85);
            text-align: left;
            transition: background 0.2s, color 0.2s;
        }
        .sfx-popover-btn:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #ffffff;
        }
        .sfx-popover-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor;
            flex-shrink: 0;
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

        @keyframes sfx-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;

    // Only apply border-radius styling on rentry.co/sin-flix and text.is/Sinflix
    if (window.location.href.includes('rentry.co/sin-flix') || window.location.href.includes('text.is/Sinflix')) {
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

    // Styles for pst.moe paste page
    if (window.location.hostname.includes('pst.moe')) {
        css += `
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
        if (typeof GM_getValue !== 'undefined') {
            return GM_getValue(key, defaultValue);
        }
        const val = localStorage.getItem(key);
        return val !== null ? JSON.parse(val) : defaultValue;
    }

    function setSetting(key, value) {
        if (typeof GM_setValue !== 'undefined') {
            GM_setValue(key, value);
        } else {
            localStorage.setItem(key, JSON.stringify(value));
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
        const selectDownloadStyle = wrap.querySelector('#sfx-select-download-style');
        const toggleDramaSearch = wrap.querySelector('#sfx-toggle-drama-search');
        const toggleMoveOngoing = wrap.querySelector('#sfx-toggle-move-ongoing');
        const toggleMegaFetchrr = wrap.querySelector('#sfx-toggle-mega-fetchrr');
        const selectMegaFetchrrStyle = wrap.querySelector('#sfx-select-mega-fetchrr-style');
        const selectChatStyle = wrap.querySelector('#sfx-select-chat-style');
        const selectDramaStyle = wrap.querySelector('#sfx-select-drama-style');
        const selectFileDitchStyle = wrap.querySelector('#sfx-select-fileditch-style');
        const inputGoogleSuffix = wrap.querySelector('#sfx-input-google-suffix');
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
            updateIslandState();
        });

        settingsCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
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

        toggleBuzzheavierUI.checked = getSetting('sfx-buzzheavier-ui-enhancements', false);
        toggleBuzzheavierUI.addEventListener('change', () => {
            setSetting('sfx-buzzheavier-ui-enhancements', toggleBuzzheavierUI.checked);
            if (window.location.hostname.includes('buzzheavier.com')) {
                if (typeof bhRunEnhance === 'function') bhRunEnhance();
                else enhanceBuzzheavierContent();
            }
        });

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
                        const pw = 950, ph = 700, pl = Math.round((screen.width - pw) / 2), pt = Math.round((screen.height - ph) / 2);
                        window.open(this.href, '_blank', `width=${pw},height=${ph},left=${pl},top=${pt},menubar=no,toolbar=no,status=no,location=yes`);
                    });
                    link.target = '_blank';
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

    function enhancePstMoeContent() {
        const preElement = document.querySelector('pre');
        if (!preElement) return false;

        if (preElement.dataset.sinflixProcessed) return true;
        preElement.dataset.sinflixProcessed = 'true';

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
                    const pstDlStyle = getSetting('sfx-download-link-style', 'tab');
                    if (pstDlStyle === 'popup') {
                        anchor.addEventListener('click', function(e) {
                            e.preventDefault();
                            const pw = 950, ph = 700, pl = Math.round((screen.width - pw) / 2), pt = Math.round((screen.height - ph) / 2);
                            window.open(this.href, '_blank', `width=${pw},height=${ph},left=${pl},top=${pt},menubar=no,toolbar=no,status=no,location=yes`);
                        });
                    }
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    anchor.textContent = rawUrl;
                    fragment.appendChild(anchor);

                    if (getSetting('sfx-mega-fetchrr-enabled', true) && (cleanUrl.includes('mega.nz/file/') || cleanUrl.includes('mega.nz/folder/'))) {
                        const circle = document.createElement('span');
                        circle.className = 'sinflix-mega-fetchrr-dot';
                        circle.title = 'Open in Fetchrr.io — direct mirror download';
                        circle.dataset.megaUrl = cleanUrl;
                        fragment.appendChild(circle);
                    }

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

        document.querySelectorAll('.sinflix-fd-dl-circle').forEach(circle => {
            circle.addEventListener('click', () => {
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
                showNotification('Opening FileDitch... will auto-download & close.', 'info', 5000);
                setTimeout(() => circle.classList.remove('fd-loading'), 18000);
                if (!w) showNotification('Popup blocked! Allow popups/tabs for pst.moe.', 'error', 6000);
            });
        });



        document.querySelectorAll('.sinflix-mega-fetchrr-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const megaUrl = dot.getAttribute('data-mega-url');
                if (!megaUrl) return;
                openMegaInFetchrr(megaUrl);
                showNotification('Opening Fetchrr.io...', 'info', 2000);
            });
        });

        return true;
    }

    /* --- BuzzHeavier Enhancements & Retry Fallback --- */
    const buzzDownloadUrlsCache = new Map();

    function showProgressIsland(message, statusType = 'progress') {
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
        }
    }

    function hideProgressIsland(island) {
        if (!island) return;
        
        const isMainPage = window.location.href.includes('rentry.co/sin-flix') || window.location.href.includes('text.is/Sinflix');
        
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

    function resolveBuzzDownloadUrlsFromDoc(doc, baseUrl) {
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
                "hx-current-url": pageUrl,
                "hx-request": "true",
                "referer": pageUrl
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
                            window.open(directUrl, '_blank');
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
        // ALWAYS add the styling class to body on buzzheavier.com since table styling has no on/off toggle
        document.body.classList.add('sfx-bh-enhanced');

        const isEnhance = getSetting('sfx-buzzheavier-ui-enhancements', false);

        // Try by ID first (live BuzzHeavier page uses id="tbody"), fallback to first non-sfx tbody
        let tbody = document.getElementById('tbody');
        if (!tbody) {
            // find the first table tbody that isn't one of our quality sub-tbodies
            const allTbodies = Array.from(document.querySelectorAll('table tbody'));
            tbody = allTbodies.find(tb => !tb.id.startsWith('sfx-tbody')) || null;
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

        if (isListPage) {
            const rows = Array.from(tbody.children).filter(el => el.tagName === 'TR');
            if (!isEnhance) {
                removeCapsules();
            } else {
                rows.forEach(row => {
                    const link = Array.from(row.querySelectorAll('a[href]')).find(isFileAnchor);
                    if (link) {
                        addCapsuleToRow(row, link);
                    }
                });
            }
        } else if (isSinglePage) {
            const downloadRow = document.querySelector('.download-row');
            if (!isEnhance) {
                if (downloadRow) downloadRow.style.display = '';
                const card = document.querySelector('.sfx-bh-single-card');
                if (card) card.remove();
            } else {
                if (downloadRow && !document.querySelector('.sfx-bh-single-card')) {
                    const sizeSpan = downloadRow.querySelector('.download-btn .size');
                    const fileSize = sizeSpan ? sizeSpan.textContent.trim() : 'Unknown Size';

                    const fileNameEl = document.querySelector('.file-name');
                    const fileName = fileNameEl ? fileNameEl.textContent.trim() : 'File Download';

                    const s1Btn = document.querySelector('a[hx-get*="/download"]:not([hx-get*="alt=true"])');
                    const s2Btn = document.querySelector('a[hx-get*="/download"][hx-get*="alt=true"]');
                    const previewBtn = document.querySelector('a[hx-get*="/preview"]');

                    const s1Hx = s1Btn ? s1Btn.getAttribute('hx-get') : '';
                    const s2Hx = s2Btn ? s2Btn.getAttribute('hx-get') : '';
                    const previewHx = previewBtn ? previewBtn.getAttribute('hx-get') : '';

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

                    const fileUrl = window.location.href;

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
                            const previewUrl = new URL(previewHx, window.location.href).href;
                            window.location.assign(previewUrl);
                        });
                    }
                }
            }
        }
    }

    function init() {
        const host = window.location.hostname;

        if (host.includes('buzzheavier.com')) {
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

                bhObserver = new MutationObserver(() => {
                    clearTimeout(bhDebounce);
                    bhDebounce = setTimeout(runEnhance, 120);
                });

                runEnhance();
                bhObserver.observe(document.body, { childList: true, subtree: true });
            } catch(e) {
                console.error('SinFlixModifier error on buzzheavier.com:', e);
            }
            return;
        }


        if (host.includes('pst.moe')) {
            try { enhancePstMoeContent(); } catch(e) { console.error('SinFlixModifier error on pst.moe:', e); }
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
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
        setupIslandEvents(wrap);

        // Create and append the popover menu to body
        const popover = document.createElement('div');
        popover.id = 'sfx-popover-menu';
        popover.innerHTML = `
            <div class="sfx-popover-title">Options</div>
            <div class="sfx-popover-divider"></div>
            <button class="sfx-popover-btn" id="sfx-popover-google">
                <svg viewBox="0 0 24 24"><path d="M12.54 10.24h9.3c.09.53.14 1.1.14 1.8 0 5.7-3.82 9.76-9.44 9.76-5.52 0-10-4.48-10-10s4.48-10 10-10c2.7 0 4.96.99 6.69 2.61l-2.7 2.61c-.72-.69-1.98-1.5-3.99-1.5-3.48 0-6.31 2.89-6.31 6.45s2.83 6.45 6.31 6.45c4.04 0 5.56-2.9 5.8-4.38H12.54v-3.8z"/></svg>
                Search Google
            </button>
            <button class="sfx-popover-btn" id="sfx-popover-mdl">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z"/></svg>
                Search MyDramaList
            </button>
            <button class="sfx-popover-btn" id="sfx-popover-imdb">
                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8.5 12.5h-1.5v-5H9v5H7.5v-5H6v5H4.5v-6h6v6zm6 0h-2v-5H13v5h-1.5v-6h4.5v6zm-4.5-6v-1.5h3v1.5h-3z"/></svg>
                Search IMDb
            </button>
            <button class="sfx-popover-btn" id="sfx-popover-copy">
                <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                Copy Name
            </button>
        `;
        document.body.appendChild(popover);

        let activeDramaName = '';

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
            btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> Copied!`;
            setTimeout(() => {
                btn.innerHTML = origHTML;
                hidePopover();
            }, 800);
        });

        // Click handler to open the options popover when title is clicked
        document.addEventListener('click', (e) => {
            const titleEl = e.target.closest('.sfx-drama-title');
            if (titleEl) {
                e.stopPropagation();
                activeDramaName = titleEl.getAttribute('data-name');
                const titleLabel = popover.querySelector('.sfx-popover-title');
                if (titleLabel) titleLabel.textContent = activeDramaName;

                popover.style.display = 'flex';
                setTimeout(() => {
                    popover.classList.add('sfx-show');
                }, 10);

                const rect = titleEl.getBoundingClientRect();
                const menuWidth = 200;
                const menuHeight = 164;
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