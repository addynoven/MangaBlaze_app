import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://digitalcomicmuseum.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string, options?: RequestInit): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
    ...options,
  })
  if (!res.ok) throw new Error(`Digital Comic Museum fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const digitalcomicmuseumSource: MangaSource = {
  id: 'digitalcomicmuseum',
  name: 'Digital Comic Museum',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/index.php?ACT=dosearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `terms=${encodeURIComponent(query)}`,
      })

      const results: SourceManga[] = []
      $('tbody tr').each((_, el) => {
        const link = $(el).find("a[href*='dlid=']").first()
        const href = link.attr('href') || ''
        const idMatch = href.match(/dlid=(\d+)/)
        const id = idMatch?.[1] || ''
        if (!id || results.some((r) => r.id === id)) return

        const title = link.text().trim()
        if (title) {
          results.push({ id, title, cover: '/images/placeholder.png' })
        }
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/index.php?dlid=${mangaId}`)
      const titleText = $('title').first().text().replace('Digital Comic Museum - ', '').trim()
      if (!titleText) return null

      const previewLink = $("a[href*='preview/index.php?did=']").attr('href') || ''
      const didMatch = previewLink.match(/did=(\d+)/)
      const did = didMatch?.[1] || ''

      const cover = did ? `${BASE_URL}/thumbnails/${did}.jpg` : '/images/placeholder.png'

      return {
        id: mangaId,
        title: titleText,
        cover,
        status: 'completed',
        year: null,
        description: 'Public domain Golden Age comic book from Digital Comic Museum.',
        authors: [],
        artists: [],
        genres: ['Comic Book', 'Public Domain'],
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
      const $ = await fetchHTML(`${BASE_URL}/index.php?dlid=${mangaId}`)
      const previewLink = $("a[href*='preview/index.php?did=']").attr('href') || ''
      const didMatch = previewLink.match(/did=(\d+)/)
      const did = didMatch?.[1] || ''

      const titleText = $('title').first().text().replace('Digital Comic Museum - ', '').trim()

      return [
        {
          id: `${mangaId}:${did}`,
          chapterNumber: '1',
          title: titleText || 'Issue',
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: did ? `${BASE_URL}/preview/index.php?did=${did}&page=1` : null,
          isUnavailable: false,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const parts = chapterId.split(':')
      const did = parts[1] || ''
      if (!did) return []

      const $ = await fetchHTML(`${BASE_URL}/preview/index.php?did=${did}&page=1`)
      const pageText = $('body').text().match(/Page\s+1\s+of\s+(\d+)/)
      const pageCount = parseInt(pageText?.[1] || '0', 10)
      if (!pageCount) return []

      const pages: SourcePage[] = []
      for (let i = 1; i <= pageCount; i++) {
        pages.push({ url: `${BASE_URL}/images/pages/${did}/${i}.jpg`, index: i - 1 })
      }
      return pages
    } catch {
      return []
    }
  },
}
