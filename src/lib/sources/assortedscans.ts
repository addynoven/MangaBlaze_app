import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://assortedscans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`AssortedScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/reader\/([^/]+)\/?/)
  return match?.[1] || ''
}

export const assortedscansSource: MangaSource = {
  id: 'assortedscans',
  name: 'Assorted Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('#result-table tr.result').each((_, el) => {
        const row = $(el)
        const link = row.find('.result-title a').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = link.text().trim()
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
      const url = `${BASE_URL}/reader/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1#series-title').first().text().trim()
      if (!title) return null

      const cover = $('img.cover').attr('src') || '/images/placeholder.png'
      const description = $('#series-desc p').first().text().trim()

      const genres: string[] = []
      $('#series-categories .category').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const authors: string[] = []
      $('#series-authors .author').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('#series-artists .artist').each((_, el) => {
        artists.push($(el).text().trim())
      })

      const statusText = $('#series-status span').first().text().trim().toLowerCase()
      const status = ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(statusText) ? statusText : undefined

      const altTitles: string[] = []
      $('#series-aliases .alias').each((_, el) => {
        altTitles.push($(el).text().trim())
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
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

  async getChapters(
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/reader/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#chapters .chapter a, .chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = href
        if (!id || chapters.some((c) => c.id === id)) return

        const titleText = link.attr('title')?.trim() || link.text().trim()
        const volMatch = titleText.match(/Vol\.\s*(\d+)/i)
        const volume = volMatch?.[1] || null
        const match = titleText.match(/Ch\.\s*(\d+(?:\.\d+)?)/i) || titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}${href}`,
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
      const firstPageUrl = `${BASE_URL}${chapterId}1/`
      const res = await fetch(firstPageUrl, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`Chapter fetch error: ${res.status}`)
      const html = await res.text()
      const $ = cheerio.load(html)

      const pageLinks = $('.dropdown-list .page-details a, .page-list .dropdown-element a')
      const totalPages = pageLinks.length
      if (totalPages === 0) {
        const img = $('#page-image').attr('src')
        return img ? [{ url: img, index: 0 }] : []
      }

      const pageUrls: string[] = []
      pageLinks.each((_, el) => {
        const href = $(el).attr('href')
        if (href) pageUrls.push(`${BASE_URL}${href}`)
      })

      const pages: SourcePage[] = []
      const batchSize = 5
      for (let i = 0; i < pageUrls.length; i += batchSize) {
        const batch = pageUrls.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(async (url, batchIndex) => {
            try {
              const r = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT },
                next: { revalidate: 300 },
              })
              const text = await r.text()
              const $p = cheerio.load(text)
              const src = $p('#page-image').attr('src')
              return src ? { url: src, index: i + batchIndex } : null
            } catch {
              return null
            }
          })
        )
        batchResults.forEach((p) => {
          if (p) pages.push(p)
        })
      }

      pages.sort((a, b) => a.index - b.index)
      return pages
    } catch {
      return []
    }
  },
}
