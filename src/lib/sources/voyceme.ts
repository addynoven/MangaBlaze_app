import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.voyce.me'
const CDN_URL = 'https://dlkfxmdtxtzpb.cloudfront.net'
const GRAPHQL_URL = 'https://graphql.voyce.me/v1/graphql/'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchJSON(url: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`VoyceMe fetch error: ${res.status} ${url}`)
  return res.json()
}

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`VoyceMe fetch HTML error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '/images/placeholder.png'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${CDN_URL}/${url.startsWith('/') ? url.slice(1) : url}`
}

function cleanDescription(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;[^&]*&gt;/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function parseChapterNumber(title: string | null | undefined): string {
  if (!title) return '0'
  const match = title.match(/(?:Episode|Chapter|Ch\.?|Ep\.?)\s*(\d+(?:\.\d+)?)/i)
  if (match) return match[1]
  const numMatch = title.match(/(\d+(?:\.\d+)?)/)
  return numMatch ? numMatch[1] : '0'
}

export const voycemeSource: MangaSource = {
  id: 'voyceme',
  name: 'VoyceMe',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const res = await fetchJSON(`${CDN_URL}/system/json/series.json`)
      if (!res || !Array.isArray(res.data)) return []

      const searchStr = query.toLowerCase().trim()
      const matches = res.data.filter((series: any) => {
        const titleMatch = series.title?.toLowerCase().includes(searchStr)
        const descMatch = series.short_desc?.toLowerCase().includes(searchStr)
        const keywordMatch = series.keyword?.toLowerCase().includes(searchStr)
        const authorMatch =
          series.author?.username?.toLowerCase().includes(searchStr) ||
          series.author?.first_name?.toLowerCase().includes(searchStr) ||
          series.author?.last_name?.toLowerCase().includes(searchStr)
        return titleMatch || descMatch || keywordMatch || authorMatch
      })

      return matches.slice(0, limit).map((series: any) => ({
        id: series.slug,
        title: series.title,
        cover: ensureAbsoluteUrl(series.thumbnail || series.cover_image),
        status: series.status?.toLowerCase(),
        genres: series.genres || [],
        description: series.short_desc ? cleanDescription(series.short_desc) : undefined,
      }))
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/series/${mangaId}`)
      const nextDataText = $('#__NEXT_DATA__').html()
      if (!nextDataText) return null

      const nextData = JSON.parse(nextDataText)
      const series = nextData?.props?.pageProps?.series
      if (!series || !series.title) return null

      const authors = series.author
        ? [
            series.author.first_name || series.author.last_name
              ? `${series.author.first_name || ''} ${series.author.last_name || ''}`.trim()
              : series.author.username,
          ]
        : []

      return {
        id: mangaId,
        title: series.title,
        cover: ensureAbsoluteUrl(series.thumbnail || series.cover_image),
        status: series.status?.toLowerCase(),
        year: null,
        description: cleanDescription(series.description || series.short_desc),
        authors,
        artists: authors,
        genres: series.genres || [],
        altTitles: [],
        originalLanguage: 'en',
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
      const query = `
        query ChaptersBySeriesSlug($slug: String!) {
          voyce_chapters(
            where: {
              publish: { _eq: 1 },
              is_deleted: { _eq: false },
              series: { slug: { _eq: $slug } }
            },
            order_by: { id: asc }
          ) {
            id
            title
            thumbnail
            created_at
            publish_date
          }
        }
      `

      const res = await fetchJSON(GRAPHQL_URL, {
        method: 'POST',
        body: JSON.stringify({
          query,
          variables: { slug: mangaId },
        }),
      })

      const chapters = res?.data?.voyce_chapters
      if (!chapters || !Array.isArray(chapters)) return []

      const mappedChapters = chapters.map((ch: any) => {
        const published = ch.publish_date || ch.created_at || new Date().toISOString()
        return {
          id: String(ch.id),
          chapterNumber: parseChapterNumber(ch.title),
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

      return mappedChapters.slice(offset, offset + limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const id = parseInt(chapterId, 10)
      if (isNaN(id)) return []

      const query = `
        query ChapterImagesById($chapter_id: Int!) {
          voyce_chapter_images(
            where: { chapter: { id: { _eq: $chapter_id } } },
            order_by: [{ sort_order: asc }, { id: asc }]
          ) {
            id
            image
            chapter_id
            sort_order
          }
        }
      `

      const res = await fetchJSON(GRAPHQL_URL, {
        method: 'POST',
        body: JSON.stringify({
          query,
          variables: { chapter_id: id },
        }),
      })

      const images = res?.data?.voyce_chapter_images
      if (!images || !Array.isArray(images)) return []

      return images.map((img: any, index: number) => ({
        url: ensureAbsoluteUrl(img.image),
        index: img.sort_order ?? index,
      }))
    } catch {
      return []
    }
  },
}
