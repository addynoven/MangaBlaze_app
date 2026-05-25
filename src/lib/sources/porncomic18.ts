import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://18porncomic.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`PornComic18 fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/comic\/([^/]+)/)
  return match?.[1] || ''
}

export const porncomic18Source: MangaSource = {
  id: 'porncomic18',
  name: '18 Porn Comic',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`
      const $ = await fetchHTML(url)

      const results: SourceManga[] = []
      $('.story_item').each((_, el) => {
        const item = $(el)
        const link = item.find('a[href^="/comic/"]').first()
        const href = link.attr('href') || ''
        const id = extractSlugFromUrl(href)
        if (!id || results.some((r) => r.id === id)) return

        const title = link.attr('title') || link.text().trim() || ''
        const cover =
          item.find('img').attr('src') || item.find('img').attr('data-src') || '/images/placeholder.png'

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
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h1').first().text().trim()
      if (!title) return null

      const cover =
        $('img[src*="/cover/"]').attr('src') ||
        $('img[src*="/uploads/manga/"]').attr('src') ||
        '/images/placeholder.png'

      const description = $('.detail_block p').first().text().trim()

      return {
        id: mangaId,
        title,
        cover,
        status: undefined,
        year: null,
        description,
        authors: [],
        artists: [],
        genres: [],
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
      const url = `${BASE_URL}/comic/${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('.chapter_box a').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(/\/comic\/[^/]+\/([^/]+)/)
        const chapterSlug = match?.[1] || ''
        if (!chapterSlug) return

        const id = `${mangaId}/${chapterSlug}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim().replace('#', '').trim()
        const numMatch = titleText.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
        const chapterNumber = numMatch?.[1] || titleText

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

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/comic/${chapterId}`
      const html = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      }).then((r) => r.text())

      // Extract slides_p_path = [...] base64 array
      const match = html.match(/slides_p_path\s*=\s*(\[[^\]]+\])/)
      if (!match) return []

      let paths: string[] = []
      try {
        paths = JSON.parse(match[1])
      } catch {
        // fallback: manual parse
        paths = match[1].match(/"[^"]+"/g)?.map((s) => s.slice(1, -1)) || []
      }

      return paths.map((b64, index) => ({
        url: Buffer.from(b64, 'base64').toString('utf-8'),
        index,
      }))
    } catch {
      return []
    }
  },
}
