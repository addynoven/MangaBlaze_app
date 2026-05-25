import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://wuxiaworld.site'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string, method: 'GET' | 'POST' = 'GET'): Promise<cheerio.CheerioAPI> {
  const options: RequestInit = {
    method,
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  }

  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`WuxiaWorld fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function toAbsoluteUrl(url: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (trimmed.startsWith('/')) return `${BASE_URL}${trimmed}`
  return trimmed
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/(novel|manga)\/([^/]+)\/?$/)
  return match?.[2] || href.split('/').filter(Boolean).pop() || ''
}

export const wuxiaworldSource: MangaSource = {
  id: 'wuxiaworld',
  name: 'WuxiaWorld',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item, .c-tabs-item__content').each((_, el) => {
        const item = $(el)
        const link = item.find('.post-title h3 a, .post-title h5 a, .post-title a').first()
        const href = link.attr('href') || item.find('.tab-thumb a').first().attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim() || item.find('.tab-thumb a').first().attr('title')?.trim() || ''
        const img = item.find('.tab-thumb img').first()
        const cover = toAbsoluteUrl(
          img.attr('data-src') ||
          img.attr('data-lazy-src') ||
          img.attr('src') ||
          '/images/placeholder.png'
        )

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
      const url = `${BASE_URL}/novel/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim() || $('.post-title h3').first().text().trim()
      if (!title) return null

      const coverImg = $('.summary_image img, .profile-manga img').first()
      const cover = toAbsoluteUrl(
        coverImg.attr('data-src') ||
        coverImg.attr('data-lazy-src') ||
        coverImg.attr('src') ||
        '/images/placeholder.png'
      )

      const description =
        $('.description-summary p').text().trim() ||
        $('.description-summary').text().trim() ||
        $('.summary__content p').text().trim() ||
        $('.summary__content').text().trim() ||
        ''

      const genres: string[] = []
      $('.genres-content a, a[href*="/genre/"], a[href*="/manga-genre/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        if (heading.includes('status')) {
          const statusText = $(el).find('.summary-content').text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].some((s) => statusText.includes(s))) {
            status = ['ongoing', 'completed', 'hiatus', 'cancelled'].find((s) => statusText.includes(s))
          }
        }
      })

      const authors: string[] = []
      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        if (heading.includes('author')) {
          $(el).find('.summary-content a, .author-content a').each((_, a) => {
            authors.push($(a).text().trim())
          })
        }
      })

      const artists: string[] = []
      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        if (heading.includes('artist')) {
          $(el).find('.summary-content a, .artist-content a').each((_, a) => {
            artists.push($(a).text().trim())
          })
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
        artists: artists.length > 0 ? [...new Set(artists)] : [...new Set(authors)],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'zh',
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
      const url = `${BASE_URL}/novel/${mangaId}/ajax/chapters/`
      const $ = await fetchHTML(url, 'POST')

      const chapters: SourceChapter[] = []
      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const chapterSlug = extractSlugFromHref(href)
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = link.parent().find('.chapter-release-date i').text().trim()
        let publishedAt = new Date().toISOString()
        if (dateText) {
          const parsedDate = new Date(dateText)
          if (!isNaN(parsedDate.getTime())) {
            publishedAt = parsedDate.toISOString()
          }
        }

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: toAbsoluteUrl(href),
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
      // chapterId is in format "manga-slug/chapter-slug"
      const url = `${BASE_URL}/novel/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.reading-content img, .wp-manga-chapter-img, .page-break img').each((index, el) => {
        const src =
          $(el).attr('data-src')?.trim() ||
          $(el).attr('data-lazy-src')?.trim() ||
          $(el).attr('src')?.trim()
        if (src) {
          pages.push({ url: toAbsoluteUrl(src), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
