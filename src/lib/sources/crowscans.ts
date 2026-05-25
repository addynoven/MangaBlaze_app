import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://crowscans.xyz'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`CrowScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const crowscansSource: MangaSource = {
  id: 'crowscans',
  name: 'Crow Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const results: SourceManga[] = []
      const normalizedQuery = query.toLowerCase()

      for (let page = 1; page <= 5; page++) {
        const url = `${BASE_URL}/manga/page/${page}/`
        const $ = await fetchHTML(url)

        $('.bsx').each((_, el) => {
          const item = $(el)
          const link = item.find('a').first()
          const href = link.attr('href') || ''
          const slug = extractSlugFromHref(href)
          if (!slug || results.some((r) => r.id === slug)) return

          const title = link.attr('title')?.trim() || ''
          const cover =
            item.find('img').attr('src') ||
            item.find('img').attr('data-src') ||
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

      const title = $('h1.entry-title').first().text().trim() || $('meta[property="og:title"]').attr('content')?.split(' - ')[0] || ''
      if (!title) return null

      const cover = $('.thumb img').attr('src') || $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'
      const description = $('meta[property="og:description"]').attr('content') || ''

      const genres: string[] = []
      $('.mgen a[rel="tag"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
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
      $('.eph-num a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href
        if (!id || chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || href.match(/chapter-(\d+(?:\.\d+)?)/i)
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
          externalUrl: href,
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
      const res = await fetch(chapterId, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`Chapter fetch error: ${res.status}`)
      const html = await res.text()

      const readerMatch = html.match(/ts_reader\.run\((\{[\s\S]*?\})\)/)
      if (!readerMatch) return []

      const readerData = JSON.parse(readerMatch[1])
      const images: string[] = readerData?.sources?.[0]?.images || []

      return images.map((url: string, index: number) => ({ url, index }))
    } catch {
      return []
    }
  },
}
