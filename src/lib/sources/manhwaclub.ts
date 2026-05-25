import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manhwaclub.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ManhwaClub fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function cleanTitle(title: string): string {
  return title.replace(/^18\+\s*/, '').trim()
}

export const manhwaclubSource: MangaSource = {
  id: 'manhwaclub',
  name: 'ManhwaClub',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.c-tabs-item').each((_, el) => {
        const item = $(el)
        const thumbLink = item.find('.tab-thumb a').first()
        const img = item.find('.tab-thumb img').first()
        const href = thumbLink.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = cleanTitle(img.attr('alt') || thumbLink.attr('title') || '')
        const cover = img.attr('src') || '/images/placeholder.png'

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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const rawTitle = $('.post-title h1').first().text().trim()
      const title = cleanTitle(rawTitle)
      if (!title) return null

      const cover =
        $('.summary_image img').attr('src') ||
        $('.profile-manga img').attr('src') ||
        '/images/placeholder.png'

      const description =
        $('.description-summary .summary__content').first().text().trim() ||
        $('.summary__content').first().text().trim() ||
        ''

      const genres: string[] = []
      $('.genres-content a, a[href*="/manga-genre/"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !genres.includes(text)) genres.push(text)
      })

      let status: string | undefined
      $('.post-status .summary-content, .mg_status .summary-content').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      $('.mg_author .summary-content a').each((_, el) => {
        authors.push($(el).text().trim())
      })

      const artists: string[] = []
      $('.mg_artists .summary-content a').each((_, el) => {
        artists.push($(el).text().trim())
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('li.wp-manga-chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/manga\/[^/]+\/([^/]+)\/?$/)
        const chapterSlug = slugMatch?.[1] || ''
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (seen.has(id)) return
        seen.add(id)

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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      // chapterId from getChapters is like "chapter-15" — we need to find which manga it belongs to
      // The chapter pages URL pattern is: /manga/{mangaId}/{chapterId}/
      // But we don't have mangaId here. We'll try to fetch the chapter URL directly
      // by constructing it from common patterns, or we can try the chapter ID as a slug.

      const url = `${BASE_URL}/manga/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.wp-manga-chapter-img').each((index, el) => {
        const src = $(el).attr('src')
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
