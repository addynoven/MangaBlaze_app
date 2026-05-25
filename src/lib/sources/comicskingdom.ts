import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://wp.comicskingdom.com'
const API_URL = `${BASE_URL}/wp-json/wp/v2`
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface WPFeatureTaxonomy {
  id: number
  name: string
  slug: string
  count: number
  description: string
}

interface WPComic {
  id: number
  date: string
  slug: string
  link: string
  title: { rendered: string }
  content: { rendered: string }
  assets: {
    featured?: { url: string; width: number; height: number; altText: string }
    single?: { url: string; width: number; height: number; altText: string }
    panels: unknown[]
  }
  ck_comic_feature_name: string
  ck_comic_byline: string
  ck_formatted_date: string
  _embedded?: {
    'wp:term'?: Array<
      Array<{
        id: number
        name: string
        slug: string
        taxonomy: string
      }>
    >
  }
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ComicsKingdom fetch error: ${res.status} ${url}`)
  return res.json()
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    .replace(/&#038;/g, '&')
}

export const comicskingdomSource: MangaSource = {
  id: 'comicskingdom',
  name: 'Comics Kingdom',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const features = await fetchJSON<WPFeatureTaxonomy[]>(
        `${API_URL}/ck_feature_taxonomy?search=${encodeURIComponent(query)}&per_page=${limit}`
      )

      const results: SourceManga[] = []
      for (const feature of features) {
        if (results.some((r) => r.id === String(feature.id))) continue
        results.push({
          id: String(feature.id),
          title: decodeHtmlEntities(feature.name),
          cover: '/images/placeholder.png',
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const taxonomy = await fetchJSON<WPFeatureTaxonomy>(
        `${API_URL}/ck_feature_taxonomy/${mangaId}`
      )

      // Fetch the latest strip to get cover and byline info
      const strips = await fetchJSON<WPComic[]>(
        `${API_URL}/ck_comic?ck_feature_taxonomy=${mangaId}&per_page=1&orderby=date&order=desc&_embed=true`
      )

      const latestStrip = strips[0]
      const cover = latestStrip?.assets?.featured?.url || '/images/placeholder.png'
      const byline = latestStrip?.ck_comic_byline || ''

      // Try to get a richer description from the ck_feature post
      let description = ''
      try {
        const featurePost = await fetchJSON<{ excerpt?: { rendered?: string }; content?: { rendered?: string } }>(
          `${API_URL}/ck_feature/${taxonomy.slug}`
        )
        const rawDesc = featurePost.excerpt?.rendered || featurePost.content?.rendered || ''
        description = decodeHtmlEntities(cheerio.load(rawDesc).text().trim())
      } catch {
        // Fallback to empty description
      }

      if (!description && byline) {
        description = byline
      }

      return {
        id: mangaId,
        title: decodeHtmlEntities(taxonomy.name),
        cover,
        status: undefined,
        year: null,
        description,
        authors: byline ? [byline.replace(/^by\s+/i, '').replace(/^By\s+/i, '')] : [],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'en',
        lastVolume: null,
        lastChapter: latestStrip ? latestStrip.title.rendered : null,
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
      const perPage = 100
      const startPage = Math.floor(offset / perPage) + 1
      const endPage = Math.floor((offset + limit - 1) / perPage) + 1
      const allStrips: WPComic[] = []

      for (let page = startPage; page <= endPage; page++) {
        const strips = await fetchJSON<WPComic[]>(
          `${API_URL}/ck_comic?ck_feature_taxonomy=${mangaId}&per_page=${perPage}&page=${page}&orderby=date&order=desc`
        )
        allStrips.push(...strips)
      }

      const sliceStart = offset % perPage
      const strips = allStrips.slice(sliceStart, sliceStart + limit)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      for (const strip of strips) {
        const id = String(strip.id)
        if (seen.has(id)) continue
        seen.add(id)

        const date = strip.date.split('T')[0]
        chapters.push({
          id,
          chapterNumber: date,
          title: `${strip.ck_comic_feature_name} – ${strip.ck_formatted_date || date}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date(strip.date).toISOString(),
          readableAt: new Date(strip.date).toISOString(),
          externalUrl: strip.link,
          isUnavailable: false,
        })
      }

      return chapters
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const strip = await fetchJSON<WPComic>(`${API_URL}/ck_comic/${chapterId}`)
      const url = strip.assets?.single?.url || strip.assets?.featured?.url
      if (!url) return []
      return [{ url, index: 0 }]
    } catch {
      return []
    }
  },
}
