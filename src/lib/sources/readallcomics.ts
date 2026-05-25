import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://readallcomics.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ReadAllComics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractCategorySlug(href: string): string {
  const match = href.match(/\/category\/([^/]+)\/?$/)
  return match?.[1] || ''
}

async function browseHomepage(query?: string, limit = 20): Promise<SourceManga[]> {
  const results: SourceManga[] = []
  const seen = new Set<string>()
  const queryLower = query?.toLowerCase()

  for (let page = 1; page <= 3; page++) {
    if (results.length >= limit) break
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/page/${page}/`
    const $ = await fetchHTML(url)

    $('a.cat-title').each((_, el) => {
      const link = $(el)
      const href = link.attr('href') || ''
      const id = extractCategorySlug(href)
      if (!id || seen.has(id)) return

      const title = link.text().trim()
      if (!title) return

      if (queryLower && !title.toLowerCase().includes(queryLower)) return

      const li = link.closest('li')
      const cover =
        li.find('img.book-cover').attr('src') ||
        link.closest('article, .post, #primary').find('img.book-cover').attr('src') ||
        '/images/placeholder.png'

      const lastChapterEl = li.find('a.latest-chapter').first()
      const lastChapter = lastChapterEl.text().trim() || null

      seen.add(id)
      results.push({ id, title, cover, lastChapter })
    })
  }

  return results.slice(0, limit)
}

export const readallcomicsSource: MangaSource = {
  id: 'readallcomics',
  name: 'ReadAllComics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // Try direct search first
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const hasResults = $('#primary .cat-title, #primary a[href*="/category/"]').length > 0
      const noResultsText = $('#primary').text().toLowerCase().includes('no results')

      if (hasResults && !noResultsText) {
        const results: SourceManga[] = []
        const seen = new Set<string>()

        $('#primary a.cat-title').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const id = extractCategorySlug(href)
          if (!id || seen.has(id)) return

          const title = link.text().trim()
          if (!title) return

          const cover =
            link.closest('li, article, .post').find('img.book-cover, img').first().attr('src') ||
            '/images/placeholder.png'

          seen.add(id)
          results.push({ id, title, cover })
        })

        return results.slice(0, limit)
      }

      // Fall back to browsing homepage pages and filtering client-side
      return await browseHomepage(query, limit)
    } catch {
      try {
        return await browseHomepage(query, limit)
      } catch {
        return []
      }
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/category/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1 b').first().text().trim() || $('h1').first().text().trim()
      if (!title) return null

      // Cover is the first <img> inside a <p> that has inline float styles
      const coverImg = $('p img[style*="float"]').first()
      const cover =
        coverImg.attr('src') ||
        $('.b img').first().attr('src') ||
        $('img').first().attr('src') ||
        '/images/placeholder.png'

      // Description from the .b div (synopsis block)
      const descBlock = $('div.b').first()
      const description = descBlock.text().trim() || ''

      // Genres from "Genres: <strong>..."
      const genres: string[] = []
      const genresText = $('p:contains("Genres:") strong').first().text().trim()
      if (genresText) {
        genresText.split(',').forEach((g) => {
          const genre = g.trim()
          if (genre) genres.push(genre)
        })
      }

      // Authors from "Publisher: <strong>..."
      const authors: string[] = []
      const publisherEl = $('p:contains("Publisher:")')
      if (publisherEl.length) {
        const html = publisherEl.html() || ''
        const pubMatch = html.match(/Publisher:\s*<strong>([^<]+)<\/strong>/i)
        if (pubMatch?.[1]) {
          authors.push(pubMatch[1].trim())
        }
      }

      return {
        id: mangaId,
        title,
        cover,
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
      const url = `${BASE_URL}/category/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('ul.list-story li a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/readallcomics\.com\/([^/]+)\/?$/)
        const id = slugMatch?.[1] || ''
        if (!id || seen.has(id)) return

        const titleText = link.text().trim()

        // Try to extract chapter number from common patterns like #01, 136, 003, etc.
        const match = titleText.match(/#?(\d+(?:\.\d+)?)/)
        const chapterNumber = match?.[1] || '?'

        seen.add(id)
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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('article p img, .entry-content p img, #content p img, p img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('icon.png') && !src.includes('ads')) {
          pages.push({ url: src, index })
        }
      })

      // Deduplicate while preserving order
      const seen = new Set<string>()
      return pages.filter((p) => {
        if (seen.has(p.url)) return false
        seen.add(p.url)
        return true
      })
    } catch {
      return []
    }
  },
}
