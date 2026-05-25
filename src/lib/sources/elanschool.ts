import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://elan.school'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Elan School fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const elanschoolSource: MangaSource = {
  id: 'elanschool',
  name: 'The Elan School',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return [
      {
        id: 'elan-school',
        title: 'The Elan School',
        cover: `${BASE_URL}/wp-content/uploads/2018/11/Elan-Comic-Thumbnail-1.jpg`,
      },
    ]
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return {
      id: 'elan-school',
      title: 'The Elan School',
      cover: `${BASE_URL}/wp-content/uploads/2018/11/Elan-Comic-Thumbnail-1.jpg`,
      status: 'completed',
      year: 2018,
      description: 'A graphic memoir about the Elan School, a controversial residential behavior modification program.',
      authors: ['Joe Nobody'],
      artists: [],
      genres: ['Drama', 'Non-fiction'],
      altTitles: [],
      originalLanguage: 'en',
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(_mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/chapters/`)
      const chapters: SourceChapter[] = []

      $('a[href^="https://elan.school/"]').each((_, el) => {
        const link = $(el)
        const href = link.attr('href') || ''
        const slugMatch = href.match(/https:\/\/elan\.school\/([^/]+)\/?$/)
        const slug = slugMatch?.[1]
        if (!slug || slug === 'chapters' || slug === 'longer-chapters' || slug === 'chapters-2-5') return
        if (chapters.some((c) => c.id === slug)) return

        const title = link.text().trim() || slug
        const numMatch = title.match(/(\d+)/)
        const chapterNumber = numMatch?.[1] || slug

        chapters.push({
          id: slug,
          chapterNumber,
          title,
          volume: null,
          language: 'en',
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
      const $ = await fetchHTML(`${BASE_URL}/${chapterId}/`)
      const pages: SourcePage[] = []

      $('img.size-full').each((index, el) => {
        const src = $(el).attr('src')?.trim()
        if (src && src.includes('elan.school') && !src.includes('thumbnail')) {
          pages.push({ url: src, index })
        }
      })

      return pages
    } catch {
      return []
    }
  },
}
