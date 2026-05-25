import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.grrlpowercomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Grrl Power fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

const MANGA_ID = 'grrlpower'

export const grrlpowercomicSource: MangaSource = {
  id: 'grrlpowercomic',
  name: 'Grrl Power Comic',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['grrl power', 'grrlpower', 'grrl power comic']
      if (!keywords.some((k) => k.includes(q) || q.includes(k))) return []
      return [
        {
          id: MANGA_ID,
          title: 'Grrl Power',
          cover: `${BASE_URL}/wp-content/themes/grrlpower/images/page_gfx/title_block_title.png`,
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
        title: 'Grrl Power',
        cover: `${BASE_URL}/wp-content/themes/grrlpower/images/page_gfx/title_block_title.png`,
        description: 'A webcomic about superheroines.',
        authors: ['DaveB'],
        artists: ['DaveB'],
        genres: ['Comedy', 'Superhero', 'Action'],
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
      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      // Archive pages show ~54 comics each; fetch pages until we have enough
      for (let page = 1; page <= 10; page++) {
        if (chapters.length >= limit) break
        const url = page === 1 ? `${BASE_URL}/archives/comic/` : `${BASE_URL}/archives/comic/?paged=${page}`
        const $ = await fetchHTML(url)

        $('a[href*="/archives/comic/"]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const slugMatch = href.match(/\/archives\/comic\/([^/]+)\/?$/)
          const slug = slugMatch?.[1] || ''
          if (!slug || seen.has(slug)) return

          const title = $(el).attr('title')?.trim() || slug
          const numMatch = title.match(/#(\d+(?:\.\d+)?)/)
          const chapterNumber = numMatch?.[1] || String(chapters.length + 1)

          seen.add(slug)
          chapters.push({
            id: slug,
            chapterNumber,
            title,
            volume: null,
            language: 'en',
            pages: 0,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: null,
            isUnavailable: false,
          })
        })
      }

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/archives/comic/${chapterId}/`)
      const pages: SourcePage[] = []
      const seen = new Set<string>()

      $('img[alt*="Grrl Power #"]').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !seen.has(src)) {
          seen.add(src)
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
