import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://mangakakalot.fun'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Mangakakalot.fun fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

function extractChapterIdFromHref(href: string): string {
  const match = href.match(/\/chapter\/(.+)$/)
  return match?.[1] || ''
}

export const mangakakalotfunSource: MangaSource = {
  id: 'mangakakalotfun',
  name: 'Mangakakalot.fun',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.media-manga.media').each((_, el) => {
        const $el = $(el)
        const link = $el.find('a[href*="/manga/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return

        if (results.some((r) => r.id === id)) return

        const img = $el.find('img').first()
        const title = img.attr('alt')?.trim() || ''
        const cover = img.attr('src') || ''

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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const h1 = $('h1._3xnDj').first()
      let title = ''
      h1.contents().each((_, node) => {
        if (node.type === 'text') {
          title = $(node).text().trim()
          return false
        }
      })
      if (!title) return null

      const cover =
        $('meta[property="og:image"]').attr('content') ||
        $('img[src*="thumb.mghcdn.com"]').first().attr('src') ||
        '/images/placeholder.png'

      let description = $('meta[name="description"]').attr('content') || ''
      // Strip trailing promo text
      const promoIdx = description.indexOf('Other attractive Manga :')
      if (promoIdx > 0) description = description.slice(0, promoIdx).trim()

      // Extract description from the "Summary" tab pane if meta is empty or generic
      const summaryPane = $('#chapters-tab-pane-999').first()
      if (summaryPane.length && description.length < 50) {
        const summaryText = summaryPane.text().trim()
        if (summaryText.length > 20) description = summaryText
      }

      const genres: string[] = []
      $('a.genre-label').each((_, el) => {
        genres.push($(el).text().trim())
      })

      const authors: string[] = []
      const artists: string[] = []
      const seenAuthors = new Set<string>()
      const seenArtists = new Set<string>()

      $('div').each((_, el) => {
        const $el = $(el)
        const label = $el.find('span._3SlhO').first().text().trim()
        if (label === 'Author') {
          const val = $el.find('span').eq(1).text().trim()
          if (val && !seenAuthors.has(val)) {
            seenAuthors.add(val)
            authors.push(val)
          }
        }
        if (label === 'Artist') {
          const val = $el.find('span').eq(1).text().trim()
          if (val && !seenArtists.has(val)) {
            seenArtists.add(val)
            artists.push(val)
          }
        }
      })

      let status: string | undefined
      $('div').each((_, el) => {
        const $el = $(el)
        const label = $el.find('span._3SlhO').first().text().trim()
        if (label === 'Status') {
          const val = $el.find('span').eq(1).text().trim()
          if (val) status = val
        }
      })

      const altTitles: string[] = []
      const altText = h1.find('small').first().text().trim()
      if (altText) {
        altText.split(';').forEach((t) => {
          const clean = t.trim().replace(/\s*\([^)]+\)\s*$/, '').trim()
          if (clean) altTitles.push(clean)
        })
      }

      let year: number | null = null
      const descYear = description.match(/(19\d{2}|20\d{2})/)
      if (descYear) {
        year = parseInt(descYear[1], 10)
      }

      return {
        id: mangaId,
        title,
        cover,
        status,
        year,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
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
      const url = `${BASE_URL}/manga/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('a._3pfyN').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractChapterIdFromHref(href)
        if (!id) return

        if (chapters.some((c) => c.id === id)) return

        const numEl = link.find('span._3D1SJ').first().text().trim()
        const chapterNumber = numEl.replace('#', '').trim()
        const titleText = link.find('span._2IG5P').first().text().trim().replace(/^-\s*/, '')
        const dateText = link.find('small.UovLc').first().text().trim()

        let publishedAt = new Date().toISOString()
        try {
          const parsed = new Date(dateText)
          if (!isNaN(parsed.getTime())) publishedAt = parsed.toISOString()
        } catch {
          // ignore invalid dates
        }

        chapters.push({
          id,
          chapterNumber: chapterNumber || '?',
          title: titleText || null,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt,
          readableAt: publishedAt,
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
      const url = `${BASE_URL}/chapter/${chapterId}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="imgx.mghcdn.com"]').each((index, el) => {
        const src = $(el).attr('src')
        if (src) {
          pages.push({ url: src.trim(), index })
        }
      })

      // Deduplicate by URL while preserving order
      const seen = new Set<string>()
      const unique: SourcePage[] = []
      for (const p of pages) {
        if (!seen.has(p.url)) {
          seen.add(p.url)
          unique.push(p)
        }
      }

      return unique.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
