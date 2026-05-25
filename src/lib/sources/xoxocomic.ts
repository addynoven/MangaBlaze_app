import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://xoxocomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`XOXO Comics fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comic\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const xoxocomicSource: MangaSource = {
  id: 'xoxocomic',
  name: 'XOXO Comics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search-comic?keyword=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []

      // Extract from JSON-LD schema
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).text())
          if (json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
            for (const item of json.itemListElement) {
              if (item['@type'] === 'ListItem' && item.url) {
                const id = extractSlugFromHref(item.url)
                if (id && !results.some((r) => r.id === id)) {
                  results.push({
                    id,
                    title: item.name || id,
                    cover: '/images/placeholder.png',
                  })
                }
              }
            }
          }
        } catch {
          // ignore invalid JSON
        }
      })

      // Also extract from any comic links in the page
      $('a[href*="/comic/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = $(el).attr('title') || $(el).text().trim() || id
        if (title && title.toLowerCase() !== 'comic list') {
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
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim().replace(/\s+-\s+Read Full List of Chapters.*$/, '')
      if (!title) return null

      const cover = $('img[src*="/images/series/"]').first().attr('src') || '/images/placeholder.png'
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
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#nt_listchapter ul li .chapter a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const match = titleText.match(/Issue\s+#?(\d+(?:\.\d+)?)/i) ||
          titleText.match(/Annual\s+#?(\d+(?:\.\d+)?)/i) ||
          id.match(/issue-(\d+(?:\.\d+)?)/i) ||
          id.match(/annual-(\d+(?:\.\d+)?)/i)
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
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/comic/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img.single-page.lazy[data-original]').each((index, el) => {
        const src = $(el).attr('data-original')?.trim()
        if (src) {
          pages.push({ url: src, index })
        }
      })

      // Fallback to src if data-original is missing
      if (pages.length === 0) {
        $('img.single-page').each((index, el) => {
          const src = $(el).attr('src')?.trim()
          if (src && !src.startsWith('data:image')) {
            pages.push({ url: src, index })
          }
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
