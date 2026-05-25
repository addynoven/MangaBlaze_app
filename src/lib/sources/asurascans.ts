import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://asurascans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`AsuraScans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comics\/([^/]+)/)
  return match?.[1] || ''
}

export const asurascansSource: MangaSource = {
  id: 'asurascans',
  name: 'Asura Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const results: SourceManga[] = []
      const seen = new Set<string>()

      // Browse pages don't have server-side search; scrape first 3 pages and filter locally
      for (let page = 1; page <= 3; page++) {
        const url = `${BASE_URL}/browse?page=${page}`
        const $ = await fetchHTML(url)

        $('a[href^="/comics/"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id || seen.has(id)) return

          const text = link.text().trim()
          // Skip rating-only links (they have no text or just a number)
          if (!text || /^[\d.]+$/.test(text)) return

          const title = text
          if (!title.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) return

          seen.add(id)
          results.push({ id, title, cover: '/images/placeholder.png' })
        })

        if (results.length >= limit) break
      }

      // Fill covers from manga pages (best effort)
      await Promise.all(
        results.slice(0, limit).map(async (r) => {
          try {
            const $ = await fetchHTML(`${BASE_URL}/comics/${r.id}`)
            const cover = $('meta[property="og:image"]').attr('content')
            if (cover) r.cover = cover
          } catch {
            // ignore
          }
        })
      )

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/comics/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description = $('meta[name="description"]').attr('content')?.trim() || ''

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
      const url = `${BASE_URL}/comics/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('a[href*="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(new RegExp(`^/comics/${mangaId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/chapter/`), '').replace(/^\//, '')
        if (!id || seen.has(id)) return

        seen.add(id)

        const titleText = link.text().trim()
        const numMatch = id.match(/(\d+(?:\.\d+)?)$/)
        const chapterNumber = numMatch?.[1] || id

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
      const parts = chapterId.split('/')
      const finalMangaId = mangaId || parts[0]
      const chapterNum = parts[1] || chapterId
      const url = `${BASE_URL}/comics/${finalMangaId}/chapter/${chapterNum}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img').each((index, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('cdn.asurascans.com') && src.includes('/chapters/')) {
          pages.push({ url: src.trim(), index })
        }
      })

      // Sort by URL to maintain order and re-index
      pages.sort((a, b) => {
        const aNum = parseInt(a.url.match(/(\d+)\.webp$/)?.[1] || '0')
        const bNum = parseInt(b.url.match(/(\d+)\.webp$/)?.[1] || '0')
        return aNum - bNum
      })

      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
