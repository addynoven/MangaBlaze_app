import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.sandraandwoo.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`SandraAndWoo fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromArchiveUrl(url: string): string {
  const match = url.match(/sandraandwoo\.com\/(.+)\/$/)
  return match?.[1] || ''
}

function extractStripNumber(title: string): string {
  const match = title.match(/^\[(\d+)\]/)
  return match?.[1] || ''
}

function isComicStrip(title: string): boolean {
  // Include numbered strips [0001], [1340], etc.
  // Include the welcome post
  // Exclude artwork and promo posts
  const t = title.trim()
  if (t === 'Welcome to Sandra and Woo') return true
  if (/^\[\d+\]/.test(t)) return true
  return false
}

export const sandraandwooSource: MangaSource = {
  id: 'sandraandwoo',
  name: 'Sandra and Woo',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!q || 'sandra and woo'.includes(q) || q.includes('sandra') || q.includes('woo')) {
        return [
          {
            id: 'sandraandwoo',
            title: 'Sandra and Woo',
            cover: 'https://www.sandraandwoo.com/images/design/sandra-and-woo-logo-small-2.png',
          },
        ]
      }
      return []
    } catch {
      return []
    }
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      return {
        id: 'sandraandwoo',
        title: 'Sandra and Woo',
        cover: 'https://www.sandraandwoo.com/images/design/sandra-and-woo-logo-small-2.png',
        status: 'hiatus',
        year: null,
        description:
          'Sandra and Woo is a comedy webcomic about love, food and other important stuff; featuring the girl Sandra and her pet raccoon Woo.',
        authors: ['Oliver Knörzer'],
        artists: ['Powree'],
        genres: ['Comedy', 'Slice of Life'],
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
    _mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/archive/`)
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.archive-title a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slug = extractSlugFromArchiveUrl(href)
        if (!slug || seen.has(slug)) return
        seen.add(slug)

        const titleText = link.text().trim()
        if (!isComicStrip(titleText)) return

        const stripNum = extractStripNumber(titleText)
        const chapterNumber = stripNum || String(seen.size)

        chapters.push({
          id: slug,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: href,
          isUnavailable: false,
        })
      })

      // Reverse so newest first
      chapters.reverse()

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}/`)
      const src = $('#comic img').first().attr('src')?.trim()
      if (src && src.includes('/comics/')) {
        const url = src.startsWith('http') ? src : `${BASE_URL}${src}`
        return [{ url, index: 0 }]
      }
      return []
    } catch {
      return []
    }
  },
}
