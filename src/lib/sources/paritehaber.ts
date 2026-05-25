import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.paritehaber.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Paritehaber fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/manga\/(.+)/)
  return match?.[1]?.replace(/\/$/, '') || ''
}

export const paritehaberSource: MangaSource = {
  id: 'paritehaber',
  name: 'Paritehaber',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item').each((_, el) => {
        const item = $(el)
        const link = item.find('.tab-thumb a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = item.find('.post-title h3 a').text().trim() || link.attr('title')?.trim() || ''
        const cover =
          link.find('img').attr('src') ||
          link.find('img').attr('data-src') ||
          '/images/placeholder.png'

        const lastChapter = item.find('.font-meta.chapter a').text().trim() || null

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

      const title = $('.post-title h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || ''
      if (!title) return null

      const cover =
        $('.summary_image img').attr('src') ||
        $('.summary_image img').attr('data-src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || ''

      const authors: string[] = []
      $('.author-content a').each((_, el) => {
        const a = $(el).text().trim()
        if (a && a.toLowerCase() !== 'n/a') authors.push(a)
      })

      const artists: string[] = []
      $('.artist-content a').each((_, el) => {
        const a = $(el).text().trim()
        if (a && a.toLowerCase() !== 'n/a') artists.push(a)
      })

      const genres: string[] = []
      $('.genres-content a').each((_, el) => {
        const g = $(el).text().trim()
        if (g) genres.push(g)
      })

      let status: string | undefined
      let year: number | null = null
      const altTitles: string[] = []

      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        const content = $(el).find('.summary-content').first().text().trim()
        if (heading.includes('status')) {
          const s = content.toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(s)) status = s
        }
        if (heading.includes('release')) {
          const n = parseInt(content, 10)
          if (!isNaN(n)) year = n
        }
        if (heading.includes('alternative') && content) {
          content.split(/\/|,/).forEach((t) => {
            const trimmed = t.trim()
            if (trimmed) altTitles.push(trimmed)
          })
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
        originalLanguage: 'en',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/(\d+(?:\.\d+)?)/)
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
      const url = `${BASE_URL}/manga/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.reading-content img.wp-manga-chapter-img').each((index, el) => {
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
