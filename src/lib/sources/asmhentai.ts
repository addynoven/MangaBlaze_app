import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://asmhentai.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`AsmHentai fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function normalizeUrl(url: string): string {
  if (url.startsWith('//')) return `https:${url}`
  return url
}

export const asmhentaiSource: MangaSource = {
  id: 'asmhentai',
  name: 'AsmHentai',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search/?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.image a[href^="/g/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/g\/(\d+)\//)
        const id = idMatch?.[1] || ''
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const img = link.find('img').first()
        let title = img.attr('alt')?.trim() || ''
        if (!title) {
          // fallback to caption
          title = link.closest('.gallery, div').find('.cpt .caption').text().trim()
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
      const url = `${BASE_URL}/g/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover = normalizeUrl(
        $('.cover img').attr('data-src') || $('.cover img').attr('src') || '/images/placeholder.png'
      )

      const genres: string[] = []
      $('.tags').each((_, el) => {
        const tagType = $(el).find('h3').first().text().trim()
        if (tagType === 'Tags:' || tagType === 'Parodies:') {
          $(el).find('a').each((__, aEl) => {
            genres.push($(aEl).text().trim())
          })
        }
      })

      const pagesText = $('h3')
        .filter((_, el) => $(el).text().includes('Pages:'))
        .first()
        .text()
      const pagesMatch = pagesText.match(/Pages:\s*(\d+)/)
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
      const url = `${BASE_URL}/g/${mangaId}/`
      const $ = await fetchHTML(url)

      const pagesText = $('h3')
        .filter((_, el) => $(el).text().includes('Pages:'))
        .first()
        .text()
      const pagesMatch = pagesText.match(/Pages:\s*(\d+)/)
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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/g/${chapterId}/`
      const $ = await fetchHTML(url)

      // Extract prefix from first thumbnail
      const firstThumb = $('.preview_thumb img').first().attr('data-src') || ''
      const prefixMatch = firstThumb.match(/images\.asmhentai\.com\/(\d+)\/\d+\/\d+t\.jpg/)
      if (!prefixMatch) return []

      const prefix = prefixMatch[1]
      const pagesText = $('h3')
        .filter((_, el) => $(el).text().includes('Pages:'))
        .first()
        .text()
      const pagesMatch = pagesText.match(/Pages:\s*(\d+)/)
      const totalPages = pagesMatch ? parseInt(pagesMatch[1], 10) : 0

      const pages: SourcePage[] = []
      for (let i = 1; i <= totalPages; i++) {
        pages.push({
          url: `https://images.asmhentai.com/${prefix}/${chapterId}/${i}.jpg`,
          index: i - 1,
        })
      }

      return pages
    } catch {
      return []
    }
  },
}
