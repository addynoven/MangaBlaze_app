import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manhwaclub.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ManhwaClub fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/manga\/(.+?)\/?$/)
  return match?.[1] || ''
}

function parseChapterNumber(text: string): string {
  const match = text.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
  return match?.[1] || '?'
}

function parseDate(text: string): string {
  const d = new Date(text)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export const manhwaclubAgent2Source: MangaSource = {
  id: 'manhwaclub_agent2',
  name: 'ManhwaClub',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item').each((_, el) => {
        const item = $(el)
        const link = item.find('.tab-thumb a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title =
          item.find('.post-title h3 a').text().trim() ||
          item.find('.post-title h4 a').text().trim() ||
          item.find('.post-title a').text().trim() ||
          link.attr('title') ||
          ''

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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title =
        $('h1')
          .first()
          .clone()
          .children('.manga-title-badges')
          .remove()
          .end()
          .text()
          .trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description =
        $('.summary__content').first().text().trim() ||
        $('.description-summary').first().text().trim() ||
        ''

      const authors: string[] = []
      $('.post-content_item.mg_author .summary-content a').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('.post-content_item.mg_artist .summary-content a').each((_, el) => {
        artists.push($(el).text().trim())
      })

      const genres: string[] = []
      $('.post-content_item.mg_genres .summary-content a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const altTitles: string[] = []
      $('.post-content_item.mg_alternative .summary-content').each((_, el) => {
        const text = $(el).text().trim()
        if (text) altTitles.push(text)
      })

      let status: string | undefined
      const statusText = $('.post-content_item.mg_status .summary-content').first().text().trim().toLowerCase()
      if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(statusText)) {
        status = statusText
      }

      const yearText = $('.post-content_item.mg_release .summary-content').first().text().trim()
      const year = yearText ? parseInt(yearText, 10) || null : null

      const isAdult = $('h1 .manga-title-badges.adult').length > 0

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        contentRating: isAdult ? 'adult' : undefined,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
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
      $('.wp-manga-chapter').each((_, el) => {
        const item = $(el)
        const link = item.find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const chapterNumber = parseChapterNumber(titleText)

        const dateText = item.find('.chapter-release-date i').text().trim()
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
      const url = `${BASE_URL}/manga/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.page-break.no-gaps img, .wp-manga-chapter-img').each((index, el) => {
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
