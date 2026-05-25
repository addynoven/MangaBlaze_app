import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://scythescans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Scythe Scans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function parseTsReaderImages(html: string): string[] {
  // The reader config is often embedded in a base64 script tag
  const base64Match = html.match(/data:text\/javascript;base64,([A-Za-z0-9+/=]+)/g)
  if (!base64Match) return []

  for (const b64 of base64Match) {
    try {
      const decoded = Buffer.from(b64.replace('data:text/javascript;base64,', ''), 'base64').toString('utf8')
      const imagesMatch = decoded.match(/"images":\[(.*?)\]/)
      if (imagesMatch) {
        const imagesJson = `[${imagesMatch[1]}]`
        const images = JSON.parse(imagesJson)
        if (Array.isArray(images) && images.length > 0) {
          return images.filter((url: string) => typeof url === 'string' && url.startsWith('http'))
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return []
}

export const scythescansSource: MangaSource = {
  id: 'scythescans',
  name: 'Scythe Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // Scythe's on-page search often returns empty HTML; fallback to browsing /manga/ page 1
      const url = `${BASE_URL}/manga/`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const q = query.toLowerCase()

      $('.bsx').each((_, el) => {
        const item = $(el)
        const link = item.find('a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || ''
        const cover =
          item.find('img').attr('src') ||
          item.find('img').attr('data-src') ||
          '/images/placeholder.png'

        if (title && title.toLowerCase().includes(q)) {
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

      const title =
        $('h1').first().text().trim() ||
        $('.wp-post-image').first().attr('alt')?.trim() ||
        ''
      if (!title) return null

      const cover =
        $('.thumb img').attr('src') ||
        $('.thumb img').attr('data-src') ||
        $('.wp-post-image').first().attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.description-summary p').first().text().trim() ||
        $('.summary__content p').first().text().trim() ||
        ''

      const genres: string[] = []
      $('.mgen a, a[href*="/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.imptdt i').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      $('.imptdt').each((_, el) => {
        const label = $(el).contents().first().text().trim().toLowerCase()
        if (label.includes('author')) {
          const author = $(el).find('i').text().trim()
          if (author) authors.push(author)
        }
      })

      const artists: string[] = []
      $('.imptdt').each((_, el) => {
        const label = $(el).contents().first().text().trim().toLowerCase()
        if (label.includes('artist')) {
          const artist = $(el).find('i').text().trim()
          if (artist) artists.push(artist)
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

      $('.eplister .chlink, #chapterlist .chlink').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/([^/]+)\/?$/)
        const id = idMatch?.[1] || href
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: href?.startsWith('http') ? href : `${BASE_URL}/${id}/`,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`Scythe Scans chapter fetch error: ${res.status} ${url}`)
      const html = await res.text()

      const images = parseTsReaderImages(html)
      if (images.length > 0) {
        return images.map((url, index) => ({ url, index }))
      }

      return []
    } catch {
      return []
    }
  },
}
