import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manhuascan.us'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Manhuascan.us fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const manhuascanusSource: MangaSource = {
  id: 'manhuascanus',
  name: 'ManhuaScan.us',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/manga-list?search=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.listupd > a[href*="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || ''
        const cover =
          link.find('img').attr('data-src') ||
          link.find('img').attr('src') ||
          '/images/placeholder.png'

        const lastChapter = link.find('.epxs').text().trim() || null

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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('.thumb img').attr('src') ||
        $('.thumb img').attr('data-src') ||
        '/images/placeholder.png'

      const description = $('.entry-content.entry-content-single').first().text().trim() || ''

      const altTitles: string[] = []
      const altText = $('.alternative').text().trim()
      if (altText) {
        altText.replace(/^Other Name:\s*/i, '').split(/,/).forEach((t) => {
          const trimmed = t.trim()
          if (trimmed) altTitles.push(trimmed)
        })
      }

      const genres: string[] = []
      $('.mgen a').each((_, el) => {
        const g = $(el).text().trim()
        if (g) genres.push(g)
      })

      let status: string | undefined
      $('.spe span').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (text.includes('status')) {
          const next = $(el).parent().text().trim().toLowerCase()
          const match = next.match(/status[:\s]*(\w+)/)
          if (match) {
            const s = match[1]
            if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(s)) status = s
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
        altTitles: [...new Set(altTitles)],
        originalLanguage: 'zh',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.eplister#chapterlist .eph-num a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/manga\/([^/]+\/[^/]+)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)$/i)
        const chapterNumber = numMatch?.[1] || '?'

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
      const url = `${BASE_URL}/manga/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.readercontent img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('manhuascan.png')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
