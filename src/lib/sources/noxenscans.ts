import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://noxenscan.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`NoxenScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const noxenscansSource: MangaSource = {
  id: 'noxenscans',
  name: 'Noxen Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.listupd .bsx').each((_, el) => {
        const item = $(el)
        const link = item.find('a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.text().trim()
        const cover =
          item.find('img.ts-post-image').attr('src') ||
          item.find('img').attr('src') ||
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
        $('img.wp-post-image').first().attr('src') ||
        $('img.attachment-medium').first().attr('src') ||
        '/images/placeholder.png'

      const description = $('.entry-content.entry-content-single p').first().text().trim()

      const genres: string[] = []
      $('.mgen a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.imptdt').each((_, el) => {
        const label = $(el).find('i').text().trim().toLowerCase()
        if (label.includes('status')) {
          const text = $(el).contents().not('i').text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
            status = text
          }
        }
      })

      const authors: string[] = []
      const artists: string[] = []
      $('.fmed').each((_, el) => {
        const label = $(el).find('span').first().text().trim().toLowerCase()
        const value = $(el).find('span').last().text().trim()
        if (label.includes('author')) authors.push(value)
        if (label.includes('artist')) artists.push(value)
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
      $('.eplister #chapterlist a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href) || href.replace(BASE_URL, '').replace(/^\//, '')
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numText = link.find('.chapternum').text().trim()
        const numMatch = numText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

        const dateText = link.find('.chapterdate').text().trim()
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString()

        chapters.push({
          id,
          chapterNumber,
          title: numText,
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
      const url = `${BASE_URL}/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('#readerarea p img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('data:image')) {
          pages.push({ url: src, index })
        }
      })

      // Fallback: try extracting from ts_reader.run script
      if (pages.length === 0) {
        const script = $('script')
          .filter((_, el) => $(el).html()?.includes('ts_reader.run') || false)
          .first()
          .html()

        if (script) {
          const imagesMatch = script.match(/"images":\s*(\[[^\]]+\])/)
          if (imagesMatch) {
            try {
              const images: string[] = JSON.parse(imagesMatch[1])
              images.forEach((url, index) => {
                if (url && !url.includes('data:image')) {
                  pages.push({ url, index })
                }
              })
            } catch {
              // ignore JSON parse errors
            }
          }
        }
      }

      return pages
    } catch {
      return []
    }
  },
}
