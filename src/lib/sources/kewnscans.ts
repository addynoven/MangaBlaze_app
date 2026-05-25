import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://kewnscans.org'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`KewnScans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function stripSiteSuffix(description: string): string {
  // Descriptions often end with site branding
  const idx = description.indexOf(' - Kewn Scans')
  return idx > 0 ? description.slice(0, idx).trim() : description.trim()
}

export const kewnscansSource: MangaSource = {
  id: 'kewnscans',
  name: 'Kewn Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(BASE_URL)
      const q = query.toLowerCase()
      const results: SourceManga[] = []

      $('a[href^="/series/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/series\/([^/]+)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.attr('alt')?.trim() || ''
        const cover = link.find('img').attr('src') || '/images/placeholder.png'

        if (title && title.toLowerCase().includes(q)) {
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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.text-2xl.font-semibold').first().text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[property="twitter:image"]').attr('content') ||
        '/images/placeholder.png'

      const rawDesc = $('meta[name="description"]').attr('content')?.trim() || ''
      const description = stripSiteSuffix(rawDesc)

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [],
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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#chapters a[href^="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/chapter\/([^/]+)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.attr('alt')?.trim() || link.attr('title')?.trim() || ''
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
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
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('div[style*="background-image"]').each((index, el) => {
        const style = $(el).attr('style') || ''
        const match = style.match(/url\(([^)]+)\)/)
        if (match) {
          const raw = match[1].replace(/&#039;/g, '').replace(/'/g, '').replace(/"/g, '')
          // Remove width param to get full image
          const fullUrl = raw.replace(/&w=\d+/, '')
          if (fullUrl && fullUrl.includes('cdn.meowing.org')) {
            pages.push({ url: fullUrl.trim(), index })
          }
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
