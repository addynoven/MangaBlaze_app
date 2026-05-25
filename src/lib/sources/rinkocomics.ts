import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://rinkocomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`RinkoComics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comic\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterSlugFromHref(href: string): string {
  const match = href.match(/\/chapter\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const rinkocomicsSource: MangaSource = {
  id: 'rinkocomics',
  name: 'Rinko Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href^="https://rinkocomics.com/comic/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const rawText = link.text().trim()
        const title = link.attr('title')?.trim() || rawText.split('\n')[0].trim()
        const cover = link.find('img').attr('src') || link.find('img').attr('data-src') || '/images/placeholder.png'

        if (title) {
          results.push({ id, title, cover })
        }
      })

      // Fallback: browse /comic page and filter client-side
      if (results.length === 0 && query.trim()) {
        const browse$ = await fetchHTML(`${BASE_URL}/comic`)
        const q = query.toLowerCase()

        browse$('.ac-thumb').each((_, el) => {
          const thumb = browse$(el)
          const href = thumb.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id || seen.has(id)) return
          seen.add(id)

          const title = thumb.find('.ac-title').text().trim() || thumb.attr('title')?.trim() || ''
          const cover = thumb.find('img').attr('src') || thumb.find('img').attr('data-src') || '/images/placeholder.png'

          if (title && (title.toLowerCase().includes(q) || id.toLowerCase().includes(q))) {
            results.push({ id, title, cover })
          }
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/comic/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('.comic-cover img').attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.comic-synopsis').first().text().trim() ||
        $('.comic-description').first().text().trim() ||
        $('meta[property="og:description"]').attr('content')?.trim() ||
        ''

      let status: string | undefined
      $('.comic-status').each((_, el) => {
        const spans = $(el).find('span')
        if (spans.length >= 2) {
          const label = spans.first().text().trim().toLowerCase()
          const value = spans.eq(1).text().trim().toLowerCase()
          if (label === 'status' && ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(value)) {
            status = value
          }
        }
      })

      const genres: string[] = []
      $('a[href^="https://rinkocomics.com/comics_genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
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
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/comic/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.chapters-list li.chapter a, a[href*="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const titleText = link.find('.chapter-number').text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = link.find('.chapter-date').text().trim()
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString()

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
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      // Comic images are lazy-loaded via data-src
      $('img[data-src*="/wp-content/uploads/comics/"]').each((index, el) => {
        const src = $(el).attr('data-src')?.trim()
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
