# Batch 6 Scraper Verification Report

**Date:** 2026-05-24  
**Sources Tested:** readkingdom, read7deadlysins, readnaruto, readonepiece  
**Method:** curl + Playwright (Chromium) navigation, screenshot capture, and HTML selector inspection.

---

## 1. readkingdom
- **Base URL:** `https://ww5.readkingdom.com`
- **Status:** `NEEDS_FIX`

### Findings
- **Homepage (curl + Playwright):** HTTP 200. Page loads correctly. Only **3 local manga links** exist on the homepage (`/manga/li-mu`, `/manga/meng-wu-and-chu-zi-one-shot`, and `/manga/kingdom/`). The main manga **"Kingdom"** is linked via a "View all chapters" button.
- **Search:** No dedicated search endpoint (`/?s=naruto` returns the homepage). The scraper fetches `/`, collects all `a[href*="/manga/"]`, extracts the link text as the title, and filters by query **before** fetching the detail page. Because the "Kingdom" link text is literally `"View all chapters"`, a search for `"kingdom"` is filtered out and returns **empty results**. This is a concrete bug.
- **Detail Page (`/manga/li-mu/`):** All scraper selectors are present:
  - `h1.my-3.font-bold` → title found
  - `img[style*="width: 300px"]` → cover image found
  - `div.text-text-muted` → description found
  - `meta[property="og:image"]` → fallback cover present
- **Chapter List:** `a[href*="/chapter/"]` links present (both relative and absolute).
- **Chapter Page (`/chapter/li-mu-chapter-one-shot/`):** `img.js-page` elements with `src` attributes (`.jpeg`) are present and load correctly. The scraper’s `src.trim()` handles any trailing whitespace.

### Screenshots
- `readkingdom_homepage.png`
- `readkingdom_search.png`
- `readkingdom_detail.png`
- `readkingdom_chapter.png`

---

## 2. read7deadlysins
- **Base URL:** `https://ww7.read7deadlysins.com`
- **Status:** `WORKING`

### Findings
- **Homepage (curl + Playwright):** HTTP 200. **10 local manga links** found in the navigation menu.
- **Search:** No dedicated search endpoint. The scraper filters homepage links by link text. Link texts are **abbreviated** (e.g., `"7DS"` for *Nanatsu no Taizai*, `"7DS:7 Days"`, etc.). Searching for the full Japanese/English title may miss results, but searching for the abbreviation works. This is a minor limitation, not a breakage.
- **Detail Page (`/manga/nanatsu-no-taizai/`):** All expected selectors present (`h1.my-3.font-bold`, `img[style*="width: 300px"]`, `div.text-text-muted`, `meta[property="og:image"]`).
- **Chapter List:** `a[href*="/chapter/"]` links are present (absolute URLs to the same domain). `sameDomain` correctly keeps them.
- **Chapter Page (`/chapter/nanatsu-no-taizai-chapter-346/`):** `img.js-page` elements with `.jpeg` `src` are present and load correctly.

### Screenshots
- `read7deadlysins_homepage.png`
- `read7deadlysins_search.png`
- `read7deadlysins_detail.png`
- `read7deadlysins_chapter.png`

---

## 3. readnaruto
- **Base URL:** `https://ww11.readnaruto.com`
- **Status:** `WORKING`

### Findings
- **Homepage (curl + Playwright):** HTTP 200. **8 local manga links** found in the nav menu with clear, descriptive titles (e.g., `"Naruto"`, `"Boruto"`, `"Samurai 8"`).
- **Search:** No dedicated search endpoint. Because link texts are descriptive, filtering by query works as expected (e.g., searching `"naruto"` matches the `"Naruto"` link).
- **Detail Page (`/manga/naruto/`):** All expected selectors present.
- **Chapter List:** `a[href*="/chapter/"]` links present. **Note:** Some links point to `https://Readnaruto.com/...` (different subdomain). The scraper’s `sameDomain()` correctly filters these out. The remaining chapter links are on `ww11.readnaruto.com` and are scraped normally.
- **Chapter Page (`/chapter/naruto-chapter-700/`):** `img.js-page` elements with `.jpg` `src` are present and load correctly.

