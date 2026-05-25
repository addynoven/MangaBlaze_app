import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.commitstrip.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`CommitStrip fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/commitstrip\.com\/(\d{4}\/\d{2}\/\d{2}\/[^/]+)\/?$/)
  return match?.[1] || ''
}

export const commitstripSource: MangaSource = {
  id: 'commitstrip',
  name: 'Commit Strip',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('a[href*="commitstrip.com/20"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const slug = extractSlugFromUrl(href)
        if (!slug || seen.has(slug)) return
        seen.add(slug)

        const title = $(el).text().trim()
        if (!title) return

        results.push({ id: slug, title, cover: '/images/placeholder.png' })
      })

      const limited = results.slice(0, limit)

      // Fetch covers
      await Promise.all(
        limited.map(async (r) => {
          try {
            const post$ = await fetchHTML(`${BASE_URL}/${r.id}/`)
            const img = post$('div.entry-content img.aligncenter').first().attr('src') ||
              post$('div.entry-content img.size-full').first().attr('src') ||
              post$('div.entry-content img').first().attr('src') ||
              ''
            if (img) r.cover = img
          } catch {
            // leave placeholder
          }
        })
      )

      return limited
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim() || $('h2.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('div.entry-content img.aligncenter').first().attr('src') ||
        $('div.entry-content img.size-full').first().attr('src') ||
        $('div.entry-content img').first().attr('src') ||
        '/images/placeholder.png'

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
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim() || $('h2.entry-title').first().text().trim() || mangaId

      // Each Commit Strip post is a single comic strip with one "chapter"
      return [
        {
          id: mangaId,
          chapterNumber: '1',
          title,
          volume: null,
          language: 'en',
          pages: 1,
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []

      $('div.entry-content img.aligncenter').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('logo') && !src.includes('shop') && !src.includes('rss')) {
          pages.push({ url: src, index })
        }
      })

      if (pages.length === 0) {
        $('div.entry-content img.size-full').each((index, el) => {
          const src = $(el).attr('src')?.trim()
          if (src && !src.includes('logo') && !src.includes('shop') && !src.includes('rss')) {
            pages.push({ url: src, index })
          }
        })
      }

      if (pages.length === 0) {
        $('div.entry-content img').each((index, el) => {
          const src = $(el).attr('src')?.trim()
          if (src && !src.includes('logo') && !src.includes('shop') && !src.includes('rss')) {
            pages.push({ url: src, index })
          }
        })
      }

      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
