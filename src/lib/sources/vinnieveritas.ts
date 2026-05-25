import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://ccc.vinnieveritas.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Vinnie Veritas fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const vinnieveritasSource: MangaSource = {
  id: 'vinnieveritas',
  name: 'Vinnie Veritas CCC',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return [
      {
        id: 'ccc',
        title: 'Vinnie Veritas CCC',
        cover: `${BASE_URL}/comics/CCC291_en.jpg`,
      },
    ]
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return {
      id: 'ccc',
      title: 'Vinnie Veritas CCC',
      cover: `${BASE_URL}/comics/CCC291_en.jpg`,
      status: 'ongoing',
      year: null,
      description: 'Vinnie Veritas comic series.',
      authors: ['Vinnie Veritas'],
      artists: [],
      genres: [],
      altTitles: [],
      originalLanguage: 'en',
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(_mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    // Only chapters 1-14 have working PHP pages
    const chapters: SourceChapter[] = []
    for (let i = 1; i <= 14; i++) {
      const num = i.toString().padStart(3, '0')
      chapters.push({
        id: num,
        chapterNumber: i.toString(),
        title: `CCC ${i}`,
        volume: null,
        language: 'en',
        pages: 0,
        publishedAt: new Date().toISOString(),
        readableAt: new Date().toISOString(),
        externalUrl: null,
        isUnavailable: false,
      })
    }
    return chapters.slice(0, limit)
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/CCC${chapterId}.php`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.cccComic').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && src.includes(`CCCr${chapterId}E`)) {
          const fullUrl = src.startsWith('http') ? src : `${BASE_URL}${src.replace(/^\./, '')}`
          pages.push({ url: fullUrl, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
