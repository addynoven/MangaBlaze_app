import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.isekaiscan.top'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`IsekaiScan fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const isekaiscanSource: MangaSource = {
  id: 'isekaiscan',
  name: 'IsekaiScan',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item').each((_, el) => {
        const item = $(el)
        const link = item.find('.post-title h3 a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover =
          item.find('.tab-thumb img').attr('data-src') ||
          item.find('.tab-thumb img').attr('src') ||
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

      const description = $('.description-summary .summary__content p').first().text().trim()

      const genres: string[] = []
      $('.genres-content a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-content_item').each((_, el) => {
        const label = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        if (label.includes('status')) {
          const value = $(el).find('.summary-content').text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(value)) {
            status = value
          }
        }
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
      $(`a[href*="${mangaId}-chapter-"]`).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/([^/]+-chapter-[^/]+)\/?$/)
        const id = slugMatch?.[1] || href
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
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
      const url = `${BASE_URL}/${chapterId}`
      const $ = await fetchHTML(url)

      const arrayData = $('#arraydata').text().trim()
      if (!arrayData) return []

      const pages: SourcePage[] = []
      arrayData.split(',').forEach((url, index) => {
        const trimmed = url.trim()
        if (trimmed) {
          pages.push({ url: trimmed, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
