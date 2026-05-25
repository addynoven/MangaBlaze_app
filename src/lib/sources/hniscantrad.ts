import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hni-scantrad.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HNI fetch error: ${res.status} ${url}`)
  return res.json()
}

interface HNIComic {
  title: string
  slug: string
  thumbnail: string
  description: string | null
  author: string | null
  artist: string | null
  status: string | null
  genres: string[]
  alt_titles: string[]
  chapters?: HNIChapter[]
}

interface HNIChapter {
  full_title: string
  title: string | null
  volume: number | null
  chapter: number
  subchapter: number | null
  full_chapter: string
  language: string
  updated_at: string
  published_on: string
  slug_lang_vol_ch_sub: string
  url: string
}

interface HNIReadResponse {
  comic: HNIComic
  chapter: HNIChapter & { pages: string[] }
}

export const hniscantradSource: MangaSource = {
  id: 'hniscantrad',
  name: 'HNI-Scantrad',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const data = await fetchJSON<{ comics: HNIComic[] }>(`${BASE_URL}/api/comics`)
      const q = query.toLowerCase()

      const results: SourceManga[] = []
      for (const comic of data.comics || []) {
        const titles = [comic.title, ...(comic.alt_titles || [])].filter(Boolean)
        if (!titles.some((t) => t.toLowerCase().includes(q))) continue

        results.push({
          id: comic.slug,
          title: comic.title,
          cover: comic.thumbnail || '/images/placeholder.png',
        })

        if (results.length >= limit) break
      }

      return results
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const data = await fetchJSON<{ comic: HNIComic }>(`${BASE_URL}/api/comics/${mangaId}`)
      const comic = data.comic
      if (!comic) return null

      return {
        id: mangaId,
        title: comic.title,
        cover: comic.thumbnail || '/images/placeholder.png',
        status: comic.status?.toLowerCase(),
        year: null,
        description: comic.description || '',
        authors: comic.author ? [comic.author] : [],
        artists: comic.artist ? [comic.artist] : [],
        genres: comic.genres || [],
        altTitles: comic.alt_titles || [],
        originalLanguage: 'fr',
        lastVolume: null,
        lastChapter: comic.chapters?.[0]?.full_chapter || null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const data = await fetchJSON<{ comic: HNIComic }>(`${BASE_URL}/api/comics/${mangaId}`)
      const chapters = data.comic?.chapters || []
      const result: SourceChapter[] = []

      for (const ch of chapters) {
        const chapterNumber = ch.subchapter ? `${ch.chapter}.${ch.subchapter}` : String(ch.chapter)
        result.push({
          id: ch.url,
          chapterNumber,
          title: ch.full_title || ch.title || `Chapter ${chapterNumber}`,
          volume: ch.volume ? String(ch.volume) : null,
          language: ch.language || 'fr',
          pages: 0,
          publishedAt: ch.published_on ? new Date(ch.published_on).toISOString() : new Date().toISOString(),
          readableAt: ch.updated_at ? new Date(ch.updated_at).toISOString() : new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return result.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const apiUrl = `${BASE_URL}/api${chapterId}`
      const data = await fetchJSON<HNIReadResponse>(apiUrl)
      const pages = data.chapter?.pages || []

      return pages.map((url, index) => ({
        url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
        index,
      }))
    } catch {
      return []
    }
  },
}
