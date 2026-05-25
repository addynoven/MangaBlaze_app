# Mangablaze Batch 1 Source Verification Report

**Date:** 2026-05-24
**Method:** Playwright + curl + cheerio HTML analysis
**Screenshots:** `/home/neon/programs/side_project/mangablaze/screenshot/`

---

## Summary

| Source | Status | Issues |
|--------|--------|--------|
| bunmanga | **WORKING** | None |
| likemanga | **WORKING** | None |
| mangack | **NEEDS_FIX** | Genre selector uses `genre/` (singular) but site uses `genres/` (plural) |
| mangagofun | **NEEDS_FIX** | `getChapterPages()` stubbed to return `[]` despite images being present in HTML |

---

## 1. bunmanga (`src/lib/sources/bunmanga.ts`)

**BASE_URL:** `https://bunmanga.com`

### curl Tests
- Homepage: HTTP 200, ~153KB
- Search (`/?s=naruto&post_type=wp-manga`): HTTP 200, ~91KB (no results for "naruto" — this manga is simply not hosted on the site)
- Search (`/?s=hunger&post_type=wp-manga`): HTTP 200, ~95KB (1 result found)

### Playwright Screenshots
- `bunmanga_homepage.png` ✅
- `bunmanga_search.png` ✅
- `bunmanga_detail.png` ✅
- `bunmanga_chapter.png` ✅

### Selector Verification (cheerio against real HTML)

| Scraper Selector | Found? | Notes |
|------------------|--------|-------|
| `.c-tabs-item .c-tabs-item__content` | ✅ | Search result container |
| `.tab-thumb a` | ✅ | Link to manga detail page |
| `.tab-summary .post-title h3 a` | ✅ | Title text (e.g. "Hunger Relation") |
| `.post-title h1` | ✅ | Detail page title |
| `.summary_image img` | ✅ | Cover image src |
| `.description-summary .summary__content` | ✅ | Description text |
| `.genres-content a` | ✅ | Genre links |
| `li.wp-manga-chapter` | ✅ | 57 chapters found on test manga |
| `.wp-manga-chapter-img` | ✅ | 7 chapter-page images found |

### Verdict: **WORKING**
All selectors match the live HTML. Search works for manga that exist on the site. Detail, chapter list, and chapter images all parse correctly. The `src` values for chapter images contain leading whitespace but the scraper calls `.trim()` so this is handled.

---

## 2. likemanga (`src/lib/sources/likemanga.ts`)

**BASE_URL:** `https://likemanga.ink`

### curl Tests
- Homepage: HTTP 200, ~319KB
- Search (`/?act=search&f[status]=all&f[sortby]=lastest-chap&f[keyword]=naruto`): HTTP 200, ~158KB

### Playwright Screenshots
- `likemanga_homepage.png` ✅
- `likemanga_search.png` ✅
- `likemanga_detail.png` ✅
- `likemanga_chapter.png` ✅

### Selector Verification (cheerio against real HTML)

| Scraper Selector | Found? | Notes |
|------------------|--------|-------|
| `img.jtip.card-img-top` | ✅ | 8 search results for "naruto" |
| `img.closest('a')` | ✅ | Parent `<a>` contains href |
| `img.attr('alt')` | ✅ | Title from alt attribute |
| `h1.title-detail` | ✅ | Detail page title (e.g. "Renge to Naruto!") |
| `img[data-index]` | ✅ | 17 chapter-page images. **All** are actual manga pages; ad containers also have `data-index` but on `<div>` tags, not `<img>` tags, so `$('img[data-index]')` correctly excludes them. |
| `#summary_shortened` / `#summary_content` | ✅ | Description text |
| `a[href^="/genres/"]` | ✅ | Genre links |
| `li.wp-manga-chapter a` | ✅ | 51 chapters found on test manga |

### Verdict: **WORKING**
All selectors match the live HTML. Search, detail, chapters, and chapter images all parse correctly. The `data-index` based page ordering works because only manga-page `<img>` elements carry that attribute.

---

## 3. mangack (`src/lib/sources/mangack.ts`)

**BASE_URL:** `https://mangack.com`

### curl Tests
- Homepage: HTTP 200, ~110KB
- Search (`/search/naruto/`): HTTP 200, ~69KB (2 results found)

### Playwright Screenshots
- `mangack_homepage.png` ✅
- `mangack_search.png` ✅
- `mangack_detail.png` ✅
- `mangack_chapter.png` ✅

### Selector Verification (cheerio against real HTML)

