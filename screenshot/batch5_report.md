# Batch 5 Source Verification Report

**Date:** 2026-05-24  
**Tester:** Playwright + curl verification agent  
**Sources tested:** 4

---

## 1. readvagabond → https://readbagabondo.com

### Source Type
Custom implementation (`src/lib/sources/readvagabond.ts`). Single-manga site.

### curl Tests
| Endpoint | Status | Result |
|----------|--------|--------|
| Homepage (`/`) | 200 | ✅ Accessible |

### Playwright Screenshots
- `readvagabond_homepage.png` ✅
- `readvagabond_search.png` ✅
- `readvagabond_detail.png` ✅ (homepage reused as detail)
- `readvagabond_chapter.png` ✅ (`/volume-1/chapter-1`)

### HTML Structure vs Scraper Expectations

| Feature | Scraper Selector | Actual HTML | Match |
|---------|-----------------|-------------|-------|
| Volume links | `a[href^="/volume-"]` | 37 found on homepage | ✅ |
| Chapter images | `main img` with `bucket.readbagabondo.com` | Images use `https://bucket.readbagabondo.com/...` | ✅ |
| Description | `p.text-gray-500.dark\:text-neutral-400` | 38 elements found; `.first()` may or may not get the manga synopsis | ⚠️ |

### Observations
- Search is hardcoded to only return "Vagabond" if query includes "vagabond". Appropriate for a single-manga site.
- Chapter extraction visits each volume page and scrapes chapter links. This should work as long as volume pages remain accessible.
- Chapter page images load correctly from the `bucket.readbagabondo.com` CDN.

### Verdict: **WORKING**
> Minor: Description extraction may pick up chapter descriptions instead of the main synopsis since 38 matching `<p>` elements exist and `.first()` is used. A fallback description is hardcoded.

---

## 2. readblackclover → https://ww10.readblackclover.com

### Source Type
`readmanga-base.ts` factory (`createReadMangaSource`)

### curl Tests
| Endpoint | Status | Result |
|----------|--------|--------|
| Homepage (`/`) | 200 | ✅ Accessible |
| Detail (`/manga/black-clover/`) | 200 | ✅ Accessible |
| Chapter (`/chapter/black-clover-chapter-392/`) | 200 | ✅ Accessible |

### Playwright Screenshots
- `readblackclover_homepage.png` ✅
- `readblackclover_search.png` ✅
- `readblackclover_detail.png` ✅
- `readblackclover_chapter.png` ⚠️ (404 for guessed `/chapter/black-clover-chapter-1/`; actual chapters start at higher numbers like 392)

### HTML Structure vs Scraper Expectations

| Feature | Scraper Selector | Actual HTML | Match |
|---------|-----------------|-------------|-------|
| Homepage manga links | `a[href*="/manga/"]` | 18 found | ✅ |
| Detail title | `h1.my-3.font-bold` | Present in raw HTML | ✅ |
| Detail cover | `img[style*="width: 300px"]` | Client-rendered, NOT in raw HTML | ❌ (fallback used) |
| Detail cover fallback | `meta[property="og:image"]` | Present (`https://i.imgur.com/pKG50Z8.png`) | ✅ |
| Description | `div.text-text-muted` | First match IS the actual synopsis | ✅ |
| Chapter links | `a[href*="/chapter/"]` | 786 found in raw HTML | ✅ |
| Chapter text format | `/Chapter\s+([\d.]+)/i` | "Black Clover Chapter 392" | ✅ |
| Chapter pages | `img.js-page` | Present with `.jpeg` extension | ✅ |

### Observations
- **Search bug:** The main manga homepage anchor text is `"View all chapters"`, not "Black Clover". The scraper filters results by title BEFORE visiting detail pages, so a search for "black clover" will NOT return the main series. Other spin-offs ("Fan Colored", "Gaiden", "Hungry Joker") may appear, but the primary series is missing from search results.
- Chapter URLs are extracted from the detail page, so the scraper will get correct chapter IDs (e.g. `black-clover-chapter-392`). The guess of `chapter-1` was 404 but that's irrelevant to scraper behavior.

