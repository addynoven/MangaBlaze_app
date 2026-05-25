import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangahub.io'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaHub fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/chapter\/(.+)$/)
  return match?.[1] || ''
}

export const mangahubSource: MangaSource = {
  id: 'mangahub',
  name: 'MangaHub',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="https://mangahub.io/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        // Find cover img in same container
        const container = link.closest('div').parent()
        const cover =
          container.find('img[src*="thumb.mghcdn.com"]').attr('src') ||
          ''

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

      const title = $('h1._3xnDj').first().contents().not('small').text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('img[src*="thumb.mghcdn.com"]').first().attr('src') ||
        '/images/placeholder.png'

      let description = $('meta[name="description"]').attr('content') || ''
      // Strip trailing promo text
      const promoIdx = description.indexOf('Other attractive Manga :')
      if (promoIdx > 0) description = description.slice(0, promoIdx).trim()

      const genres: string[] = []
      $('a.genre-label').each((_, el) => {
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a[href^="https://mangahub.io/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const numMatch = id.match(/chapter-([\d.]+)/i)
        const chapterNumber = numMatch?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
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
      const url = `${BASE_URL}/chapter/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="imgx.mghcdn.com"]').each((index, el) => {
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
