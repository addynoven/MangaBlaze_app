import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://megatokyo.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`MegaTokyo fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

async function getLatestStrip(): Promise<number> {
  try {
    const $ = await fetchHTML(BASE_URL)
    const imgSrc = $('img[src*="strips/"]').attr('src') || ''
    const match = imgSrc.match(/strips\/(\d+)/)
    if (match) return parseInt(match[1], 10)
    const prev = $('a[href^="./strip/"]').attr('href') || ''
    const prevMatch = prev.match(/strip\/(\d+)/)
    if (prevMatch) return parseInt(prevMatch[1], 10) + 1
    return 1619
  } catch {
    return 1619
  }
}

export const megatokyoSource: MangaSource = {
  id: 'megatokyo',
  name: 'MegaTokyo',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!'megatokyo'.includes(q) && !q.includes('mega') && !q.includes('tokyo')) return []
      return [{ id: 'megatokyo', title: 'MegaTokyo', cover: `${BASE_URL}/strips/0001.gif` }]
    } catch {
      return []
    }
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const latest = await getLatestStrip()
      return {
        id: 'megatokyo',
        title: 'MegaTokyo',
        cover: `${BASE_URL}/strips/0001.gif`,
        description: 'A webcomic by Fred Gallagher and Rodney Caston.',
        authors: ['Fred Gallagher', 'Rodney Caston'],
        artists: ['Fred Gallagher'],
        genres: ['Comedy', 'Drama', 'Romance'],
        altTitles: [],
        status: 'ongoing',
        year: 2000,
        originalLanguage: 'en',
        lastVolume: null,
        lastChapter: String(latest),
      }
    } catch {
      return null
    }
  },

  async getChapters(_mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try {
      const latest = await getLatestStrip()
      const chapters: SourceChapter[] = []
      const start = Math.max(1, latest - limit + 1)
      for (let i = latest; i >= start; i--) {
        chapters.push({
          id: String(i),
          chapterNumber: String(i),
          title: `Strip ${i}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date(2000, 0, 1).toISOString(),
          readableAt: new Date(2000, 0, 1).toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      }
      return chapters
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/strip/${chapterId}`
      const $ = await fetchHTML(url)
      const src = $('img[src*="strips/"]').attr('src')
      if (!src) return []
      const pageUrl = src.startsWith('http') ? src : `${BASE_URL}/${src.replace(/^\//, '')}`
      return [{ url: pageUrl, index: 0 }]
    } catch {
      return []
    }
  },
}