### Verdict: **NEEDS_FIX**
> **Issue:** Search fails to find the main "Black Clover" series because the homepage anchor text is "View all chapters" and filtering happens before detail-page title resolution.
>
> **Fix suggestion:** Either remove title filtering in `search()` and filter after detail-page titles are fetched, or change the selector to capture the actual manga title from the homepage.

---

## 3. readfairytail → https://ww8.readfairytail.com

### Source Type
`readmanga-base.ts` factory (`createReadMangaSource`)

### curl Tests
| Endpoint | Status | Result |
|----------|--------|--------|
| Homepage (`/`) | 200 | ✅ Accessible |
| Detail (`/manga/fairy-tail/`) | 200 | ✅ Accessible |
| Chapter (`/chapter/fairy-tail-chapter-545/`) | 200 | ✅ Accessible |

### Playwright Screenshots
- `readfairytail_homepage.png` ✅
- `readfairytail_search.png` ✅
- `readfairytail_detail.png` ✅
- `readfairytail_chapter.png` ⚠️ (404 for guessed `/chapter/fairy-tail-chapter-1/`; actual chapters start at higher numbers)

### HTML Structure vs Scraper Expectations

| Feature | Scraper Selector | Actual HTML | Match |
|---------|-----------------|-------------|-------|
| Homepage manga links | `a[href*="/manga/"]` | 37 found | ✅ |
| Homepage link texts | `$(el).text().trim()` | Proper titles: "Fairy Tail", "FT Zero", "Dead Rock", etc. | ✅ |
| Detail title | `h1.my-3.font-bold` | Present in raw HTML | ✅ |
| Detail cover | `img[style*="width: 300px"]` | Client-rendered, NOT in raw HTML | ❌ (fallback used) |
| Detail cover fallback | `meta[property="og:image"]` | Present (`https://i.imgur.com/XUDUoez.png`) | ✅ |
| Description | `div.text-text-muted` | First match is a chapter title ("The Path you believe in!"), NOT the manga synopsis. The actual synopsis is client-rendered / absent from raw HTML. | ❌ |
| Chapter links | `a[href*="/chapter/"]` | 1102 found in raw HTML | ✅ |
| Chapter text format | `/Chapter\s+([\d.]+)/i` | "Fairy Tail Chapter 545.5" | ✅ |
| Chapter pages | `img.js-page` | Present with `.jpg` extension | ✅ |

### Observations
- **Search works** for this site because homepage manga links have proper titles.
- **Description is broken:** The raw HTML contains many `div.text-text-muted` elements, but the first one is a chapter title. The actual manga synopsis is not present in the server-rendered HTML. `getManga()` will return a chapter title as the description.
- Chapter extraction and page loading work correctly.

### Verdict: **NEEDS_FIX**
> **Issue:** `getManga()` description selector picks up chapter titles instead of the actual manga synopsis because `div.text-text-muted` is too broad and the synopsis is not server-rendered.
>
> **Fix suggestion:** Use a more specific description selector, or accept that description may be empty for this site.

---

## 4. readjujutsukaisen → https://ww5.readjujutsukaisen.com

### Source Type
`readmanga-base.ts` factory (`createReadMangaSource`)

### curl Tests
| Endpoint | Status | Result |
|----------|--------|--------|
| Homepage (`/`) | 200 | ✅ Accessible |
| Detail (`/manga/jujutsu-kaisen/`) | 200 | ✅ Accessible |
| Chapter (`/chapter/jujutsu-kaisen-chapter-272.5/`) | 200 | ✅ Accessible |

### Playwright Screenshots
- `readjujutsukaisen_homepage.png` ✅
- `readjujutsukaisen_search.png` ✅
- `readjujutsukaisen_detail.png` ✅
- `readjujutsukaisen_chapter.png` ✅

### HTML Structure vs Scraper Expectations

