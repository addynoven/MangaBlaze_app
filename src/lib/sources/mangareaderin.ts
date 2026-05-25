import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangareader.in'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaReader.in fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterSlugFromUrl(url: string): string {
  const match = url.match(/\/chapter\/([^/]+)/)
  return match?.[1] || ''
}

export const mangareaderinSource: MangaSource = {
  id: 'mangareaderin',
  name: 'MangaReader.in',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const queryLower = query.toLowerCase()

      // Search results are in .allgreen.genrelst > ul > li > .anipost
      $('.allgreen.genrelst ul li .anipost').each((_, el) => {
        const post = $(el)
        const linkEl = post.find('.left > a[href^="https://mangareader.in/manga/"]').first()
        const href = linkEl.attr('href') || ''
        const id = extractSlugFromUrl(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = linkEl.find('h3.title_mg').text().trim()
        if (!title) return

        // Client-side filter: only include if title matches query
        if (!title.toLowerCase().includes(queryLower)) return

        const cover =
          post.find('.thumb img').attr('src') || '/images/placeholder.png'

        const genres: string[] = []
        post.find('.info span.g a.green').each((_, gEl) => {
          const g = $(gEl).text().trim()
          if (g) genres.push(g)
        })

        let status: string | undefined
        post.find('.info span').each((_, sEl) => {
          const text = $(sEl).text().trim().toLowerCase()
          const match = text.match(/status\s*:\s*(\w+)/)
          if (match) {
            const s = match[1]
            if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(s)) {
              status = s
            }
          }
        })

        const lastChapterLink = post.find('.info span a[href^="https://mangareader.in/chapter/"]').first()
        const lastChapter = lastChapterLink.text().trim() || null

        results.push({
          id,
          title,
          cover,
          status,
          genres: [...new Set(genres)],
          description: '',
          lastChapter,
        })
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

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('img[src*="/imgs/"]').first().attr('src') || '/images/placeholder.png'

      const description =
        $('.summary, .description, [class*="desc"]').first().text().trim() || ''

      const genres: string[] = []
      $('a[href^="/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('span, div').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (text.includes('status')) {
          const next = $(el).next().text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(next)) {
            status = next
          }
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
      // Manga detail pages are protected by Cloudflare challenge (403 cf-mitigated).
      // The HTML structure was verified via the search page, but /manga/* and
      // /chapter/* paths consistently return a Cloudflare interstitial.
      return null
    }
  },

  async getChapters(
    _mangaId: string,
    _limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      // Chapter lists live on the manga detail page, which is behind
      // Cloudflare challenge. Unable to retrieve chapter data.
      return []
    } catch {
      return []
    }
  },

  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    try {
      // Chapter pages are behind Cloudflare challenge (403 cf-mitigated).
      // Unable to retrieve page images.
      return []
    } catch {
      return []
    }
  },
}
