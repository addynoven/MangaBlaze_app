import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manhuahot.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ManhuaHot fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/manga\/(.+)/)
  return match?.[1]?.replace(/\/$/, '') || ''
}

export const manhuahotSource: MangaSource = {
  id: 'manhuahot',
  name: 'ManhuaHot',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.tab-content-wrap .c-tabs-item').each((_, el) => {
        const link = $(el).find('.tab-thumb a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('img').attr('alt') || ''
        const cover =
          link.find('img').attr('src') || link.find('img').attr('data-src') || '/images/placeholder.png'

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

      const title = $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim()
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('.summary_image img').first().attr('src') ||
        '/images/placeholder.png'
      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        ''

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [],
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.listing-chapters_wrap ul.main.version-chap li.wp-manga-chapter a[href*="/manga/"]').each(
        (_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const id = extractChapterIdFromHref(href)
          if (!id) return
          if (chapters.some((c) => c.id === id)) return

          const titleText = link.text().trim()
          const match = titleText.match(/(\d+(?:\.\d+)?)/)
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
        }
      )

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
