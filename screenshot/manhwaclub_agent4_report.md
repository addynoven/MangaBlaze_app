# ManhwaClub.net Scraper Analysis Report

**Source URL:** `https://manhwaclub.net`  
**Platform:** WordPress 6.5.4 + Madara theme  
**Date:** 2026-05-24

---

## 1. Site Accessibility

- **Homepage:** Accessible via curl and browser. Returns HTML with heavy JS/CSS payload.
- **Search:** Uses WordPress native search with `post_type=wp-manga` parameter.
- **Manga Detail:** Standard Madara manga page structure.
- **Chapter Reading:** Standard Madara reader with `page-break no-gaps` image containers.

---

## 2. URL Structure

| Page | Pattern |
|------|---------|
| Manga listing | `https://manhwaclub.net/manga/<slug>/` |
| Chapter reading | `https://manhwaclub.net/manga/<slug>/<chapter-slug>/` |
| Search | `https://manhwaclub.net/?s=<query>&post_type=wp-manga` |
| AJAX chapters | `POST https://manhwaclub.net/wp-admin/admin-ajax.php` with `action=manga_get_chapters&manga=<post-id>` |

---

## 3. HTML Selectors Found

### Search Results (`/?s=...&post_type=wp-manga`)
- **Result row:** `.row.c-tabs-item__content`
- **Title:** `.post-title h3 a`
- **Cover:** `.tab-thumb img` (attribute `src` or `data-src`)
- **Latest chapter:** `.latest-chap .chapter a`

### Manga Detail (`/manga/<slug>/`)
- **Title:** `.post-title h1` — contains an adult badge span (e.g. `<span class="manga-title-badges custom adult">18+</span>`) which must be stripped.
- **Cover:** `.summary_image img` (attribute `src`)
- **Description:** `.summary__content.show-more`
- **Meta fields:** `.post-content_item` rows, each containing:
  - Heading: `.summary-heading h5`
  - Content: `.summary-content`
  - **Genres:** heading text contains "Genre(s)" → `.summary-content a`
  - **Authors:** heading text contains "Author(s)" → `.summary-content a`
  - **Artists:** heading text contains "Artist(s)" → `.summary-content a`
  - **Alternative titles:** heading text contains "Alternative" → `.summary-content`
  - **Status:** heading text contains "Status" → `.summary-content` (values: `OnGoing`, `Completed`, etc.)
  - **Release:** heading text contains "Release" → `.summary-content` (often "Updating", not a year)
- **Adult badge:** `.manga-title-badges.custom.adult`
- **Post ID (for AJAX):** `#manga-chapters-holder[data-id]`

### Chapters (AJAX Response)
- **List container:** `.listing-chapters_wrap.show-more ul.main.version-chap`
- **Chapter row:** `.wp-manga-chapter`
- **Chapter link:** `a` (href attribute)
- **Chapter title:** `a` text (e.g. "Chapter 307 raw")
- **Release date:** `.chapter-release-date i` or `.chapter-release-date .c-new-tag a[title]`

### Chapter Pages (`/manga/<slug>/<chapter>/`)
- **Image container:** `.page-break.no-gaps`
- **Image:** `.page-break img` (attribute `src`)
- **Image class:** `.wp-manga-chapter-img`
- **Note:** `src` values contain significant whitespace and must be `.trim()`ed.

---

## 4. Implementation Decisions

- **Manga ID:** The URL slug (e.g. `secret-class-07`).
- **Chapter ID:** The full relative path from the base URL (e.g. `manga/secret-class-07/chapter-307`). This allows `getChapterPages` to reconstruct the full chapter URL without needing a separate `mangaId` parameter.
- **AJAX required:** Chapters are NOT present in the initial manga detail HTML. They are loaded via `POST admin-ajax.php` using the manga `post-id` extracted from `#manga-chapters-holder[data-id]`.
- **Title cleanup:** The `.post-title h1` node contains a badge `<span>`. We clone the node, remove the span, then extract text to get the clean title.
- **Date parsing:** Dates come as either formatted strings ("May 14, 2026") or relative strings ("2 days ago"). A small parser normalizes both to ISO strings.
- **Content rating:** Detected via adult badge or `Adult`/`Mature` genres; mapped to `erotica`.
- **Original language:** Set to `ko` (Korean/manhwa site).

---

## 5. Screenshots Captured

| File | Description |
|------|-------------|
| `manhwaclub_agent4_homepage.png` | Homepage with latest releases |
| `manhwaclub_agent4_search.png` | Search results for "secret" |
| `manhwaclub_agent4_manga.png` | Manga detail page (Secret Class) |
| `manhwaclub_agent4_chapter.png` | Chapter reader page (Chapter 307) |

---

## 6. Implementability Verdict

✅ **Fully implementable.**

All four required functions (`search`, `getManga`, `getChapters`, `getChapterPages`) work correctly:
- Search returns manga with title, cover, and last chapter.
- Manga detail returns full metadata including description, authors, artists, genres, status, and content rating.
- Chapters are fetched via the Madara AJAX endpoint and parsed successfully.
- Chapter pages are extracted from the reader and return valid image URLs.

The only site-specific quirk is the AJAX chapter loading, which is handled by extracting the WordPress post ID from the manga page and making a single POST request.
