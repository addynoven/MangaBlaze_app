import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://madaradex.org'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MadaraDex fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/title\/([^/]+)/)
  return match?.[1] || ''
}

export const madaradexSource: MangaSource = {
  id: 'madaradex',
  name: 'MadaraDex',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item .c-tabs-item__content').each((_, el) => {
        const item = $(el)
        const link = item.find('.tab-thumb a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromUrl(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = item.find('.post-title h3 a').text().trim() || link.attr('title') || ''
        const cover =
          item.find('.tab-thumb a img').attr('data-src') ||
          item.find('.tab-thumb a img').attr('src') ||
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
      const url = `${BASE_URL}/title/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      const description = $('.summary__content p').first().text().trim()

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

      const authors: string[] = []
      $('.author-content a').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('.artist-content a').each((_, el) => {
        artists.push($(el).text().trim())
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
      const url = `${BASE_URL}/title/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slug = extractSlugFromUrl(href)
        const chapterMatch = href.match(/chapter-(\d+)/)
        const chapterSlug = chapterMatch?.[1] || ''
        if (!chapterSlug || !slug) return

        const id = `${slug}/chapter-${chapterSlug}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+)/i)
        const chapterNumber = numMatch?.[1] || chapterSlug

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterSlug}`,
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
      const url = `${BASE_URL}/title/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.wp-manga-chapter-img').each((index, el) => {
        const dataSrc = $(el).attr('data-src')?.trim()
        const src = $(el).attr('src')?.trim()
        const imageUrl = dataSrc || src
        if (imageUrl && !imageUrl.includes('data:image')) {
          pages.push({ url: imageUrl, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