### Screenshots
- `readnaruto_homepage.png`
- `readnaruto_search.png`
- `readnaruto_detail.png`
- `readnaruto_chapter.png`

---

## 4. readonepiece
- **Base URL:** `https://ww12.readonepiece.com`
- **Status:** `NEEDS_FIX`

### Findings
- **Homepage (curl + Playwright):** HTTP 200. **17 local manga links** found in the nav menu. However, the **main manga "One Piece"** (`/manga/one-piece/`) is **not** in the nav menu; it is only linked via a "View all chapters" button, exactly like readkingdom.
- **Search:** No dedicated search endpoint. Because the main manga link text is `"View all chapters"`, a search for `"one piece"` is filtered out and returns **empty results**. This is the same bug as readkingdom.
- **Detail Page (`/manga/one-piece-digital-colored-comics/`):** All expected selectors present (`h1.my-3.font-bold`, `img[style*="width: 300px"]`, `div.text-text-muted`, `meta[property="og:image"]`).
- **Chapter List:** `a[href*="/chapter/"]` links present (absolute URLs to the same domain).
- **Chapter Page (`/chapter/one-piece-digital-colored-comics-chapter-1076/`):** `img.js-page` elements with `.jpg` `src` are present and load correctly.

### Screenshots
- `readonepiece_homepage.png`
- `readonepiece_search.png`
- `readonepiece_detail.png`
- `readonepiece_chapter.png`

---

## Structural Comparison (Scraper Expectations vs. Reality)

| Selector | readkingdom | read7deadlysins | readnaruto | readonepiece |
|----------|-------------|-----------------|------------|--------------|
| `a[href*="/manga/"]` on homepage | ✅ (3 links) | ✅ (10 links) | ✅ (8 links) | ✅ (17 links) |
| `h1.my-3.font-bold` on detail | ✅ | ✅ | ✅ | ✅ |
| `img[style*="width: 300px"]` on detail | ✅ | ✅ | ✅ | ✅ |
| `div.text-text-muted` on detail | ✅ | ✅ | ✅ | ✅ |
| `a[href*="/chapter/"]` on detail | ✅ | ✅ | ✅ | ✅ |
| `img.js-page` on chapter | ✅ | ✅ | ✅ | ✅ |

---

## Summary & Recommendations

| Source | Verdict | Issue |
|--------|---------|-------|
| **readkingdom** | `NEEDS_FIX` | Search filters by link text before resolving the real title. The main manga "Kingdom" is linked as "View all chapters", so it is unsearchable. |
| **read7deadlysins** | `WORKING` | Minor limitation: link texts are abbreviations ("7DS"), so full-title searches may miss. Core scrapers (detail, chapters, pages) all match. |
| **readnaruto** | `WORKING` | Core scrapers all match. A few chapter links are on a different subdomain (`Readnaruto.com`) and are safely skipped by `sameDomain`. |
| **readonepiece** | `NEEDS_FIX` | Same bug as readkingdom: the main manga "One Piece" is linked as "View all chapters", making it unsearchable. |

### Suggested Fix
In `readmanga-base.ts`, update the `search()` function to also match against the manga **slug** (derived from the URL) when filtering results, or fetch the detail page title before filtering. This would fix the "View all chapters" problem on readkingdom and readonepiece.

### Screenshot Files
All screenshots saved to `/home/neon/programs/side_project/mangablaze/screenshot/`:
- `readkingdom_homepage.png`, `readkingdom_search.png`, `readkingdom_detail.png`, `readkingdom_chapter.png`
- `read7deadlysins_homepage.png`, `read7deadlysins_search.png`, `read7deadlysins_detail.png`, `read7deadlysins_chapter.png`
- `readnaruto_homepage.png`, `readnaruto_search.png`, `readnaruto_detail.png`, `readnaruto_chapter.png`
- `readonepiece_homepage.png`, `readonepiece_search.png`, `readonepiece_detail.png`, `readonepiece_chapter.png`
