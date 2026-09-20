# Sinflix Modifier

A premium userscript that elevates the SinFlix drama index and its associated download pages — featuring an Apple TV+ inspired **TheMovieDB media modal**, in-page search via **Dynamic Island**, multi-source ratings, intelligent multi-season MyDramaList matching, and automated quality-splitting for download hosts.

**Author:** [mthlpbs](https://greasyfork.org/en/users/1490967-mthlpbs) · **License:** MIT · **Latest Version:** 26.09.21

---

## 🌟 Key Features

### 🎬 Immersive TheMovieDB (TMDb) Drama Modal
Clicking on any drama title opens a rich, Apple TV+ style media viewer:
- **Dynamic Ambient Backdrop**: Ambient blurred glassmorphic background that dynamically matches the active drama's key art.
- **Scores & Ratings**:
  - **Rotten Tomatoes**: Tomatometer score, Audience popcorn score (`🍿`), and direct link.
  - **IMDb**: Official IMDb star rating and link.
  - **TheMovieDB**: Animated circular user score ring.
- **Cast & Crew Directory**: High-res portraits with character names. Clicking any actor reveals their full bio, age, birthplace, and separated TV/Movie filmography with complete back-navigation.
- **Trailer Player**: Pop-up embedded YouTube trailer modal.
- **Smart MyDramaList (MDL) Matching**:
  - Advanced title similarity with **strict release year priority** (giving heavy weighting to release year to accurately disambiguate similarly titled dramas).
  - Quick-search buttons for Google and MyDramaList right in the header.
- **Multi-Season TV Protection**:
  - Automatically identifies TV shows with 2 or more seasons.
  - Blocks single-season direct link copying with an informative prompt.
  - Redirects the "Visit site" action directly to MyDramaList search results so you can select the exact season you need.
- **Allocated 2-Column Download Section**:
  - Positioned directly before Recommendations.
  - Clean 2-column balanced grid preventing single links from awkwardly stretching across the entire width.
  - One-click access to SinFlix links, Dramaday, and Ext.to.
- **Language-Filtered Recommendations**: "More Like This" carousel filtered strictly for Korean and English releases with high-quality posters.

---

### 🔑 TheMovieDB API Credentials Setup
To protect your privacy and ensure reliable quota, default testing keys are not bundled. You can easily connect your own free TMDb account:

1. **Create an account**: Sign up for free at [themoviedb.org](https://www.themoviedb.org/).
2. **Get your API key**: Navigate to [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) and request an API key (or copy your existing credentials).
3. **Save in Settings**:
   - Click the **Settings (gear icon)** on the SinFlix Dynamic Island (or click **"Open Settings"** inside the drama modal).
   - Under the **TheMovieDB** section, paste either your **API Read Access Token (v4 auth)** or **API Key (v3 auth)**.
   - Click **"Save Credentials"** (or press Enter) to immediately persist your keys.
   - Your credentials are safely stored across both userscript storage (`GM_setValue`) and `localStorage` for maximum reliability across page refreshes.

---

### 🏝️ Dynamic Island & In-Page Search
- Floating iOS-style **Dynamic Island** pinned to the bottom of the page.
- Real-time page search with live match counter (`X / Y`), instant highlights, and previous/next navigation buttons.
- Quick shortcuts for Settings, SinFlix Chat, and smooth Back-To-Top button.
- Reorder page sections (e.g. prioritize Ongoing Dramas) and filter completed titles.

---

### ⚡ Download Host Enhancements

| Host / Service | Enhancement Features |
| :--- | :--- |
| **BuzzHeavier** | Auto-splits folder files by quality (`1080p`, `720p`, `540p`, etc.) into neat tables sorted highest to lowest, with resolution-specific batch copy buttons. |
| **pst.moe / DarkLab / 0g.gg** | Transforms raw text into clickable links, enables same-tab navigation, copy-all-links per resolution, and OLED dark mode. |
| **Transfer.it** | Adds direct download links, one-click PotPlayer stream integration, and batch copy utilities powered by Dynamic Island. |
| **Mega.nz** | Dynamic Island floating pill that pre-fills links into Fetchrr.io. |
| **Fetchrr.io** | Automatically populates Mega links and triggers extraction. |

---

## 🚀 Installation

1. Install a userscript manager extension for your browser:
   - [Violentmonkey](https://violentmonkey.github.io/) *(Recommended)*
   - [Tampermonkey](https://www.tampermonkey.net/)

2. Click the link below to install:

   👉 **[Install Sinflix Modifier](https://raw.githubusercontent.com/mthlpbs/sinflix-modifier/refs/heads/main/sinflix-modifier.user.js)**

3. Your userscript manager will prompt you to confirm the installation.
4. Visit [rentry.co/sin-flix](https://rentry.co/sin-flix) or [rentry.co/sin0flix](https://rentry.co/sin0flix) and the script will activate automatically!

---

## 🌐 Supported Domains

- `https://rentry.co/sin-flix*`
- `https://rentry.co/sin0flix*`
- `https://text.is/Sinflix*`
- `https://buzzheavier.com/*`
- `https://pst.moe/paste/*`
- `https://p.darklab.sh/*`
- `https://0g.gg/*`
- `https://transfer.it/*`
- `https://mega.nz/*`
- `https://fetchrr.io/*`

---

## 📄 License

[MIT](https://opensource.org/licenses/MIT) © 2026 [mthlpbs](https://greasyfork.org/en/users/1490967-mthlpbs)
