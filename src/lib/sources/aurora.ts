import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://comicaurora.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Aurora fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const auroraSource: MangaSource = {
  id: 'aurora',
  name: 'Aurora',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if ('aurora'.includes(q)) {
        return [
          {
            id: 'aurora',
            title: 'Aurora',
            cover: 'https://comicaurora.com/wp-content/uploads/2019/04/logo-progress.png',
          },
        ]
      }
      return []
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'aurora') return null
      const $ = await fetchHTML(BASE_URL)
      const cover =
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'
      return {
        id: mangaId,
        title: 'Aurora',
        cover,
        description: 'A fantasy webcomic. Updates M-W-F.',
        status: 'ongoing',
        year: null,
        authors: ['Red'],
        artists: ['Red'],
        genres: ['Fantasy'],
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
      if (mangaId !== 'aurora') return []
      const $ = await fetchHTML(`${BASE_URL}/feed/`)
      const chapters: SourceChapter[] = []

      $('item').each((_, el) => {
        const item = $(el)
        const title = item.find('title').first().text().trim()
        const link = item.find('link').first().text().trim()
        const id = link.replace(`${BASE_URL}/aurora/`, '').replace(/\/$/, '')
        if (!id || chapters.some((c) => c.id === id)) return

        chapters.push({
          id,
          chapterNumber: id,
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
      const $ = await fetchHTML(`${BASE_URL}/aurora/${chapterId}/`)
      const src = $('[class*="webcomicmedia"] img').attr('src')
      if (!src) return []
      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
