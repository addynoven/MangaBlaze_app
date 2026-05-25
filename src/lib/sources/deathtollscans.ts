import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://reader.deathtollscans.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`DeathTollScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/series\/([^/]+)\/?/)
  return match?.[1] || ''
}

export const deathtollscansSource: MangaSource = {
  id: 'deathtollscans',
  name: 'Death Toll Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const res = await fetch(`${BASE_URL}/search/`, {
        method: 'POST',
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `search=${encodeURIComponent(query)}`,
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`Search error: ${res.status}`)
      const $ = cheerio.load(await res.text())

      const results: SourceManga[] = []
      $('.group .title a[href*="/series/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.text().trim()
        if (title) {
          results.push({ id, title, cover: '/images/placeholder.png' })
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

      const title = $('h1.title').first().text().trim()
      if (!title) return null

      const cover = $('.thumbnail img').first().attr('src') || '/images/placeholder.png'

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
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
      $('.element .title a[href*="/read/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(/\/read\/[^/]+\/[^/]+\/[^/]+\/([^/]+)\/?$/)
        const id = match ? `${mangaId}/${href.match(/\/read\/[^/]+\/([^/]+)\/([^/]+)\/([^/]+)\/?$/)?.slice(1).join('/')}` : href
        if (!id || chapters.some((c) => c.id === id)) return

        const titleText = link.attr('title')?.trim() || link.text().trim()
        const chapterMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || href.match(/\/([^/]+)\/?$/)
        const chapterNumber = chapterMatch?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}${href}`,
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
      const url = `${BASE_URL}/read/${chapterId}/`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`Chapter fetch error: ${res.status}`)
      const html = await res.text()

      const pagesMatch = html.match(/var\s+pages\s*=\s*(\[[\s\S]+?\]);/)
      if (!pagesMatch) return []

      const pages: Array<{ url: string }> = JSON.parse(pagesMatch[1])
      return pages.map((p, index) => ({ url: p.url, index }))
    } catch {
      return []
    }
  },
}
