import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentairead.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiRead fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/hentai\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const hentaireadSource: MangaSource = {
  id: 'hentairead',
  name: 'HentaiRead',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a.manga-item__link').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover = '' // fetched in getManga

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
      const url = `${BASE_URL}/hentai/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim() || $('title').text().split('by')[0].trim()
      if (!title) return null

      const cover =
        $('img[fetchpriority="high"]').attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description = $('meta[property="og:description"]').attr('content') || ''

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
    // HentaiRead has no chapters; each gallery is a single item
    try {
      return [
        {
          id: mangaId,
          chapterNumber: '1',
          title: null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/hentai/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[alt^="Page "]').each((_, el) => {
        const src = $(el).attr('src')
        const alt = $(el).attr('alt') || ''
        const indexMatch = alt.match(/Page\s+(\d+)/)
        const index = indexMatch ? parseInt(indexMatch[1], 10) - 1 : pages.length
        if (src) {
          pages.push({ url: src.trim(), index })
        }
      })

      // Sort by index to ensure correct order
      pages.sort((a, b) => a.index - b.index)
      // Re-index after sort
      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
