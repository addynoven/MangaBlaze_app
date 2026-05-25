import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangack.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Mangack fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const mangackSource: MangaSource = {
  id: 'mangack',
  name: 'Mangack',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/${encodeURIComponent(query)}/`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a.wrap-text[href^="https://mangack.com/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(`${BASE_URL}/manga/`, '').replace(/\/$/g, '')
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        // Cover isn't available on search results page
        const cover = '/images/placeholder.png'

        if (title && id) {
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover = $('img.wp-post-image').first().attr('src') || '/images/placeholder.png'
      const description = $('.entry-content').first().text().trim()

      const genres: string[] = []
      $('a[href^="https://mangack.com/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('ul.chapterslist a.title').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(`${BASE_URL}/chapter/`, '').replace(/\/$/g, '')
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/CHAPTER\s+(\d+(?:\.\d+)?)/i)
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
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.aligncenter').each((index, el) => {
        const src = $(el).attr('src')
        if (src) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
