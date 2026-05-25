import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.mangatown.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaTown fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\//)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  // href looks like "/manga/naruto/v72/c700.6/"
  const match = href.match(/\/manga\/(.+?)\/?$/)
  return match?.[1] || ''
}

function extractChapterNumberFromHref(href: string): string | undefined {
  const match = href.match(/\/c([\d.]+)\//)
  return match?.[1]
}

export const mangatownSource: MangaSource = {
  id: 'mangatown',
  name: 'MangaTown',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?name=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a.manga_cover').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('img').attr('alt')?.trim() || ''
        const cover = link.find('img').attr('src') || '/images/placeholder.png'

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

      const title = $('h1.title-top').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || ''
      if (!title) return null

      const cover = $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'

      // Full description is in #show (hidden), truncated in #hide
      let description = $('#show').first().text().trim() || $('#hide').first().text().trim()
      if (!description) {
        description = $('meta[property="og:description"]').attr('content')?.trim() || ''
      }

      const genres: string[] = []
      let authors: string[] = []
      let artists: string[] = []
      let status: string | undefined

      // Extract info from detail blocks using <b> labels
      $('b').each((_, el) => {
        const label = $(el).text().trim()
        const parent = $(el).parent()

        if (label.includes('Genre(s)')) {
          parent.find('a[href*="/directory/"]').each((_, a) => {
            const g = $(a).text().trim()
            if (g) genres.push(g)
          })
        }

        if (label.includes('Author(s)')) {
          parent.find('a').each((_, a) => {
            const name = $(a).text().trim()
            if (name) authors.push(name)
          })
        }

        if (label.includes('Artist(s)')) {
          parent.find('a').each((_, a) => {
            const name = $(a).text().trim()
            if (name) artists.push(name)
          })
        }

        if (label.includes('Status(s)')) {
          const statusText = parent.text().replace('Status(s):', '').trim().toLowerCase()
          if (statusText) status = statusText
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
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
      const chapterPattern = new RegExp(`^/manga/${mangaId}/v\\d+/c[\\d.]+/$`)

      $('ul.chapter_list li a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''

        if (!chapterPattern.test(href)) return

        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        let chapterNumber = extractChapterNumberFromHref(href)
        if (!chapterNumber) {
          chapterNumber = link.attr('name')?.trim()
        }
        if (!chapterNumber) {
          chapterNumber = '?'
        }

        const titleText = link.text().trim()
        const timeText = link.parent().find('span.time').text().trim()

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: timeText || new Date().toISOString(),
          readableAt: timeText || new Date().toISOString(),
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
    // MangaTown chapter pages use dynamic JS image loading similar to MangaHere.
    // Page images are loaded via client-side JavaScript after the initial HTML.
    // A headless browser would be required to extract actual page URLs.
    console.warn('[MangaTown] Chapter pages use dynamic JS image loading. Not supported in this implementation.')
    return []
  },
}
