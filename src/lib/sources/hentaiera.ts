import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentaiera.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiEra fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractGalleryIdFromHref(href: string): string {
  const match = href.match(/\/gallery\/(\d+)\//)
  return match?.[1] || ''
}

function extractPageCount(text: string): number {
  const match = text.match(/(\d+)\s*Pages?/i)
  return match ? parseInt(match[1], 10) : 0
}

export const hentaieraSource: MangaSource = {
  id: 'hentaiera',
  name: 'HentaiEra',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?key=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.thumb').each((_, el) => {
        const link = $(el).find('.gallery_title a')
        const href = link.attr('href') || ''
        const id = extractGalleryIdFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const img = $(el).find('.inner_thumb img')
        const cover = img.attr('data-src') || img.attr('src') || '/images/placeholder.png'

        if (title) {
          results.push({ id, title, cover })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const coverImg = $('.left_cover img')
      const cover = coverImg.attr('data-src') || coverImg.attr('src') || '/images/placeholder.png'

      const genres: string[] = []
      $('.info_tags a.tag').each((_, el) => {
        const text = $(el).find('.item_name').text().trim()
        if (text) genres.push(text)
      })

      const pageCountText = $('#pages_btn').text().trim()
      const lastChapter = extractPageCount(pageCountText) > 0 ? String(extractPageCount(pageCountText)) : null

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter,
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
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const pageCountText = $('#pages_btn').text().trim()
      const pages = extractPageCount(pageCountText)

      const chapters: SourceChapter[] = [
        {
          id: mangaId,
          chapterNumber: '1',
          title: 'Chapter 1',
          volume: null,
          language: 'en',
          pages,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        },
      ]

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      // HentaiEra galleries are single-chapter; chapterId is the gallery ID
      const mangaId = chapterId

      // Fetch gallery page to get page count and first thumbnail
      const galleryUrl = `${BASE_URL}/gallery/${mangaId}/`
      const $gallery = await fetchHTML(galleryUrl)

      const pageCountText = $gallery('#pages_btn').text().trim()
      const totalPages = extractPageCount(pageCountText)
      if (!totalPages) return []

      // Get first thumbnail to derive image base URL
      const firstThumb = $gallery('.gthumb').first().find('img').attr('data-src')
      if (!firstThumb) return []

      // Thumbnail: https://m11.hentaiera.com/032/6uvwz328aj/1t.jpg
      // Full:      https://m11.hentaiera.com/032/6uvwz328aj/1.webp
      const baseMatch = firstThumb.match(/^(.*\/)(\d+)t\.jpg$/)
      if (!baseMatch) return []
      const baseUrl = baseMatch[1]

      // Verify extension by fetching first view page
      const viewUrl = `${BASE_URL}/view/${mangaId}/1/`
      const $view = await fetchHTML(viewUrl)
      const firstImg = $view('#gimg').attr('data-src')
      if (!firstImg) return []

      const extMatch = firstImg.match(/\.([a-zA-Z0-9]+)$/)
      const ext = extMatch ? extMatch[1] : 'webp'

      const pages: SourcePage[] = []
      for (let i = 1; i <= totalPages; i++) {
        pages.push({ url: `${baseUrl}${i}.${ext}`, index: i - 1 })
      }

      return pages
    } catch {
      return []
    }
  },
}
