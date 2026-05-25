# Batch 2 Source Verification Report

**Date:** 2026-05-24
**Method:** Playwright + curl + cheerio HTML analysis
**Screenshots:** `/home/neon/programs/side_project/mangablaze/screenshot/`

---

## 1. mangaka (https://mangaka.cc)

**Status: WORKING**

### curl Tests
| Endpoint | Status | Time |
|----------|--------|------|
| Homepage | HTTP 200 | ~2.1s |
| Search (`/?s=naruto&post_type=wp-manga`) | HTTP 200 | ~1.8s |

### Playwright Findings
- **Homepage:** Loads successfully, contains manga links.
- **Search:** Tested with "naruto" → 0 results (manga not on site). Tested with "Margrave" → 1 result found. Selectors match correctly:
  - `.c-tabs-item` ✅ (1 result)
  - `.post-title h3 a` ✅ (title: "Margrave's Bastard Son was The Emperor")
  - `.tab-thumb img` ✅ (`src` attribute present)
- **Detail Page:** All scraper selectors verified:
  - `.post-title h1` ✅
  - `.summary_image img` ✅
  - `.description-summary p` ✅
  - `.genres-content a` ✅ (6 genres found)
  - `.post-status .summary-content` ✅
  - `li.wp-manga-chapter a` ✅ (220 chapters)
- **Chapter Pages:** `img.wp-manga-chapter-img` ✅ (14 images found on test chapter)

### HTML Structure Match
- Search result links use **absolute URLs** (`https://mangaka.cc/manga/...`), but the scraper's `extractSlugFromHref()` uses regex `//manga/([^/]+)/?$/` which correctly handles absolute URLs.
- Chapter links also use absolute URLs, but `getChapters()` uses regex extraction which handles them correctly.
- All selectors match the actual DOM structure.

### Screenshots
- `mangaka_homepage.png`
- `mangaka_search.png`
- `mangaka_detail.png`
- `mangaka_chapter.png`

---

## 2. mangakiss (https://mangakiss.org)

**Status: NEEDS_FIX**

### curl Tests
| Endpoint | Status | Time |
|----------|--------|------|
| Homepage | HTTP 200 | ~2.1s |
| Search (`/?s=naruto&post_type=wp-manga`) | HTTP 200 | ~1.9s |

### Playwright Findings
- **Homepage:** Loads successfully, contains manga links.
- **Search:** Tested with "naruto" → 0 results. Tested with "Wife Contract" → 1 result found. Selectors match:
  - `.c-tabs-item` ✅
  - `.post-title h3 a` ✅
  - `.tab-thumb img` ✅ (`src` present, `data-src` also present)
- **Detail Page:** All scraper selectors verified:
  - `.post-title h1` ✅
  - `.summary_image img` ✅
  - `.description-summary p` ✅
  - `.genres-content a` ✅ (3 genres found)
  - `.post-status .summary-content` ✅
  - `li.wp-manga-chapter a` ✅ (702 chapters)
- **Chapter Pages:** ❌ **BROKEN**
  - The scraper's `getChapterPages()` returns an empty array by design (comment: "Chapter images are loaded via AJAX on this site").
  - Actual chapter pages DO contain images loaded via lazy-loading (`img.lazyloaded` with `data-src` attributes), but the expected selector `img.wp-manga-chapter-img` finds 0 images.

### HTML Structure Match
- Same Madara theme as mangaka. Absolute URLs work with regex-based slug extraction.
- Search/detail/chapter-list selectors all match.
- **Chapter page images need a new selector** to capture lazy-loaded images (e.g., `img.lazyloaded[data-src]` or `img[data-src]`).

### Screenshots
- `mangakiss_homepage.png`
- `mangakiss_search.png`
- `mangakiss_detail.png`
- `mangakiss_chapter.png`

---

## 3. mangapandaonl (https://mangapanda.onl)

**Status: NEEDS_FIX**

### curl Tests
| Endpoint | Status | Time |
|----------|--------|------|
| Homepage | HTTP 200 | ~0.6s |
| Search (`/search?q=naruto`) | HTTP 200 | ~0.3s |

### Playwright Findings
- **Homepage:** Loads successfully.
- **Search:** ❌ **BROKEN**
  - The scraper expects `a[href^="/manga/"]` with relative URLs.
  - Actual HTML contains **absolute URLs**: `href="https://mangapanda.onl/manga/naruto_113"`.
  - `href.startsWith('/manga/')` check fails → **0 results returned**.
  - 102 manga links exist in the search HTML.
  - Cover images (`img.manga-thumb.list-item-thumb`) only present on ~3-4 of 102 links.
- **Detail Page:** ✅ WORKING
  - `h1._3xnDj` ✅
  - `img.manga-thumb` ✅
  - `meta[name="description"]` ✅
  - `a.genre-label` ✅ (8 genres)
  - `span._3SlhO` ✅ (4 status/author/artist labels)
