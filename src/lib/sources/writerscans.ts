import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://writerscans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`WriterScans fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function stripWsrvParams(url: string): string {
  // Remove &w=600 etc from wsrv.nl proxy URLs to get full-size image
  return url.replace(/&w=\d+/, '').replace(/&h=\d+/, '').replace(/&q=\d+/, '')
}

export const writerscansSource: MangaSource = {
  id: 'writerscans',
  name: "Writer Scans",
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/series?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="/series/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace('/series/', '').replace('/', '')
        if (!id || id.length < 10) return // skip non-series links

        if (results.some((r) => r.id === id)) return

        const title = link.attr('alt') || link.attr('title') || ''
        if (!title) return

        // Cover is in a nested div with background-image style
        const bgDiv = link.find('div[style*="background-image"]').first()
        const style = bgDiv.attr('style') || ''
        const bgMatch = style.match(/background-image:url\(([^)]+)\)/)
        let cover = bgMatch?.[1] || ''
        if (cover) cover = stripWsrvParams(cover)
        if (!cover) cover = '/images/placeholder.png'

        results.push({ id, title, cover })
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        stripWsrvParams($('meta[property="og:image"]').attr('content') || '') ||
        '/images/placeholder.png'

      const description = $('p[style*="white-space: pre-wrap"]').first().text().trim()

      const authors: string[] = []
      const artists: string[] = []
      let status: string | undefined
      const genres: string[] = []

      // Extract metadata fields
      $('div').each((_, el) => {
        const label = $(el).find('span').first().text().trim()
        const value = $(el).children().last().text().trim()
        if (label === 'Author' && value) authors.push(value)
        if (label === 'Artist' && value) artists.push(value)
        if (label === 'Status' && value) status = value.toLowerCase()
      })

      // Genres from meta keywords
      const keywords = $('meta[name="keywords"]').attr('content') || ''
      if (keywords) {
        keywords.split(',').forEach((g) => {
          const trimmed = g.trim()
          if (trimmed) genres.push(trimmed)
        })
      }

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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a[href^="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace('/chapter/', '').replace('/', '')
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.attr('alt') || link.attr('title') || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
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
      $('img[uid]').each((index, el) => {
        const uid = $(el).attr('uid')
        if (uid) {
          pages.push({ url: `https://cdn.meowing.org/uploads/${uid}`, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
