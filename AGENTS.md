<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — MangaBlaze

This file contains everything an AI coding agent needs to know to work effectively on the **MangaBlaze** project. MangaBlaze is a Next.js web application for reading manga online. It aggregates manga from multiple sources (APIs and HTML scrapers) and provides a unified reading experience with user authentication, bookmarks, and reading progress tracking.

---

## Project Overview

- **Name:** MangaBlaze (public-facing title in metadata is "MangaFire")
- **Version:** 0.1.0
- **Type:** Full-stack Next.js web application (App Router)
- **Purpose:** Browse, search, and read manga from multiple aggregated sources
- **Package Manager:** pnpm (`pnpm-lock.yaml`, `pnpm-workspace.yaml` present)
- **Node Environment:** Standard Next.js runtime with both Server Components and Client Components

### Key Features
- Multi-source manga aggregation (MangaDex API + several scraping sources)
- User authentication (email/password via NextAuth v5 / Auth.js)
- Bookmarks and per-user reading progress
- Responsive manga reader with customizable layout (long strip, single page, double page)
- Dark-themed UI

---

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.6 | App Router. **Breaking changes from earlier versions.** |
| UI Library | React | 19.2.4 | |
| Language | TypeScript | 5.x | Strict mode enabled |
| Styling | Tailwind CSS | 4.x | PostCSS-based (no `tailwind.config.js`) |
| CSS Preprocessor | PostCSS | — | `@tailwindcss/postcss` plugin |
| State Management | Redux Toolkit | 2.12.0 | + `redux-persist` for localStorage persistence |
| Auth | NextAuth.js / Auth.js | 5.0.0-beta.31 | Credentials provider + Prisma adapter |
| ORM | Prisma | 5.22.0 | SQLite database |
| DB | SQLite | — | File-based via `prisma/dev.db` |
| HTTP Client | Native `fetch` | — | Used in API routes and source clients |
| HTML Scraping | Cheerio | 1.2.0 | For scraping-based manga sources |
| Testing | Vitest | 4.1.7 | `jsdom` environment |
| Testing (UI) | @testing-library/react | 16.3.2 | |
| Mocking | MSW | 2.14.6 | Mock Service Worker for API tests |
| Linting | ESLint | 9.x | `eslint-config-next` (core-web-vitals + typescript) |
| Icons | react-icons | 5.6.0 | |
| Carousel | Swiper | 12.1.4 | |
| Tooltips | Tippy.js | 6.3.7 | |
| Notifications | react-hot-toast | 2.6.0 | |

