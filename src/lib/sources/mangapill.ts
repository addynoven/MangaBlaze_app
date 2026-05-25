import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangapill.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaPill fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractIdFromHref(href: string): string {
  const match = href.match(/\/manga\/(\d+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/chapters\/(\d+-\d+)/)
  return match?.[1] || ''
}

export const mangapillSource: MangaSource = {
  id: 'mangapill',
  name: 'MangaPill',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = link.find('h3').text().trim() || link.find('div.font-black').text().trim()
        const cover = link.find('img').attr('data-src') || link.find('img').attr('src') || '/images/placeholder.png'

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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1.font-bold').first().text().trim()
      if (!title) return null

      const cover = $('img[data-src*="/i/' + mangaId + '"]').attr('data-src') ||
        $('img[src*="/i/' + mangaId + '"]').attr('src') ||
        '/images/placeholder.png'

      const description = $('p.text-sm.text--secondary').first().text().trim()

      const genres: string[] = []
      $('a[href^="/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('div.flex.flex-wrap.gap-1').first().find('span').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a[href^="/chapters/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
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

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapters/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[data-src]').each((index, el) => {
        const src = $(el).attr('data-src')
        if (src && src.includes('cdn.readdetectiveconan.com')) {
          pages.push({ url: src.trim(), index })
        }
      })

      // Sort by URL to maintain page order
      pages.sort((a, b) => {
        const aNum = parseInt(a.url.match(/\/(\d+)\.jpg$/)?.[1] || '0')
        const bNum = parseInt(b.url.match(/\/(\d+)\.jpg$/)?.[1] || '0')
        return aNum - bNum
      })

      // Re-index after sort
      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
