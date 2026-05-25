import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://ww6.readopm.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadOPM fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const readopmSource: MangaSource = {
  id: 'readopm',
  name: 'Read One-Punch Man Manga Online',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const known: SourceManga[] = [
        {
          id: 'one-punch-man',
          title: 'One Punch Man',
          cover: 'https://ww6.readopm.com/wp-content/uploads/2017/11/Read-One-Punch-Man-Manga-1-270x300.png',
        },
      ]

      const q = query.toLowerCase()
      const results = known.filter(
        (k) => k.title.toLowerCase().includes(q) || k.id.toLowerCase().includes(q)
      )

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h2.mb-0 span').first().text().trim() || $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('img.card-img-right').attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'ja',
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('a[href*="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/chapter\/(.+?)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id || seen.has(id)) return
        seen.add(id)

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}/chapter/${id}/`,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.pages__img').each((index, el) => {
        const src = $(el).attr('data-src') || $(el).attr('src') || ''
        if (src && !src.startsWith('data:')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
