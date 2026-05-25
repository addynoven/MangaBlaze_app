import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://swordscomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Swords Comic fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const swordscomicSource: MangaSource = {
  id: 'swordscomic',
  name: 'Swords Comic',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const $ = await fetchHTML(`${BASE_URL}/archive/pages/`)
      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('.archive-tile[data-title]').each((_, el) => {
        const title = $(el).attr('data-title')?.trim() || ''
        const href = $(el).attr('href') || ''
        // href is like /comic/I/  -> id should be I
        const id = href.replace(/^\/comic\/|\/$/g, '')
        if (!id || seen.has(id)) return
        seen.add(id)

        // Skip non-comic entries like cover page
        if (id.toLowerCase() === 'cover') return

        if (title.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
          const style = $(el).attr('style') || ''
          const bgMatch = style.match(/url\(([^)]+)\)/)
          const cover = bgMatch ? (bgMatch[1].startsWith('http') ? bgMatch[1] : `${BASE_URL}${bgMatch[1]}`) : '/images/placeholder.png'
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
      const $ = await fetchHTML(`${BASE_URL}/comic/${mangaId}/`)
      const title = $('title').first().text().trim().replace(/\s*\|\s*Swords.*$/i, '') || mangaId
      if (!title) return null

      const cover = $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'
      const description = $('meta[property="og:description"]').attr('content')?.trim() || ''

      return {
        id: mangaId,
        title,
        cover,
        status: 'ongoing',
        year: null,
        description,
        authors: [],
        artists: [],
        genres: ['Fantasy', 'Comedy'],
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
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/archive/pages/`)
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.archive-tile[data-title]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const id = href.replace(/^\/comic\/|\/$/g, '')
        if (!id || seen.has(id)) return
        seen.add(id)

        // Skip non-comic entries like cover page
        if (id.toLowerCase() === 'cover') return

        const title = $(el).attr('data-title')?.trim() || id

        chapters.push({
          id,
          chapterNumber: String(chapters.length + 1),
          title,
          volume: null,
          language: 'en',
          pages: 1,
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
      const $ = await fetchHTML(`${BASE_URL}/comic/${chapterId}/`)

      let src = ''
      $('img').each((_, el) => {
        const s = $(el).attr('src') || ''
        if (s.includes('/media/Swords/images/') || s.includes('/cdn-cgi/image/')) {
          src = s
          return false
        }
      })

      if (!src) return []
      if (!src.startsWith('http')) {
        src = src.startsWith('//') ? `https:${src}` : `${BASE_URL}${src}`
      }
      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