- **Chapters:** ❌ **BROKEN**
  - The scraper expects `a[href^="/chapter/"]` with relative URLs.
  - Actual HTML contains **absolute URLs**: `href="https://mangapanda.onl/chapter/naruto_113/chapter-700.5"`.
  - `href.startsWith('/chapter/')` check fails → **0 chapters returned**.
  - 1,604 chapter links exist in the detail HTML.
  - `span._2IG5P` ✅ (1,594 found)
- **Chapter Pages:** ✅ WORKING
  - `img.PB0mN` ✅ (18 images found in raw HTML)

### HTML Structure Match
- Search and chapter links use absolute URLs. The scraper uses `href.startsWith('/...')` which is incompatible.
- Fix: Use `URL` parsing or `href.includes('/manga/')` / regex extraction instead of `startsWith`.
- Detail page and chapter image selectors match correctly.

### Screenshots
- `mangapandaonl_homepage.png`
- `mangapandaonl_search.png`
- `mangapandaonl_detail.png`
- `mangapandaonl_chapter.png`

---

## 4. mangareadersite (https://mangareader.site)

**Status: NEEDS_FIX**

### curl Tests
| Endpoint | Status | Time |
|----------|--------|------|
| Homepage | HTTP 200 | ~0.5s |
| Search (`/search?q=naruto`) | HTTP 200 | ~0.3s |

### Playwright Findings
- **Homepage:** Loads successfully.
- **Search:** ❌ **BROKEN** (same root cause as mangapandaonl)
  - Scraper expects relative URLs (`href.startsWith('/manga/')`).
  - Actual HTML uses **absolute URLs**: `href="https://mangareader.site/manga/naruto_113"`.
  - Result: **0 search results** from the scraper.
  - 104 manga links exist in the search HTML.
  - `img.manga-thumb.list-item-thumb` present on ~4 of 104 links.
- **Detail Page:** ✅ WORKING
  - `h1._3xnDj` ✅
  - `img.manga-thumb` ✅
  - `meta[name="description"]` ✅
  - `a.genre-label` ✅ (11 genres)
  - `span._3SlhO` ✅ (4 labels)
- **Chapters:** ❌ **BROKEN** (same root cause as mangapandaonl)
  - Scraper expects `a[href^="/chapter/"]` with relative URLs.
  - Actual HTML uses **absolute URLs**: `href="https://mangareader.site/chapter/naruto_113/chapter-700.5"`.
  - Result: **0 chapters** from the scraper.
  - 1,644 chapter links exist in the detail HTML.
  - `span._2IG5P` ✅ (1,594 found)
- **Chapter Pages:** ✅ WORKING
  - `img.PB0mN` ✅ (10 images found in raw HTML)

### HTML Structure Match
- This site shares the exact same code/template as mangapandaonl (same class names, same image CDN `imgx.mghcdn.com`, same HTML structure).
- Same fixes required: handle absolute URLs in search and chapter extraction.

### Screenshots
- `mangareadersite_homepage.png`
- `mangareadersite_search.png`
- `mangareadersite_detail.png`
- `mangareadersite_chapter.png`

---

## Summary Table

| Source | Homepage | Search | Detail | Chapters | Chapter Pages | Overall |
|--------|----------|--------|--------|----------|---------------|---------|
| **mangaka** | ✅ | ✅ | ✅ | ✅ | ✅ | **WORKING** |
| **mangakiss** | ✅ | ✅ | ✅ | ✅ | ❌ | **NEEDS_FIX** |
| **mangapandaonl** | ✅ | ❌ | ✅ | ❌ | ✅ | **NEEDS_FIX** |
| **mangareadersite** | ✅ | ❌ | ✅ | ❌ | ✅ | **NEEDS_FIX** |

---

## Required Fixes

### mangakiss
**File:** `src/lib/sources/mangakiss.ts`  
**Issue:** `getChapterPages()` returns empty array.  
**Fix:** Add lazy-loaded image selector. The chapter page contains `img.lazyloaded` elements with `data-src` attributes pointing to chapter images. Example selector: `$('img.lazyloaded[data-src]')` or `$('img[data-src]').filter((_, el) => $(el).attr('data-src')?.includes('wp-content'))`.

### mangapandaonl
**File:** `src/lib/sources/mangapandaonl.ts`  
**Issue:** Absolute URLs break search and chapter extraction.  
**Fix:**
1. In `search()`: Replace `href.startsWith('/manga/')` with `href.includes('/manga/')` or parse with `new URL(href, BASE_URL)`.
2. In `getChapters()`: Replace `href.startsWith('/chapter/')` with `href.includes('/chapter/')`.
3. Extract ID using `new URL(href).pathname.replace('/manga/', '')` instead of string replacement on potentially absolute URLs.

### mangareadersite
**File:** `src/lib/sources/mangareadersite.ts`  
**Issue:** Identical to mangapandaonl — absolute URLs break search and chapter extraction.  
**Fix:** Apply the same URL handling fixes as mangapandaonl.
