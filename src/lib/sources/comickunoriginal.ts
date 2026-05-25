import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://comick.live'
const IMG_URL = 'https://meo.comick.pictures'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`ComickUnoriginal fetch error: ${res.status} ${url}`)
  const html = await res.text()
  return cheerio.load(html)
}

function extractScriptJson($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null
  $('script').each((_, el) => {
    if (found) return
    const text = $(el).text().trim()
    if (!text || text.startsWith('window.') || text.includes('function') || text.includes('=>')) return
    try {
      const data = JSON.parse(text)
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        found = data as Record<string, unknown>
      }
    } catch {
      // ignore
    }
  })
  return found
}

function getCoverUrl(covers?: Array<{ b2key?: string }>): string {
  if (covers && covers.length > 0 && covers[0].b2key) {
    return `${IMG_URL}/${covers[0].b2key}`
  }
  return '/images/placeholder.png'
}

function statusFromCode(code: number): string {
  const map: Record<number, string> = { 1: 'ongoing', 2: 'completed', 3: 'cancelled', 4: 'hiatus' }
  return map[code] || 'unknown'
}

interface HomeComic {
  slug: string
  title: string
  last_chapter?: number
  md_covers?: Array<{ b2key?: string }>
  md_titles?: Array<{ title: string; lang: string }>
}

export const comickunoriginalSource: MangaSource = {
  id: 'comickunoriginal',
  name: 'Comick (Unoriginal)',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/home`)
      const scriptData = extractScriptJson($)
      const data = scriptData?.data as Record<string, unknown> | undefined
      if (!data) return []

      const allComics: HomeComic[] = []
      for (const key of Object.keys(data)) {
        const list = data[key]
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && typeof item === 'object' && 'slug' in item && 'title' in item) {
              if (!allComics.some((c) => c.slug === item.slug)) {
                allComics.push(item as HomeComic)
              }
            }
          }
        }
      }

      const q = query.toLowerCase()
      const results = allComics
        .filter((c) =>
          c.title.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          c.md_titles?.some((t) => t.title.toLowerCase().includes(q))
        )
        .map((c) => ({
          id: c.slug,
          title: c.title,
          cover: getCoverUrl(c.md_covers),
          lastChapter: c.last_chapter ? String(c.last_chapter) : null,
        }))

      return results.slice(0, limit)
    } catch {
      return []
    }
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      const $ = await fetchHTML(`${BASE_URL}/comic/${mangaId}`)
      const scriptData = extractScriptJson($)
      if (!scriptData || !scriptData.id) return null

      const comic = scriptData
      const title = (comic.title as string) || mangaId
      const cover = (comic.default_thumbnail as string) || getCoverUrl(comic.md_covers as Array<{ b2key?: string }>)
      const description = (comic.desc as string) || ''

      const genres: string[] = []
      const mdGenres = comic.md_comic_md_genres as Array<{ md_genres?: { name?: string } }> | undefined
      if (mdGenres) {
        for (const g of mdGenres) {
          if (g.md_genres?.name) genres.push(g.md_genres.name)
        }
      }

      const authors: string[] = []
      const authorsArr = comic.authors as Array<{ name?: string }> | undefined
      if (authorsArr) {
        for (const a of authorsArr) {
          if (a.name) authors.push(a.name)
        }
      }

      const artists: string[] = []
      const artistsArr = comic.artists as Array<{ name?: string }> | undefined
      if (artistsArr) {
        for (const a of artistsArr) {
          if (a.name) artists.push(a.name)
        }
      }

      const altTitles: string[] = []
      const mdTitles = comic.md_titles as Array<{ title?: string }> | undefined
      if (mdTitles) {
        for (const t of mdTitles) {
          if (t.title && t.title !== title) altTitles.push(t.title)
        }
      }

      return {
        id: mangaId,
        title,
        cover,
        status: statusFromCode(comic.status as number),
        year: (comic.year as number | null) ?? null,
        description,
        authors: [...new Set(authors)],
        artists: [...new Set(artists)],
        genres: [...new Set(genres)],
        altTitles: [...new Set(altTitles)],
        originalLanguage: (comic.country as string) || 'ja',
        lastVolume: null,
        lastChapter: comic.last_chapter != null ? String(comic.last_chapter) : null,
      }
    } catch {
      return null
    }
  },

  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      // Need a chapter HID to load the chapter page which contains the full chapterList
      const detail$ = await fetchHTML(`${BASE_URL}/comic/${mangaId}`)
      const detailData = extractScriptJson(detail$)
      const firstChapters = detailData?.firstChapters as Array<{ hid?: string; lang?: string }> | undefined
      if (!firstChapters || firstChapters.length === 0 || !firstChapters[0].hid) return []

      const firstCh = firstChapters[0]
      const chapterUrl = `${BASE_URL}/comic/${mangaId}/${firstCh.hid}-chapter-0-${firstCh.lang || 'en'}`
      const $ = await fetchHTML(chapterUrl)
      const scriptData = extractScriptJson($)
      const chapterList = scriptData?.chapterList as Array<{
        hid: string
        chap: string
        vol: string | null
        title: string | null
        lang: string
        created_at: string
      }> | undefined

      if (!chapterList) return []

      const chapters: SourceChapter[] = []
      for (const ch of chapterList) {
        const id = `${mangaId}/${ch.hid}-chapter-${ch.chap || '0'}-${ch.lang}`
        if (chapters.some((c) => c.id === id)) continue

        chapters.push({
          id,
          chapterNumber: ch.chap || '?',
          title: ch.title || `Chapter ${ch.chap || '0'}`,
          volume: ch.vol,
          language: ch.lang || 'en',
          pages: 0,
          publishedAt: ch.created_at || new Date().toISOString(),
          readableAt: ch.created_at || new Date().toISOString(),
          externalUrl: null,
          isUnavailable: false,
        })
      }

      return chapters.slice(0, limit)
    } catch {
      return []
    }
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    try {
      const url = `${BASE_URL}/comic/${chapterId}`
      const $ = await fetchHTML(url)
      const scriptData = extractScriptJson($)
      const chapter = scriptData?.chapter as { images?: Array<{ url?: string; name?: string }> } | undefined
      const images = chapter?.images || []

      return images.map((img, index) => ({
        url: img.url || '',
        index,
      })).filter((p) => p.url)
    } catch {
      return []
    }
  },
}
