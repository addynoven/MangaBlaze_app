# MangaBlaze Extension Specification (v1)

This document defines the standard for creating and integrating manga source extensions into the MangaBlaze ecosystem.

## 1. Directory Structure
Each extension must reside in its own subdirectory within `src/lib/extensions/`:
```
src/lib/extensions/
  └── [extension-id]/
      ├── manifest.json
      ├── index.ts
      └── icon.png (optional)
```

## 2. The Manifest (`manifest.json`)
Every extension must contain a `manifest.json` file with the following metadata:
- `id`: Unique string identifier (e.g., "mangadex").
- `name`: Human-readable name (e.g., "MangaDex").
- `lang`: Language code (e.g., "en", "ja").
- `version`: Semantic version string.
- `baseUrl`: The root URL of the target website.
- `type`: Either "api" or "scraper".
- `nsfw`: Boolean indicating if the source contains adult content.

## 3. The Implementation (`index.ts`)
The `index.ts` file must export a class that extends the `BaseSource` class.

### Required Methods:
- `search(query: string, limit?: number)`: Returns a list of manga.
- `getManga(mangaId: string)`: Returns detailed metadata for a single manga.
- `getChapters(mangaId: string)`: Returns a list of available chapters.
- `getChapterPages(chapterId: string, mangaId?: string)`: Returns a list of image URLs.

## 4. Normalization Standards
All data returned by extensions must map to the unified types defined in `src/lib/sources/types.ts`.
- **Manga IDs**: Must be URL-safe strings.
- **Images**: Should be absolute URLs (the `BaseSource` handles proxying).
- **Dates**: Must be in ISO 8601 format.

## 5. Built-in Capabilities
By extending `BaseSource`, extensions automatically receive:
- **Automatic Proxying**: All image requests are routed via the internal proxy.
- **Health Reporting**: Success rates and latency are tracked automatically.
- **Standard Fetching**: Built-in `fetchHTML` (Cheerio) and `fetchJSON` methods with user-agent rotation.
