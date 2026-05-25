import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://hentaihere.com'
const CDN_URL = 'https://hentaicdn.com/hentai'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HentaiHere fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const hentaihereSource: MangaSource = {
  id: 'hentaihere',
  name: 'HentaiHere',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?search=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.seriesBlock').each((_, el) => {
        const block = $(el)
        const link = block.find('a[href^="/m/S"]').first()
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/m\/S(\d+)/)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover = `${CDN_URL}/cover/_S${id}.jpg`

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
      const url = `${BASE_URL}/m/S${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover = `${CDN_URL}/cover/_S${mangaId}.jpg`

      const description = $('meta[name="description"]').attr('content') || ''

      const genres: string[] = []
      $('a.tagbutton').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const artists: string[] = []
      $('span.text-info').each((_, el) => {
        const text = $(el).text().trim()
        if (text.toLowerCase().startsWith('artist:')) {
          const artist = $(el).parent().text().replace(text, '').trim()
          if (artist) artists.push(artist)
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [...new Set(artists)],
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
      const url = `${BASE_URL}/m/S${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('#availableChapters a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/m\/S\d+\/\d+\/\d+\/?$/)
        if (!idMatch) return

        const id = href.replace(`${BASE_URL}/m/`, '').replace(/\/$/, '')
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/\/(\d+)\/\d+\/?$/)
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
      const url = `${BASE_URL}/m/${chapterId}/`
      const $ = await fetchHTML(url)

      // Try to extract image list from script tag
      const scriptText = $('script')
        .map((_, el) => $(el).html() || '')
        .get()
        .find((text) => text.includes('rff_imageList'))

      if (scriptText) {
        const listMatch = scriptText.match(/rff_imageList\s*=\s*(\[[^\]]+\])/)
        if (listMatch) {
          const paths: string[] = JSON.parse(listMatch[1])
          return paths.map((p, index) => ({
            url: `${CDN_URL}${p}`,
            index,
          }))
        }
      }

      // Fallback: try the single reader image
      const singleSrc = $('#arf-reader-img').attr('src')
      if (singleSrc) {
        return [{ url: singleSrc, index: 0 }]
      }

      return []
    } catch {
      return []
    }
  },
}
