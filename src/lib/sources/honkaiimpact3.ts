import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manga.honkaiimpact3.com'
const STATIC_URL = 'https://act-webstatic.hoyoverse.com/manga/static'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Honkai Impact fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Honkai Impact JSON fetch error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

interface HonkaiChapterJSON {
  id: string
  title: string
  page: string
  bookid: string
  chapterid: string
  praise: string
  timestamp: string
}

function extractChapterNumber(title: string): string {
  const match = title.match(/(\d+(?:\.\d+)?)(?:-END)?$/i)
  return match?.[1] || '?'
}

export const honkaiimpact3Source: MangaSource = {
  id: 'honkaiimpact3',
  name: 'Honkai Impact 3rd',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/book/`)
      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('.container').each((_, el) => {
        const link = $(el).closest('a')
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/book\/(\d+)/)
        const id = idMatch?.[1] || ''
        if (!id || seen.has(id)) return

        const title = $(el).find('.container-title').contents().filter(function () {
          return this.type === 'text'
        }).text().trim()

        const cover = $(el).find('.container-cover img').attr('src') || `${STATIC_URL}/comic/book_cover/${id}.jpg`
        const description = $(el).find('.container-description').text().trim()

        if (title) {
          if (!query || title.toLowerCase().includes(query.toLowerCase())) {
            seen.add(id)
            results.push({ id, title, cover, description })
          }
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/book/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.title').first().text().trim()
      if (!title) return null

      const cover = $('.detail_img img.cover').attr('src') || `${STATIC_URL}/comic/book_cover/${mangaId}.jpg`
      const description = $('.detail_info1').first().text().trim()

      return {
        id: mangaId,
        title,
        cover,
        status: 'completed',
        year: null,
        description,
        authors: ['miHoYo'],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'zh',
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
      const data = await fetchJSON<HonkaiChapterJSON[]>(`${BASE_URL}/book/${mangaId}/get_chapter`)
      const chapters: SourceChapter[] = []

      for (const item of data) {
        const chapterNumber = extractChapterNumber(item.title)
        const timestamp = item.timestamp
        const publishedAt = timestamp && timestamp !== '0000-00-00 00:00:00'
          ? new Date(timestamp).toISOString()
          : new Date().toISOString()

        chapters.push({
          id: `${mangaId}/${item.chapterid}`,
          chapterNumber,
          title: item.title,
          volume: null,
          language: 'en',
          pages: parseInt(item.page, 10) || 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/book/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.comic_img[data-original]').each((index, el) => {
        const src = $(el).attr('data-original')
        if (src) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
