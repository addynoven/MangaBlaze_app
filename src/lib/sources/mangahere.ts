import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangahere.cc'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaHere fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\//)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  // href looks like "/manga/naruto/v72/c700.6/1.html"
  const match = href.match(/\/manga\/([^/]+\/v\d+\/c[\d.]+)\//)
  return match?.[1] || ''
}

function extractChapterNumberFromHref(href: string): string | undefined {
  const match = href.match(/\/c([\d.]+)\//)
  return match?.[1]
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/Completed/gi, '')
    .replace(/\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?/g, '')
    .replace(/\(\s*\)/g, '')
    .trim()
}

export const mangahereSource: MangaSource = {
  id: 'mangahere',
  name: 'MangaHere',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      let url: string
      if (!query.trim()) {
        url = `${BASE_URL}/directory/`
      } else {
        url = `${BASE_URL}/search?title=${encodeURIComponent(query)}`
      }

      const $ = await fetchHTML(url)
      const results: SourceManga[] = []

      const selector = !query.trim()
        ? '.manga-list-1-item-title a'
        : '.manga-list-4-item-title a'

      $(selector).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        let cover = '/images/placeholder.png'

        if (!query.trim()) {
          const img = link.closest('li').find('img').first()
          cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'
        } else {
          const img = link.closest('li').find('img.manga-list-4-cover').first()
          cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'
        }

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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const rawTitle = $('.detail-info-right-title').first().text().trim()
      const title = cleanTitle(rawTitle)
      if (!title) return null

      const cover =
        $('.detail-info-cover-img').first().attr('src') ||
        $('.poster img').first().attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.detail-info-right-content p').first().text().trim() ||
        $('.fullcontent').first().text().trim()

      const statusText = $('.detail-info-right-title-tip').first().text().trim().toLowerCase()
      const status =
        statusText === 'ongoing'
          ? 'ongoing'
          : statusText === 'completed'
            ? 'completed'
            : statusText || undefined

      const authors: string[] = []
      $('a[href*="author"]').each((_, el) => {
        const name = $(el).text().trim()
        if (name) authors.push(name)
      })

      const genres: string[] = []
      $('.detail-info a[href^="/directory/"]').each((_, el) => {
        const g = $(el).text().trim()
        if (g && g !== 'Browse' && g !== 'History') {
          genres.push(g)
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description: description || '',
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
      const chapterPattern = new RegExp(`^/manga/${mangaId}/v\\d+/c[\\d.]+/1\\.html$`)

      $(`a[href*="/manga/${mangaId}/"]`).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''

        if (!chapterPattern.test(href)) return

        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.attr('title')?.trim() || link.text().trim()

        let chapterNumber = extractChapterNumberFromHref(href)
        if (!chapterNumber && titleText) {
          const titleMatch = titleText.match(/Ch\.?\s*([\d.]+)/i)
          chapterNumber = titleMatch?.[1]
        }
        if (!chapterNumber) {
          chapterNumber = '?'
        }

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
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
    // MangaHere.cc uses dynamic JS image loading via chapterfun.ashx which
    // returns packed JavaScript. This is too complex for a simple scraper.
    console.warn('[MangaHere] Chapter pages use dynamic JS image loading via chapterfun.ashx. Not supported in this implementation.')
    return []
  },
}
