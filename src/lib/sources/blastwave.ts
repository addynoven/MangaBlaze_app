import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.blastwave-comic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Blastwave fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

const MANGA_ID = 'blastwave'

export const blastwaveSource: MangaSource = {
  id: 'blastwave',
  name: 'Gone with the Blastwave',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['gone with the blastwave', 'blastwave', 'gwtb']
      if (!keywords.some((k) => k.includes(q) || q.includes(k))) return []
      return [
        {
          id: MANGA_ID,
          title: 'Gone with the Blastwave',
          cover: `${BASE_URL}/images/page/default/banner.jpg`,
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
        title: 'Gone with the Blastwave',
        cover: `${BASE_URL}/images/page/default/banner.jpg`,
        description: 'Because war can be boring too.',
        authors: ['Kimmo Lemetti'],
        artists: ['Kimmo Lemetti'],
        genres: ['Comedy', 'War', 'Sci-Fi'],
        altTitles: ['GWTB'],
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
      const $ = await fetchHTML(BASE_URL)
      const chapters: SourceChapter[] = []

      $('select[name="nro"] option[value]').each((_, el) => {
        const value = $(el).attr('value') || ''
        if (!value || value === '') return
        const num = parseInt(value)
        if (isNaN(num)) return

        const text = $(el).text().trim()
        const match = text.match(/#(\d+(?:\.\d+)?)/)
        const chapterNumber = match?.[1] || String(num)

        chapters.push({
          id: value,
          chapterNumber,
          title: text || `Strip #${num}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Dropdown is newest first
      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/index.php?p=comic&nro=${chapterId}`)
      const pages: SourcePage[] = []
      $('#comic_ruutu img, img[src^="comics/"]').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && src.startsWith('comics/')) {
          pages.push({ url: `${BASE_URL}/${src}`, index })
        }
      })
      return pages
    } catch {
      return []
    }
  },
}
