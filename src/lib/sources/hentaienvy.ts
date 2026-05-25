import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentaienvy.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiEnvy fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const hentaienvySource: MangaSource = {
  id: 'hentaienvy',
  name: 'HentaiEnvy',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.thumb a[href^="/gallery/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/gallery\/(\d+)\//)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('.title').text().trim()
        const img = link.find('img').first()
        const cover = img.attr('data-src') || img.attr('src') || '/images/placeholder.png'

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

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('img[data-src*="/cover."]').attr('data-src') ||
        $('img[alt*="cover"]').attr('data-src') ||
        '/images/placeholder.png'

      const genres: string[] = []
      const descriptionParts: string[] = []

      $('.gt_right_tags ul').each((_, el) => {
        const tagTitle = $(el).find('.tag_title').first().text().trim()
        const values: string[] = []
        $(el)
          .find('a')
          .each((__, aEl) => {
            const val = $(aEl).text().trim()
            if (val) values.push(val)
          })

        if (tagTitle === 'Tags:') {
          genres.push(...values)
        }

        if (values.length > 0 && tagTitle) {
          descriptionParts.push(`${tagTitle} ${values.join(', ')}`)
        }
      })

      const pagesText = $('#load_pages').attr('value') || ''
      const pages = parseInt(pagesText, 10) || 0

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description: descriptionParts.join('\n'),
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

      const pagesText = $('#load_pages').attr('value') || ''
      const pages = parseInt(pagesText, 10) || 0

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
      const galleryUrl = `${BASE_URL}/gallery/${chapterId}/`
      const $gallery = await fetchHTML(galleryUrl)

      const server = $gallery('#load_server').attr('value') || ''
      const dir = $gallery('#load_dir').attr('value') || ''
      const loadId = $gallery('#load_id').attr('value') || ''
      const pagesText = $gallery('#load_pages').attr('value') || ''
      const totalPages = parseInt(pagesText, 10) || 0

      if (!server || !dir || !loadId || totalPages === 0) return []

      // Fetch first reader page to determine image extension
      const readerUrl = `${BASE_URL}/g/${chapterId}/1/`
      const $reader = await fetchHTML(readerUrl)
      const firstImg = $reader('#fimg').attr('data-src') || ''

      const extMatch = firstImg.match(/\.(webp|jpg|jpeg|png)$/)
      const ext = extMatch ? extMatch[1] : 'webp'

      const pages: SourcePage[] = []
      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          url: `https://m${server}.hentaienvy.com/${dir}/${loadId}/${i}.${ext}`,
          index: i - 1,
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
