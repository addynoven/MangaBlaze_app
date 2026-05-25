import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.viz.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`VIZ fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

let seriesCache: Array<{ title: string; subtitle: string; vanityurl: string }> = []

async function getAllSeries(): Promise<Array<{ title: string; subtitle: string; vanityurl: string }>> {
  if (seriesCache.length > 0) return seriesCache
  const res = await fetch(`${BASE_URL}/search/series_titles.js`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const text = await res.text()
  // Extract JSON array from var series_suggestions = [...];
  const match = text.match(/var series_suggestions = (\[[\s\S]*?\]);/)
  if (!match) return []
  try {
    seriesCache = JSON.parse(match[1]) || []
    return seriesCache
  } catch {
    return []
  }
}

export const vizSource: MangaSource = {
  id: 'viz',
  name: 'VIZ Shonen Jump',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const allSeries = await getAllSeries()
      const q = query.toLowerCase()
      const results: SourceManga[] = []

      for (const series of allSeries) {
        if (!series.title.toLowerCase().includes(q) && !series.vanityurl.toLowerCase().includes(q)) {
          continue
        }
        if (results.some((r) => r.id === series.vanityurl)) continue

        results.push({
          id: series.vanityurl,
          title: series.title,
          cover: '/images/placeholder.png',
          description: series.subtitle || undefined,
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${mangaId}`)

      const title = $('meta[property="og:title"]').attr('content')?.replace(/^VIZ: The Official Website for\s*/, '') || ''
      if (!title) return null

      const description = $('meta[property="og:description"]').attr('content')?.trim() || ''
      const cover = $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${mangaId}`)
      const chapters: SourceChapter[] = []

      // Look for volume/product links
      $('a[href*="/manga-books/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const text = link.text().trim()
        if (!href.includes('/product/')) return
        if (chapters.some((c) => c.id === href)) return

        // Extract volume number from text like "Akane-banashi, Vol. 17"
        const volMatch = text.match(/Vol\.?\s*(\d+)/i)
        const chapterNumber = volMatch?.[1] || String(chapters.length + 1)

        chapters.push({
          id: href,
          chapterNumber,
          title: text || `Volume ${chapterNumber}`,
          volume: chapterNumber,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}${href}`,
          isUnavailable: false,
        })
      })

      // Also look for read preview links
      $('a[href*="/read/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        if (!href.includes('?action=read')) return
        // Find matching product link
        const productHref = href.replace('?action=read', '').replace('/read/manga/', '/manga-books/manga/')
        const existing = chapters.find((c) => productHref.includes(c.id))
        if (existing) {
          existing.externalUrl = `${BASE_URL}${href}`
        }
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    // VIZ uses a proprietary HTML5 reader - pages are not scrapable
    return []
  },
}
