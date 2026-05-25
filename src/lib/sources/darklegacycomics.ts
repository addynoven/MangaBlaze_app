import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.darklegacycomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`DarkLegacyComics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

async function fetchXML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`DarkLegacyComics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text(), { xmlMode: true })
}

export const darklegacycomicsSource: MangaSource = {
  id: 'darklegacycomics',
  name: 'Dark Legacy Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if ('dark legacy'.includes(q) || 'dlc'.includes(q) || !q) {
        return [
          {
            id: 'darklegacycomics',
            title: 'Dark Legacy Comics',
            cover: `${BASE_URL}/comics/thumbnails/990t.jpg`,
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
      if (mangaId !== 'darklegacycomics') return null
      const $ = await fetchHTML(`${BASE_URL}/newest`)
      const cover = $('meta[property="og:image"]').attr('content') || `${BASE_URL}/comics/thumbnails/990t.jpg`
      return {
        id: mangaId,
        title: 'Dark Legacy Comics',
        cover: cover.startsWith('http') ? cover : `${BASE_URL}/${cover.replace(/^\//, '')}`,
        description: 'A World of Warcraft webcomic by Arad Kedar (Keydar).',
        status: 'ongoing',
        year: null,
        authors: ['Arad Kedar (Keydar)'],
        artists: ['Arad Kedar (Keydar)'],
        genres: ['Comedy', 'Gaming'],
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
      if (mangaId !== 'darklegacycomics') return []
      const $ = await fetchXML(`${BASE_URL}/sitemap.xml`)

      const chapters: SourceChapter[] = []
      $('url loc').each((_, el) => {
        const loc = $(el).text().trim()
        const match = loc.match(/darklegacycomics\.com\/(\d+)$/)
        if (!match) return
        const id = match[1]
        if (chapters.some((c) => c.id === id)) return

        chapters.push({
          id,
          chapterNumber: id,
          title: `Comic ${id}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters
        .sort((a, b) => parseInt(b.id) - parseInt(a.id))
        .slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}`)
      const img = $('img[src^="comics/"]').first()
      let src = img.attr('src')
      if (!src) {
        src = $('meta[property="og:image"]').attr('content') || ''
      }
      if (!src) return []
      const url = src.startsWith('http') ? src : `${BASE_URL}/${src.replace(/^\//, '')}`
      return [{ url, index: 0 }]
    } catch {
      return []
    }
  },
}
