import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://arenascan.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Arena Scans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const arenascanSource: MangaSource = {
  id: 'arenascan',
  name: 'Arena Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []

      // Search results use .serieslist structure
      $('.serieslist ul li, .bsx').each((_, el) => {
        const item = $(el)
        const link = item.find('a.series').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim() || link.attr('title')?.trim() || id
        const cover =
          item.find('img.ts-post-image').attr('src') ||
          item.find('img.wp-post-image').attr('src') ||
          '/images/placeholder.png'

        if (title) {
          results.push({ id, title, cover })
        }
      })

      // Fallback: any a.series on the page
      if (results.length === 0) {
        $('a.series[href*="/manga/"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id) return
          if (results.some((r) => r.id === id)) return

          const title = link.text().trim() || link.attr('title')?.trim() || id
          const cover =
            link.find('img').attr('src') ||
            link.closest('li, .bsx').find('img').attr('src') ||
            '/images/placeholder.png'

          if (title) {
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim() || $('title').text().trim()
      if (!title) return null

      const cover =
        $('img.wp-post-image').first().attr('src') ||
        $('img.attachment-').first().attr('src') ||
        '/images/placeholder.png'

      const description = $('.entry-content-single p').first().text().trim() ||
        $('meta[name="description"]').attr('content')?.trim() || ''

      const genres: string[] = []
      $('a[rel="tag"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !genres.includes(text)) {
          genres.push(text)
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'ko',
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
      $('.eplister ul li a, #chapterlist ul li a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/([^/]+)-chapter-(\d+(?:\.\d+)?)\/?$/)
        if (!slugMatch) return

        const id = `${slugMatch[1]}-chapter-${slugMatch[2]}`
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = numText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = link.find('.chapterdate').text().trim()

        chapters.push({
          id,
          chapterNumber,
          title: numText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
          readableAt: dateText ? new Date(dateText).toISOString() : new Date().toISOString(),
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

      const pages: SourcePage[] = []
      $('img[decoding="async"]').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && src.includes('cdn.arenascan.com')) {
          pages.push({ url: src, index })
        }
      })

      // Fallback: any img with src containing the chapter path pattern
      if (pages.length === 0) {
        $('img[src*="arena-bucket"]').each((index, el) => {
          const src = $(el).attr('src')?.trim()
          if (src) {
            pages.push({ url: src, index })
          }
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
