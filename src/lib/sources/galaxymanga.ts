import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://galaxymanga.io'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`GalaxyManga fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?/)
  return match?.[1] || ''
}

function extractChapterNumber(text: string): string {
  const match = text.match(/Chapter\s+([\d.]+)/i)
  return match?.[1] || '?'
}

export const galaxymangaSource: MangaSource = {
  id: 'galaxymanga',
  name: 'Galaxy Manga',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href^="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        if (href.includes('/genres/') || href.includes('/list-mode')) return

        const title = link.text().trim().replace(/\s+/g, ' ')
        if (!title || title.length < 2) return

        const img = link.find('img').first()
        const cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'

        seen.add(id)
        results.push({ id, title, cover })
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

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.manga-thumb img, .thumbnail img, .poster img, img[class*="thumb"], img[class*="cover"], img[class*="poster"]').first().attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.description, .summary, .synopsis, [class*="desc"], [class*="summary"]').first().text().trim() ||
        $('meta[name="description"]').attr('content') ||
        ''

      const genres: string[] = []
      $('a[href^="/genres/"]').each((_, el) => {
        const g = $(el).text().trim()
        if (g) genres.push(g)
      })

      const statusText = $('meta[name="description"]').attr('content')?.toLowerCase() || ''
      const status = statusText.includes('completed') ? 'completed' : statusText.includes('ongoing') ? 'ongoing' : undefined

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

  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('a[href*="chapter"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(/^https?:\/\/[^/]+/, '')
        if (!id || seen.has(id)) return
        if (id.includes('/genres/') || id.includes('/manga/')) return

        const text = link.text().trim().replace(/\s+/g, ' ')
        if (!text || text.includes('{{') || text.length < 2) return

        const chapterNumber = extractChapterNumber(text)
        const dateMatch = text.match(/([A-Za-z]+ \d{1,2},? \d{4})/)
        const publishedAt = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()

        seen.add(id)
        chapters.push({
          id,
          chapterNumber,
          title: text.split(/\s{2,}/)[0] || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
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
      const url = `${BASE_URL}${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img').each((index, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src')
        if (src && src.includes('image-manga')) {
          pages.push({ url: src.trim(), index: pages.length })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
