# Manga Sources

MangaBlaze supports a wide array of manga sources — both API-based and scraping-based (Tachiyomi-style).

## Architecture

```
Browser → Next.js API Routes → Source Client → Raw Data → Normalized → UI
```

The UI only sees normalized types. It doesn't know if data came from an API or a scraper.

---

## Why Scraping Manga Is Easy

Unlike video streaming sites that use:
- Iframes embedding players from other domains
- HLS/DASH streams with segmented video
- DRM / encrypted media
- Tokenized URLs that expire quickly

**Manga sites are just HTML pages with `<img>` tags.**

A typical manga chapter page looks like:
```html
<div class="reader">
  <img src="https://server1.com/img/001.jpg" />
  <img src="https://server1.com/img/002.jpg" />
  <img src="https://server1.com/img/003.jpg" />
</div>
```

**Our scraper does exactly 3 things:**
1. `fetch()` the chapter URL
2. Parse HTML with Cheerio
3. Extract `src` (or `data-src`) from every `<img>` in the reader container

That's it. No iframes. No video parsing. No DRM. Just HTTP requests and HTML parsing.

---

## API Sources

### 1. MangaDex (API)
**Status:** ✅ Implemented  
**Base:** `https://api.mangadex.org`

**How it works:**
```
GET /at-home/server/{chapterId}
→ { baseUrl, chapter: { hash, data: ["1-...png", ...] } }
→ Image URL: {baseUrl}/data/{hash}/{filename}
```

**Gotchas:**
- Many chapters link externally (MangaPlus) → `externalUrl` set, `pages: 0`
- Rate limit: ~40 req/min
- Images returned as nested `chapter.data[]`, not top-level

---

### 2. ComicK (API)
**Status:** ⏳ Planned  
**Base:** `https://api.comick.fun`

**How it works:**
```
GET /v1.0/chapter/{hid}
→ { chapter: { md_images: [{ url, w, h }, ...] } }
→ Image URL: {url}
```

**Why easy:** Direct image URLs in JSON. No scraping needed.

---

### 3. MangaPlus (API)
**Status:** ⏳ Planned  
**Base:** `https://jumpg-webapi.tokyo-cdn.com`

**How it works:**
```
GET /api/manga_viewer?chapter_id={id}
→ Protobuf binary response
→ Parse binary → extract image URLs
```

**Why harder:** Returns protobuf instead of JSON. Need a protobuf decoder.
**Mitigation:** Use `protobufjs` to decode the binary response. Image URLs are plain strings inside.

---

## Scraping Sources

### 4. MangaNato (Scraper)
**Status:** ⏳ Planned  
**Base:** `https://chapmanganato.to`

**How scraping works:**

**Step 1 — Search:**
```
fetch('https://chapmanganato.to/search/story/naruto')
→ HTML
→ cheerio: $('.search-story-item')
→ extract: href, title, thumbnail src
```

**Step 2 — Manga detail:**
```
fetch('https://chapmanganato.to/manga-abc123')
→ HTML
→ cheerio:
  - title: $('.story-info-right h1').text()
  - chapters: $('.panel-story-chapter-list .a-h').map(...)
```

**Step 3 — Chapter pages (the actual scraper):**
```
fetch('https://chapmanganato.to/chapter-abc123/chapter-1')
→ HTML
→ cheerio: $('.container-chapter-reader img')
→ extract each: $(el).attr('src')
→ Result: ['https://v2.mkclcdnv6tempv2.com/001.jpg', 'https://v2.mkclcdnv6tempv2.com/002.jpg', ...]
```

**Why easy:** Images are plain `<img>` tags with direct `src` URLs. No obfuscation.

---

### 5. MangaPark (Scraper)
**Status:** ⏳ Planned  
**Base:** `https://mangapark.net`

**How scraping works:**

**Step 3 — Chapter pages:**
```
fetch('https://mangapark.net/title/123/en/chapters/1')
→ HTML
→ Two options:
  A) Parse HTML: $('.reading-content img').map(e => $(e).attr('src'))
  B) Extract JSON from window.__NEXT_DATA__
```

**Why easy:** Either standard `<img>` parsing OR structured JSON embedded in the page. No iframes.

---

### 6. MangaKakalot (Scraper)
**Status:** ⏳ Planned  
**Base:** `https://mangakakalot.com`

**How scraping works:**

**Step 3 — Chapter pages:**
```
fetch('https://mangakakalot.com/chapter/abc123/chapter_1')
→ HTML
→ cheerio: $('#vungdoc img')
→ extract: $(el).attr('src') or $(el).attr('data-src') (lazy loading)
→ Result: ['https://cm.blazefast.co/001.jpg', ...]
```

