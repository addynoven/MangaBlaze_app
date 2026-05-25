import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://politeandgood.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`PoliteAndGood fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const politeandgoodSource: MangaSource = {
  id: 'politeandgood',
  name: 'Broccoli Soup',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return [
      {
        id: 'broccoli-soup',
        title: 'Broccoli Soup',
        cover: `${BASE_URL}/assets/images/comics/202408241944078964021/1.1.jpg`,
      },
    ]
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return {
      id: 'broccoli-soup',
      title: 'Broccoli Soup',
      cover: `${BASE_URL}/assets/images/comics/202408241944078964021/1.1.jpg`,
      status: 'ongoing',
      year: null,
      description: 'Broccoli Soup webcomic by Joe Chouinard.',
      authors: ['Joe Chouinard'],
      artists: [],
      genres: [],
      altTitles: [],
      originalLanguage: 'en',
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(_mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic/archive`)
      const chapters: SourceChapter[] = []

      $('a[href^="/comic/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const numMatch = href.match(/\/comic\/(\d+)$/)
        const num = numMatch?.[1]
        if (!num) return

        const chapterNum = parseInt(num, 10)
        if (chapters.some((c) => c.chapterNumber === num)) return

        chapters.push({
          id: num,
          chapterNumber: num,
          title: `Comic ${num}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      chapters.sort((a, b) => parseInt(a.chapterNumber, 10) - parseInt(b.chapterNumber, 10))
      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/comic/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[itemprop="image"]').each((index, el) => {
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
