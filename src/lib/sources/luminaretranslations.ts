import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://luminaretranslations.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`LuminareTranslations fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

interface YarnovelSeries {
  id: number
  slug: string
  title: string
  cover_image: string
  excerpt?: string
  genres?: string[]
  status?: string | null
  chapters?: { label: string; url: string }[]
  latest_chapter?: { id: number; number: number; title: string | null; url: string } | null
}

function extractSeriesFromExplore(html: string): YarnovelSeries[] {
  const match = html.match(/x-data=['"]exploreFilter\((\{[\s\S]*?\})\)/)
  if (!match) return []
  try {
    const data = JSON.parse(match[1])
    const payload = data.initialPayload
    if (payload?.data && Array.isArray(payload.data)) {
      return payload.data
    }
  } catch {
    // ignore
  }
  return []
}

function extractChaptersFromSeriesPage(html: string): Array<{ label: string; url: string }> {
  const match = html.match(/chapters:\s*(\[[\s\S]*?\]),\s*sortNewestFirst/)
  if (!match) return []
  try {
    return JSON.parse(match[1])
  } catch {
    return []
  }
}

function extractImagesFromChapterPage(html: string): string[] {
  const match = html.match(/imagesWithServers:\s*(\[[\s\S]*?\]),\s*servers/)
  if (match) {
    try {
      const data = JSON.parse(match[1])
      if (Array.isArray(data)) {
        return data.map((item: { url: string }) => item.url)
      }
    } catch {
      // ignore
    }
  }
  // Fallback: extract background-image URLs from inline styles
  const bgMatches = html.matchAll(/background-image:[^;]*url\(&#039;([^']+)&#039;\)/g)
  const images: string[] = []
  for (const m of bgMatches) {
    if (m[1] && !images.includes(m[1])) {
      images.push(m[1])
    }
  }
  return images
}

export const luminaretranslationsSource: MangaSource = {
  id: 'luminaretranslations',
  name: 'Luminare Translations',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/series/`)
      const html = $.html()
      const allSeries = extractSeriesFromExplore(html)
      const q = query.toLowerCase()

      const results: SourceManga[] = []
      for (const series of allSeries) {
        if (series.title.toLowerCase().includes(q) || series.slug.toLowerCase().includes(q)) {
          results.push({
            id: series.slug,
            title: series.title,
            cover: series.cover_image || '/images/placeholder.png',
          })
        }
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const title =
        $('meta[property="og:title"]').attr('content')?.replace(' - Luminare Translations', '').trim() ||
        $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('img').first().attr('src') ||
        '/images/placeholder.png'

      const description =
        $('meta[name="description"]').attr('content')?.trim() ||
        $('meta[property="og:description"]').attr('content')?.trim() ||
        ''

      const html = $.html()
      const allSeries = extractSeriesFromExplore(html)
      const seriesData = allSeries.find((s) => s.slug === mangaId)

      const genres = seriesData?.genres || []
      const status = seriesData?.status || undefined

      return {
        id: mangaId,
        title,
        cover,
        status: status || undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)
      const html = $.html()
      const chapters = extractChaptersFromSeriesPage(html)

      const result: SourceChapter[] = []
      for (const ch of chapters) {
        // Store full path as id: slug/chapterId
        const idMatch = ch.url.match(/\/series\/([^/]+\/[^/]+)\/?$/)
        const id = idMatch?.[1] || ch.url

        const match = ch.label.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        result.push({
          id,
          chapterNumber,
          title: ch.label,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
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
      const url = `${BASE_URL}/series/${chapterId}`
      const $ = await fetchHTML(url)
      const html = $.html()
      const images = extractImagesFromChapterPage(html)

      return images.map((url, index) => ({ url: url.trim(), index }))
    } catch {
      return []
    }
  },
}
