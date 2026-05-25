import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentairox.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiRox fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function normalizeUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `${BASE_URL}${url}`
  return url
}

export const hentairoxSource: MangaSource = {
  id: 'hentairox',
  name: 'HentaiRox',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a[href^="/gallery/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/gallery\/(\d+)\//)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const img = link.find('img').first()
        let title = img.attr('alt')?.trim() || ''
        if (!title) {
          // fallback to sibling title
          title = link.closest('div').find('h2.gallery_title a').text().trim()
        }
        const cover = normalizeUrl(img.attr('data-src') || img.attr('src') || '/images/placeholder.png')

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
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('#gallery_title').attr('value')?.trim() || $('title').first().text().replace(' - HentaiRox', '').trim()
      if (!title) return null

      const cover = normalizeUrl(
        $('img[data-src*="cover.jpg"]').attr('data-src') ||
        $('img[src*="cover.jpg"]').attr('src') ||
        '/images/placeholder.png'
      )

      const genres: string[] = []
      $('a.tag.btn.btn-primary').each((_, el) => {
        const text = $(el).text().trim()
        if (text) genres.push(text)
      })

      const pagesText = $('li.pages').first().text()
      const pagesMatch = pagesText.match(/(\d+)\s*pages/)
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
      const url = `${BASE_URL}/gallery/${mangaId}/`
      const $ = await fetchHTML(url)

      const pagesText = $('li.pages').first().text()
      const pagesMatch = pagesText.match(/(\d+)\s*pages/)
      const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0

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
      const url = `${BASE_URL}/gallery/${chapterId}/`
      const $ = await fetchHTML(url)

      const server = $('#load_server').attr('value') || ''
      const dir = $('#load_dir').attr('value') || ''
      const loadId = $('#load_id').attr('value') || ''
      const pagesVal = $('#load_pages').attr('value') || '0'
      const totalPages = parseInt(pagesVal, 10)

      if (!server || !dir || !loadId || !totalPages) {
        // fallback: try to infer from first thumbnail
        const firstThumb = $('a[href^="/view/"] img').first().attr('data-src') || ''
        const thumbMatch = firstThumb.match(/^(https?:\/\/m\d+\.hentairox\.com\/\d+\/[^/]+\/)/)
        if (!thumbMatch) return []
        const base = thumbMatch[1]
        // derive page count from thumbnail count if hidden input missing
        const thumbCount = $('a[href^="/view/"]').length
        const pages: SourcePage[] = []
        for (let i = 1; i <= thumbCount; i++) {
          pages.push({
            url: `${base}${i}.webp`,
            index: i - 1,
          })
        }
        return pages
      }

      const pages: SourcePage[] = []
      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          url: `https://m${server}.hentairox.com/${dir}/${loadId}/${i}.webp`,
          index: i - 1,
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