| Feature | Scraper Selector | Actual HTML | Match |
|---------|-----------------|-------------|-------|
| Homepage manga links | `a[href*="/manga/"]` | 29 found | ✅ |
| Homepage link texts | `$(el).text().trim()` | Main series text is "View all chapters" | ❌ |
| Detail title | `h1.my-3.font-bold` | Present in raw HTML | ✅ |
| Detail cover | `img[style*="width: 300px"]` | Template syntax (`${item.image}`), not rendered server-side | ❌ (fallback used) |
| Detail cover fallback | `meta[property="og:image"]` | Present (`https://i.imgur.com/AHz5hzf.png`) | ✅ |
| Description | `div.text-text-muted` | First match is a chapter title ("EPILOGUE - OZAWA YUKO"), NOT the synopsis. No actual synopsis in raw HTML. | ❌ |
| Chapter links | `a[href*="/chapter/"]` | 564 found in raw HTML | ✅ |
| Chapter text format | `/Chapter\s+([\d.]+)/i` | "Jujutsu Kaisen Chapter 272.5" | ✅ |
| Chapter pages | `img.js-page` | Present with `.jpeg` extension | ✅ |

### Observations
- **Search bug:** Same as readblackclover — the main "Jujutsu Kaisen" series homepage anchor text is "View all chapters". Searching for "jujutsu kaisen" will miss the main series. Spin-offs like "Jujutsu Kaisen 0", "JJK Colored" will be found.
- **Description is broken:** Same as readfairytail — `div.text-text-muted` first match is a chapter title. The manga synopsis is not present in the server-rendered HTML.
- The site has a slow-loading homepage that caused a `networkidle` timeout in the first Playwright run. The site is functional but heavy with ads/scripts.

### Verdict: **NEEDS_FIX**
> **Issues:**
> 1. Search fails to find the main "Jujutsu Kaisen" series (homepage anchor text is "View all chapters").
> 2. `getManga()` description returns chapter titles instead of the synopsis.
>
> **Fix suggestions:**
> 1. Defer search filtering until after detail-page titles are fetched, or scrape titles from a more reliable homepage element.
> 2. Use a more specific description selector or accept empty descriptions.

---

## Cross-Cutting Issue: `readmanga-base.ts` Cover Image Selector

All three base-derived sources use:
```ts
$('img[style*="width: 300px"]').attr('src')
```

This image is **client-rendered** on all three sites and is NOT present in the server-rendered HTML. The scraper falls back to `meta[property="og:image"]`, which IS present for all three sites. This means covers work via fallback, but the primary selector is effectively dead code for these sites.

**Recommendation:** Consider removing the `img[style*="width: 300px"]` selector or replacing it with a server-rendered alternative to avoid relying on the fallback.

---

## Summary Table

| Source | Homepage | Search | getManga | getChapters | getChapterPages | Overall |
|--------|----------|--------|----------|-------------|-----------------|---------|
| readvagabond | ✅ | ✅ (hardcoded) | ⚠️ | ✅ | ✅ | **WORKING** |
| readblackclover | ✅ | ❌ | ✅ | ✅ | ✅ | **NEEDS_FIX** |
| readfairytail | ✅ | ✅ | ⚠️ | ✅ | ✅ | **NEEDS_FIX** |
| readjujutsukaisen | ✅ | ❌ | ⚠️ | ✅ | ✅ | **NEEDS_FIX** |

### Screenshot Files
All screenshots saved to `/home/neon/programs/side_project/mangablaze/screenshot/`:

```
readvagabond_homepage.png
readvagabond_search.png
readvagabond_detail.png
readvagabond_chapter.png
readblackclover_homepage.png
readblackclover_search.png
readblackclover_detail.png
readblackclover_chapter.png
readfairytail_homepage.png
readfairytail_search.png
readfairytail_detail.png
readfairytail_chapter.png
readjujutsukaisen_homepage.png
readjujutsukaisen_search.png
readjujutsukaisen_detail.png
readjujutsukaisen_chapter.png
```
