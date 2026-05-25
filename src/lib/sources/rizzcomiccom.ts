import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://rizzcomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Rizz Comic fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function makeAbsoluteUrl(url: string): string {
  if (!url) return '/images/placeholder.png'
  if (url.startsWith('http')) return url
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return BASE_URL + url
  return url
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterSlugFromHref(href: string): string {
  const match = href.match(/\/([^/]+-chapter-[^/]+)\/?$/)
  if (match) return match[1]
  const match2 = href.match(/\/([^/]+)\/?$/)
  return match2?.[1] || ''
}

export const rizzcomiccomSource: MangaSource = {
  id: 'rizzcomiccom',
  name: 'Rizz Comic (unoriginal)',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('.bsx').each((_, el) => {
        // Links may be absolute URLs like https://rizzcomic.com/manga/...
        const link = $(el).find('a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = link.attr('title')?.trim() || $(el).find('.tt').text().trim() || link.text().trim()
        const cover = makeAbsoluteUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')

        if (title) {
          results.push({ id, title, cover })
        }
      })

      // Fallback: search results may use serieslist layout
      if (results.length === 0) {
        $('.serieslist .imgseries a.series, a[href^="/manga/"]').each((_, el) => {
          const href = $(el).attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id || seen.has(id)) return
          seen.add(id)

          const title = $(el).text().trim() || $(el).attr('title')?.trim() || ''
          const cover = makeAbsoluteUrl($(el).find('img').attr('src') || $(el).closest('.serieslist, li').find('img').attr('src') || '')

          if (title) {
            results.push({ id, title, cover })
          }
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

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover = makeAbsoluteUrl($('.thumb img').attr('src') || $('.thumb img').attr('data-src') || '')

      let description = ''
      const descContainer = $('#description-container').html()
      if (descContainer && descContainer.trim().length > 0) {
        description = $('#description-container').text().trim()
      }
      if (!description) {
        $('script').each((_, el) => {
          const text = $(el).html() || ''
          const match = text.match(/var\s+description\s*=\s*"([^"]*)"\s*;/)
          if (match) description = match[1]
        })
      }

      const genres: string[] = []
      $('a[href^="/genre/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const status = $('.bs-status').first().text().trim().toLowerCase()

      const authors: string[] = []
      const artists: string[] = []
      $('.tsinfo .imptdt').each((_, el) => {
        const label = $(el).contents().first().text().trim().toLowerCase()
        const value = $(el).find('i').text().trim()
        if (label.includes('author') && value) authors.push(value)
        if (label.includes('artist') && value) artists.push(value)
      })

      return {
        id: mangaId,
        title,
        cover,
        status: ['ongoing', 'completed', 'hiatus', 'cancelled'].includes(status) ? status : undefined,
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
      const seen = new Set<string>()

      $('.eplister ul li').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = link.find('.chapterdate').text().trim()
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString()

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
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
      const url = `${BASE_URL}/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.entry-content img[src], .readercontent img[src]').each((index, el) => {
        const src = $(el).attr('src')
        if (src && (src.startsWith('http') || src.startsWith('//')) && !src.includes('logo') && !src.includes('readerarea.svg')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
