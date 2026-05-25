import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://fanfox.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`FanFox fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractMangaIdFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  // href looks like "/manga/naruto/v72/c700.6/1.html"
  return href.replace(/^\//, '')
}

function parseChapterTitle(titleText: string): { chapterNumber: string; volume: string | null; title: string | null } {
  const volMatch = titleText.match(/Vol\.(\d+)/i)
  const chMatch = titleText.match(/Ch\.([\d.]+)/i)
  const chapterNumber = chMatch?.[1] || '?'
  const volume = volMatch?.[1] || null

  // Extract title after the chapter number part
  let title: string | null = null
  const titleMatch = titleText.match(/Ch\.[\d.]+\s*-\s*(.+)/i)
  if (titleMatch?.[1]) {
    title = titleMatch[1].trim()
  }

  return { chapterNumber, volume, title }
}

export const fanfoxSource: MangaSource = {
  id: 'fanfox',
  name: 'FanFox',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?title=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.manga-list-4-list li').each((_, el) => {
        const item = $(el)
        const link = item.find('.manga-list-4-item-title a').first()
        const href = link.attr('href') || ''
        const id = extractMangaIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title') || link.text().trim()
        const cover = item.find('.manga-list-4-cover').attr('src') || '/images/placeholder.png'
        const status = item.find('.manga-list-4-show-tag-list-2 a').text().trim() || undefined

        if (title) {
          results.push({ id, title, cover, status })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.detail-info-right-title-font').first().text().trim()
      if (!title) return null

      const cover = $('.detail-info-cover-img').first().attr('src') || '/images/placeholder.png'

      // Prefer full hidden description, fallback to truncated visible one
      let description = $('.fullcontent').first().text().trim()
      if (!description) {
        description = $('.detail-info-right-content').first().text().trim()
      }

      const statusText = $('.detail-info-right-title-tip').first().text().trim().toLowerCase()
      const status = ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(statusText) ? statusText : undefined

      const authors: string[] = []
      $('.detail-info-right-say a').each((_, el) => {
        const name = $(el).text().trim()
        if (name) authors.push(name)
      })

      const genres: string[] = []
      $('.detail-info-right-tag-list a').each((_, el) => {
        const g = $(el).text().trim()
        if (g) genres.push(g)
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(authors)],
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#chapterlist .detail-main-list li').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''

        // Only match chapter URLs: /manga/{slug}/v\d+/c[\d.]+/1.html or /manga/{slug}/c[\d.]+/1.html
        const chapterHrefRegex = new RegExp(`^/manga/${mangaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(v\\d+/)?c[\\d.]+/1\\.html$`)
        if (!chapterHrefRegex.test(href)) return

        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.attr('title') || link.find('.title3').text().trim()
        const { chapterNumber, volume, title } = parseChapterTitle(titleText)
        const dateText = link.find('.title2').text().trim()

        chapters.push({
          id,
          chapterNumber,
          title: title || titleText,
          volume,
          language: 'en',
          pages: 0,
          publishedAt: dateText || new Date().toISOString(),
          readableAt: dateText || new Date().toISOString(),
          externalUrl: `${BASE_URL}${href}`,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    // FanFox chapter pages are loaded dynamically via client-side JS (same backend as MangaHere).
    // A headless browser is required to extract the actual image URLs.
    console.warn('[FanFox] Chapter pages require headless browser for dynamic JS loading. Not supported in this implementation.')
    return []
  },
}
