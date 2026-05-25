import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://rokaricomics.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`RokariComics fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function makeAbsoluteUrl(url: string): string {
  if (!url) return '/images/placeholder.png'
  if (url.startsWith('http')) return url
  if (url.startsWith('//')) return 'https:' + url
  if (url.startsWith('/')) return BASE_URL + url
  return url
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)/)
  return match?.[1] || ''
}

function extractChapterSlugFromHref(href: string): string {
  const match = href.match(/\/([^/]+-chapter-[^/]+)\/?$/)
  if (match) return match[1]
  const match2 = href.match(/\/([^/]+)\/?$/)
  return match2?.[1] || ''
}

export const rokaricomicsSource: MangaSource = {
  id: 'rokaricomics',
  name: 'RokariComics',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type=wp-manga`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      const seen = new Set<string>()

      // Try direct manga links first (search results use absolute URLs)
      $('a[href*="/manga/"]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const title = $(el).attr('title')?.trim() || $(el).text().trim() || ''
        // Skip navigation/menu links that don't have a title or meaningful text
        if (!title || title.length < 2) return
        if (['Manga', 'Home', 'Manhwa', 'Manhua', 'Webtoon'].includes(title)) return

        const cover = makeAbsoluteUrl(
          $(el).closest('div, li, article').find('img').attr('src') ||
          $(el).find('img').attr('src') ||
          $(el).find('img').attr('data-src') ||
          ''
        )

        if (title) {
          results.push({ id, title, cover })
        }
      })

      // Fallback: bsx layout
      if (results.length === 0) {
        $('.bsx').each((_, el) => {
          const link = $(el).find('a[href*="/manga/"]').first()
          const href = link.attr('href') || ''
          const id = extractSlugFromHref(href)
          if (!id || seen.has(id)) return
          seen.add(id)

          const title = link.attr('title')?.trim() || $(el).find('.tt').text().trim() || link.text().trim()
          const cover = makeAbsoluteUrl($(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '')

          if (title) {
            results.push({ id, title, cover })
          }
        })
      }

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1.entry-title').first().text().trim()
      if (!title) return null

      const cover = makeAbsoluteUrl(
        $('.thumb img').attr('src') ||
        $('.thumb img').attr('data-src') ||
        $('meta[property="og:image"]').attr('content') ||
        ''
      )

      const description =
        $('.description-summary p').first().text().trim() ||
        $('.summary__content p').first().text().trim() ||
        $('meta[property="og:description"]').attr('content')?.trim() ||
        ''

      const genres: string[] = []
      $('a[href*="/manga-genre/"], a[href*="/genre/"]').each((_, el) => {
        genres.push($(el).text().trim())
      })

      let status: string | undefined
      $('.post-status .summary-content, .mg_status .summary-content, .bs-status').each((_, el) => {
        const text = $(el).text().trim().toLowerCase()
        if (['ongoing', 'completed', 'hiatus', 'cancelled'].includes(text)) {
          status = text
        }
      })

      const authors: string[] = []
      const artists: string[] = []
      $('.tsinfo .imptdt, .mg_author .summary-content, .mg_artists .summary-content').each((_, el) => {
        const label = $(el).contents().first().text().trim().toLowerCase()
        const value = $(el).find('i, a').text().trim()
        if (label.includes('author') && value) authors.push(value)
        if (label.includes('artist') && value) artists.push(value)
      })

      return {
        id: mangaId,
        title,
        cover,
        status,
        year: null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [],
        originalLanguage: 'en',
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
      const url = `${BASE_URL}/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      $('.eplister ul li').each((_, el) => {
        const link = $(el).find('a').first()
        const href = link.attr('href') || ''
        const id = extractChapterSlugFromHref(href)
        if (!id || seen.has(id)) return
        seen.add(id)

        const titleText = link.find('.chapternum').text().trim() || link.text().trim()
        const match = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = match?.[1] || '?'

        const dateText = link.find('.chapterdate').text().trim()
        const publishedAt = dateText ? new Date(dateText).toISOString() : new Date().toISOString()

        chapters.push({
          id,
          chapterNumber,
          title: titleText,
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
      const url = `${BASE_URL}/${chapterId}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('#readerarea img[src], .entry-content img[src], .readercontent img[src]').each((index, el) => {
        const src = $(el).attr('src')
        if (
          src &&
          (src.startsWith('http') || src.startsWith('//')) &&
          !src.includes('logo') &&
          !src.includes('readerarea.svg') &&
          !src.includes('/uploads/2026/') && // skip banner images
          src.includes('/uploads/manga/')     // only actual manga pages
        ) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
