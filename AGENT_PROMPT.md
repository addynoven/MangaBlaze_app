# Manga Source Scraper Agent Prompt

## Your Task
Implement manga scraper sources from a **batch file**. Each batch has **5 sources**.

## Step 1: Claim a Batch

Run this to claim your batch:
```bash
cd /home/neon/programs/side_project/mangablaze/batches
./claim-batch.sh
```

This will move a file from `pending/` to `in-progress/` and print its name (e.g. `batch-001.md`).

**If no batches are left, report back immediately.**

## Step 2: Read Your Batch File

Open the claimed file, e.g.:
```bash
cat /home/neon/programs/side_project/mangablaze/batches/in-progress/batch-001.md
```

It looks like:
```markdown
# Batch 1

- [ ] **Source Name** — `https://base-url.com`
- [ ] **Source Name 2** — `https://base-url-2.com`
...
```

## Step 3: Implement Each Source (1-5)

For each source in your batch, do the following:

### 3a. Test accessibility
```bash
curl -s -o /dev/null -w "%{http_code}" -L -m 10 "{baseUrl}" -H "User-Agent: Mozilla/5.0"
```
- **Not 200?** → Mark `- [x]` in the batch file, note reason, skip to next source
- **200?** → Continue

### 3b. Test search / browse
Try these common patterns:
- `/?s=naruto`
- `/?s=naruto&post_type=wp-manga`
- `/search?q=naruto`
- `/search/naruto/`
- `/manga/`

```bash
curl -s -L -m 10 "{baseUrl}/?s=naruto&post_type=wp-manga" -H "User-Agent: Mozilla/5.0" | head -20
```

If the HTML is an empty SPA shell (`<div id="root">`, `<div id="__next">`, `<div id="app">`), mark `- [x]` (SPA, no SSR).

### 3c. Implement the scraper

Read these reference files first:
- `/home/neon/programs/side_project/mangablaze/src/lib/sources/types.ts` — interfaces
- `/home/neon/programs/side_project/mangablaze/src/lib/sources/mangapill.ts` — clean example
- `/home/neon/programs/side_project/mangablaze/src/lib/sources/mangaka.ts` — Madara theme
- `/home/neon/programs/side_project/mangablaze/src/lib/sources/readberserk.ts` — custom theme

Create file: `/home/neon/programs/side_project/mangablaze/src/lib/sources/{sourceId}.ts`

**Naming:**
| Source Name | File | Export |
|-------------|------|--------|
| Bun Manga | `bunmanga.ts` | `bunmangaSource` |
| MangaGo.fun | `mangagofun.ts` | `mangagofunSource` |
| Read Berserk | `readberserk.ts` | `readberserkSource` |

Rules: lowercase, no spaces, no dots, no special chars.

**Code template:**
```typescript
import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://example.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`Name fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const exampleSource: MangaSource = {
  id: 'sourceid',
  name: 'Display Name',
  type: 'scraper',
  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try { /* ... */ return results.slice(0, limit) } catch { return [] }
  },
  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try { /* ... */ } catch { return null }
  },
  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try { /* ... */ return chapters.slice(0, limit) } catch { return [] }
  },
  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try { /* ... */ return pages } catch { return [] }
  },
}
```

**Chapter object:**
```typescript
{
  id: string,
  chapterNumber: string,
  title: string | null,
  volume: string | null,
  language: 'en',
  pages: number,
  publishedAt: string,
  readableAt: string,
  externalUrl: string | null,  // set if getChapterPages returns []
  isUnavailable: false,
}
```

### 3d. Register in index.ts

Add import + registry entry + export to `/home/neon/programs/side_project/mangablaze/src/lib/sources/index.ts`.

### 3e. Update your batch file

After processing each source, update the checkbox in the batch file:
- `- [✓] **Name**` — implemented successfully
- `- [x] **Name**` — couldn't implement (write reason after the URL)

Example:
```markdown
- [✓] **Bun Manga** — `https://bunmanga.com`
- [x] **MangaDraft** — `https://mangadraft.com` — Vue SPA, no SSR
```

## Step 4: Complete the Batch

When all 5 sources are checked, run:
```bash
cd /home/neon/programs/side_project/mangablaze/batches
./complete-batch.sh batch-XXX.md
```

This moves the file from `in-progress/` to `complete/`.

## Step 5: Verify Build

```bash
cd /home/neon/programs/side_project/mangablaze && npx tsc --noEmit
```

Fix any TypeScript errors before finishing.

## When to Skip

| Situation | Action |
|-----------|--------|
| 403 / 401 / blocked | `- [x]` |
| Timeout / unreachable | `- [x]` |
| React/Next.js/Vue SPA with empty shell | `- [x]` |
| Chapter list only via AJAX, no fallback HTML | `- [x]` |
| Canvas-based or heavily obfuscated reader | `- [x]` |
| Site parked / for sale | `- [x]` |
| Paid/subscription only | `- [x]` |

## Common Patterns

**WordPress Madara:**
- Search: `/?s={q}&post_type=wp-manga`
- Results: `.c-tabs-item`
- Chapters: `li.wp-manga-chapter`
- Pages: `img.wp-manga-chapter-img` or `img[data-src]`

**Next.js SSR:**
- Search results in server-rendered HTML
- Look for `__NEXT_DATA__` or direct `<a>` / `<img>` tags

**Custom PHP/Laravel:**
- No search? Scrape homepage nav/menu links
- Chapters often in `<ul>` or `<table>`
- Pages: `img.js-page`, `img.pages__img`, or direct `<img>` with `data-src`

## Your Report

Report back:
1. Batch file name claimed
2. For each source: ✅ implemented or ❌ skipped (with reason)
3. Any TypeScript errors and how fixed
