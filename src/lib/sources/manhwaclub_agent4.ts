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
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  return href.replace(BASE_URL, '').replace(/^\/|\/$/g, '')
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString()
  const lower = dateStr.toLowerCase()
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/)
  if (daysAgoMatch) {
    const d = new Date()
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1], 10))
    return d.toISOString()
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export const manhwaclubAgent4Source: MangaSource = {
  id: 'manhwaclub_agent4',
  name: 'ManhwaClub',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.row.c-tabs-item__content').each((_, el) => {
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

        const lastChapter = item.find('.latest-chap .chapter a').text().trim() || null

        if (title) {
          results.push({ id, title, cover, lastChapter })
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

      const titleEl = $('.post-title h1').first()
      const title = titleEl.clone().find('span').remove().end().text().trim() || titleEl.text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description = $('.summary__content.show-more').text().trim()

      const genres: string[] = []
      const authors: string[] = []
      const artists: string[] = []
      const altTitles: string[] = []
      let status: string | undefined
      let year: number | null = null
      let contentRating: string | undefined

      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()

        if (heading.includes('genre')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { genres.push($(a).text().trim()) })
        } else if (heading.includes('status')) {
          const text = $(el).find('.summary-content').text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
            status = text
          }
        } else if (heading.includes('author')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { authors.push($(a).text().trim()) })
        } else if (heading.includes('artist')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => { artists.push($(a).text().trim()) })
        } else if (heading.includes('alternative')) {
          const text = $(el).find('.summary-content').text().trim()
          text.split(/[;|,]/).forEach((t) => {
            const trimmed = t.trim()
            if (trimmed) altTitles.push(trimmed)
          })
        } else if (heading.includes('release')) {
          const text = $(el).find('.summary-content').text().trim()
          const parsed = parseInt(text, 10)
          if (!isNaN(parsed)) year = parsed
        }
      })

      const hasAdultBadge = $('.manga-title-badges.custom.adult').length > 0
      const hasAdultGenre = genres.some(
        (g) => g.toLowerCase() === 'adult' || g.toLowerCase() === 'mature'
      )
      if (hasAdultBadge || hasAdultGenre) {
        contentRating = 'erotica'
      }

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        contentRating,
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
      const mangaUrl = `${BASE_URL}/manga/${mangaId}/`
      const $manga = await fetchHTML(mangaUrl)

      const postId = $manga('#manga-chapters-holder').attr('data-id')
      if (!postId) return []

      const res = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=manga_get_chapters&manga=${postId}`,
        next: { revalidate: 300 },
      })
      const html = await res.text()
      const $ = cheerio.load(html)

      const chapters: SourceChapter[] = []
      $('.wp-manga-chapter').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText =
          $(el).find('.chapter-release-date i').text().trim() ||
          $(el).find('.chapter-release-date .c-new-tag a').attr('title') ||
          ''
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.page-break img').each((index, el) => {
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
