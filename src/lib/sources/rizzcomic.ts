import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://rizzcomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`RizzComic fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const rizzcomicSource: MangaSource = {
  id: 'rizzcomic',
  name: 'Rizz Comic',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="https://rizzcomic.com/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('img').attr('title')?.trim() || link.text().trim()
        const cover = link.find('img').attr('src') || link.find('img').attr('data-src') || '/images/placeholder.png'

        if (title) {
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

      const cover = $('meta[property="og:image"]').attr('content') || '/images/placeholder.png'
      const description = $('.entry-content p').first().text().trim()

      const genres: string[] = []
      $('a[href^="https://rizzcomic.com/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.tsinfo .imptdt').each((_, el) => {
        const label = $(el).find('i').text().trim().toLowerCase()
        const value = $(el).contents().filter(function () {
          return this.type === 'text'
        }).text().trim().toLowerCase()
        if (label === 'status' && ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(value)) {
          status = value
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
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
      $('.eph-num a, .inepcx a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/([^/]+-chapter-[^/]+)\/?$/)
        const id = slugMatch?.[1] || ''
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = numText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: numText,
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
      const url = `${BASE_URL}/${chapterId}/`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`RizzComic fetch error: ${res.status} ${url}`)
      const html = await res.text()

      // Extract ts_reader.run({...}) JSON
      const match = html.match(/ts_reader\.run\(([\s\S]*?)\);\s*<\/script>/)
      if (!match) return []

      const jsonStr = match[1]
      const data = JSON.parse(jsonStr)
      const images: string[] = data?.sources?.[0]?.images || []

      return images.map((url: string, index: number) => ({
        url: url.trim(),
        index,
      }))
    } catch {
      return []
    }
  },
}
