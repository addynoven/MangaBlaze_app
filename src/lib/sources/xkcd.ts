import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://xkcd.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`xkcd fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const xkcdSource: MangaSource = {
  id: 'xkcd',
  name: 'xkcd',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/archive`)
      const results: SourceManga[] = []

      $('#middleContainer a[href^="/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(/\//g, '')
        if (!id || isNaN(Number(id))) return

        const title = link.text().trim()
        if (!title) return
        if (results.some((r) => r.id === id)) return

        if (
          title.toLowerCase().includes(query.toLowerCase()) ||
          id.includes(query)
        ) {
          results.push({
            id,
            title,
            cover: '/images/placeholder.png',
          })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'xkcd') return null
      const $ = await fetchHTML(BASE_URL)
      const cover = $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'
      const description = $('meta[property="og:description"]').attr('content')?.trim() || ''
      return {
        id: mangaId,
        title: 'xkcd',
        cover,
        description,
        status: 'ongoing',
        year: null,
        authors: ['Randall Munroe'],
        artists: ['Randall Munroe'],
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
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      if (mangaId !== 'xkcd') return []
      const $ = await fetchHTML(`${BASE_URL}/archive`)

      const chapters: SourceChapter[] = []
      $('#middleContainer a[href^="/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(/\//g, '')
        if (!id || isNaN(Number(id))) return

        const title = link.text().trim()
        if (!title) return
        if (chapters.some((c) => c.id === id)) return

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

      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}/`)
      const img = $('#comic img').first()
      const src = img.attr('src')
      if (!src) return []
      return [{ url: src.startsWith('//') ? `https:${src}` : src, index: 0 }]
    } catch {
      return []
    }
  },
}
