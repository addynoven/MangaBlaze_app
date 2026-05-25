import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://vortexscans.org'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Vortex Scans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/series\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const vortexscansSource: MangaSource = {
  id: 'vortexscans',
  name: 'Vortex Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // Browse homepage for series and filter client-side
      const $ = await fetchHTML(BASE_URL)
      const q = query.toLowerCase()

      const results: SourceManga[] = []
      $('a[href^="/series/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (href.includes('/chapter-')) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.text().trim()
        if (!title) return

        const cover =
          link.find('img').attr('src') ||
          link.closest('a').siblings().find('img').attr('src') ||
          '/images/placeholder.png'

        if (title.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
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
      const url = `${BASE_URL}/series/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1[itemProp="name"]').first().text().trim()
      if (!title) return null

      const cover =
        $('img[itemProp="image"]').first().attr('src') ||
        $('img[alt*="Cover"]').first().attr('src') ||
        '/images/placeholder.png'

      // Description from meta or first paragraph
      let description = $('meta[name="description"]').attr('content')?.trim() || ''
      if (!description) {
        description = $('p').first().text().trim()
      }

      let status: string | undefined
      const statusText = $('p').filter((_, el) => $(el).text().toLowerCase().includes('ongoing') || $(el).text().toLowerCase().includes('completed')).first().text().toLowerCase()
      if (statusText.includes('ongoing')) status = 'ongoing'
      if (statusText.includes('completed')) status = 'completed'

      // Try to find type/genre tags
      const genres: string[] = []
      $('span[class*="rounded"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text && ['manhwa', 'manga', 'manhua', 'comic', 'webtoon'].includes(text.toLowerCase())) {
          genres.push(text)
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
      const url = `${BASE_URL}/series/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $(`a[href^="/series/${mangaId}/chapter-"]`).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/series\/[^/]+\/(chapter-[^/]+)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numMatch = id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

        const title = link.text().trim() || `Chapter ${chapterNumber}`

        chapters.push({
          id,
          chapterNumber,
          title,
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
      // chapterId includes the series slug, e.g. "reincarnator's-stream/chapter-1"
      const url = `${BASE_URL}/series/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[data-reader-page-image]').each((index, el) => {
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
