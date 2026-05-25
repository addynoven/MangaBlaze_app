import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://www.luscious.net'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Luscious fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function upgradeImageUrl(url: string): string {
  // Replace size suffix like .315x0.jpg, .640x0.jpg with .1680x0.<ext>
  return url.replace(/\.(\d+)x0\.(jpg|jpeg|png|JPG|JPEG|PNG)$/g, '.1680x0.$2')
}

export const lusciousSource: MangaSource = {
  id: 'luscious',
  name: 'Luscious',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/albums/list/?search_query=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="/albums/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        // Only match album detail pages, not pagination or list pages
        const match = href.match(/^\/albums\/([^/]+)\/$/)
        if (!match) return

        const id = match[1]
        if (results.some((r) => r.id === id)) return

        const title = link.find('h3').first().text().trim()
        const coverImg = link.find('img').first().attr('src')
        const cover = coverImg ? upgradeImageUrl(coverImg) : '/images/placeholder.png'

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
      const url = `${BASE_URL}/albums/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        upgradeImageUrl($('meta[property="og:image"]').attr('content') || '') ||
        '/images/placeholder.png'
      const description = $('meta[name="description"]').attr('content') || ''

      const genres: string[] = []
      $('a[href^="/genres/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const authors: string[] = []
      const uploader = $('a[href^="/users/"] span').first().text().trim()
      if (uploader) {
        authors.push(uploader)
      }

      return {
        id: mangaId,
        title,
        cover,
        description,
        authors: [...new Set(authors)],
        artists: [],
        genres: [...new Set(genres)],
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
      const url = `${BASE_URL}/albums/${mangaId}/`
      const $ = await fetchHTML(url)

      // Extract picture count from album info
      let pages = 0
      const bodyText = $('body').text()
      const match = bodyText.match(/(\d+)\s+pictures/)
      if (match) {
        pages = parseInt(match[1], 10)
      }

      // Luscious albums do not have chapters; model as single chapter
      const chapters: SourceChapter[] = [
        {
          id: mangaId,
          chapterNumber: '1',
          title: 'Full Album',
          volume: null,
          language: 'en',
          pages,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        },
      ]

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const mangaId = chapterId
      const firstUrl = `${BASE_URL}/albums/${mangaId}/`
      const $first = await fetchHTML(firstUrl)

      // Extract total picture count
      let totalPics = 0
      const bodyText = $first('body').text()
      const match = bodyText.match(/(\d+)\s+pictures/)
      if (match) {
        totalPics = parseInt(match[1], 10)
      }

      if (totalPics === 0) return []

      const picsPerPage = 50
      const totalPages = Math.ceil(totalPics / picsPerPage)
      const pages: SourcePage[] = []

      for (let page = 1; page <= totalPages; page++) {
        const url = page === 1 ? firstUrl : `${BASE_URL}/albums/${mangaId}/?page=${page}`
        const $ = await fetchHTML(url)

        $('a[href^="/pictures/album/"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          // Ensure this picture belongs to the requested album
          if (!href.includes(`/album/${mangaId}/`)) return

          const img = link.find('img').first().attr('src')
          if (!img) return

          const fullUrl = upgradeImageUrl(img)
          pages.push({ url: fullUrl, index: pages.length })
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
