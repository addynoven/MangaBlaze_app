import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangamaniacs.org'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaManiacs fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractMangaIdFromUrl(url: string): string {
  const match = url.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromUrl(url: string): string {
  const match = url.match(/\/manga\/(.+)/)
  return match?.[1]?.replace(/\/$/, '') || ''
}

function parseChapterNumber(text: string): string {
  const match = text.match(/Ch\.?\s*(\d+(?:\.\d+)?)/i)
  if (match) return match[1]
  const numMatch = text.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) return numMatch[1]
  return '?'
}

async function fetchSearchAjax(query: string): Promise<SourceManga[]> {
  const res = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: `action=wp-manga-search-manga&title=${encodeURIComponent(query)}`,
    next: { revalidate: 300 },
  })
  if (!res.ok) return []

  const json = (await res.json()) as { success?: boolean; data?: Array<{ title: string; url: string; type: string }> }
  if (!json.success || !Array.isArray(json.data)) return []

  const results: SourceManga[] = []
  for (const item of json.data) {
    const id = extractMangaIdFromUrl(item.url)
    if (!id || results.some((r) => r.id === id)) continue
    results.push({
      id,
      title: item.title.trim(),
      cover: '/images/placeholder.png',
    })
  }
  return results
}

async function fetchBrowsePage(page = 1): Promise<SourceManga[]> {
  const url = page === 1 ? `${BASE_URL}/manga/` : `${BASE_URL}/manga/page/${page}/`
  const $ = await fetchHTML(url)
  const results: SourceManga[] = []

  $('.page-item-detail.manga').each((_, el) => {
    const link = $(el).find('.item-thumb a[href*="/manga/"]').first()
    const href = link.attr('href') || ''
    const id = extractMangaIdFromUrl(href)
    if (!id || results.some((r) => r.id === id)) return

    const title = link.attr('title')?.trim() || $(el).find('.post-title h3 a').text().trim()
    const cover =
      link.find('img').attr('data-src') ||
      link.find('img').attr('src') ||
      '/images/placeholder.png'

    if (title) {
      results.push({ id, title, cover })
    }
  })

  return results
}

export const mangamaniacsSource: MangaSource = {
  id: 'mangamaniacs',
  name: 'MangaManiacs',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      let results: SourceManga[]
      if (!query.trim()) {
        results = await fetchBrowsePage(1)
      } else {
        results = await fetchSearchAjax(query.trim())
      }
      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.profile-manga .post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').first().attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '/images/placeholder.png'

      const description = $('.description-summary .summary__content').first().text().trim()

      const authors: string[] = []
      const artists: string[] = []
      const genres: string[] = []
      const altTitles: string[] = []
      let status: string | undefined
      let year: number | null = null

      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading h5').text().trim().toLowerCase()
        const content = $(el).find('.summary-content').first().text().trim()

        if (heading.includes('author')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => {
              const name = $(a).text().trim()
              if (name) authors.push(name)
            })
        } else if (heading.includes('artist')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => {
              const name = $(a).text().trim()
              if (name) artists.push(name)
            })
        } else if (heading.includes('genre')) {
          $(el)
            .find('.summary-content a')
            .each((_, a) => {
              const g = $(a).text().trim()
              if (g) genres.push(g)
            })
        } else if (heading.includes('alternative')) {
          content.split(/\/|,/).forEach((t) => {
            const trimmed = t.trim()
            if (trimmed) altTitles.push(trimmed)
          })
        } else if (heading.includes('status')) {
          const st = content.toLowerCase()
          if (st.includes('ongoing')) status = 'ongoing'
          else if (st.includes('completed')) status = 'completed'
          else if (st.includes('hiatus')) status = 'hiatus'
          else if (st.includes('dropped')) status = 'cancelled'
        } else if (heading.includes('release')) {
          const y = parseInt(content, 10)
          if (!isNaN(y)) year = y
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        contentRating: undefined,
        description: description || '',
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
        originalLanguage: undefined,
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)
      const chapters: SourceChapter[] = []

      $('.wp-manga-chapter').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterIdFromUrl(href)
        if (!id || chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const chapterNumber = parseChapterNumber(titleText)
        const dateText = $(el).find('.chapter-release-date i').text().trim()

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: dateText ? new Date().toISOString() : new Date().toISOString(),
          readableAt: dateText ? new Date().toISOString() : new Date().toISOString(),
          externalUrl: href || null,
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
      const url = `${BASE_URL}/manga/${chapterId}/`
      const $ = await fetchHTML(url)
      const pages: SourcePage[] = []

      $('img.wp-manga-chapter-img').each((index, el) => {
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