### DevDependencies of Note
- `puppeteer-core` — installed but verify usage before relying on it
- `jsdom` — test environment
- `@types/*` packages for TypeScript definitions

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma        # Database schema (SQLite)
│   ├── dev.db               # SQLite database file
│   └── migrations/          # Prisma migrations
├── public/                  # Static assets (images, fonts, placeholders)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout (ReduxProvider, global styles, Toaster)
│   │   ├── (default)/       # Route group: browsing pages (home, filter, manga detail, etc.)
│   │   │   ├── layout.tsx   # 'use client'; wraps MainLayout
│   │   │   ├── page.tsx     # Landing page → Welcome view
│   │   │   ├── home/page.tsx
│   │   │   ├── filter/page.tsx
│   │   │   ├── manga/[slug]/page.tsx
│   │   │   ├── genre/[slug]/page.tsx
│   │   │   ├── newest/page.tsx
│   │   │   ├── updated/page.tsx
│   │   │   ├── added/page.tsx
│   │   │   └── random/page.tsx
│   │   ├── (read)/          # Route group: manga reader
│   │   │   ├── layout.tsx   # 'use client'; wraps ReadLayout
│   │   │   └── read/[...params]/page.tsx
│   │   └── api/             # API Routes (Route Handlers)
│   │       ├── auth/[...nextauth]/route.ts   # NextAuth handlers (GET, POST)
│   │       ├── manga/route.ts                # Search manga
│   │       ├── manga/detail/route.ts         # Get manga detail
│   │       ├── manga/detail/feed/route.ts    # Get chapter feed
│   │       ├── manga/popular/route.ts
│   │       ├── manga/latest/route.ts
│   │       ├── manga/updated/route.ts
│   │       ├── chapter/pages/route.ts        # Get chapter image pages
│   │       └── manga/__tests__/route.test.ts # API route tests
│   ├── @types/              # Shared TypeScript type definitions
│   ├── assets/
│   │   ├── styles/          # Global CSS files (bootstrap.css, app.css, read.css, etc.)
│   │   └── sites/           # Site assets (logos, favicons)
│   ├── components/
│   │   ├── layouts/         # MainLayout, ReadLayout + sub-components (ControlMenu, SubPanel, ProgressBar)
│   │   ├── providers/       # ReduxProvider
│   │   ├── route/           # Route guards (AppRoute, AuthorityGuard, ProtectedRoute, PublicRoute)
│   │   ├── shared/          # Reusable components (Card, Poster, Loading, ShareSocial)
│   │   ├── template/        # Header/Footer templates for Default and Read layouts
│   │   └── ui/              # UI primitives (Modal, Pagination, Spinner, Toast)
│   ├── configs/
│   │   ├── app.config.ts    # App-level config (API prefix, entry paths, locale)
│   │   └── theme.config.ts  # Default theme/reader settings
│   ├── constants/           # Application constants/enums (fit, page, panel, progress, direction, theme, roles, route)
│   ├── lib/
│   │   ├── db.ts            # Singleton PrismaClient export
│   │   ├── sourceStorage.ts # Source storage helpers
│   │   ├── sources/         # Manga source implementations
│   │   │   ├── types.ts     # Unified MangaSource interface + normalized types
│   │   │   ├── index.ts     # Source registry (8 sources)
│   │   │   ├── mangadex.ts  # MangaDex API source
│   │   │   ├── comick.ts    # ComicK API source
│   │   │   ├── mangapill.ts # MangaPill scraper
│   │   │   ├── manganato.ts # MangaNato scraper
│   │   │   ├── mangafire.ts # MangaFire scraper
│   │   │   ├── mangahere.ts # MangaHere scraper
│   │   │   ├── mangatown.ts # MangaTown scraper
│   │   │   └── fanfox.ts    # FanFox scraper
│   │   └── mangadex/
│   │       └── transform.ts # MangaDex-specific data transforms
│   ├── server/              # Server-side utilities (empty at present)
│   ├── store/               # Redux store
│   │   ├── storeSetup.ts    # Store configuration + persist + injectReducer
│   │   ├── rootReducer.ts   # Static + async reducer combination
│   │   ├── hook.ts          # Typed `useAppDispatch` / `useAppSelector`
│   │   └── slices/
│   │       ├── auth/        # Auth state (sessionSlice, userSlice)
│   │       └── theme/       # Theme state (themeSlice)
│   ├── test/
│   │   ├── setup.ts         # Vitest setup (localStorage mock, MSW server, Next.js nav mock)
│   │   └── mocks/
│   │       ├── handlers.ts  # MSW request handlers
│   │       └── server.ts    # MSW node server setup
│   └── views/               # Page-level view components
│       ├── welcome/         # Landing page view
│       ├── home/            # Home page sections (TopTrending, NewRelease, etc.)
│       ├── filter/          # Filter/search page
│       ├── manga/           # Manga detail page
│       └── read/            # Manga reader page
├── docs/
│   └── manga-source.md      # Detailed documentation on manga source architecture
├── .env                     # Environment variables (secrets; blocked from reading)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
└── postcss.config.mjs
```

---

## Build and Development Commands

All commands use `pnpm` (or `npm`/`yarn` if preferred, but pnpm is the lockfile source).

```bash
# Install dependencies
pnpm install

# Run development server (hot reload at http://localhost:3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

### Testing

```bash
# Run tests (Vitest)
npx vitest

# Run tests once (CI mode)
npx vitest run
```

- **Config:** `vitest.config.ts`
- **Environment:** `jsdom`
- **Setup file:** `src/test/setup.ts`
- **Aliases:** `@/` maps to `./src` (mirrors `tsconfig.json`)
- **Globals enabled:** Yes (`globals: true`)

---

## Database & ORM

### Prisma
- **Schema:** `prisma/schema.prisma`
- **Provider:** `sqlite`
- **Connection:** Controlled by `DATABASE_URL` env var

### Schema Overview
- **NextAuth v5 models:** `Account`, `Session`, `VerificationToken`, `User`
- **App models:**
  - `Manga` — cached manga metadata from MangaDex (id, title, description, status, year, contentRating, coverUrl, tags, authors)
  - `Chapter` — cached chapter metadata (id, mangaId, chapterNumber, title, volume, pages, language, publishedAt)
  - `Bookmark` — user bookmarked manga
  - `ReadingProgress` — per-user progress (mangaId, chapterId, pageIndex, chapterNumber)

### Prisma Commands
```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio
```

---

## Authentication

- **Library:** NextAuth.js v5 (Auth.js) — beta.31
- **Adapter:** `@auth/prisma-adapter`
- **Provider:** Credentials (email + password with bcryptjs)
- **Session Strategy:** JWT
- **Required Env Vars:** `AUTH_SECRET`, `DATABASE_URL`

### Auth Files
- `src/auth.config.ts` — Core auth config (callbacks, session strategy, trustHost)
- `src/auth.ts` — NextAuth initialization with PrismaAdapter + Credentials provider
- `src/app/api/auth/[...nextauth]/route.ts` — Exports `GET` and `POST` handlers

### Auth State in Redux
- `src/store/slices/auth/` contains `sessionSlice` and `userSlice`
- `auth` and `theme` slices are persisted to `localStorage` via `redux-persist`

---

## Manga Source Architecture

The app supports **8 manga sources** through a unified interface. See `docs/manga-source.md` for deep documentation.

