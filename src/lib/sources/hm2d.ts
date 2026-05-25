import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://doujindistrict.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HM2D fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractMangaSlugFromHref(href: string): string {
  const match = href.match(/\/read\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  return href.replace(BASE_URL, '').replace(/^\/|\/$/g, '')
}

export const hm2dSource: MangaSource = {
  id: 'hm2d',
  name: 'HM2D',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item__content').each((_, el) => {
        const item = $(el)
        const link = item.find('.post-title h3 a').first()
        const href = link.attr('href') || ''
        const id = extractMangaSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover =
          item.find('.tab-thumb img').attr('data-src') ||
          item.find('.tab-thumb img').attr('src') ||
          '/images/placeholder.png'

        const statusEl = item.find('.mg_status .summary-content').first()
        const status = statusEl.text().trim().toLowerCase()

        const lastChapterLink = item.find('.meta-item.latest-chap a').first()
        const lastChapter = lastChapterLink.text().trim() || null

        if (title) {
          results.push({
            id,
            title,
            cover,
            status: ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(status) ? status : undefined,
            year: null,
            contentRating: 'pornographic',
            lastChapter,
          })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/read/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.description-summary .summary__content').first().text().trim() ||
        $('.description-summary p').first().text().trim() ||
        ''

      const genres: string[] = []
      $('.mg_genres .summary-content a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-status .summary-content, .mg_status .summary-content').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      $('.mg_author .summary-content a').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('.mg_artists .summary-content a').each((_, el) => {
        artists.push($(el).text().trim())
      })

      const altTitles: string[] = []
      const altText = $('.mg_alternative .summary-content').first().text().trim()
      if (altText) {
        altText.split(/,\s*|\//).forEach((t) => {
          const trimmed = t.trim()
          if (trimmed && trimmed !== title && !altTitles.includes(trimmed)) {
            altTitles.push(trimmed)
          }
        })
      }

      const lastChapterLink = $('.listing-chapters_wrap li.wp-manga-chapter a').first()
      const lastChapter = lastChapterLink.text().trim() || null

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        contentRating: 'pornographic',
        genres: [...new Set(genres)],
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        altTitles,
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter,
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
      const url = `${BASE_URL}/read/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.wp-manga-chapter-img').each((index, el) => {
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
