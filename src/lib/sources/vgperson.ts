import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://vgperson.com/other/mangaviewer.php'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`vgperson fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

interface RawManga {
  id: string
  title: string
}

async function fetchMangaList(): Promise<RawManga[]> {
  const $ = await fetchHTML(BASE_URL)
  const list: RawManga[] = []

  $('p.nospace a[href^="?m="]').each((_, el) => {
    const link = $(el)
    const href = link.attr('href') || ''
    const idMatch = href.match(/\?m=(\d+)/)
    const id = idMatch?.[1] || ''
    const title = link.text().trim()
    if (id && title && !list.some((m) => m.id === id)) {
      list.push({ id, title })
    }
  })

  return list
}

export const vgpersonSource: MangaSource = {
  id: 'vgperson',
  name: 'vgperson',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const list = await fetchMangaList()
      const q = query.toLowerCase()
      const results: SourceManga[] = list
        .filter((m) => m.title.toLowerCase().includes(q))
        .map((m) => ({
          id: m.id,
          title: m.title,
          cover: '/images/placeholder.png',
        }))
      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const url = `${BASE_URL}?m=${mangaId}`
      const $ = await fetchHTML(url)

      const title = $('h2.title').first().text().trim()
      if (!title) return null

      const description = $('meta[name="description"]').attr('content') || ''

      let status: string | undefined
      const statusText = $('p.complete, p.ongoing, p.hiatus, p.cancelled').first().text().trim().toLowerCase()
      if (statusText.includes('complete')) status = 'completed'
      else if (statusText.includes('ongoing')) status = 'ongoing'
      else if (statusText.includes('hiatus')) status = 'hiatus'
      else if (statusText.includes('cancelled')) status = 'cancelled'

      return {
        id: mangaId,
        title,
        cover: '/images/placeholder.png',
        status,
        year: null,
        description,
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
      const url = `${BASE_URL}?m=${mangaId}`
      const $ = await fetchHTML(url)

      const chapters: SourceChapter[] = []
      $('table.chaptertable tr').each((_, el) => {
        const row = $(el)
        const link = row.find('a[href^="?m="]')
        const href = link.attr('href') || ''
        const cMatch = href.match(/[?&]c=(\d+)/)
        const chapterNum = cMatch?.[1] || ''
        if (!chapterNum) return

        const id = `${mangaId}|${chapterNum}`
        if (chapters.some((c) => c.id === id)) return

        const titleText = link.text().trim()
        const chapterTitle = row.find('td').eq(1).text().trim() || null

        chapters.push({
          id,
          chapterNumber: chapterNum,
          title: chapterTitle,
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
      const [mangaId, chapterNum] = chapterId.split('|')
      if (!mangaId || !chapterNum) return []

      const url = `${BASE_URL}?m=${mangaId}&c=${chapterNum}`
      const $ = await fetchHTML(url)

      const pages: SourcePage[] = []
      $('img[alt^="Page"]').each((_, el) => {
        const img = $(el)
        const src = img.attr('src')
        const alt = img.attr('alt') || ''
        const pageMatch = alt.match(/Page\s+(\d+)/)
        const index = pageMatch ? parseInt(pageMatch[1], 10) - 1 : pages.length
        if (src) {
          pages.push({ url: src.trim(), index })
        }
      })

      pages.sort((a, b) => a.index - b.index)
      return pages
    } catch {
      return []
    }
  },
}
