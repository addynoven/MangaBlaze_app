import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://chapmanganato.to'
const SEARCH_URL = 'https://manganato.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaNato fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

export const manganatoSource: MangaSource = {
  id: 'manganato',
  name: 'MangaNato',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${SEARCH_URL}/search/story/${encodeURIComponent(query.replace(/\s+/g, '_'))}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.search-story-item').each((_, el) => {
        const item = $(el)
        const link = item.find('a').first()
        const href = link.attr('href') || ''
        const id = href.split('/').pop() || ''
        const title = item.find('.item-title').text().trim()
        const cover = item.find('img').attr('src') || item.find('img').attr('data-src') || '/images/placeholder.png'
        const status = item.find('.item-author').text().trim() || undefined

        if (id && title) {
          results.push({ id, title, cover, status })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${SEARCH_URL}/manga-${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.story-info-right h1').text().trim()
      if (!title) return null

      const cover = $('.info-image img').attr('src') || '/images/placeholder.png'
      const description = $('#panel-story-info-description').text().replace('Description :', '').trim()

      const authors: string[] = []
      const genres: string[] = []
      let status: string | undefined

      $('.variations-tableInfo tr').each((_, el) => {
        const label = $(el).find('.table-label').text().trim().toLowerCase()
        const value = $(el).find('.table-value').text().trim()
        if (label.includes('author')) authors.push(value)
        if (label.includes('status')) status = value.toLowerCase()
        if (label.includes('genres')) {
          $(el)
            .find('.table-value a')
            .each((_, a) => { genres.push($(a).text().trim()) })
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors,
        artists: [...authors],
        genres,
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
      const url = `${SEARCH_URL}/manga-${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.panel-story-chapter-list .a-h').each((_, el) => {
        const row = $(el)
        const link = row.find('a').first()
        const href = link.attr('href') || ''
        const id = href.split('/').pop() || ''
        const titleText = link.text().trim()

        // Parse "Chapter 123: Title" or "Vol.1 Chapter 123: Title"
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)[\s:]?(.*)/i)
        const chapterNumber = match?.[1] || '?'
        const title = match?.[2]?.trim() || null

        const timeText = row.find('.chapter-time').attr('title') || row.find('.chapter-time').text().trim()

        if (id) {
          chapters.push({
            id,
            chapterNumber,
            title,
            volume: null,
            language: 'en',
            pages: 0, // unknown until we fetch the chapter
            publishedAt: timeText || new Date().toISOString(),
            readableAt: timeText || new Date().toISOString(),
            externalUrl: null,
            isUnavailable: false,
          })
        }
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapter-${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.container-chapter-reader img').each((index, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src')
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
