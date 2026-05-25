import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://brainrotcomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`AryaScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?/)
  return match?.[1] || ''
}

export const aryascansSource: MangaSource = {
  id: 'aryascans',
  name: 'Arya Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const results: SourceManga[] = []
      const normalizedQuery = query.toLowerCase()

      for (let page = 1; page <= 5; page++) {
        const url = `${BASE_URL}/manga/page/${page}/`
        const $ = await fetchHTML(url)

        $('.page-item-detail').each((_, el) => {
          const item = $(el)
          const link = item.find('.item-summary .post-title a, .item-thumb a').first()
          const href = link.attr('href') || ''
          const slug = extractSlugFromHref(href)
          if (!slug || results.some((r) => r.id === slug)) return

          const title = link.attr('title')?.trim() || link.text().trim()
          const cover =
            item.find('.item-thumb img').attr('data-src') ||
            item.find('.item-thumb img').attr('src') ||
            '/images/placeholder.png'

          if (title && title.toLowerCase().includes(normalizedQuery)) {
            results.push({ id: slug, title, cover })
          }
        })

        if (results.length >= limit) break
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

      const title = $('.profile-manga .post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description = $('.description-summary p').first().text().trim()

      const genres: string[] = []
      $('.genres-content a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-status .summary-content').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/manga\/[^/]+\/([^/]+)\/?$/)
        const id = slugMatch?.[1] || href
        if (!id || chapters.some((c) => c.id === id)) return

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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const mangaId = chapterId.split('/')[0]
      const url = `${BASE_URL}/manga/${mangaId}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.wp-manga-chapter-img').each((index, el) => {
        const src = $(el).attr('data-src')?.trim() || $(el).attr('src')?.trim()
        if (src && !src.includes('data:image')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
