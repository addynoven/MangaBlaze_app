import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://kingofshojo.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`King of Shojo fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const kingofshojoSource: MangaSource = {
  id: 'kingofshojo',
  name: 'King of Shojo',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.bsx').each((_, el) => {
        const link = $(el).find('a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('.tt').text().trim()
        const cover =
          link.find('img').attr('data-src') ||
          link.find('img').attr('src') ||
          '/images/placeholder.png'

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

      const cover =
        $('.thumb img').attr('src') ||
        $('.thumb img').attr('data-src') ||
        '/images/placeholder.png'

      const description = $('.entry-content.entry-content-single').first().text().trim() || ''

      let status: string | undefined
      let year: number | null = null
      const authors: string[] = []
      const artists: string[] = []
      const altTitles: string[] = []

      $('.infotable tr').each((_, el) => {
        const cells = $(el).find('td')
        if (cells.length < 2) return
        const key = $(cells[0]).text().trim().toLowerCase()
        const val = $(cells[1]).text().trim()
        if (key.includes('status')) {
          const s = val.toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(s)) status = s
        }
        if (key.includes('released') && val) {
          const n = parseInt(val, 10)
          if (!isNaN(n)) year = n
        }
        if (key.includes('author') && val && val.toLowerCase() !== 'n/a') {
          authors.push(val)
        }
        if (key.includes('artist') && val && val.toLowerCase() !== 'n/a') {
          artists.push(val)
        }
        if (key.includes('alternative') && val) {
          val.split(/\/|，|,/).forEach((t) => {
            const trimmed = t.trim()
            if (trimmed) altTitles.push(trimmed)
          })
        }
      })

      const genres: string[] = []
      $('.seriestugenre a, .mgen a').each((_, el) => {
        const g = $(el).text().trim()
        if (g) genres.push(g)
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.eplister ul.clstyle li .chbox a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/([^/]+-chapter-\d+(?:\.\d+)?)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('#readerarea img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('wp-content/themes') && !src.includes('ibb.co')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
