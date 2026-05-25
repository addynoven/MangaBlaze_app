# Batch 8 Verification Report

**Date:** 2026-05-24
**Sources tested:** 4
**Method:** curl + Playwright screenshots + HTML selector inspection

---

## 1. honkaiimpact3 (`src/lib/sources/honkaiimpact3.ts`)

**Website:** https://manga.honkaiimpact3.com  
**HTTP Status (curl):** 200 OK  
**Verdict:** ✅ WORKING

### Screenshots
- `honkaiimpact3_home.png` — Homepage loads correctly
- `honkaiimpact3_booklist.png` — `/book/` list page loads with manga entries
- `honkaiimpact3_detail.png` — Book detail page (e.g. `/book/1011`) loads correctly

### Selector Validation
| Scraper Selector | Found on Site? | Notes |
|------------------|----------------|-------|
| `.container` (on `/book/`) | ✅ Yes | Each manga is wrapped in `<a><div class="container">` |
| `.container-title` | ✅ Yes | Contains title text node (e.g. "Elan Palatinus") |
| `.container-cover img` | ✅ Yes | `src` attribute points to Hoyoverse CDN |
| `.container-description` | ✅ Yes | Contains synopsis text |
| `.title` (detail) | ✅ Yes | `<div class="title">` on detail page |
| `.detail_img img.cover` | ✅ Yes | Cover image present |
| `.detail_info1` | ✅ Yes | Description block present |
| `/book/{id}/get_chapter` | ✅ Yes | Returns valid JSON array with chapter metadata |
| `img.comic_img[data-original]` | ✅ Yes | Lazy-loaded page images with `data-original` present |

### Notes
- The `/book/{id}/get_chapter` endpoint returns a clean JSON array with `id`, `title`, `page`, `bookid`, `chapterid`, `praise`, `timestamp`.
- Chapter reader pages (e.g. `/book/1011/1`) contain `img.comic_img` with `data-original` pointing to `act-webstatic.hoyoverse.com`.
- All critical scraper paths are functional.

---

## 2. vgperson (`src/lib/sources/vgperson.ts`)

**Website:** https://vgperson.com/other/mangaviewer.php  
**HTTP Status (curl):** 200 OK  
**Verdict:** ✅ WORKING

### Screenshots
- `vgperson_home.png` — Manga list page loads correctly
- `vgperson_detail.png` — Manga detail page (e.g. `?m=1`) loads correctly

### Selector Validation
| Scraper Selector | Found on Site? | Notes |
|------------------|----------------|-------|
| `p.nospace a[href^="?m="]` | ✅ Yes | Manga list links present (e.g. `<p class="nospace"><a href="?m=1">...</a></p>`) |
| `h2.title` | ✅ Yes | `<h2 class="title nospace">` on detail page |
| `meta[name="description"]` | ✅ Yes | Present in `<head>` |
| `p.complete, p.ongoing, p.hiatus, p.cancelled` | ✅ Yes | `p.complete` found on tested manga |
| `table.chaptertable tr` | ✅ Yes | Chapter list rendered in table rows |
| `a[href^="?m="]` inside row | ✅ Yes | Chapter links like `?m=1&c=1` present |
| `td:nth-child(2)` | ✅ Yes | Second column contains chapter subtitle |
| `img[alt^="Page"]` | ✅ Yes | Reader page contains hidden `<img>` tags with `alt="Page N"` |

### Notes
- This is a single-page app-style viewer. The chapter list page (`?m=1`) contains both metadata and the chapter table.
- The reader (`?m=1&c=1`) pre-loads all page images as hidden `<img style="display: none" src="..." alt="Page N">` tags; the scraper’s `img[alt^="Page"]` selector correctly captures them.
- Search is performed client-side by filtering the full manga list; this works as long as the list page is reachable.

---

## 3. onepunchmanonline (`src/lib/sources/onepunchmanonline.ts`)

**Website:** https://w11.1punchman.com  
**HTTP Status (curl):** 200 OK  
**Verdict:** ✅ WORKING

### Screenshots
- `onepunchmanonline_home.png` — Homepage loads correctly
- `onepunchmanonline_api.png` — WordPress REST API response rendered in browser

