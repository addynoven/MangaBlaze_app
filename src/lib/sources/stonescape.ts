import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://stonescape.xyz'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchJSON(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`StoneScape fetch error: ${res.status} ${url}`)
  return res.json()
}

function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '/images/placeholder.png'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export const stonescapeSource: MangaSource = {
  id: 'stonescape',
  name: 'StoneScape',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const searchUrl = `${BASE_URL}/api/series?page=1&limit=${limit}&search=${encodeURIComponent(query)}`
      const res = await fetchJSON(searchUrl)
      if (!res || !Array.isArray(res.data)) return []

      return res.data.map((series: any) => ({
        id: series.slug,
        title: series.title,
        cover: ensureAbsoluteUrl(series.coverUrl),
        status: series.publicationStatus?.toLowerCase(),
        genres: series.genres || [],
        description: series.description || undefined,
      }))
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const detailUrl = `${BASE_URL}/api/series/by-slug/${mangaId}`
      const series = await fetchJSON(detailUrl)
      if (!series || !series.title) return null

      const authors = series.author ? [series.author] : []
      const artists = series.artist ? [series.artist] : []

      return {
        id: mangaId,
        title: series.title,
        cover: ensureAbsoluteUrl(series.coverUrl),
        status: series.publicationStatus?.toLowerCase(),
        year: null,
        description: series.description || '',
        authors,
        artists: artists.length > 0 ? artists : authors,
        genres: series.genres || [],
        altTitles: [],
        originalLanguage: series.countryOfOrigin || 'ja',
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
    offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const chaptersUrl = `${BASE_URL}/api/series/by-slug/${mangaId}/chapters`
      const res = await fetchJSON(chaptersUrl)
      if (!res || !Array.isArray(res.chapters)) return []

      const allChapters = res.chapters.map((ch: any) => {
        let chNum = ch.chapterNumber
        if (chNum) {
          const parsed = parseFloat(chNum)
          if (!isNaN(parsed)) {
            chNum = String(parsed)
          }
        } else {
          chNum = '0'
        }

        const published = ch.createdAt || ch.releaseDate || new Date().toISOString()

        return {
          id: ch.chapterId,
          chapterNumber: chNum,
          title: ch.title || null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: published,
          readableAt: published,
          externalUrl: null,
          isUnavailable: false,
        }
      })

      return allChapters.slice(offset, offset + limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const pagesUrl = `${BASE_URL}/api/chapters/${chapterId}/pages`
      const res = await fetchJSON(pagesUrl)
      if (!res || !Array.isArray(res.pages)) return []

      const sortedPages = [...res.pages].sort((a: any, b: any) => a.pageNumber - b.pageNumber)

      return sortedPages.map((page: any, index: number) => ({
        url: ensureAbsoluteUrl(page.url),
        index,
      }))
    } catch {
      return []
    }
  },
}
