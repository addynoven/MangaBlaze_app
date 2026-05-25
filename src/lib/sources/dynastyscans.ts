import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://dynasty-scans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`DynastyScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/(series|doujins|chapters)\/([^/]+)/)
  return match?.[2] || ''
}

interface DynastyPage {
  image: string
  name: string
  width: number
  height: number
}

export const dynastyscansSource: MangaSource = {
  id: 'dynastyscans',
  name: 'Dynasty Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a.name').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        // Only keep series and doujins
        if (!href.startsWith('/series/') && !href.startsWith('/doujins/')) return

        const id = extractSlugFromUrl(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = link.text().trim()
        // Search page doesn't have covers, fetch later
        if (title) {
          results.push({ id, title, cover: '/images/placeholder.png' })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      // Try series first, then doujins
      let $: cheerio.CheerioAPI | null = null
      let url = ''
      try {
        url = `${BASE_URL}/series/${mangaId}`
        $ = await fetchHTML(url)
        const title = $('h2.tag-title b').first().text().trim()
        if (!title) throw new Error('Not a series')
      } catch {
        url = `${BASE_URL}/doujins/${mangaId}`
        $ = await fetchHTML(url)
      }

      const title = $('h2.tag-title b').first().text().trim() || $('h2').first().text().trim()
      if (!title) return null

      const cover = $('.cover img.thumbnail').attr('src') || '/images/placeholder.png'
      const description = $('.tag-tags').first().text().trim()

      const genres: string[] = []
      $('.tag-tags a.label').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      const statusText = $('h2.tag-title small').last().text().trim().toLowerCase()
      if (statusText.includes('ongoing')) status = 'ongoing'
      else if (statusText.includes('completed')) status = 'completed'
      else if (statusText.includes('hiatus')) status = 'hiatus'
      else if (statusText.includes('cancelled')) status = 'cancelled'

      const authors: string[] = []
      $("a[href^='/authors/']").each((_, el) => {
        authors.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
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
      let $: cheerio.CheerioAPI | null = null
      try {
        $ = await fetchHTML(`${BASE_URL}/series/${mangaId}`)
      } catch {
        $ = await fetchHTML(`${BASE_URL}/doujins/${mangaId}`)
      }

      const chapters: SourceChapter[] = []
      $("dl.chapter-list dd a.name[href^='/chapters/']").each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slug = extractSlugFromUrl(href)
        if (!slug || chapters.some((c) => c.id === slug)) return

        const titleText = link.text().trim()
        const match = titleText.match(/ch(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || titleText

        chapters.push({
          id: slug,
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

      // Extract var pages = [...] from script tags
      let pages: DynastyPage[] = []
      $('script').each((_, el) => {
        const text = $(el).html() || ''
        const match = text.match(/var\s+pages\s*=\s*(\[[\s\S]*?\]);/)
        if (match) {
          try {
            pages = JSON.parse(match[1])
          } catch {
            // ignore parse error
          }
        }
      })

      return pages.map((page, index) => ({
        url: page.image.startsWith('http') ? page.image : `${BASE_URL}${page.image}`,
        index,
      }))
    } catch {
      return []
    }
  },
}
