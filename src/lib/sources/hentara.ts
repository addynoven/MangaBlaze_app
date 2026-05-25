import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentara.com'
const CDN_URL = 'https://cdn.hentara.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hentara fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

interface VisibleCatalog {
  manhwas: Record<string, { enabledAt: string; title: string }>
}

let visibleCatalogCache: VisibleCatalog | null = null
let visibleCatalogCacheTime = 0

async function getVisibleCatalog(): Promise<VisibleCatalog> {
  const now = Date.now()
  if (visibleCatalogCache && now - visibleCatalogCacheTime < 5 * 60 * 1000) {
    return visibleCatalogCache
  }
  const res = await fetch(`${BASE_URL}/data/visible.json`, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Hentara catalog fetch error: ${res.status}`)
  const data = (await res.json()) as VisibleCatalog
  visibleCatalogCache = data
  visibleCatalogCacheTime = now
  return data
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manhwa\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterSlugFromHref(href: string): string {
  const match = href.match(/\/manhwa\/[^/]+\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function guessCoverUrl(slug: string): string {
  return `${CDN_URL}/${slug}/thumbnail.webp`
}

function parseJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  try {
    const script = $('script[type="application/ld+json"]').first().html()
    if (!script) return null
    return JSON.parse(script) as Record<string, unknown>
  } catch {
    return null
  }
}

function getComicSeriesFromLd(ld: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!ld) return null
  if (ld['@type'] === 'ComicSeries') return ld
  const graph = ld['@graph']
  if (Array.isArray(graph)) {
    return (graph.find((item) => item['@type'] === 'ComicSeries') as Record<string, unknown>) || null
  }
  return null
}

export const hentaraSource: MangaSource = {
  id: 'hentara',
  name: 'Hentara',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const catalog = await getVisibleCatalog()
      const lowerQuery = query.toLowerCase()
      const results: SourceManga[] = []

      for (const [slug, info] of Object.entries(catalog.manhwas)) {
        if (!slug || slug.match(/^\d+$/)) continue
        const title = info.title
        if (!title.toLowerCase().includes(lowerQuery)) continue

        results.push({
          id: slug,
          title,
          cover: guessCoverUrl(slug),
          contentRating: 'Adult',
        })

        if (results.length >= limit) break
      }

      return results
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manhwa/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.ssr-info h1').first().text().trim()
      if (!title) return null

      const cover =
        $('img.ssr-cover').attr('src') ||
        $('link[rel="preload"][as="image"]').attr('href') ||
        guessCoverUrl(mangaId)

      const description = $('.ssr-description').first().text().trim() || ''

      const ld = parseJsonLd($)
      const series = getComicSeriesFromLd(ld)

      const genres: string[] = []
      $('.ssr-header .ssr-genres .ssr-genre').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !genres.includes(text)) genres.push(text)
      })
      if (genres.length === 0 && series && Array.isArray(series.genre)) {
        for (const g of series.genre) {
          if (typeof g === 'string' && !genres.includes(g)) genres.push(g)
        }
      }

      let status: string | undefined
      const statusEl = $('.ssr-status').first()
      if (statusEl.hasClass('ongoing')) status = 'ongoing'
      else if (statusEl.hasClass('completed')) status = 'completed'

      let lastChapter: string | null = null
      const chaptersCountText = $('.ssr-chapters-count').first().text().trim()
      const countMatch = chaptersCountText.match(/(\d+)\s+chapters?/i)
      if (countMatch) lastChapter = countMatch[1]

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        contentRating: 'Adult',
        description: description || (series?.description as string) || '',
        authors: [],
        artists: [],
        genres,
        altTitles: [],
        originalLanguage: 'ko',
        lastVolume: null,
        lastChapter,
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
      const url = `${BASE_URL}/manhwa/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.ssr-chapters-grid .ssr-chapter').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const chapterSlug = extractChapterSlugFromHref(href)
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (seen.has(id)) return
        seen.add(id)

        const text = link.text().trim()
        const numMatch = text.match(/Ch\.?\s*(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || chapterSlug.replace(/chapter-?/i, '')

        chapters.push({
          id,
          chapterNumber: String(chapterNumber),
          title: text || `Chapter ${chapterNumber}`,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Sort by chapter number descending (newest first) then reverse for ascending
      chapters.sort((a, b) => {
        const na = parseFloat(a.chapterNumber) || 0
        const nb = parseFloat(b.chapterNumber) || 0
        return na - nb
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/manhwa/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.reader-images img').each((index, el) => {
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
