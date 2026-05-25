import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manga18.me'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Manga18.me fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+\/[^/]+)\/?$/)
  return match?.[1] || ''
}

function parseDate(text: string): string {
  const d = new Date(text)
  if (!isNaN(d.getTime())) return d.toISOString()
  return new Date().toISOString()
}

export const manga18meSource: MangaSource = {
  id: 'manga18me',
  name: 'Manga18.me',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.page-item-detail').each((_, el) => {
        const item = $(el)
        const link = item.find('.item-title h3 a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description = $('.panel-story-description .ss-manga p').first().text().trim()

      const genres: string[] = []
      $('.genres-content a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const authors: string[] = []
      $('.author-content a').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('.artist-content a').each((_, el) => {
        artists.push($(el).text().trim())
      })

      let status: string | undefined
      let year: number | null = null
      $('.post_status .post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading').text().trim().toLowerCase()
        const content = $(el).find('.summary-content').text().trim()
        if (heading.includes('status')) {
          const text = content.toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
            status = text
          }
        }
        if (heading.includes('release')) {
          const y = parseInt(content)
          if (!isNaN(y)) year = y
        }
      })

      const altTitles: string[] = []
      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading').text().trim().toLowerCase()
        if (heading.includes('alternative')) {
          const content = $(el).find('.summary-content').text().trim()
          if (content) {
            content.split(/\s*\/\s*/).forEach((t) => {
              const trimmed = t.trim()
              if (trimmed) altTitles.push(trimmed)
            })
          }
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.panel-manga-chapter .row-content-chapter li').each((_, el) => {
        const link = $(el).find('a.chapter-name').first()
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim() || link.attr('title') || ''
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = $(el).find('span.chapter-time').text().trim()
        const publishedAt = dateText ? parseDate(dateText) : new Date().toISOString()

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

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/manga/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $("img[class^='p']").each((index, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src')
        if (src && !src.includes('data:image') && !src.includes('base64')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
