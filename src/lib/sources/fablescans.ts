import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://fablescans.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`FableScans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comic\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const fablescansSource: MangaSource = {
  id: 'fablescans',
  name: 'Fable Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('a.series').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim()
        const cover =
          link.closest('.bsx, .bs, li').find('img.ts-post-image, img.wp-post-image').first().attr('src') ||
          link.closest('.bsx, .bs, li').find('img').first().attr('data-src') ||
          '/images/placeholder.png'

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
      const url = `${BASE_URL}/comic/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('img.ts-post-image').first().attr('src') ||
        $('img.wp-post-image').first().attr('src') ||
        '/images/placeholder.png'

      const descParagraphs: string[] = []
      $('.entry-content p, .summary__content p, .wd-full p').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !text.includes('All the comics on this website are only previews')) {
          descParagraphs.push(text)
        }
      })
      const description = descParagraphs.join('\n\n') || ''

      const genres: string[] = []
      $('a[href*="/genres/"], .mgen a').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.ts-post-status, .post-status .summary-content').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled', 'dropped'].includes(text)) {
          status = text
        }
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [],
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

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/comic/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a.search-chapter, .eplister a, .epl-num a, .chapternum').closest('a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/([^/]+-chapter-[\d.]+)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const numText = link.find('.chapternum').text().trim() || link.text().trim()
        const numMatch = numText.match(/Chapter\s+([\d.]+)/i)
        const chapterNumber = numMatch?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: numText,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      // Fallback: any link containing -chapter- on the manga page
      if (chapters.length === 0) {
        $('a[href*="-chapter-"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const idMatch = href.match(/\/([^/]+-chapter-[\d.]+)\/?$/)
          const id = idMatch?.[1] || ''
          if (!id || chapters.some((c) => c.id === id)) return

          const numText = link.find('.chapternum').text().trim() || link.text().trim()
          const numMatch = numText.match(/Chapter\s+([\d.]+)/i)
          const chapterNumber = numMatch?.[1] || '?'

          chapters.push({
            id,
            chapterNumber,
            title: numText,
            volume: null,
            language: 'en',
            pages: 0,
            publishedAt: new Date().toISOString(),
            readableAt: new Date().toISOString(),
            externalUrl: null,
            isUnavailable: false,
          })
        })
      }

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
      if (!res.ok) throw new Error(`FableScans fetch error: ${res.status} ${url}`)
      const html = await res.text()

      // Extract ts_reader.run JSON
      const match = html.match(/ts_reader\.run\((\{[\s\S]*?\})\)/)
      if (!match) return []

      const jsonStr = match[1]
      const data = JSON.parse(jsonStr)
      const images: string[] = data.sources?.[0]?.images || []

      return images.map((url: string, index: number) => ({ url, index }))
    } catch {
      return []
    }
  },
}
