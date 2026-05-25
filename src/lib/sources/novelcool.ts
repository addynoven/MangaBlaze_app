import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.novelcool.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`NovelCool fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractMangaIdFromHref(href: string): string {
  const match = href.match(/\/novel\/(.*)$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/chapter\/(.*?)\/?$/)
  return match?.[1] || ''
}

export const novelcoolSource: MangaSource = {
  id: 'novelcool',
  name: 'NovelCool',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?name=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.book-item').each((_, el) => {
        const item = $(el)

        // Only include manga entries
        const type = item.find('.book-type').text().trim().toLowerCase()
        if (type !== 'manga') return

        const link = item.find('a[itemprop="url"]').first()
        const href = link.attr('href') || ''
        const id = extractMangaIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (results.some((r) => r.id === id)) return

        const title = item.find('.book-name').first().text().trim() || link.attr('title') || ''
        const img = item.find('img').first()
        const cover = img.attr('src') || img.attr('cover_url') || img.attr('lazy_url') || img.attr('data-src') || '/images/placeholder.png'

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
      const url = `${BASE_URL}/novel/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.bookinfo-title').first().text().trim()
      if (!title) return null

      const cover = $('.bookinfo-pic-img').first().attr('src') || '/images/placeholder.png'
      const description = $('.bk-summary-txt').first().text().trim()

      const authors: string[] = []
      $('.bookinfo-author span[itemprop="creator"]').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const genres: string[] = []
      $('.book-tag').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.bookinfo-category-list').each((_, el) => {
        const text = $(el).text().trim()
        if (text.includes('Status:')) {
          const statusText = text.replace(/.*Status:\s*/, '').trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled', 'dropped'].includes(statusText)) {
            status = statusText
          }
        }
      })

      const altTitles: string[] = []
      $('.bookinfo-alternative span[itemprop="alternateName"]').each((_, el) => {
        altTitles.push($(el).text().trim())
      })

      let year: number | null = null
      const yearText = $('span[itemprop="datePublished"]').first().text().trim()
      if (yearText) {
        const yearMatch = yearText.match(/(\d{4})/)
        if (yearMatch) year = parseInt(yearMatch[1], 10)
      }

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        description,
        authors: [...new Set(authors)],
        artists: [],
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
      const url = `${BASE_URL}/novel/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.chapter-item-list a[href*="/chapter/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        // Avoid duplicates
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.attr('title') || link.find('.chapter-item-headtitle').text().trim() || ''
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || titleText

        chapters.push({
          id,
          chapterNumber,
          title: titleText || null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Reverse to get oldest first
      chapters.reverse()

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/chapter/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.mangaread-manga-pic').each((index, el) => {
        const src = $(el).attr('src')
        if (src && src.startsWith('http')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
