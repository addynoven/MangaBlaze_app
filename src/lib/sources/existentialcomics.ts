import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://existentialcomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Existential Comics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

const MANGA_ID = 'existentialcomics'

export const existentialcomicsSource: MangaSource = {
  id: 'existentialcomics',
  name: 'Existential Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['existential comics', 'existential', 'philosophy comic']
      if (!keywords.some((k) => k.includes(q) || q.includes(k))) return []
      return [
        {
          id: MANGA_ID,
          title: 'Existential Comics',
          cover: `${BASE_URL}/static/title.jpg`,
        },
      ]
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== MANGA_ID) return null
      return {
        id: MANGA_ID,
        title: 'Existential Comics',
        cover: `${BASE_URL}/static/title.jpg`,
        description:
          'A philosophy webcomic about the inevitable anguish of living a brief life in an absurd world. Also Jokes.',
        authors: ['Corey Mohler'],
        artists: ['Corey Mohler'],
        genres: ['Comedy', 'Philosophy'],
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
      if (mangaId !== MANGA_ID) return []

      // Get latest comic number from homepage permalink
      const $ = await fetchHTML(BASE_URL)
      const permalink = $('.permalink a').attr('href') || ''
      const latestMatch = permalink.match(/\/comic\/(\d+)$/)
      const latestNum = parseInt(latestMatch?.[1] || '0', 10)

      // Fetch RSS for recent titles
      const rssRes = await fetch(`${BASE_URL}/rss.xml`, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      const rssTitles: Record<number, string> = {}
      if (rssRes.ok) {
        const rss$ = cheerio.load(await rssRes.text(), { xmlMode: true })
        rss$('item').each((_, el) => {
          const link = rss$(el).find('link').text().trim()
          const title = rss$(el).find('title').text().trim()
          const match = link.match(/\/comic\/(\d+)$/)
          if (match && title) {
            rssTitles[parseInt(match[1])] = title
          }
        })
      }

      const chapters: SourceChapter[] = []
      const start = latestNum
      const end = Math.max(1, latestNum - limit + 1)

      for (let i = start; i >= end; i--) {
        chapters.push({
          id: String(i),
          chapterNumber: String(i),
          title: rssTitles[i] || `Comic #${i}`,
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

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic/${chapterId}`)
      const pages: SourcePage[] = []
      $('img.comicImg').each((index, el) => {
        let src = $(el).attr('src')?.trim()
        if (src) {
          if (src.startsWith('//')) src = `https:${src}`
          pages.push({ url: src, index })
        }
      })
      return pages
    } catch {
      return []
    }
  },
}
