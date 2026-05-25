import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://ww2.mangafreak.me'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaFreak fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function toSnakeCase(name: string): string {
  return name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export const mangafreakSource: MangaSource = {
  id: 'mangafreak',
  name: 'MangaFreak',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(BASE_URL)
      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href^="/Manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace('/Manga/', '').replace(/\/$/, '')
        if (!id || seen.has(id)) return

        const title = link.text().trim()
        if (!title) return

        const cover = `https://images.mangafreak.me/manga_images/${id.toLowerCase()}.jpg`

        seen.add(id)
        results.push({ id, title, cover })
      })

      const q = query.toLowerCase()
      const filtered = results.filter(
        (r) => r.title.toLowerCase().includes(q) || r.id.toLowerCase().replace(/_/g, ' ').includes(q)
      )

      return filtered.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/Manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('title').text().replace(/ Manga Chapter List.*$/i, '').trim()
      if (!title) return null

      const cover = `https://images.mangafreak.me/manga_images/${mangaId.toLowerCase()}.jpg`

      const description =
        $('meta[name="description"]').attr('content') ||
        $('meta[name="Description"]').attr('content') ||
        ''

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
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
      const url = `${BASE_URL}/Manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $(`a[href^="/Read1_${mangaId}_"]`).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(new RegExp(`/Read1_${mangaId}_(\\d+)`))
        const chapterNumber = match?.[1] || ''
        if (!chapterNumber) return

        const titleText = link.text().trim()
        const titleMatch = titleText.match(new RegExp(`Chapter ${chapterNumber}(.*)`))
        const title = titleMatch?.[1]?.trim() || titleText

        const chapterId = `${mangaId}/${chapterNumber}`
        if (chapters.some((c) => c.id === chapterId)) return

        chapters.push({
          id: chapterId,
          chapterNumber,
          title: title || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const parts = chapterId.split('/')
      if (parts.length !== 2) return []
      const finalMangaId = mangaId || parts[0]
      const chapterNumber = parts[1]

      const url = `${BASE_URL}/Read1_${finalMangaId}_${chapterNumber}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img').each((index, el) => {
        const src = $(el).attr('src')
        if (src && src.includes('images.mangafreak.me/mangas/')) {
          pages.push({ url: src.trim(), index: pages.length })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
