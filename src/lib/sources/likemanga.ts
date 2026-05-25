import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://likemanga.ink'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`LikeManga fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const likemangaSource: MangaSource = {
  id: 'likemanga',
  name: 'LikeManga',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?act=search&f%5Bstatus%5D=all&f%5Bsortby%5D=lastest-chap&f%5Bkeyword%5D=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('img.jtip.card-img-top').each((_, el) => {
        const img = $(el)
        const link = img.closest('a').first()
        const href = link.attr('href') || ''
        const id = href.replace(/^\/|\/$/g, '')
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = img.attr('alt') || ''
        let cover = img.attr('src') || '/images/placeholder.png'
        if (cover && !cover.startsWith('http')) {
          cover = `${BASE_URL}/${cover.replace(/^\//, '')}`
        }

        if (title && id) {
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
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.title-detail').first().text().trim()
      if (!title) return null

      // Find cover: first non-logo img that looks like a manga cover
      let cover = '/images/placeholder.png'
      $('img').each((_, el) => {
        const img = $(el)
        const src = img.attr('src') || ''
        const classes = img.attr('class') || ''
        if (src.includes('logo')) return
        if (classes.includes('card-img-top') || classes.includes('lazy') || classes.includes('center')) {
          cover = src
          return false
        }
      })
      if (cover && !cover.startsWith('http')) {
        cover = `${BASE_URL}/${cover.replace(/^\//, '')}`
      }

      const description = $('#summary_shortened').text().trim() || $('#summary_content').text().trim()

      const genres: string[] = []
      $('a[href^="/genres/"]').each((_, el) => {
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
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href.replace(/^\/|\/$/g, '')
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[data-index]').each((_, el) => {
        const img = $(el)
        const src = img.attr('src')
        const indexAttr = img.attr('data-index')
        if (src && indexAttr) {
          const index = parseInt(indexAttr, 10) - 1
          pages.push({ url: src.trim(), index })
        }
      })

      // Sort by data-index to ensure correct order
      pages.sort((a, b) => a.index - b.index)

      // Re-index after sort
      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
