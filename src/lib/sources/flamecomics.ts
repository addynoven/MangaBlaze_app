import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://flamecomics.xyz'
const CDN_URL = 'https://cdn.flamecomics.xyz'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Flame Comics fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractNextData($: cheerio.CheerioAPI): any {
  const script = $('#__NEXT_DATA__').html()
  if (!script) return null
  return JSON.parse(script)
}

function buildCoverUrl(seriesId: number | string, cover: string): string {
  return `${CDN_URL}/uploads/images/series/${seriesId}/${cover}`
}

interface BrowseSeries {
  series_id: number
  title: string
  description?: string
  language?: string
  type?: string
  categories?: string[]
  country?: string
  author?: string[]
  artist?: string[]
  publisher?: string[]
  year?: number
  status?: string
  likes?: number
  cover: string
  last_edit?: number
  time?: number
}

interface SeriesChapter {
  chapter_id: number
  series_id: number
  chapter: string
  title: string
  cover: number
  release_date: number
  token: string
  edit_time: number
}

interface ChapterImage {
  size: number
  type: string
  name: string
  modified: string
  width: number
  height: number
}

export const flamecomicsSource: MangaSource = {
  id: 'flamecomics',
  name: 'Flame Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/browse`)
      const data = extractNextData($)
      if (!data?.props?.pageProps?.series) return []

      const series: BrowseSeries[] = data.props.pageProps.series
      const q = query.toLowerCase()

      const results: SourceManga[] = []
      for (const s of series) {
        if (s.title.toLowerCase().includes(q)) {
          results.push({
            id: String(s.series_id),
            title: s.title,
            cover: buildCoverUrl(s.series_id, s.cover),
          })
        }
        if (results.length >= limit) break
      }

      return results
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/series/${mangaId}`)
      const data = extractNextData($)
      if (!data?.props?.pageProps?.series) return null

      const series: BrowseSeries = data.props.pageProps.series
      const title = series.title
      if (!title) return null

      const description =
        series.description?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''

      const status = series.status?.toLowerCase()

      return {
        id: mangaId,
        title,
        cover: buildCoverUrl(series.series_id, series.cover),
        status: ['ongoing', 'completed', 'hiatus', 'cancelled', 'dropped'].includes(status || '')
          ? status
          : undefined,
        year: series.year ?? null,
        description,
        authors: series.author ? [...new Set(series.author)] : [],
        artists: series.artist ? [...new Set(series.artist)] : [],
        genres: series.categories ? [...new Set(series.categories)] : [],
        altTitles: [],
        originalLanguage: series.country?.toLowerCase() || 'ja',
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
      const $ = await fetchHTML(`${BASE_URL}/series/${mangaId}`)
      const data = extractNextData($)
      if (!data?.props?.pageProps?.chapters) return []

      const chapters: SeriesChapter[] = data.props.pageProps.chapters
      const results: SourceChapter[] = []

      for (const ch of chapters) {
        const chapterNumber = ch.chapter || '?'
        const title = ch.title || `Chapter ${chapterNumber}`
        const publishedAt = ch.release_date
          ? new Date(ch.release_date * 1000).toISOString()
          : new Date().toISOString()

        results.push({
          id: `${mangaId}/${ch.token}`,
          chapterNumber,
          title,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const [seriesId, token] = chapterId.split('/')
      if (!seriesId || !token) return []

      const $ = await fetchHTML(`${BASE_URL}/series/${seriesId}/${token}`)
      const data = extractNextData($)
      if (!data?.props?.pageProps?.chapter?.images) return []

      const images: Record<string, ChapterImage> = data.props.pageProps.chapter.images
      const pages: SourcePage[] = []

      for (const key of Object.keys(images).sort((a, b) => parseInt(a) - parseInt(b))) {
        const img = images[key]
        pages.push({
          url: `${CDN_URL}/uploads/images/series/${seriesId}/${token}/${img.name}`,
          index: parseInt(key),
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
