# MangaBlaze: Professional Content-Centric Manga Reader

MangaBlaze is a high-performance, unified manga reader application built with Next.js. It aggregates manga from 200+ sources into a single, normalized, content-centric interface.

## Core Philosophy

- **Content-Centric UX:** The application prioritizes content over sources. The Home page is the user's Library, and sources are treated as modular providers (Extensions).
- **Normalization:** Every source maps to a unified `MangaSource` interface.
- **Data Sovereignty:** Users own their data via portable JSON backups and tracker synchronization.
- **Performance First:** Lightweight scraping (`fetch` + `cheerio`) and aggressive client-side prefetching.

## Advanced Features

### 1. Unified Global Search
Concurrent searching across all pinned sources with automatic title deduplication.

### 2. Personal Library & Organization
Organize manga into folders (Reading, Plan to Read, Completed, etc.) with real-time update notifications.

### 3. Reading Intelligence
- **Progress Tracking:** Automatic chapter/page memory synced to the database.
- **Source Resolution:** Automatically find a title on multiple extensions to switch providers seamlessly.
- **History:** Chronological log of all reading activity.

### 4. Professional Reader UX
- **Zero-Lag Reading:** Dual-layer image prefetching (current pages and next chapter).
- **Customization:** Multiple themes (Dark, Light, Sepia, OLED) and an immersive 'Reader Mode'.
- **Navigation:** Floating chapter sidebars and full keyboard shortcuts.

### 5. PWA & Offline Reading
- **Installable:** Full PWA support with manifest and service worker.
- **Offline Mode:** Download individual chapters for reading without internet.
- **Connectivity Awareness:** Real-time online/offline status indicators.

### 6. Ecosystem & Data
- **Backup & Restore:** Export your entire collection and history to JSON.
- **Tracker Integration:** Background synchronization with MyAnimeList and AniList.
- **Source Health:** Crowdsourced real-time monitoring of all 200+ scrapers.

## Tech Stack

- **Frontend:** Next.js 15+ (App Router), React 19, Redux Toolkit, PWA Service Workers.
- **Backend:** Next.js API Routes, Prisma (SQLite), NextAuth.js v5.
- **Scraping:** Cheerio (Standard), High-concurrency parallel fetching.

## Project Structure

- `src/lib/sources/`: Scraper implementations.
- `src/app/api/user/`: User-scoped logic (Bookmarks, Progress, History, Backups, Trackers).
- `src/views/`: Feature-specific UI modules.
- `public/sw.js`: PWA Service worker logic.
- `prisma/`: Multi-source aware database schema.

## Development Workflow

### 1. Implementing a New Source
- Check `todo.md` for the next available source.
- Create a new file in `src/lib/sources/`.
- Implement the `MangaSource` interface: `search`, `getManga`, `getChapters`, `getChapterPages`.
- Register the source in `src/lib/sources/index.ts`.
- Use `docs/manga-source.md` as a reference for scraping techniques.

### 2. Verification Workflow
The project uses automated scripts to verify that scrapers work correctly.
- `screenshot_script.js`: Uses Playwright to take screenshots of source sites (homepage, search, detail, chapter).
- `*_snapshot.yml`: YAML snapshots used by agents to track the state of a source site.
- `VERIFICATION_MASTER_REPORT.md`: Aggregated status of all sources.

## Key Commands

```bash
# Development
pnpm dev          # Start development server
pnpm lint         # Run linting
pnpm test         # Run unit/integration tests (Vitest)

# Database
pnpm prisma generate  # Generate Prisma client
pnpm prisma db push   # Sync schema with local SQLite (dev.db)
pnpm prisma studio    # Open database GUI

# Production
pnpm build        # Build for production
pnpm start        # Run production server
```

## Conventions

- **Module Co-location:** Keep tests, styles, and sub-components inside the feature folder.
- **Type Safety:** Strict TypeScript usage. Avoid `any`. Use the normalized types from `@/lib/sources/types`.
- **Error Handling:** Sources should return `null` or throw meaningful errors that the API routes can handle.
- **Scraping:** Prefer `cheerio` over `puppeteer` unless the site is a heavy SPA with no SSR data (rare for manga sites).

## Agent Instructions (Specific to this Repo)

- **Do NOT** work on a source that is already checked or marked as "in progress" in `todo.md`.
- Always update `todo.md` before starting work.
- After implementing a source, run the verification scripts if applicable to ensure the scraper works against the live site.
