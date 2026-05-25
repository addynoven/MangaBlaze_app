import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangadass.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaDass fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const mangadassSource: MangaSource = {
  id: 'mangadass',
  name: 'Manga Dass',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      // MangaDass search loads via AJAX, but the initial HTML contains results
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.item-title h3 a, #search-result a[href^="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.text().trim()
        if (!title) return

        // Find cover from sibling/parent img
        const parent = link.closest('.item-title, .inner, div')
        const cover =
          parent.siblings().find('img').attr('data-src') ||
          parent.siblings().find('img').attr('src') ||
          parent.parent().find('img').attr('data-src') ||
          parent.parent().find('img').attr('src') ||
          '/images/placeholder.png'

        results.push({ id, title, cover })
      })

      // Fallback: if no results from search page, scrape manga list and filter client-side
      if (results.length === 0) {
        const listUrl = `${BASE_URL}/manga`
        const $list = await fetchHTML(listUrl)

        $list('.item-title h3 a').each((_, el) => {
          const link = $list(el)
          const href = link.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id) return
          if (results.some((r) => r.id === id)) return

          const title = link.attr('title')?.trim() || link.text().trim()
          if (!title) return
          if (!title.toLowerCase().includes(query.toLowerCase())) return

          const cover =
            link.closest('.inner').find('.item-thumb img').attr('data-src') ||
            link.closest('.inner').find('.item-thumb img').attr('src') ||
            '/images/placeholder.png'

          results.push({ id, title, cover })
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.post-title h1').first().text().trim()
      if (!title) return null

      const cover =
        $('.summary_image img').attr('data-src') ||
        $('.summary_image img').attr('src') ||
        '/images/placeholder.png'

      // Description from meta tag if not in body
      const metaDesc = $('meta[name="description"]').attr('content') || ''
      const description = metaDesc.replace(/^Read .*? at MangaDass\.COM$/i, '').trim() || ''

      const genres: string[] = []
      $('.genres-content a, a[href*="/manga-genre/"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text) genres.push(text)
      })

      let status: string | undefined
      $('.summary-heading').each((_, el) => {
        const heading = $(el).text().trim().toLowerCase()
        if (heading.includes('status')) {
          const content = $(el).next('.summary-content').text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(content)) {
            status = content
          }
        }
      })

      const authors: string[] = []
      $('.summary-heading').each((_, el) => {
        const heading = $(el).text().trim().toLowerCase()
        if (heading.includes('author')) {
          $(el).next('.summary-content').find('a').each((_, a) => {
            authors.push($(a).text().trim())
          })
        }
      })

      const artists: string[] = []
      $('.summary-heading').each((_, el) => {
        const heading = $(el).text().trim().toLowerCase()
        if (heading.includes('artist')) {
          $(el).next('.summary-content').find('a').each((_, a) => {
            artists.push($(a).text().trim())
          })
        }
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a.chapter-name').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/manga\/[^/]+\/([^/]+)\/?$/)
        const id = slugMatch?.[1] || href
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || titleText

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
      const mangaId = chapterId.split('/')[0]
      const url = `${BASE_URL}/manga/${mangaId}/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[class^="p"]').each((index, el) => {
        const src =
          $(el).attr('data-src')?.trim() ||
          $(el).attr('src')?.trim()
        if (src && !src.includes('loading') && !src.includes('logo')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
