import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://readcomicsonline.ru'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadComicsOnline fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadComicsOnline JSON error: ${res.status} ${url}`)
  return res.json() as Promise<T>
}

interface SearchSuggestion {
  value: string
  data: string
}

interface SearchResponse {
  suggestions: SearchSuggestion[]
}

function normalizeCover(src: string): string {
  if (!src) return '/images/placeholder.png'
  if (src.startsWith('//')) return 'https:' + src
  if (src.startsWith('/')) return BASE_URL + src
  return src
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comic\/([^/]+)/)
  return match?.[1] || ''
}

function parseChapterNumber(text: string): string {
  const match = text.match(/#(\S+)/)
  return match?.[1] || '?'
}

function parseDate(dateText: string): string {
  try {
    const cleaned = dateText.replace(/^\s+|\s+$/g, '')
    const d = new Date(cleaned)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch { /* ignore */ }
  return new Date().toISOString()
}

export const readcomicsonlineSource: MangaSource = {
  id: 'readcomicsonline',
  name: 'Read Comics Online',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}`
      const data = await fetchJSON<SearchResponse>(url)

      const results: SourceManga[] = []
      for (const suggestion of data.suggestions || []) {
        const slug = suggestion.data
        const title = suggestion.value
        if (!slug || !title) continue
        if (results.some((r) => r.id === slug)) continue

        results.push({
          id: slug,
          title,
          cover: '/images/placeholder.png',
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h2.listmanga-header').first().clone().children().remove().end().text().trim()
      if (!title) return null

      const cover = normalizeCover($('.boxed img.img-responsive').first().attr('src') || '')

      const description = $('.manga.well p').first().text().trim()

      const genres: string[] = []
      $('.tag-links a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      const statusText = $('.label').first().text().trim().toLowerCase()
      if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(statusText)) {
        status = statusText
      }

      const authors: string[] = []
      $('dt').each((_, el) => {
        if ($(el).text().includes('Author')) {
          $(el).next('dd').find('a').each((_, a) => {
            authors.push($(a).text().trim())
          })
        }
      })

      return {
        id: mangaId,
        title,
        cover: cover || '/images/placeholder.png',
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
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
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('ul.chapters li').each((_, el) => {
        const link = $(el).find('h5.chapter-title-rtl a').first()
        const href = link.attr('href') || ''
        const slug = extractSlugFromHref(href)
        if (!slug) return

        const chapterSlug = href.match(/\/comic\/[^/]+\/(.+)$/)?.[1] || ''
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const chapterNumber = parseChapterNumber(titleText)

        const dateText = $(el).find('.date-chapter-title-rtl').text().trim()

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: parseDate(dateText),
          readableAt: parseDate(dateText),
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
      const url = `${BASE_URL}/comic/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('#all img.img-responsive').each((index, el) => {
        const src = $(el).attr('data-src')?.trim()
        if (src) {
          pages.push({ url: normalizeCover(src), index })
        }
      })

      // Fallback to scan-page if #all is empty
      if (pages.length === 0) {
        $('img.scan-page').each((index, el) => {
          const src = $(el).attr('src')?.trim() || $(el).attr('data-src')?.trim()
          if (src) {
            pages.push({ url: normalizeCover(src), index })
          }
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
