import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.pornpics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`PornPics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractGalleryIdFromHref(href: string): string {
  const match = href.match(/-(\d+)\/?$/)
  return match?.[1] || ''
}

export const pornpicsSource: MangaSource = {
  id: 'pornpics',
  name: 'PornPics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('li.thumbwook a.rel-link').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = link.attr('data-gid') || extractGalleryIdFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = link.attr('title')?.trim() || ''
        if (!title) return

        const cover =
          link.find('img').attr('data-src') ||
          link.find('img').attr('src') ||
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
      // Need to find the gallery slug first via search or guess the URL
      const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(mangaId)}`
      const $search = await fetchHTML(searchUrl)

      let galleryHref = ''
      $search('li.thumbwook a.rel-link').each((_, el) => {
        const link = $search(el)
        const gid = link.attr('data-gid') || ''
        if (gid === mangaId) {
          galleryHref = link.attr('href') || ''
          return false
        }
      })

      if (!galleryHref) return null

      const $gallery = await fetchHTML(galleryHref)
      const title = $gallery('h1').first().text().trim()
      if (!title) return null

      const cover =
        $gallery('li.thumbwook a.rel-link img').first().attr('data-src') ||
        $gallery('li.thumbwook a.rel-link img').first().attr('src') ||
        '/images/placeholder.png'

      const pages = $gallery('li.thumbwook a.rel-link').length

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

  async getChapters(
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(mangaId)}`
      const $search = await fetchHTML(searchUrl)

      let galleryHref = ''
      let title = ''
      $search('li.thumbwook a.rel-link').each((_, el) => {
        const link = $search(el)
        const gid = link.attr('data-gid') || ''
        if (gid === mangaId) {
          galleryHref = link.attr('href') || ''
          title = link.attr('title')?.trim() || ''
          return false
        }
      })

      if (!galleryHref) return []

      const $gallery = await fetchHTML(galleryHref)
      const pages = $gallery('li.thumbwook a.rel-link').length

      return [
        {
          id: mangaId,
          chapterNumber: '1',
          title: title || 'Chapter 1',
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
      const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(chapterId)}`
      const $search = await fetchHTML(searchUrl)

      let galleryHref = ''
      $search('li.thumbwook a.rel-link').each((_, el) => {
        const link = $search(el)
        const gid = link.attr('data-gid') || ''
        if (gid === chapterId) {
          galleryHref = link.attr('href') || ''
          return false
        }
      })

      if (!galleryHref) return []

      const $gallery = await fetchHTML(galleryHref)
      const pages: SourcePage[] = []

      $gallery('li.thumbwook a.rel-link').each((index, el) => {
        const url = $gallery(el).attr('href')
        if (url && url.includes('cdni.pornpics.com')) {
          pages.push({ url, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
