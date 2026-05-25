import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://lagoonscans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`LagoonScans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const lagoonscansSource: MangaSource = {
  id: 'lagoonscans',
  name: 'Lagoon Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.bsx').each((_, el) => {
        const item = $(el)
        const link = item.find('a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.text().trim()
        const cover =
          item.find('img.ts-post-image').attr('src') ||
          item.find('img.wp-post-image').attr('src') ||
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

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('.thumb img').attr('src') ||
        $('img.wp-post-image').first().attr('src') ||
        '/images/placeholder.png'

      const description = $('.entry-content.entry-content-single p').first().text().trim()

      const genres: string[] = []
      $('.mgen a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.main-info .info-desc .spe span').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      $('.main-info .info-desc .spe span').each((_, el) => {
        const label = $(el).text().trim().toLowerCase()
        if (label.includes('author')) {
          const next = $(el).next().text().trim()
          if (next) authors.push(next)
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
        artists: [],
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
      $('.eplister ul li a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/(?:manga\/[^/]+\/|)([^/]+-chapter-\d+(?:\.\d+)?)\/?$/)
        const id = idMatch?.[1] || href
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numEl = link.find('.chapternum').first()
        const titleText = numEl.text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      // Extract ts_reader.run({...}) JSON from script tags
      let images: string[] = []
      $('script').each((_, el) => {
        const text = $(el).html() || ''
        if (text.includes('ts_reader.run')) {
          const match = text.match(/ts_reader\.run\((\{[\s\S]*?\})\)/)
          if (match) {
            try {
              const data = JSON.parse(match[1])
              const source = data.sources?.[0]
              if (source?.images && Array.isArray(source.images)) {
                images = source.images
              }
            } catch {
              // ignore JSON parse error
            }
          }
        }
      })

      return images.map((url, index) => ({ url: url.trim(), index }))
    } catch {
      return []
    }
  },
}
