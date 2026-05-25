import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://patchfriday.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`PatchFriday fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const patchfridaySource: MangaSource = {
  id: 'patchfriday',
  name: 'Patch Friday',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    try {
      return [{ id: 'patchfriday', title: 'Patch Friday', cover: '/images/placeholder.png' }]
    } catch {
      return []
    }
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      return {
        id: 'patchfriday',
        title: 'Patch Friday',
        cover: '/images/placeholder.png',
        status: undefined,
        year: null,
        description: 'A webcomic about cybersecurity.',
        authors: [],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'en',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(_mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(BASE_URL)
      let max = 1
      $('a[href^="/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const num = parseInt(href.replace(/\//g, ''), 10)
        if (!isNaN(num) && num > max) max = num
      })

      const chapters: SourceChapter[] = []
      for (let i = 1; i <= max; i++) {
        chapters.push({
          id: String(i),
          chapterNumber: String(i),
          title: `Strip ${i}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const src = $('img[src*="/patches/"]').first().attr('src')
      if (!src) return []

      const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`
      return [{ url: fullUrl, index: 0 }]
    } catch {
      return []
    }
  },
}