| Scraper Selector | Found? | Notes |
|------------------|--------|-------|
| `a.wrap-text[href^="https://mangack.com/manga/"]` | ✅ | 2 search results for "naruto" |
| `h1.entry-title` | ✅ | Detail page title (e.g. "Boruto: Naruto Next Generations") |
| `img.wp-post-image` | ✅ | Cover image src |
| `a[href^="https://mangack.com/genre/"]` | ❌ | **BROKEN** — site uses `/genres/` (plural), scraper expects `/genre/` (singular). Genres array will always be empty. |
| `ul.chapterslist a.title` | ✅ | 81 chapters found on test manga |
| `img.aligncenter` | ✅ | 41 chapter-page images found |
| `.entry-content` | ⚠️ | Matches, but selector is too broad. It also captures "Bookmark", "Followers: 13", "Views: 53.7K" etc., polluting the description field. |

### Verdict: **NEEDS_FIX**
- **Genre selector broken:** Change `a[href^="https://mangack.com/genre/"]` to `a[href^="https://mangack.com/genres/"]` (add `s`).
- **Description selector too broad:** `.entry-content` pulls in bookmark buttons and view counts. Consider narrowing to a synopsis-specific container if one exists.
- Otherwise search, detail title/cover, chapters, and chapter images all work.

---

## 4. mangagofun (`src/lib/sources/mangagofun.ts`)

**BASE_URL:** `https://www.mangago.fun`

### curl Tests
- Homepage: HTTP 200, ~154KB
- Search (`/?s=naruto&post_type=wp-manga`): HTTP 200, ~87KB (no results for "naruto" — not hosted)
- Search (`/?s=dragon&post_type=wp-manga`): HTTP 200, ~101KB (1 result found)

### Playwright Screenshots
- `mangagofun_homepage.png` ✅
- `mangagofun_search.png` ✅
- `mangagofun_detail.png` ✅
- `mangagofun_chapter.png` ✅

### Selector Verification (cheerio against real HTML)

| Scraper Selector | Found? | Notes |
|------------------|--------|-------|
| `.c-tabs-item` | ✅ | Search result container |
| `.post-title h3 a` | ✅ | Title link (e.g. "Dragonslayer's Class Regression") |
| `.tab-thumb img` | ✅ | Cover image (checks `data-src` then `src`) |
| `.post-title h1` / `.post-title h3` | ✅ | Detail page title |
| `.summary_image img` | ✅ | Detail cover image |
| `.description-summary p` / `.summary__content p` | ✅ | Description paragraphs |
| `.genres-content a` / `a[href*="/manga-genre/"]` | ✅ | Genre links |
| `li.wp-manga-chapter a` | ✅ | 48 chapters found on test manga |
| `.wp-manga-chapter-img` | ✅ | 12 chapter-page images present in raw HTML |

### Verdict: **NEEDS_FIX**
The `getChapterPages()` method is currently stubbed:

```ts
async getChapterPages(chapterId: string): Promise<SourcePage[]> {
  try {
    // Chapter images are loaded via AJAX on this site
    return []
  } catch {
    return []
  }
}
```

**However, live HTML analysis proves chapter images are NOT AJAX-loaded.** They are present in the initial HTML as `<img class="wp-manga-chapter-img" src="...">` elements (same pattern as bunmanga). The fix is to implement the method exactly like bunmanga:

```ts
async getChapterPages(chapterId: string): Promise<SourcePage[]> {
  try {
    const url = `${BASE_URL}/manga/${chapterId}/`
    const $ = await fetchHTML(url)
    const pages: SourcePage[] = []
    $('.wp-manga-chapter-img').each((index, el) => {
      const src = $(el).attr('src')
      if (src) {
        pages.push({ url: src.trim(), index })
      }
    })
    return pages
  } catch {
    return []
  }
}
```

All other selectors (search, detail, chapters) match correctly.

---

## Appendix: Screenshot Inventory

| Screenshot | Source | Page | Status |
|------------|--------|------|--------|
| `bunmanga_homepage.png` | bunmanga | Homepage | ✅ |
| `bunmanga_search.png` | bunmanga | Search (hunger) | ✅ |
| `bunmanga_detail.png` | bunmanga | Manga detail | ✅ |
| `bunmanga_chapter.png` | bunmanga | Chapter reader | ✅ |
| `likemanga_homepage.png` | likemanga | Homepage | ✅ |
| `likemanga_search.png` | likemanga | Search (naruto) | ✅ |
| `likemanga_detail.png` | likemanga | Manga detail | ✅ |
| `likemanga_chapter.png` | likemanga | Chapter reader | ✅ |
| `mangack_homepage.png` | mangack | Homepage | ✅ |
| `mangack_search.png` | mangack | Search (naruto) | ✅ |
| `mangack_detail.png` | mangack | Manga detail | ✅ |
| `mangack_chapter.png` | mangack | Chapter reader | ✅ |
| `mangagofun_homepage.png` | mangagofun | Homepage | ✅ |
| `mangagofun_search.png` | mangagofun | Search (dragon) | ✅ |
| `mangagofun_detail.png` | mangagofun | Manga detail | ✅ |
| `mangagofun_chapter.png` | mangagofun | Chapter reader | ✅ |
