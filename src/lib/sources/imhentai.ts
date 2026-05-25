import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://imhentai.xxx'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`IMHentai fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const imhentaiSource: MangaSource = {
  id: 'imhentai',
  name: 'IMHentai',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?key=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('.thumb').each((_, el) => {
        const thumb = $(el)
        const link = thumb.find('.inner_thumb a').last()
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/gallery\/(\d+)\/$/)
        const id = idMatch?.[1] || ''
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = link.text().trim()
        if (!title) return

        const cover =
          thumb.find('img.lazy').attr('data-src') ||
          thumb.find('img.lazy').attr('src') ||
          '/images/placeholder.png'

        results.push({ id, title, cover })
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('title').first().text().trim().replace(/ - IMHentai$/, '')
      if (!title) return null

      const cover =
        $('img.lazy').first().attr('data-src') ||
        $('img.lazy').first().attr('src') ||
        '/images/placeholder.png'

      const pagesText = $('li.pages').text()
      const pagesMatch = pagesText.match(/(\d+)/)
      const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [],
        altTitles: [],
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: pages > 0 ? String(pages) : null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const pagesText = $('li.pages').text()
      const pagesMatch = pagesText.match(/(\d+)/)
      const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0

      return [
        {
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
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      // Fetch first page to determine image URL pattern
      const firstPageUrl = `${BASE_URL}/view/${chapterId}/1/`
      const first$ = await fetchHTML(firstPageUrl)
      const firstImg = first$('img#gimg').attr('src')
      if (!firstImg) return []

      // Derive pattern: replace /1.jpg with /{n}.jpg
      const extMatch = firstImg.match(/\/(\d+)\.(\w+)$/)
      if (!extMatch) return []
      const baseUrl = firstImg.replace(/\/(\d+)\.(\w+)$/, '/')
      const ext = extMatch[2]

      // Fetch gallery page to get total pages
      const gallery$ = await fetchHTML(`${BASE_URL}/gallery/${chapterId}/`)
      const pagesText = gallery$('li.pages').text()
      const pagesMatch = pagesText.match(/(\d+)/)
      const totalPages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0
      if (!totalPages) return []

      const pages: SourcePage[] = []
      for (let i = 1; i <= totalPages; i++) {
        pages.push({ url: `${baseUrl}${i}.${ext}`, index: i - 1 })
      }

      return pages
    } catch {
      return []
    }
  },
}
