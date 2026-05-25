import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentainexus.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiNexus fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const hentainexusSource: MangaSource = {
  id: 'hentainexus',
  name: 'HentaiNexus',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = query ? `${BASE_URL}/?q=${encodeURIComponent(query)}` : BASE_URL
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.column.is-one-fifth, .column.is-one-quarter, .column.is-one-third, .column.is-half').each((_, el) => {
        const card = $(el).find('.card').first()
        const link = $(el).find('a[href^="/view/"]').first()
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/view\/(\d+)/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = card.find('.card-header-title').attr('title') || card.find('.card-header-title').text().trim()
        const cover = '' // will be fetched in getManga

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
      const url = `${BASE_URL}/view/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('meta[property="og:title"]').attr('content') || ''
      if (!title) return null

      const cover = $('meta[property="og:image"]').attr('content') || ''
      const description = $('meta[property="og:description"]').attr('content') || ''

      // Extract artist from title if present (e.g., "Title by Artist")
      const artists: string[] = []
      const byMatch = title.match(/by\s+(.+)$/)
      if (byMatch) {
        artists.push(byMatch[1].trim())
      }

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists,
        genres: [],
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
    // HentaiNexus has no chapters; each gallery is a single item
    try {
      return [
        {
          id: mangaId,
          chapterNumber: '1',
          title: null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/view/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*=".thumb.jpg"]').each((index, el) => {
        const thumbSrc = $(el).attr('src')
        if (thumbSrc) {
          // Remove .thumb to get full-size image
          const fullSrc = thumbSrc.replace('.thumb.jpg', '.jpg')
          pages.push({ url: fullSrc, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
