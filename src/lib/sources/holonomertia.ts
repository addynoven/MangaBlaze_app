import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://holoearth.com'
const MANGA_LIST_URL = 'https://holoearth.com/alt/holonometria/manga/'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`HOLONOMETRIA fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

function extractSlugFromHref(href: string): string {
  const match = href.match(/\/manga\/([^/]+)\/?$/)
  return match?.[1] || ''
}

export const holonomertiaSource: MangaSource = {
  id: 'holonomertia',
  name: 'HOLONOMETRIA',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(MANGA_LIST_URL)

      const results: SourceManga[] = []
      $('a[href^="https://holoearth.com/alt/holonometria/manga/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const id = extractSlugFromHref(href)
        if (!id) return
        if (results.some((r) => r.id === id)) return

        const title = link.text().trim() || id
        if (!title.toLowerCase().includes(query.toLowerCase())) return

        results.push({ id, title, cover: `${BASE_URL}/assets/img/common/logo_alt.png` })
      })

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}/alt/holonometria/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const title = $('h1, h2').first().text().trim() || mangaId
      const cover = `${BASE_URL}/assets/img/common/logo_alt.png`

      return {
        id: mangaId,
        title,
        cover,
        status: 'ongoing',
        year: null,
        description: '',
        authors: [],
        artists: [],
        genres: [],
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
      const url = `${BASE_URL}/alt/holonometria/manga/${mangaId}/`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $(`a[href*="/manga/${mangaId}/ep"]`).each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const match = href.match(/\/ep(\d+)\/?$/)
        const id = match ? `ep${match[1]}` : ''
        if (!id) return
        if (chapters.some((c) => c.id === id)) return

        chapters.push({
          id,
          chapterNumber: match?.[1] || id,
          title: `Episode ${match?.[1] || id}`,
          volume: null,
          language: 'ja',
          pages: 0,
          publishedAt: new Date().toISOString(),
          readableAt: new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      })

      chapters.sort((a, b) => parseInt(a.chapterNumber) - parseInt(b.chapterNumber))
      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      const parts = chapterId.split('/')
      const finalMangaId = mangaId || parts[0]
      const ep = parts[1] || chapterId
      const url = `${BASE_URL}/alt/holonometria/manga/${finalMangaId}/${ep}/`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[src*="/comic/"]').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src) {
          pages.push({ url: src.startsWith('http') ? src : `${BASE_URL}${src}`, index })
        }
      })

      return pages.sort((a, b) => a.index - b.index)
    } catch {
      return []
    }
  },
}
