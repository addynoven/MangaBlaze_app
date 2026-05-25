import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.egscomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`EGS fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

const MANGA_ID = 'elgoonishshive'

export const egscomicsSource: MangaSource = {
  id: 'egscomics',
  name: 'El Goonish Shive',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['el goonish shive', 'egs', 'goonish', 'shive']
      if (!keywords.some((k) => k.includes(q) || q.includes(k))) return []
      return [
        {
          id: MANGA_ID,
          title: 'El Goonish Shive',
          cover: `${BASE_URL}/images/logo.gif`,
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
        title: 'El Goonish Shive',
        cover: `${BASE_URL}/images/logo.gif`,
        description:
          'El Goonish Shive is a comic about a group of teenagers who face both real life and bizarre, supernatural situations.',
        authors: ['Dan Shive'],
        artists: ['Dan Shive'],
        genres: ['Comedy', 'Drama', 'Fantasy', 'Supernatural'],
        altTitles: ['EGS'],
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
      const $ = await fetchHTML(`${BASE_URL}/comic/archive`)
      const chapters: SourceChapter[] = []

      $('select[name="comic"] option[value^="comic/"]').each((_, el) => {
        const value = $(el).attr('value') || ''
        const slug = value.replace('comic/', '')
        if (!slug) return

        const text = $(el).text().trim()
        const match = text.match(/^(.+?)\s+-\s+(.+)$/)
        const title = match ? match[1].trim() : text

        chapters.push({
          id: slug,
          chapterNumber: String(chapters.length + 1),
          title: title || slug,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Newest first
      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic/${chapterId}`)
      const src = $('#cc-comic').attr('src')
      if (!src) return []
      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
