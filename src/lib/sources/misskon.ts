import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://misskon.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`MissKon fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractIdFromHref(href: string): string {
  const match = href.match(/misskon\.com\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function normalizeUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  return url
}

function isGalleryImage(url: string): boolean {
  if (!url || url.includes('data:image/svg+xml')) return false
  if (url.includes('misskon.com/img/')) return false
  if (url.includes('ad-provider.js') || url.includes('bn.js')) return false
  // Exclude resized thumbnails like -310x163.webp
  if (/-\d+x\d+\.\w+$/.test(url)) return false
  return url.includes('tez.misskon.com') || url.includes('misskon.com/media/')
}

function extractPagesFromTitle(title: string): number {
  const match = title.match(/\((\d+)\s*photos/i)
  return match ? parseInt(match[1], 10) : 0
}

export const misskonSource: MangaSource = {
  id: 'misskon',
  name: 'MissKon',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.post-listing, article.post').each((_, el) => {
        const item = $(el)
        const link = item.find('.post-box-title a').first()
        const href = link.attr('href') || ''
        const id = extractIdFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover = normalizeUrl(
          item.find('.post-thumbnail img').attr('data-src') ||
            item.find('.post-thumbnail img').attr('src') ||
            '/images/placeholder.png'
        )

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
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.post-title').first().text().trim()
      if (!title) return null

      const cover = normalizeUrl(
        $('.post-thumbnail img').attr('data-src') ||
          $('.post-thumbnail img').attr('src') ||
          $('img.aligncenter.lazy').first().attr('data-src') ||
          $('img.aligncenter.lazy').first().attr('src') ||
          '/images/placeholder.png'
      )

      const genres: string[] = []
      $('.post-tag a, .post-cats a').each((_, el) => {
        const text = $(el).text().trim()
        if (text) genres.push(text)
      })

      const pages = extractPagesFromTitle(title)

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
        lastChapter: pages > 0 ? pages.toString() : null,
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
      const url = `${BASE_URL}/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.post-title').first().text().trim()
      const pages = extractPagesFromTitle(title)

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

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const baseUrl = `${BASE_URL}/${chapterId}/`
      const $first = await fetchHTML(baseUrl)

      // Determine total sub-pages from WordPress <!--nextpage--> pagination
      let totalSubPages = 1
      const pageNumbers = $first('.page-link .post-page-numbers')
        .map((_, el) => {
          const text = $first(el).text().trim()
          const num = parseInt(text, 10)
          return Number.isNaN(num) ? 0 : num
        })
        .get()
      const maxPage = Math.max(...pageNumbers, 1)
      if (maxPage > 1) totalSubPages = maxPage

      const allDocs: cheerio.CheerioAPI[] = [$first]
      if (totalSubPages > 1) {
        const fetches: Promise<cheerio.CheerioAPI>[] = []
        for (let i = 2; i <= totalSubPages; i++) {
          fetches.push(fetchHTML(`${BASE_URL}/${chapterId}/${i}/`))
        }
        const rest = await Promise.all(fetches)
        allDocs.push(...rest)
      }

      const pages: SourcePage[] = []
      const seen = new Set<string>()
      for (const $ of allDocs) {
        $('img.aligncenter.lazy, img.lazy').each((_, el) => {
          const src =
            $(el).attr('data-src')?.trim() || $(el).attr('src')?.trim() || ''
          if (!src || seen.has(src) || !isGalleryImage(src)) return
          seen.add(src)
          pages.push({ url: normalizeUrl(src), index: pages.length })
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
