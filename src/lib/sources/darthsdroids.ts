import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.darthsanddroids.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Darths & Droids fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const darthsdroidsSource: MangaSource = {
  id: 'darthsdroids',
  name: 'Darths & Droids',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return [
      {
        id: 'darths-droids',
        title: 'Darths & Droids',
        cover: `${BASE_URL}/comics/darths2782.jpg`,
      },
    ]
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return {
      id: 'darths-droids',
      title: 'Darths & Droids',
      cover: `${BASE_URL}/comics/darths2782.jpg`,
      status: 'ongoing',
      year: null,
      description: 'A webcomic imagining a group of role-players playing Star Wars.',
      authors: ['The Comic Irregulars'],
      artists: [],
      genres: ['Comedy', 'Parody'],
      altTitles: [],
      originalLanguage: 'en',
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(_mangaId: string, limit = 100, offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      // Get latest episode number from homepage
      const $ = await fetchHTML(BASE_URL)
      const img = $('img[src*="/comics/darths"]').first()
      const alt = img.attr('alt') || ''
      const numMatch = alt.match(/Episode\s+(\d+):/)
      const latest = numMatch ? parseInt(numMatch[1], 10) : 2782

      const chapters: SourceChapter[] = []
      for (let i = offset + 1; i <= latest && chapters.length < limit; i++) {
        chapters.push({
          id: i.toString().padStart(4, '0'),
          chapterNumber: i.toString(),
          title: `Episode ${i}`,
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
      const url = `${BASE_URL}/episodes/${chapterId.padStart(4, '0')}.html`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="/comics/darths"]').each((index, el) => {
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
