import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangapanda.onl'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaPanda.onl fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const mangapandaonlSource: MangaSource = {
  id: 'mangapandaonl',
  name: 'MangaPanda.onl',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href*="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        if (!href.includes('/manga/')) return
        const id = href.replace(/^.*\/manga\//, '')
        if (!id) return

        const img = link.find('img.manga-thumb.list-item-thumb')
        const title = img.attr('alt')?.trim() || link.text().trim()
        const cover = img.attr('src') || '/images/placeholder.png'

        if (title && !results.some((r) => r.id === id)) {
          results.push({ id, title, cover })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1._3xnDj').first().contents().filter(function () {
        return this.type === 'text'
      }).text().trim()
      if (!title) return null

      const cover = $('img.manga-thumb').first().attr('src') || '/images/placeholder.png'
      const description = $('meta[name="description"]').attr('content')?.trim() || ''

      const genres: string[] = []
      $('a.genre-label').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('span._3SlhO').each((_, el) => {
        const label = $(el).text().trim().toLowerCase()
        if (label === 'status') {
          const next = $(el).next().text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(next)) {
            status = next
          }
        }
      })

      const authors: string[] = []
      const artists: string[] = []
      $('span._3SlhO').each((_, el) => {
        const label = $(el).text().trim().toLowerCase()
        const next = $(el).next().text().trim()
        if (label === 'author') authors.push(next)
        if (label === 'artist') artists.push(next)
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a[href*="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        if (!href.includes('/chapter/')) return
        const id = href.replace(/^.*\/chapter\//, '')
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numMatch = id.match(/chapter-(\d+(?:\.\d+)?)$/i)
        const chapterNumber = numMatch?.[1] || '?'

        const titleSpan = link.find('span._2IG5P').text().trim()
        const title = titleSpan.replace(/^\s*-\s*/, '') || `Chapter ${chapterNumber}`

        chapters.push({
          id,
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

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapter/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.PB0mN').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
