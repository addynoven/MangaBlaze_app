import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://w11.1punchman.com'
const API_URL = `${BASE_URL}/wp-json/wp/v2/comic`
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const COVER_URL = 'https://1punchman.com/wp-content/uploads/2024/02/9782380712018_1_75.jpg'

interface WPComic {
  id: number
  slug: string
  link: string
  date: string
  title: { rendered: string }
  content: { rendered: string }
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`One Punch Man Online fetch error: ${res.status} ${url}`)
  return res.json()
}

function extractChapterNumber(title: string, slug: string): string {
  const titleMatch = title.match(/Chapter\s+(\d+(?:\.\d+)?)/i)
  if (titleMatch) return titleMatch[1]
  const slugMatch = slug.match(/chapter-(\d+(?:\.\d+)?)/i)
  if (slugMatch) return slugMatch[1]
  return '?'
}

export const onepunchmanonlineSource: MangaSource = {
  id: 'onepunchmanonline',
  name: 'One Punch Man Online',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const q = query.toLowerCase()
      const keywords = ['one punch', 'one-punch', 'saitama', 'opm', 'wanpanman']
      if (!keywords.some((kw) => q.includes(kw))) return []

      return [
        {
          id: 'one-punch-man',
          title: 'One-Punch Man',
          cover: COVER_URL,
        },
      ].slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      if (mangaId !== 'one-punch-man') return null

      return {
        id: 'one-punch-man',
        title: 'One-Punch Man',
        cover: COVER_URL,
        status: 'ongoing',
        year: 2012,
        description:
          'One punch-Man imitates the life of an average hero who wins all of his fights with only one punch! This is why he is called Onepunch man Manga. This story takes place in the fictional Z-City. The world is full of mysterious beings, villains and monsters that cause destruction and havoc.',
        authors: ['ONE'],
        artists: ['Yusuke Murata'],
        genres: ['Action', 'Comedy', 'Sci-Fi', 'Supernatural'],
        altTitles: ['ワンパンマン'],
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
    offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    try {
      if (mangaId !== 'one-punch-man') return []

      const startPage = Math.floor(offset / 100) + 1
      const endPage = Math.floor((offset + limit - 1) / 100) + 1
      const allComics: WPComic[] = []

      for (let page = startPage; page <= endPage; page++) {
        const comics = await fetchJSON<WPComic[]>(`${API_URL}?per_page=100&page=${page}`)
        allComics.push(...comics)
      }

      const chapters: SourceChapter[] = []
      const seen = new Set<string>()

      for (const comic of allComics) {
        if (seen.has(comic.slug)) continue
        seen.add(comic.slug)

        const title = comic.title.rendered.replace(/&#8211;/g, '-').trim()
        const chapterNumber = extractChapterNumber(title, comic.slug)

        chapters.push({
          id: comic.slug,
          chapterNumber,
          title,
          volume: null,
          language: 'en',
          pages: 0,
          publishedAt: new Date(comic.date).toISOString(),
          readableAt: new Date(comic.date).toISOString(),
          externalUrl: comic.link,
          isUnavailable: false,
        })
      }

      const sliceStart = offset % 100
      return chapters.slice(sliceStart, sliceStart + limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const comics = await fetchJSON<WPComic[]>(`${API_URL}?slug=${encodeURIComponent(chapterId)}&per_page=1`)
      if (!comics.length) return []

      const $ = cheerio.load(comics[0].content.rendered)
      const pages: SourcePage[] = []

      $('img').each((index, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || ''
        if (src.startsWith('data:')) src = ''
        if (
          src &&
          (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.png') || src.includes('.webp'))
        ) {
          pages.push({ url: src.trim(), index })
        }
      })

      return pages.map((p, i) => ({ ...p, index: i }))
    } catch {
      return []
    }
  },
}
