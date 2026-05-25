import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hiperdex.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hiperdex fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/manga\/[^/]+\/(.+?)\/?$/)
  return match?.[1] || ''
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  const clean = dateStr.trim()
  // Try MM/DD/YYYY format
  const usMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`).toISOString()
  }
  const d = new Date(clean)
  if (!isNaN(d.getTime())) return d.toISOString()
  return new Date().toISOString()
}

export const hiperdexSource: MangaSource = {
  id: 'hiperdex',
  name: 'Hiperdex',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.page-item-detail.manga').each((_, el) => {
        const item = $(el)
        const link = item.find('.post-title a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim() || link.attr('title')?.trim() || ''
        const cover =
          item.find('.item-thumb img').attr('data-src') ||
          item.find('.item-thumb img').attr('src') ||
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim() || $('.post-title h3').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.description-summary p').first().text().trim() ||
        $('.summary__content p').first().text().trim() ||
        ''

      const genres: string[] = []
      const authors: string[] = []
      const artists: string[] = []
      let status: string | undefined
      let year: number | null = null
      const altTitles: string[] = []

      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        const content = $(el).find('.summary-content').text().trim()

        if (heading.includes('genre')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { genres.push($(a).text().trim()) })
        } else if (heading.includes('author')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { authors.push($(a).text().trim()) })
        } else if (heading.includes('artist')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { artists.push($(a).text().trim()) })
        } else if (heading.includes('status')) {
          const text = content.toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
            status = text
          }
        } else if (heading.includes('release')) {
          const num = parseInt(content, 10)
          if (!isNaN(num)) year = num
        } else if (heading.includes('alternative')) {
          content.split(/;|\|/).forEach((t) => {
            const trimmed = t.trim()
            if (trimmed) altTitles.push(trimmed)
          })
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
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
      $('li.wp-manga-chapter').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = $(el).find('.chapter-release-date i').text().trim()
        const publishedAt = parseDate(dateText)

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const mangaId = chapterId.split('/')[0]
      const url = `${BASE_URL}/manga/${mangaId}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.reading-content img.wp-manga-chapter-img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
