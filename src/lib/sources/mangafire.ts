import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangafire.to'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaFire fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractMangaIdFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  // href looks like "/read/one-piecee.dkw/en/chapter-1183"
  const match = href.match(/\/read\/([^/]+\/[^/]+\/[^/]+)/)
  return match?.[1] || href.replace(/^\/read\//, '')
}

export const mangafireSource: MangaSource = {
  id: 'mangafire',
  name: 'MangaFire',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      let url: string
      if (!query.trim()) {
        // Browse trending/popular
        url = `${BASE_URL}/filter?page=1&sort=trending&language[]=en`
      } else {
        // Keyword search — may be blocked by VRF on some queries
        url = `${BASE_URL}/filter?keyword=${encodeURIComponent(query)}&page=1&language[]=en`
      }

      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.original.card-lg .unit .inner').each((_, el) => {
        const infoLink = $(el).find('.info > a').first()
        if (!infoLink.length) return

        const href = infoLink.attr('href') || ''
        const id = extractMangaIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = infoLink.text().trim()
        const img = $(el).find('img').first()
        const cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'

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

      const title = $('h1[itemprop="name"]').first().text().trim()
      if (!title) return null

      const cover = $('.poster img').first().attr('src') || '/images/placeholder.png'

      const description = $('#synopsis .modal-body').first().text().trim()

      const statusText = $('.info p').first().text().trim().toLowerCase()
      const status =
        statusText === 'releasing'
          ? 'ongoing'
          : statusText === 'completed'
            ? 'completed'
            : statusText === 'on hiatus'
              ? 'hiatus'
              : statusText || undefined

      const authors: string[] = []
      $('a[itemprop="author"]').each((_, el) => {
        const name = $(el).text().trim()
        if (name) authors.push(name)
      })

      const genres: string[] = []
      $('.meta span').each((_, el) => {
        const text = $(el).text().trim()
        if (text.includes('Genres')) {
          $(el)
            .next('span')
            .find('a')
            .each((_, a) => {
              const g = $(a).text().trim()
              if (g) genres.push(g)
            })
        }
      })

      // Also look for type info and add it to genres
      let mangaType: string | undefined
      $('.meta span').each((_, el) => {
        const text = $(el).text().trim()
        if (text.includes('Type')) {
          mangaType = $(el).next('span').text().trim()
        }
      })
      if (mangaType && !genres.includes(mangaType)) {
        genres.unshift(mangaType)
      }

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description: description || '',
        authors: [...new Set(authors)],
        artists: [...new Set(authors)],
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

      // Chapters are in .m-list li or .tab-content li
      $('.m-list li, .tab-content li').each((_, el) => {
        const link = $(el).find('a').first()
        if (!link.length) return

        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const chapterNumber = $(el).attr('data-number') || '?'
        const titleText = link.attr('title') || link.text().trim()

        // Try to extract date from span
        const dateSpan = $(el).find('span').last()
        const dateText = dateSpan.text().trim()
        let publishedAt = new Date().toISOString()
        try {
          const parsed = new Date(dateText)
          if (!isNaN(parsed.getTime())) publishedAt = parsed.toISOString()
        } catch {
          // ignore invalid dates
        }

        chapters.push({
          id,
          chapterNumber: String(chapterNumber),
          title: titleText || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    // MangaFire.to chapter pages are protected by VRF tokens computed via
    // obfuscated client-side JS. A headless browser is required to bypass this.
    // Returning empty gracefully, consistent with other blocked sources.
    console.warn('[MangaFire] Chapter pages require VRF bypass via headless browser. Not supported in this implementation.')
    return []
  },
}
