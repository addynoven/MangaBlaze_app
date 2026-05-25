import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://comicfury.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ComicFury fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function normalizeUrl(url: string): string {
  if (url.startsWith('/')) return `${BASE_URL}${url}`
  if (url.startsWith('http')) return url
  return `${BASE_URL}/${url}`
}

export const comicfurySource: MangaSource = {
  id: 'comicfury',
  name: 'Comic Fury',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search.php?combinedquery=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.webcomic-result').each((_, el) => {
        const item = $(el)
        const link = item.find('.webcomic-result-title a').first()
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/comicprofile\.php\?url=([^&/]+)/)
        const id = slugMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim() || item.find('.webcomic-result-title').attr('title') || id
        const cover =
          normalizeUrl(item.find('.webcomic-result-avatar img').attr('src') || '/images/placeholder.png')

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
      const url = `${BASE_URL}/comicprofile.php?url=${encodeURIComponent(mangaId)}`
      const $ = await fetchHTML(url)

      const title =
        $('.desktop-webcomic-link a').first().text().trim() ||
        $('.mobile-webcomic-link a').first().text().trim() ||
        mangaId
      if (!title) return null

      const cover =
        normalizeUrl(
          $('.desktop-webcomic-link img').first().attr('src') ||
          $('.mobile-webcomic-link img').first().attr('src') ||
          '/images/placeholder.png'
        )

      const description = ''

      const genres: string[] = []
      $('.authorinfo').each((_, el) => {
        const label = $(el).find('.infoname').first().text().trim()
        if (label === 'Genre:') {
          $(el).find('.info a').each((__, aEl) => {
            genres.push($(aEl).text().trim())
          })
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
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
      const url = `${BASE_URL}/read/${encodeURIComponent(mangaId)}/archive`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.archive-comic').each((_, el) => {
        const item = $(el)
        const href = item.closest('a').attr('href') || item.parent('a').attr('href') || ''
        const idMatch = href.match(/\/comics\/(\d+)/)
        const comicId = idMatch?.[1] || ''
        if (!comicId) return

        const id = `${mangaId}/${comicId}`
        if (chapters.some((c) => c.id === id)) return

        const title = item.find('.archive-comic-title').text().trim()
        const dateText = item.find('.archive-comic-date').text().trim()
        const date = dateText ? new Date(dateText) : new Date()

        chapters.push({
          id,
          chapterNumber: (chapters.length + 1).toString(),
          title: title || `Page ${chapters.length + 1}`,
          volume: null,
          language: 'en',
          pages: 1,
          publishedAt: date.toISOString(),
          readableAt: date.toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      return chapters.reverse().slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      // chapterId format: "{slug}/{comicId}"
      const parts = chapterId.split('/')
      if (parts.length < 2) return []
      const comicId = parts[parts.length - 1]
      const slug = parts.slice(0, parts.length - 1).join('/')
      
      const url = `${BASE_URL}/read/${slug}/comics/${comicId}`
      const $ = await fetchHTML(url)

      const imgSrc = $('.is--image-segment img').attr('src')
      if (!imgSrc) return []

      return [{ url: imgSrc, index: 0 }]
    } catch {
      return []
    }
  },
}
