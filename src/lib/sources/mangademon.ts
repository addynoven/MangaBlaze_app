import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://demonicscans.org'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MangaDemon fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const mangademonSource: MangaSource = {
  id: 'mangademon',
  name: 'Manga Demon',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search.php?manga=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = decodeURIComponent(href.replace('/manga/', ''))
        if (!id || results.some((r) => r.id === id)) return

        const img = link.find('img.search-thumb')
        const title = link.text().trim() || img.attr('alt') || id
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
      const url = `${BASE_URL}/manga/${encodeURIComponent(mangaId)}`
      const $ = await fetchHTML(url)

      const title = $('h1.big-fat-titles').first().text().trim() || mangaId
      if (!title) return null

      const cover =
        $('#manga-page img.border-box[onerror="errorimg(this)"]').first().attr('src') ||
        '/images/placeholder.png'

      const description = $('meta[name="description"]').attr('content')?.trim() || ''

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
      // First, fetch the manga page to get the manga numeric ID from the "read first" link
      const mangaUrl = `${BASE_URL}/manga/${encodeURIComponent(mangaId)}`
      const $manga = await fetchHTML(mangaUrl)

      const firstChapHref = $manga('a#read-first').attr('href') || ''
      const mangaIdMatch = firstChapHref.match(/[?&]manga=(\d+)/)
      const numericMangaId = mangaIdMatch?.[1]
      if (!numericMangaId) return []

      // Fetch the first chapter page to extract the chapter list from the dropdown
      const firstChapterUrl = `${BASE_URL}/chaptered.php?manga=${numericMangaId}&chapter=1`
      const $chapter = await fetchHTML(firstChapterUrl)

      const chapters: SourceChapter[] = []
      $chapter('select option').each((_, el) => {
        const value = $chapter(el).attr('value') || ''
        if (!value) return

        const text = $chapter(el).text().trim()
        const numMatch = text.match(/Chapter[:\s]*(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || text

        // Use the full URL path as chapter ID
        const id = value.replace(`${BASE_URL}`, '').replace(/^\//, '')

        if (chapters.some((c) => c.id === id)) return

        chapters.push({
          id,
          chapterNumber,
          title: text,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: `${BASE_URL}${value.startsWith('/') ? '' : '/'}${value}`,
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
      $('img.imgholder').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('/img/free_ads.jpg') && !src.includes('/img/noimg.jpg')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
