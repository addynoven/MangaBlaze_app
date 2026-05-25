// Unified manga source types
// All sources (API + scraper) normalize to these types

export interface SourceManga {
  id: string
  title: string
  cover: string
  source?: string
  status?: string
  year?: number | null
  contentRating?: string
  genres?: string[]
  description?: string
  lastChapter?: string | null
  lastVolume?: string | null
}

export interface SourceMangaDetail extends SourceManga {
  description: string
  authors: string[]
  artists: string[]
  genres: string[]
  altTitles: string[]
  originalLanguage?: string
  lastVolume?: string | null
  lastChapter?: string | null
}

export interface SourceChapter {
  id: string
  chapterNumber: string
  title: string | null
  volume: string | null
  language: string
  pages: number
  publishedAt: string
  readableAt: string
  externalUrl: string | null
  isUnavailable: boolean
}

export interface SourcePage {
  url: string
  index: number
}

export interface MangaSource {
  id: string
  name: string
  type: 'api' | 'scraper'

  search(query: string, limit?: number): Promise<SourceManga[]>
  getManga(mangaId: string): Promise<SourceMangaDetail | null>
  getChapters(mangaId: string, limit?: number, offset?: number, lang?: string): Promise<SourceChapter[]>
  getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]>
}
