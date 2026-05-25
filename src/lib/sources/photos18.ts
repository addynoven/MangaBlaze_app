import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.photos18.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Photos18 fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function normalizeUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${BASE_URL}${url}`
  return url
}

export const photos18Source: MangaSource = {
  id: 'photos18',
  name: 'Photos18',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = query ? `${BASE_URL}/q/${encodeURIComponent(query)}` : BASE_URL
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.card').each((_, el) => {
        const card = $(el)
        // Title link is in .card-body without class="visited"
        const titleLink = card.find('.card-body a').first()
        const href = titleLink.attr('href') || ''
        const id = href.replace('/v/', '')
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = titleLink.text().trim()
        if (!title) return

        const cover =
          normalizeUrl(card.find('img').first().attr('src') || '') || '/images/placeholder.png'

        results.push({ id, title, cover })
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/v/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $("h1.title").first().text().trim()
      if (!title) return null

      const images = $('img[src*="img.photos18.com"]')
      const cover = normalizeUrl(images.first().attr('src') || '') || '/images/placeholder.png'

      const genre = $('.badge.badge-primary').first().text().trim()
      const genres = genre ? [genre] : []

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: images.length > 0 ? images.length.toString() : null,
        contentRating: 'erotica',
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
      const url = `${BASE_URL}/v/${mangaId}`
      const $ = await fetchHTML(url)

      const pages = $('img[src*="img.photos18.com"]').length

      const chapter: SourceChapter = {
        id: mangaId,
        chapterNumber: '1',
        title: 'Chapter 1',
        volume: null,
        language: 'en',
        pages,
        publishedAt: new Date().toISOString(),
        readableAt: new Date().toISOString(),
        externalUrl: null,
        isUnavailable: false,
      }

      return [chapter].slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/v/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="img.photos18.com"]').each((index, el) => {
        const src = $(el).attr('src')
        if (src) {
          pages.push({ url: normalizeUrl(src), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
