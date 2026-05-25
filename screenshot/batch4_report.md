# Mangablaze Batch 4 Verification Report

**Date:** 2026-05-24
**Sources tested:** manhuaplus, manhwaget, readberserk, readmha
**Method:** curl + Playwright (Chromium) + server-side fetch validation

---

## 1. manhuaplus → https://manhuaplus.com

**Status: WORKING**

### curl tests
- Homepage: `200 OK`
- Search endpoint (`/?s=naruto&post_type=wp-manga`): `200 OK`

### Playwright findings
- **Homepage**: Loads successfully. Manga links exist in sliders and listing grids.
- **Search**: Tested with "naruto" returned no results (site simply does not host Naruto). Retested with "immortal" — **1 search result** found matching `.tab-content-wrap .c-tabs-item`.
- **Detail page** (`/manga/rebirth-of-the-urban-immortal-cultivator/`):
  - `meta[property="og:title"]`: 2 matches
  - `.summary_image img`: present
  - `.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]`: **759 chapters**
- **Chapter page** (server-side fetch test):
  - `img[decoding="async"]` with `src` containing `cdn.manhuaplus.com`: **found in raw HTML**

### Selector alignment
| Scraper expects | Actual site | Match? |
|-----------------|-------------|--------|
| `.tab-content-wrap .c-tabs-item` | Used in search results | ✅ |
| `.tab-thumb a[href*="/manga/"]` | Used for cover+link | ✅ |
| `meta[property="og:title"]` | Present | ✅ |
| `.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]` | Present | ✅ |
| `img[decoding="async"]` + `cdn.manhuaplus.com` | Present in chapter raw HTML | ✅ |

### Notes
- Search returns empty for queries not in catalog; this is expected behavior, not a scraper bug.

### Screenshots
- `manhuaplus_homepage.png`
- `manhuaplus_search.png`
- `manhuaplus_search2.png`
- `manhuaplus_detail.png`

---

## 2. manhwaget → https://manhwaget.com

**Status: WORKING**

### curl tests
- Homepage: `200 OK`
- Search endpoint (`/?s=naruto&post_type=wp-manga`): `200 OK`

### Playwright findings
- **Homepage**: Loads successfully. Manga links present.
- **Search**: Tested with "revenge" — **16 results** found matching `.c-tabs-item__content`. ("naruto" also had no results on this site.)
- **Detail page** (`/manga/revenge-of-the-iron-blooded-sword-hound/`):
  - `.post-title h1`: 1 match
  - `.summary_image img`: 1 match
  - `.description-summary`: 1 match
  - `ul.main.version-chap li.wp-manga-chapter a`: **38 chapters**
- **Chapter page** (server-side fetch test):
  - `.read-container img.wp-manga-chapter-img`: **found in raw HTML**

### Selector alignment
| Scraper expects | Actual site | Match? |
|-----------------|-------------|--------|
| `.c-tabs-item__content` | Used in search results | ✅ |
| `.post-title h3 a` / `.post-title h1` | Present | ✅ |
| `.summary_image img` | Present | ✅ |
| `.description-summary` | Present | ✅ |
| `ul.main.version-chap li.wp-manga-chapter a` | Present | ✅ |
| `.read-container img.wp-manga-chapter-img` | Present in chapter raw HTML | ✅ |

### Notes
- Search URL `/?s={query}&post_type=wp-manga` works; site may redirect to `/search/{query}/` but response still contains results.

### Screenshots
- `manhwaget_homepage.png`
- `manhwaget_search.png`
- `manhwaget_detail.png`

---

## 3. readberserk → https://readberserk.com

**Status: WORKING**

### curl tests
- Homepage: `200 OK`

### Playwright findings
- **Homepage**: Loads successfully. `a[href^="https://readberserk.com/manga/"]`: **9 matches**.
- **Detail page** (`/manga/berserk/`):
  - `h2.mb-0 span`: 1 match (title)
  - `.card-img-right`: 1 match (cover)
  - `.card-text p`: 0 matches in test, but fallback to `meta[property="og:description"]` works.
  - `a[href*="/chapter/"]`: **402 chapters**
- **Chapter page** (`/chapter/berserk-chapter-383/`):
  - Server-side fetch: `img.pages__img` + `data-src`: **found in raw HTML**
  - After JS render: `img.pages__img`: **24 matches**

### Selector alignment
| Scraper expects | Actual site | Match? |
|-----------------|-------------|--------|
| `a[href^='https://readberserk.com/manga/']` | Present on homepage | ✅ |
| `h2.mb-0 span` | Present | ✅ |
| `.card-img-right` | Present | ✅ |
| `.card-text p` | Missing on some pages, but fallback meta works | ⚠️ |
| `table tr` / `.card` + `a[href*="/chapter/"]` | Present | ✅ |
| `img.pages__img` with `data-src` | Present in raw HTML | ✅ |

### Notes
- Site is heavily focused on Berserk; search is limited to homepage scraping plus a hardcoded "berserk" entry.
- `.card-text p` was absent on the tested detail page, but `meta[property="og:description"]` is available as a robust fallback.

### Screenshots
- `readberserk_homepage.png`
- `readberserk_detail.png`
- `readberserk_chapter.png`

---

## 4. readmha → https://ww10.readmha.com

**Status: WORKING**

### curl tests
- Homepage: `200 OK`

### Playwright findings
- **Homepage**: Loads successfully. `a[href^="/manga/"]`: **9 matches**.
- **Detail page** (`/manga/boku-no-hero-academia-colored/`):
  - `<title>`: 1 match
  - `meta[property="og:image"]`: 2 matches
  - `img[src*="i.imgur.com"]`: 1 match
  - `a[href*="/chapter/"]`: **188 chapters**
- **Chapter page** (`/chapter/boku-no-hero-academia-colored-chapter-368/`, server-side fetch):
  - `img.js-page`: **found in raw HTML**

### Selector alignment
| Scraper expects | Actual site | Match? |
|-----------------|-------------|--------|
| `a[href^="/manga/"]` | Present on homepage | ✅ |
| `<title>` | Present | ✅ |
| `meta[property="og:image"]` | Present | ✅ |
| `img[src*="i.imgur.com"]` | Present | ✅ |
| `a[href*="/chapter/"]` with text containing "chapter" | Present | ✅ |
| `img.js-page` with `src` / `data-src` | Present in chapter raw HTML | ✅ |

### Notes
- The manga slug for MHA on this site is `boku-no-hero-academia-colored`, not `my-hero-academia`. Search derives titles from slugs via `titleCaseFromSlug`, so searching "hero academia" or "boku" will match.
- No dedicated search endpoint; search function scrapes the homepage and filters known links. This is functional but limited to homepage-linked manga.

### Screenshots
- `readmha_homepage.png`
- `readmha_detail.png`
- `readmha_chapter.png`

---

## Summary

| Source | Status | Key Risk |
|--------|--------|----------|
| manhuaplus | **WORKING** | Search may be empty for off-catalog titles |
| manhwaget | **WORKING** | Search may be empty for off-catalog titles |
| readberserk | **WORKING** | `.card-text p` occasionally missing; fallback covers it |
| readmha | **WORKING** | Search limited to homepage-scraped manga; slug mismatch possible |

**Overall batch verdict: All 4 sources are functional.** No scraper fixes required, though readberserk's description selector has a safe meta-tag fallback already in place.
