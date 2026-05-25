import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://nhentai.xxx'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`NHentai.xxx fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractGth($: cheerio.CheerioAPI): Record<string, Record<string, string>> | null {
  for (const el of $('script').toArray()) {
    const text = $(el).text()
    if (text.includes('var g_th = ')) {
      const match = text.match(/\$\.parseJSON\('([\s\S]+?)'\)/)
      if (match) {
        try {
          return JSON.parse(match[1])
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function extFromFormat(fmt: string): string {
  const c = fmt.charAt(0)
  if (c === 'w') return 'webp'
  if (c === 'p') return 'png'
  return 'jpg'
}

export const nhentaixxxSource: MangaSource = {
  id: 'nhentaixxx',
  name: 'NHentai.xxx',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?key=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.gallery_item a[href^="/g/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.match(/\/g\/(\d+)\//)?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('.caption').text().trim()
        const cover =
          link.find('img').attr('data-src') ||
          link.find('img').attr('src') ||
          '/images/placeholder.png'

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
      const url = `${BASE_URL}/g/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.cover img').attr('data-src') ||
        $('.cover img').attr('src') ||
        '/images/placeholder.png'

      const genres: string[] = []
      const authors: string[] = []
      const artists: string[] = []

      $('li.tags').each((_, el) => {
        const section = $(el).find('span.text').first().text().trim().toLowerCase()
        $(el)
          .find('a.tag_btn .tag_name')
          .each((__, tagEl) => {
            const tag = $(tagEl).text().trim()
            if (!tag) return
            if (section === 'tags') genres.push(tag)
            if (section === 'artists') {
              artists.push(tag)
              authors.push(tag)
            }
          })
      })

      const pagesVal = $('#load_pages').val()
      const pages = typeof pagesVal === 'string' ? parseInt(pagesVal, 10) : 0

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: !isNaN(pages) && pages > 0 ? String(pages) : null,
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
      const url = `${BASE_URL}/g/${mangaId}/`
      const $ = await fetchHTML(url)

      const pagesVal = $('#load_pages').val()
      const pages = typeof pagesVal === 'string' ? parseInt(pagesVal, 10) : 0

      const chapters: SourceChapter[] = [
        {
          id: mangaId,
          chapterNumber: '1',
          title: 'Chapter 1',
          volume: null,
          language: 'en',
          pages: !isNaN(pages) ? pages : 0,
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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/g/${chapterId}/`
      const $ = await fetchHTML(url)

      const server = $('#load_server').val()
      const dir = $('#load_dir').val()
      const loadId = $('#load_id').val()
      const pagesVal = $('#load_pages').val()

      if (!server || !dir || !loadId || !pagesVal) return []

      const totalPages = parseInt(pagesVal as string, 10)
      if (isNaN(totalPages) || totalPages <= 0) return []

      const gth = extractGth($)
      if (!gth || !gth.fl) return []

      const basePath = `https://i${server}.nhentaimg.com/${dir}/${loadId}/`
      const pages: SourcePage[] = []

      for (let i = 1; i <= totalPages; i++) {
        const fmt = gth.fl[String(i)]
        if (!fmt) continue
        const ext = extFromFormat(fmt)
        pages.push({ url: `${basePath}${i}.${ext}`, index: i - 1 })
      }

      return pages
    } catch {
      return []
    }
  },
}
