import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangatx.cc'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaTX fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

export const mangatxSource: MangaSource = {
  id: 'mangatx',
  name: 'MangaTX',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // Browse manga list and filter locally — site search redirects to homepage
      const url = `${BASE_URL}/manga-list`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const lowerQuery = query.toLowerCase()

      $('.bsx').each((_, el) => {
        const item = $(el)
        const link = item.find('a[href^="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromUrl(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = link.attr('title') || link.text().trim() || ''
        if (!title.toLowerCase().includes(lowerQuery)) return

        const cover = item.find('img').attr('src') || item.find('img').attr('data-src') || '/images/placeholder.png'

        results.push({ id, title, cover })
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

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('.thumb img').attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description = $('.entry-content p').first().text().trim()

      const genres: string[] = []
      $('.mgen a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.imptdt').each((_, el) => {
        const heading = $(el).find('i').text().trim().toLowerCase()
        if (heading === 'status') {
          const text = $(el).contents().filter(function () {
            return this.type === 'text'
          }).text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
            status = text
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#chapterlist .eph-num a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(/chapter-(\d+)/)
        const chapterSlug = match?.[1] || ''
        if (!chapterSlug) return

        const id = `${mangaId}/chapter-${chapterSlug}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.find('.chapternum').text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+)/i)
        const chapterNumber = numMatch?.[1] || chapterSlug

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterSlug}`,
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
      const url = `${BASE_URL}/manga/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="/chapters/"]').each((index, el) => {
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
