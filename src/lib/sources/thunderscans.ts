import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://en-thunderscans.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Thunder Scans fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/comics\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const thunderscansSource: MangaSource = {
  id: 'thunderscans',
  name: 'Thunder Scans',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.bsx').each((_, el) => {
        const link = $(el).find('a[href*="/comics/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.attr('title')?.trim() || link.find('.tt').text().trim()
        const cover =
          link.find('img').attr('data-src') ||
          link.find('img').attr('src') ||
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
      const url = `${BASE_URL}/comics/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover =
        $('.thumb img').attr('src') ||
        $('.thumb img').attr('data-src') ||
        $('.ts-post-image').first().attr('src') ||
        $('.bigbanner.img-blur').attr('style')?.match(/url\(['"]?(.*?)['"]?\)/)?.[1] ||
        '/images/placeholder.png'

      const description = $('.wd-full p, .entry-content p, .info-desc p').first().text().trim()

      let status: string | undefined
      $('.imptdt').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (text.includes('status')) {
          const next = $(el).next().text().trim().toLowerCase()
          if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(next)) {
            status = next
          }
        }
      })

      const genres: string[] = []
      $('.mgen a').each((_, el) => {
        genres.push($(el).text().trim())
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
      const url = `${BASE_URL}/comics/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.eplister ul li a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const idMatch = href.match(/\/([^/]+-chapter-\d+(?:\.\d+)?)\/?$/)
        const id = idMatch?.[1] || ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || id.match(/chapter-(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || '?'

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
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

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/${chapterId}/`
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      })
      const html = await res.text()

      const match = html.match(/ts_reader\.run\((\{[\s\S]*?\})\);?[\s\S]*?<\/script>/)
      if (!match) return []

      const json = JSON.parse(match[1])
      const images: string[] = json.sources?.[0]?.images || []

      return images.map((src, index) => ({
        url: src.startsWith('http') ? src : `${BASE_URL}${src}`,
        index,
      }))
    } catch {
      return []
    }
  },
}
