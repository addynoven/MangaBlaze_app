import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.gunnerkrigg.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Gunnerkrigg Court fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const gunnerkriggSource: MangaSource = {
  id: 'gunnerkrigg',
  name: 'Gunnerkrigg Court',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return [
      {
        id: 'gunnerkrigg',
        title: 'Gunnerkrigg Court',
        cover: `${BASE_URL}/comics/00003260.jpg`,
      },
    ]
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return {
      id: 'gunnerkrigg',
      title: 'Gunnerkrigg Court',
      cover: `${BASE_URL}/comics/00003260.jpg`,
      status: 'ongoing',
      year: null,
      description: 'A science-fantasy webcomic by Tom Siddell about a girl attending a mysterious boarding school.',
      authors: ['Tom Siddell'],
      artists: [],
      genres: ['Fantasy', 'Science Fiction'],
      altTitles: [],
      originalLanguage: 'en',
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(_mangaId: string, limit = 100, offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      // Get latest page number from homepage
      const $ = await fetchHTML(BASE_URL)
      const latestLink = $('a[href^="?p="]').first()
      const href = latestLink.attr('href') || ''
      const numMatch = href.match(/\?p=(\d+)/)
      const latest = numMatch ? parseInt(numMatch[1], 10) : 3260

      const chapters: SourceChapter[] = []
      for (let i = offset + 1; i <= latest && chapters.length < limit; i++) {
        chapters.push({
          id: i.toString(),
          chapterNumber: i.toString(),
          title: `Page ${i}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return chapters
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/?p=${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.comic_image').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src) {
          const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`
          pages.push({ url: fullUrl, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
