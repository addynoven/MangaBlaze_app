import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://skymanga.work'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`SkyManga fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const skymangaSource: MangaSource = {
  id: 'skymanga',
  name: 'Sky Manga',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      $('article, .bs, .page-item-detail').each((_, el) => {
        const item = $(el)
        const link = item.find('a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const img = item.find('img').first()
        const title = img.attr('alt') || link.attr('title') || link.text().trim() || id
        const cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'
        if (title) results.push({ id, title, cover })
      })

      // Fallback: direct manga links
      if (results.length === 0) {
        $('a[href*="/manga/"]').each((_, el) => {
          const link = $(el)
          const href = link.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id || seen.has(id)) return
          seen.add(id)

          const img = link.find('img').first()
          const title = img.attr('alt') || link.attr('title') || link.text().trim() || id
          const cover = img.attr('src') || img.attr('data-src') || '/images/placeholder.png'
          if (title) results.push({ id, title, cover })
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('.entry-title').first().text().trim() || $('h1').first().text().trim()
      if (!title) return null

      const cover = $('.thumb img').attr('src') || '/images/placeholder.png'
      const description = $('.entry-content').first().text().trim() || ''

      const genres: string[] = []
      $('a[href*="/genre/"]').each((_, el) => {
        const text = $(el).text().trim()
        if (text && !genres.includes(text)) genres.push(text)
      })

      return {
        id: mangaId, title, cover, status: undefined, year: null, description,
        authors: [], artists: [], genres, altTitles: [], originalLanguage: 'ja',
        lastVolume: null, lastChapter: null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100): Promise<SourceChapter[]> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('a[href*="/manga/' + mangaId + '/chapter"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/\/manga\/[^/]+\/(chapter[^/]*)\/?$/)
        const chapterSlug = slugMatch?.[1] || ''
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (seen.has(id)) return
        seen.add(id)

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i) || titleText.match(/(\d+(?:\.\d+)?)/)
        const chapterNumber = match?.[1] || '?'

        chapters.push({
          id, chapterNumber, title: titleText || chapterSlug, volume: null, language: 'en', pages: 0,
          publishedAt: new Date().toISOString(), readableAt: new Date().toISOString(),
          externalUrl: null, isUnavailable: false,
        })
      })

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/manga/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('.entry-content img').each((index, el) => {
        const src = $(el).attr('src')
        if (src && !src.includes('logo') && !src.includes('banner')) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
