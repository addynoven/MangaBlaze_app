import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://reader.mangatellers.gr'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string, init?: RequestInit): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    next: { revalidate: 300 },
    ...init,
    headers: {
      'User-Agent': USER_AGENT,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Mangatellers fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/series\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/read\/(.+)/)
  return match?.[1]?.replace(/\/$/, '') || ''
}

export const mangatellersSource: MangaSource = {
  id: 'mangatellers',
  name: 'Mangatellers',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/search/`, {
        method: 'POST',
        body: new URLSearchParams({ search: query }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })

      const results: SourceManga[] = []
      $('.list .group').each((_, el) => {
        const link = $(el).find('.title a[href*="/series/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('.comic.info h1.title').first().text().trim()
      if (!title) return null

      const cover = $('.comic.info .thumbnail img').first().attr('src') || '/images/placeholder.png'
      let description = $('.comic.info .info').first().text().trim()
      if (description.startsWith('Synopsis:')) {
        description = description.replace('Synopsis:', '').trim()
      }

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
      const url = `${BASE_URL}/series/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.list .group .element .title a[href*="/read/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const metaText = link.closest('.element').find('.meta_r').text().trim()
        const dateMatch = metaText.match(/(\d{4})\.(\d{2})\.(\d{2})/)
        const publishedAt = dateMatch
          ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T00:00:00.000Z`
          : new Date().toISOString()

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
      const url = `${BASE_URL}/read/${chapterId}/`
      const $ = await fetchHTML(url)

      const scriptText = $('script')
        .map((_, el) => $(el).text())
        .get()
        .join('\n')
      const pagesMatch = scriptText.match(/var pages = (\[[\s\S]*?\]);/)
      if (!pagesMatch) return []

      const pages: Array<{ url: string }> = JSON.parse(pagesMatch[1])
      return pages.map((p, index) => ({ url: p.url, index }))
    } catch {
      return []
    }
  },
}
