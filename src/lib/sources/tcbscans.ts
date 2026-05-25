import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://tcbonepiecechapters.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`TCB Scans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const tcbscansSource: MangaSource = {
  id: 'tcbscans',
  name: 'TCB Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/projects`)
      const lowerQuery = query.toLowerCase()

      const results: SourceManga[] = []
      $('a[href^="/mangas/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/mangas\/\d+\/(.+)$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        if (!title.toLowerCase().includes(lowerQuery)) return

        results.push({ id, title, cover: '/images/placeholder.png' })
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      // Need to find the manga ID first from projects page
      const $projects = await fetchHTML(`${BASE_URL}/projects`)
      let mangaPath = ''
      let title = ''

      $projects('a[href^="/mangas/"]').each((_, el) => {
        const link = $projects(el)
        const href = link.attr('href') || ''
        if (href.endsWith(`/${mangaId}`)) {
          mangaPath = href
          title = link.text().trim()
        }
      })

      if (!mangaPath) return null

      const $ = await fetchHTML(`${BASE_URL}${mangaPath}`)
      const cover =
        $(`img[alt="${title}"]`).attr('src') ||
        $('img[alt]').first().attr('src') ||
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
        originalLanguage: 'ja',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      // Find the manga path
      const $projects = await fetchHTML(`${BASE_URL}/projects`)
      let mangaPath = ''

      $projects('a[href^="/mangas/"]').each((_, el) => {
        const href = $projects(el).attr('href') || ''
        if (href.endsWith(`/${mangaId}`)) {
          mangaPath = href
        }
      })

      if (!mangaPath) return []

      const $ = await fetchHTML(`${BASE_URL}${mangaPath}`)

      const chapters: SourceChapter[] = []
      $('a[href^="/chapters/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/chapters\/\d+\/(.+)$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const numMatch = id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText || `Chapter ${chapterNumber}`,
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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      // Need to find the chapter path
      const $projects = await fetchHTML(`${BASE_URL}/projects`)
      let chapterPath = ''

      $projects('a[href^="/chapters/"]').each((_, el) => {
        const href = $projects(el).attr('href') || ''
        if (href.endsWith(`/${chapterId}`)) {
          chapterPath = href
        }
      })

      if (!chapterPath) {
        // Try direct URL construction - search all mangas for this chapter
        const $mangas = await fetchHTML(`${BASE_URL}/projects`)
        const mangaPaths: string[] = []
        $mangas('a[href^="/mangas/"]').each((_, el) => {
          mangaPaths.push($mangas(el).attr('href') || '')
        })

        for (const mp of mangaPaths.slice(0, 20)) {
          if (!mp) continue
          try {
            const $manga = await fetchHTML(`${BASE_URL}${mp}`)
            $manga('a[href^="/chapters/"]').each((_, el2) => {
              const href = $manga(el2).attr('href') || ''
              if (href.endsWith(`/${chapterId}`)) {
                chapterPath = href
              }
            })
            if (chapterPath) break
          } catch {
            // continue
          }
        }
      }

      if (!chapterPath) return []

      const $ = await fetchHTML(`${BASE_URL}${chapterPath}`)

      const pages: SourcePage[] = []
      $('img.fixed-ratio-content').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && src.includes('cdn.onepiecechapters.com')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