**Why easy:** Standard image tags. Some use `data-src` for lazy loading — just check both attributes.

### 7. TimelessToons (Scraper)
**Status:** ✅ Implemented  
**Base:** `https://timelesstoons.org`

**How scraping works:**

**Step 1 — Search:**
```
fetch('https://timelesstoons.org/search_series')
→ HTML
→ cheerio: button elements
→ extract: id (from href), title, cover (from background-image style)
→ Filter in-memory matching search query
```

**Step 2 — Manga detail:**
```
fetch('https://timelesstoons.org/series/severe-section-manager/')
→ HTML
→ cheerio:
  - title: $('h1').text()
  - cover: extract --photoURL from style attribute
  - description: $('#expand_content p').text()
  - authors/artists: loop through div.font-medium containing 'Author'/'Artist' spans
  - genres: extract from a[href*="genre="] links
```

**Step 3 — Chapter pages:**
```
fetch('https://timelesstoons.org/chapter/chapter-1/')
→ HTML
→ cheerio: img elements inside #pages with class .myImage
→ extract uid attribute: $(el).attr('uid')
→ Page image URL: https://wsrv.nl/?url=cdn.meowing.org/uploads/{uid}
```

### 8. GenzToons (Scraper)
**Status:** ✅ Implemented  
**Base:** `https://genzupdates.com`

**How scraping works:**
Runs on the identical clone CMS architecture as **TimelessToons**. Utilizes the same layout structure, buttons catalog, custom detail CSS container queries, and image placeholder tags with `uid` parameters mapping to `cdn.meowing.org/uploads/{uid}`.

### 9. StoneScape (Scraper)
**Status:** ✅ Implemented  
**Base:** `https://stonescape.xyz`

**How scraping works:**
StoneScape is a modern client-side Vue 3 SPA. Standard HTML parsing yields only an empty shell (`<div id="app"></div>`). To keep the client lightweight and high-performing, we bypass HTML parsing entirely and query its internal JSON REST API endpoints:
- **Search**: `GET /api/series?page=1&limit={limit}&search={query}`
- **Manga Details**: `GET /api/series/by-slug/{slug}`
- **Chapters List**: `GET /api/series/by-slug/{slug}/chapters`
- **Chapter Pages**: `GET /api/chapters/{chapterId}/pages`

Image resources and covers returned from the REST API are relative path strings (e.g. `/pub/covers/...`), which we expand by prepending the base domain.

---

### 10. WuxiaWorld (Scraper)
**Status:** ✅ Implemented  
**Base:** `https://wuxiaworld.site`

**How scraping works:**
Runs on the WordPress **Madara** theme architecture, but specifically uses `/novel/` instead of `/manga/` as the URL prefix.
- **Search**: Scrapes the query result page using `.c-tabs-item__content` for list items, retrieving titles, absolute cover images, and slugs.
- **Manga Details**: Resolves titles, covers (via lazy loading `data-src` or standard `src`), descriptions, genres, status, authors, and artists by checking `.post-content_item` wrappers.
- **Chapters List**: Madara theme chapters list is fetched asynchronously via an AJAX POST request to `${BASE_URL}/novel/${mangaId}/ajax/chapters/` which returns the HTML of all available chapters directly.
- **Chapter Pages**: We extract reader pages (or illustration images in the case of novels) from elements like `.reading-content img`, `.wp-manga-chapter-img`, and `.page-break img`. If it's a text-only light novel, it returns an empty page array `[]` and falls back to original reading links using `externalUrl`.

---

### 11. VoyceMe (Scraper)
**Status:** ✅ Implemented  
**Base:** `https://www.voyce.me`

**How scraping works:**
VoyceMe is built with Next.js and has all its series catalogs deployed to a high-speed Cloudfront CDN static JSON file. We bypass crawling/scraping multiple lists, and instead fetch the centralized system JSON containing 100% of available series details for instant in-memory client-side keyword matches:
- **Search**: `GET https://dlkfxmdtxtzpb.cloudfront.net/system/json/series.json`
- **Manga Details**: Fetches `https://www.voyce.me/series/{slug}` and parses `__NEXT_DATA__` from the server-rendered HTML for detailed fields (like the full, un-truncated description and metadata).
- **Chapters List**: Fetches series chapters asynchronously via official Hasura GraphQL queries against `https://graphql.voyce.me/v1/graphql/`:
  ```graphql
  query ChaptersBySeriesSlug($slug: String!) {
    voyce_chapters(
      where: {
        publish: { _eq: 1 },
        is_deleted: { _eq: false },
        series: { slug: { _eq: $slug } }
      },
      order_by: { id: asc }
    ) {
      id
      title
      thumbnail
      created_at
      publish_date
    }
  }
  ```
