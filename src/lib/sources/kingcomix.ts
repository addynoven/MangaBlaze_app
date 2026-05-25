import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://kingcomix.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`KingComiX fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/https:\/\/kingcomix\.com\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const kingcomixSource: MangaSource = {
  id: 'kingcomix',
  name: 'KingComiX',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('article.thumb-block').each((_, el) => {
        const link = $(el).find('a[href^="https://kingcomix.com/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || ''
        const cover =
          link.find('.post-thumbnail img').attr('src') ||
          link.find('img').attr('src') ||
          '/images/placeholder.png'

        if (title) {
          results.push({
            id,
            title,
            cover,
            contentRating: 'adult',
          })
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

      const title = $('h1.singleTitle-h1').first().text().trim() || $('h1').first().text().trim()
      if (!title) return null

      // Try to find the first image in the content as cover
      let cover = ''
      $('.entry-content figure.wp-block-image img').each((_, el) => {
        if (!cover) {
          const src = $(el).attr('src')
          if (src) cover = src
        }
      })
      if (!cover) {
        cover = $('.post-thumbnail img').attr('src') || '/images/placeholder.png'
      }

      const description = ''
      const genres: string[] = []
      $('#breadcrumbs a').each((_, el) => {
        const text = $(el).text().trim()
        if (text && text !== 'KingComiX') {
          genres.push(text)
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status: 'completed',
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'en',
        contentRating: 'adult',
        lastVolume: null,
        lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string): Promise<SourceChapter[]> {
    // Each post is a single comic with no chapters.
    // Return one pseudo-chapter so the reader can open it.
    return [
      {
        id: mangaId,
        chapterNumber: '1',
        title: 'Full Comic',
        volume: null,
        language: 'en',
        pages: 0,
        publishedAt: new Date().toISOString(),
        readableAt: new Date().toISOString(),
        externalUrl: null,
        isUnavailable: false,
      },
    ]
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.entry-content figure.wp-block-image img').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && !src.includes('wp-content/themes') && !src.includes('Banner')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
