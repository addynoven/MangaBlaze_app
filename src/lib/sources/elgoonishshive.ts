import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.egscomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ElGoonishShive fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const elgoonishshiveSource: MangaSource = {
  id: 'elgoonishshive',
  name: 'El Goonish Shive',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      if (!q.includes('el goonish') && !q.includes('egs')) return []

      const $ = await fetchHTML(BASE_URL)
      const img = $('#cc-comic').first()
      const cover = img.attr('src') || '/images/placeholder.png'

      return [
        {
          id: 'egs',
          title: 'El Goonish Shive',
          cover,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'egs') return null
      const $ = await fetchHTML(BASE_URL)

      const img = $('#cc-comic').first()
      const cover = img.attr('src') || '/images/placeholder.png'

      return {
        id: mangaId,
        title: 'El Goonish Shive',
        cover,
        description: 'El Goonish Shive by Dan Shive. A comic about a group of teenagers who encounter aliens, magic, and transformation beams.',
        status: 'ongoing',
        year: null,
        authors: ['Dan Shive'],
        artists: ['Dan Shive'],
        genres: ['Comedy', 'Fantasy', 'Sci-Fi'],
        altTitles: ['EGS'],
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
      if (mangaId !== 'egs') return []
      const $ = await fetchHTML(BASE_URL)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      // Try archive page for full list
      try {
        const archive$ = await fetchHTML(`${BASE_URL}/comic/archive`)
        archive$('a[href*="/comic/"]').each((_, el) => {
          const link = archive$(el)
          const href = link.attr('href') || ''
          const match = href.match(/\/comic\/([^/]+)\/?$/)
          const slug = match?.[1] || ''
          if (!slug || seen.has(slug)) return
          seen.add(slug)

          const title = link.text().trim() || slug

          chapters.push({
            id: slug,
            chapterNumber: slug,
            title,
            volume: null,
            language: 'en',
            pages: 1,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: `${BASE_URL}/comic/${slug}`,
            isUnavailable: false,
          })
        })
      } catch {
        // Archive failed, fallback to current page navigation
      }

      // Fallback: use current comic + prev/next links
      if (chapters.length === 0) {
        const currentImg = $('#cc-comic').first()
        const currentSrc = currentImg.attr('src') || ''
        const currentTitle = currentImg.attr('title') || 'Latest'

        // Try to extract a slug from the canonical or current URL
        const canonical = $('link[rel="canonical"]').attr('href') || ''
        const slugMatch = canonical.match(/\/comic\/([^/]+)\/?$/)
        const slug = slugMatch?.[1] || currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')

        if (slug && !seen.has(slug)) {
          chapters.push({
            id: slug,
            chapterNumber: slug,
            title: currentTitle,
            volume: null,
            language: 'en',
            pages: 1,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: canonical || `${BASE_URL}/comic/${slug}`,
            isUnavailable: false,
          })
        }
      }

      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/comic/${chapterId}`
      const $ = await fetchHTML(url)

      const img = $('#cc-comic').first()
      const src = img.attr('src')
      if (!src) return []

      return [{ url: src, index: 0 }]
    } catch {
      return []
    }
  },
}