- **Chapter Pages**: Fetches split layout or single pages using GraphQL:
  ```graphql
  query ChapterImagesById($chapter_id: Int!) {
    voyce_chapter_images(
      where: { chapter: { id: { _eq: $chapter_id } } },
      order_by: [{ sort_order: asc }, { id: asc }]
    ) {
      id
      image
      chapter_id
      sort_order
    }
  }
  ```
Relative paths inside image panels/series covers are expanded to absolute urls by prefixing `https://dlkfxmdtxtzpb.cloudfront.net`.

---

## The Scraping Code (What It Actually Looks Like)

```typescript
// src/lib/sources/manganato/scraper.ts
import * as cheerio from 'cheerio'

async function getChapterPages(chapterUrl: string): Promise<string[]> {
  // 1. Fetch the HTML
  const html = await fetch(chapterUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 ...' }
  }).then(r => r.text())

  // 2. Load into Cheerio
  const $ = cheerio.load(html)

  // 3. Find all images in the reader
  const images: string[] = []
  $('.container-chapter-reader img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src')
    if (src) images.push(src)
  })

  // 4. Return direct image URLs
  return images
}
```

**That's the entire scraper.** ~15 lines. No iframe handling. No video extraction. No headless browser. Just `fetch` + `cheerio` + extract `src`.

---

## Anti-Bot Measures & Mitigations

| Measure | Frequency | Mitigation |
|---------|-----------|------------|
| Cloudflare | Common | Use `cloudscraper` or proxy through own server |
| Rate limiting | Common | 1-second delays between requests |
| Lazy loading (`data-src`) | Common | Check both `src` and `data-src` |
| Image list in JS variable | Rare | Extract from `<script>` tags with regex |
| Base64-encoded images | Very rare | Decode with `Buffer.from(b64, 'base64')` |

**Note:** None of these require headless browsers (Puppeteer/Playwright). Cheerio handles 99% of manga sites.

---

## Unified Interface

Every source implements:

```typescript
interface MangaSource {
  id: string          // 'mangadex' | 'comick' | 'manganato' | ...
  name: string
  type: 'api' | 'scraper'

  search(query: string): Promise<SourceManga[]>
  getManga(mangaId: string): Promise<SourceMangaDetail>
  getChapters(mangaId: string): Promise<SourceChapter[]>
  getChapterPages(chapterId: string): Promise<SourcePage[]>
}
```

### Normalized Types

```typescript
interface SourceManga {
  id: string
  title: string
  cover: string
  status?: string
  year?: number
}

interface SourceChapter {
  id: string
  chapterNumber: string
  title: string | null
  language: string
  pages: number
  publishedAt: string
  isExternal: boolean
}

interface SourcePage {
  url: string      // Direct image URL
  index: number
}
```

---

## Multi-Source Chapter Merging

When multiple sources have the same manga, chapters are merged by chapter number:

```typescript
// Priority: MangaDex > ComicK > scraping sources
function mergeChapters(sources: SourceChapter[][]): MergedChapter[] {
  const map = new Map<string, MergedChapter>()
  
  for (const sourceList of sources) {
    for (const ch of sourceList) {
      const key = ch.chapterNumber
      if (!map.has(key) || isHigherPriority(ch.source, map.get(key)!.source)) {
        map.set(key, { ...ch, availableSources: [...] })
      }
    }
  }
  
  return Array.from(map.values()).sort((a, b) => 
    parseFloat(b.chapterNumber) - parseFloat(a.chapterNumber)
  )
}
```

---

## Route Structure

```
/api/mangadex/search?q={query}
/api/mangadex/manga/{id}
/api/mangadex/chapters?mangaId={id}
/api/mangadex/pages?chapterId={id}

/api/{source}/search?q={query}
/api/{source}/manga/{id}
/api/{source}/chapters?mangaId={id}
/api/{source}/pages?chapterId={id}
```

The frontend calls `/api/{source}/...` and gets back the exact same normalized format regardless of whether the source is an API or a scraper.

---

## Implementation Order

1. ✅ MangaDex API (done)
2. ComicK API (JSON — trivial)
3. MangaNato scraper (simple HTML `<img>` parsing)
4. MangaKakalot scraper (simple HTML `<img>` parsing)
5. MangaPark scraper (HTML or embedded JSON)
6. MangaPlus API (protobuf — needs decoder library)
