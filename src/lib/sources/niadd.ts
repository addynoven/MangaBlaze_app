import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.niadd.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Niadd fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\.html/)
  return match?.[1] || ''
}

function parseChapterDate(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString()
  const cleaned = dateStr.trim()
  const parsed = new Date(cleaned)
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

function extractChapterNumber(title: string): string {
  const patterns = [
    /Vol\.?\s*\S+\s*Ch\.?\s*(\d+(?:\.\d+)?)/i,
    /Ch\.?\s*(\d+(?:\.\d+)?)/i,
    /Chapter\s+(\d+(?:\.\d+)?)/i,
    /\b(\d+(?:\.\d+)?)\s*$/,
    /\b(\d+(?:\.\d+)?)\b/,
  ]
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1]
  }
  return '?'
}

export const niaddSource: MangaSource = {
  id: 'niadd',
  name: 'Niadd',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?name=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.manga-item').each((_, el) => {
        const link = $(el).find('a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = $(el).find('.manga-name').text().trim() || link.attr('title')?.trim() || id
        const cover = $(el).find('img').attr('src') || '/images/placeholder.png'
        const description = $(el).find('.manga-intro').text().trim() || undefined

        if (title) {
          results.push({ id, title, cover, description })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}.html`
      const $ = await fetchHTML(url)

      const title = $('h1.book-headline-name').first().text().trim() || $('[itemprop="name"]').first().text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('.bookside-img').attr('style')?.match(/url\(['"]?(.*?)['"]?\)/)?.[1] ||
        '/images/placeholder.png'

      const description = $('.detail-synopsis').first().text().trim()

      const authors: string[] = []
      const artists: string[] = []
      $('.bookside-general-cell, .detail-general-cell').each((_, el) => {
        const text = $(el).text()
        if (text.includes('Author')) {
          $(el).find('[itemprop="name"]').each((_, nameEl) => {
            const name = $(nameEl).text().trim()
            if (name && !authors.includes(name)) authors.push(name)
          })
        }
        if (text.includes('Artist')) {
          $(el).find('[itemprop="name"]').each((_, nameEl) => {
            const name = $(nameEl).text().trim()
            if (name && !artists.includes(name)) artists.push(name)
          })
        }
      })

      const genres: string[] = []
      $('[itemprop="genre"]').each((_, el) => {
        const genre = $(el).text().trim().replace(/^,\s*/, '')
        if (genre && !genres.includes(genre)) genres.push(genre)
      })

      const altTitles: string[] = []
      $('.bookside-general-cell, .detail-general-cell').each((_, el) => {
        const text = $(el).text()
        if (text.includes('Alternative')) {
          const raw = $(el).contents().not('span').text().trim() || $(el).text().replace(/Alternative\(s\)?:\s*/, '').trim()
          if (raw) {
            const splits = raw.split(/;|\n/).map((s) => s.trim()).filter(Boolean)
            splits.forEach((t) => {
              if (!altTitles.includes(t)) altTitles.push(t)
            })
          }
        }
      })

      const yearText = $('[itemprop="datePublished"]').first().text().trim()
      const year = yearText ? parseInt(yearText, 10) || null : null

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year,
        description,
        authors,
        artists,
        genres: [...new Set(genres)],
        altTitles,
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
      const url = `${BASE_URL}/manga/${mangaId}/chapters.html`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.chapter-list a.hover-underline').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        if (!href) return

        const title = link.find('.chp-title').text().trim() || link.attr('title')?.trim() || ''
        const id = href
        if (chapters.some((c) => c.id === id)) return

        const dateText = link.find('.chp-time').text().trim()
        const publishedAt = parseChapterDate(dateText)
        const chapterNumber = extractChapterNumber(title)

        chapters.push({
          id,
          chapterNumber,
          title: title || null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
          externalUrl: href,
          isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    // Niadd hosts metadata only; actual chapters are on ninemanga.com which is Cloudflare-blocked.
    return []
  },
}
