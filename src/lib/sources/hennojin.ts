import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hennojin.com/home'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hennojin fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const hennojinSource: MangaSource = {
  id: 'hennojin',
  name: 'Hennojin',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/`)
      const q = query.toLowerCase()
      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href*="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = link.text().trim()
        if (!title) return
        if (!title.toLowerCase().includes(q)) return

        // Try to find a cover image sibling
        const img = link.find('img').first()
        const cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'

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

      const title = $('h1.entry-title').first().text().trim() || $('title').first().text().trim()
      if (!title) return null

      const cover =
        $('.manga-thumbnail img').attr('src') ||
        $('img.wp-post-image').attr('src') ||
        '/images/placeholder.png'

      const description = ''

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
      // Each manga is a single chapter
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)
      const title = $('h1.entry-title').first().text().trim() || mangaId

      return [
        {
          id: mangaId,
          chapterNumber: '1',
          title,
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
      const url = `${BASE_URL}/manga/${chapterId}/?preview=true`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.preview').each((index, el) => {
        const src = $(el).attr('src')
        if (src) {
          const absolute = src.startsWith('http') ? src : `${BASE_URL.replace(/\/home$/, '')}${src}`
          pages.push({ url: absolute, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