### Selector Validation
| Scraper Selector / API | Found on Site? | Notes |
|------------------------|----------------|-------|
| `/wp-json/wp/v2/comic?per_page=100&page=1` | ✅ Yes | Returns valid JSON array of WP Comic posts |
| `title.rendered` | ✅ Yes | e.g. `"One-Punch Man &#8211; Chapter 231"` |
| `slug` | ✅ Yes | e.g. `"one-punch-man-chapter-231"` |
| `content.rendered` | ✅ Yes | Contains `<img src="...">` tags for chapter pages |
| `date` | ✅ Yes | ISO-like date string present |
| Search keyword filter | ✅ By design | Only returns result for `one punch`, `one-punch`, `saitama`, `opm`, `wanpanman` |

### Notes
- The site is a single-manga WordPress comic site. The scraper hardcodes the manga ID as `one-punch-man` and fetches chapters via the WP REST API.
- API returns chapter posts with HTML content containing `<img src="...">` tags; the scraper’s `img[src]` + extension filter correctly extracts page URLs.
- The hardcoded `COVER_URL` (`https://1punchman.com/wp-content/uploads/...`) still resolves, though the base domain has shifted to `w11.1punchman.com`. The cover image loads fine.
- Search logic is intentionally limited to One-Punch Man keywords; this is acceptable for a single-manga source.

---

## 4. frierenonline (`src/lib/sources/frierenonline.ts`)

**Website:** https://www.frieren.online  
**HTTP Status (curl):** 200 OK  
**Verdict:** ⚠️ NEEDS_FIX (minor status selector issue)

### Screenshots
- `frierenonline_home.png` — Homepage loads correctly
- `frierenonline_chapter.png` — Playwright navigation resulted in empty body (likely anti-bot / redirect on click); however, direct curl/fetch works fine.

### Selector Validation
| Scraper Selector | Found on Site? | Notes |
|------------------|----------------|-------|
| `h1, h2` containing "Frieren" | ✅ Yes | Page title and headings match |
| `.summary_image img, .profile-manga img` | ✅ Yes | `.profile-manga` contains the cover `<img>` with `src` |
| `.synopsis p` | ✅ Yes | Synopsis paragraph present |
| `a[href*="/manga-genre/"]` | ✅ Yes | Genre links present (Adventure, Drama, Fantasy, etc.) |
| `a[href*="/manga-author/"]` | ✅ Yes | Author link present |
| `a[href*="/manga-artist/"]` | ✅ Yes | Artist link present |
| `.listing-chapters_wrap a[href*="/manga/sousou-no-frieren-chapter-"]` | ✅ Yes | Chapter list links present |
| `img.wp-manga-chapter-img` | ✅ Yes | Present on chapter pages with `src` attribute |
| `.post-status .summary-content` / `.mg_status .summary-content` | ❌ **NO** | **Status is not inside these selectors** |

### Issue Details
- **Status extraction is broken.** The site renders status as:
  ```html
  <div class="col-xl-3 col-lg-3 col-3 mt-0">
    <h5>Status</h5>
    <h4>OnGoing</h4>
  </div>
  ```
  The scraper looks for `.post-status .summary-content` or `.mg_status .summary-content`, which do **not** exist in the current HTML. As a result, `status` will always be `undefined`.

- **Fix suggestion:** Update the status selector to something like:
  ```js
  $('.info .col-xl-3 h4').filter((_, el) => {
    const heading = $(el).prev('h5').text().trim().toLowerCase()
    return heading === 'status'
  }).text().trim().toLowerCase()
  ```
  Or use a broader selector such as `.info h5:contains("Status") + h4` (via Cheerio sibling traversal).

- **Chapter page fetch works via curl.** Although Playwright click-navigation resulted in an empty page (the site may use JS redirects or anti-automation), the scraper uses server-side `fetchHTML`, which follows HTTP redirects and successfully retrieves the chapter HTML containing `img.wp-manga-chapter-img`.

- The regex `/\/manga\/(sousou-no-frieren-chapter-\d+)\/?$/` only matches integer chapters. If the site ever publishes decimal chapters (e.g. `chapter-149.5`), the scraper will skip them. This is a minor future risk.

---

## Summary

| Source | Verdict | Critical Issues | Minor Issues |
|--------|---------|-----------------|--------------|
| honkaiimpact3 | ✅ WORKING | None | None |
| vgperson | ✅ WORKING | None | None |
| onepunchmanonline | ✅ WORKING | None | Cover URL uses old domain (still works) |
| frierenonline | ⚠️ NEEDS_FIX | Status selector broken | None |

### Recommended Actions
1. **frierenonline**: Fix `getManga` status extraction to match the actual DOM structure (`.info h5` + sibling `h4`).
2. All other sources are verified functional with no changes required.
