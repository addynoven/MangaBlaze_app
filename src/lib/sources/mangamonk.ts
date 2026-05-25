import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangamonk.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`MangaMonk fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

interface NextData {
  props?: {
    pageProps?: {
      ssrItems?: SearchItem[]
      initialManga?: MangaDetail
      initialChapter?: ChapterDetail
    }
  }
}

interface SearchItem {
  slug: string
  name: string
  cover?: string
  status?: string
  year?: number | null
  isAdult?: boolean | null
  genres?: Array<{ name: string }>
  summary?: string
  latestChapters?: Array<{ name: string }>
}

interface MangaDetail {
  name: string
  cover?: string
  status?: string
  year?: number | null
  isAdult?: boolean | null
  genres?: Array<{ name: string }>
  summary?: string
  authors?: Array<{ name: string }>
  artists?: Array<{ name: string }>
  altName?: string
  latestChapters?: Array<{ name: string }>
  chapters?: ChapterItem[]
}

interface ChapterItem {
  url?: string
  slug: string
  name?: string
  updatedAt?: string
}

interface ChapterDetail {
  images?: string[]
}

function extractNextData($: cheerio.CheerioAPI): NextData | null {
  const script = $('#__NEXT_DATA__').html()
  if (!script) return null
  try {
    return JSON.parse(script) as NextData
  } catch {
    return null
  }
}

function extractChapterNumber(name: string): string {
  const match = name.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
  if (match) return match[1]
  const match2 = name.match(/^(\d+(?:\.\d+)?)\s*[:.]/)
  if (match2) return match2[1]
  return '?'
}

export const mangamonkSource: MangaSource = {
  id: 'mangamonk',
  name: 'MangaMonk',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)
      const data = extractNextData($)
      const items = data?.props?.pageProps?.ssrItems || []

      const results: SourceManga[] = items.map((item) => ({
        id: item.slug,
        title: item.name,
        cover: item.cover || '/images/placeholder.png',
        status: item.status?.toLowerCase(),
        year: item.year || null,
        contentRating: item.isAdult ? 'suggestive' : undefined,
        genres: item.genres?.map((g) => g.name) || [],
        description: item.summary,
        lastChapter: item.latestChapters?.[0]?.name || null,
        lastVolume: null,
      }))

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${mangaId}`)
      const data = extractNextData($)
      const manga = data?.props?.pageProps?.initialManga
      if (!manga) return null

      const altTitles: string[] = []
      if (manga.altName) {
        altTitles.push(...manga.altName.split(';').map((s) => s.trim()).filter(Boolean))
      }

      return {
        id: mangaId,
        title: manga.name,
        cover: manga.cover || '/images/placeholder.png',
        status: manga.status?.toLowerCase(),
        year: manga.year || null,
        contentRating: manga.isAdult ? 'suggestive' : undefined,
        genres: manga.genres?.map((g) => g.name) || [],
        description: manga.summary || '',
        authors: manga.authors?.map((a) => a.name) || [],
        artists: manga.artists?.map((a) => a.name) || [],
        altTitles,
        originalLanguage: undefined,
        lastVolume: null,
        lastChapter: manga.latestChapters?.[0]?.name || null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${mangaId}`)
      const data = extractNextData($)
      const manga = data?.props?.pageProps?.initialManga
      if (!manga) return []

      const chapters: SourceChapter[] = (manga.chapters || []).map((ch) => ({
        id: ch.url?.replace(/^\//, '') || ch.slug,
        chapterNumber: extractChapterNumber(ch.name || ''),
        title: ch.name || null,
        volume: null,
        language: 'en',
        pages: 0,
        publishedAt: ch.updatedAt || new Date().toISOString(),
        readableAt: ch.updatedAt || new Date().toISOString(),
        externalUrl: null,
        isUnavailable: false,
      }))

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}`)
      const data = extractNextData($)
      const chapter = data?.props?.pageProps?.initialChapter
      if (!chapter) return []

      return (chapter.images || []).map((url: string, index: number) => ({
        url,
        index,
      }))
    } catch {
      return []
    }
  },
}