### Unified Interface (`src/lib/sources/types.ts`)
Every source implements:
```typescript
interface MangaSource {
  id: string
  name: string
  type: 'api' | 'scraper'
  search(query, limit?): Promise<SourceManga[]>
  getManga(mangaId): Promise<SourceMangaDetail | null>
  getChapters(mangaId, limit?, offset?, lang?): Promise<SourceChapter[]>
  getChapterPages(chapterId): Promise<SourcePage[]>
}
```

### Source Registry (`src/lib/sources/index.ts`)
| Source | Type | Status |
|--------|------|--------|
| MangaDex | API | Primary / default |
| ComicK | API | Implemented |
| MangaPill | Scraper | Implemented |
| MangaNato | Scraper | Implemented |
| MangaFire | Scraper | Implemented |
| MangaHere | Scraper | Implemented |
| MangaTown | Scraper | Implemented |
| FanFox | Scraper | Implemented |

### API Routes as Proxy
Frontend → `/api/manga?q=...&source=mangadex` → `src/lib/sources/index.ts` → specific source client → raw data → normalized → JSON response.

### Scraping Notes
- Scrapers use `fetch()` + `cheerio` to parse HTML.
- They extract image URLs from `<img>` tags (`src` or `data-src`).
- No headless browser is used for scraping.
- Respect rate limits; many sources have anti-bot measures.

---

## Code Style Guidelines

### TypeScript
- **Strict mode** is enabled (`strict: true` in `tsconfig.json`).
- Use the `@/` path alias for all imports from `src/`.
- Prefer explicit return types on public-facing functions/interfaces.

### React
- Use Server Components by default.
- Mark client components with `'use client'` when using hooks, browser APIs, or event handlers.
- Route groups `(default)` and `(read)` use client layouts that import reusable layout components.

### Styling
- **Tailwind CSS v4** is installed but the project also relies heavily on custom global CSS in `src/assets/styles/`.
- Do not assume utility classes are the primary styling method; many components use traditional CSS class names.
- The `app.css` and `bootstrap.css` files provide the bulk of the visual theme.

### ESLint
- Config: `eslint.config.mjs`
- Extends Next.js core-web-vitals and TypeScript rules.
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

### File Naming
- Components: PascalCase (`MainLayout.tsx`, `Filter.tsx`)
- Utilities/configs: camelCase (`app.config.ts`, `theme.config.ts`)
- Constants: camelCase or SCREAMING_SNAKE for enums (`app.constant.ts`, `FIT_ENUM`)
- Route handlers: `route.ts`
- Page components: `page.tsx`
- Layout components: `layout.tsx`

---

## Testing Strategy

### Unit / Integration Tests
- **Runner:** Vitest
- **DOM:** jsdom
- **Location:** Co-located with source (`__tests__/` folders) or in `src/test/`

### Mocking
- **MSW** mocks external API calls (e.g., `api.mangadex.org`) and internal API routes during tests.
- **Next.js navigation** is globally mocked in `src/test/setup.ts`.
- **localStorage** is manually mocked in `src/test/setup.ts` to avoid Node.js experimental native localStorage issues.

### Example Test Patterns
- API route tests import the `GET` handler and call it with a `Request` object.
- Component tests use `@testing-library/react` and can assert on DOM output.

---

## Security Considerations

1. **Auth Secret:** `AUTH_SECRET` must be set in `.env`. Never commit secrets.
2. **Passwords:** Stored hashed with `bcryptjs`. Never store or log plaintext passwords.
3. **Database:** SQLite file (`prisma/dev.db`) should not be committed to version control.
4. **API Rate Limiting:** External sources (especially MangaDex) have rate limits. The MangaDex client has an in-memory cache with a 5-minute TTL.
5. **Scraping Ethics:** Scrapers fetch public HTML pages. Be mindful of source site load and terms of service.
6. **CORS / Trust Host:** `trustHost: true` is set in auth config for flexibility; review this for production hardening.

---

## Environment Variables

The following variables are expected in `.env` (do not read/print the actual values):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma SQLite connection string |
| `AUTH_SECRET` | NextAuth.js encryption secret |

Additional variables may be added as the project grows.

---

## Key Conventions for Agents

1. **Always check `node_modules/next/dist/docs/` before using Next.js APIs** — this is Next.js 16 and has breaking changes.
2. **Use `pnpm` for package management** to keep `pnpm-lock.yaml` in sync.
3. **Use the `@/` alias** for all internal imports.
4. **When adding a new manga source:**
   - Implement `MangaSource` interface in `src/lib/sources/{sourceId}.ts`
   - Register it in `src/lib/sources/index.ts`
   - Document it in `docs/manga-source.md`
5. **When modifying the database:**
   - Update `prisma/schema.prisma`
   - Run `npx prisma migrate dev`
   - Run `npx prisma generate`
6. **When adding new API routes:**
   - Place them under `src/app/api/.../route.ts`
   - Co-locate `__tests__/route.test.ts` when possible
7. **Client vs Server:**
   - Pages under `(default)/` and `(read)/` are mostly `'use client'` because they delegate to view components.
   - API routes are always server-side.
   - Keep data fetching in API routes or server components when possible.
