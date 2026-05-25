import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://manhwabuddy.com'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return cheerio.load(await res.text())
  } catch {
    return null
  }
}

export const manhwabuddySource: MangaSource = {
  id: 'manhwabuddy',
  name: 'ManhwaBuddy',
  type: 'scraper',

  async search(query: string, limit = 20): Promise<SourceManga[]> {
    const results: SourceManga[] = []
    const lowerQuery = query.toLowerCase()
    for (let page = 1; page <= 3 && results.length < limit; page++) {
      const $ = await fetchHTML(`${BASE_URL}/page/${page}/`)
      if (!$) break
      $('.item-move').each((_, el) => {
        const a = $(el).find('a[href^="/manhwa/"]').first()
        const title = a.attr('title')?.trim() || ''
        const href = a.attr('href') || ''
        const img = $(el).find('img.img-move').first()
        const cover = img.attr('src') || img.attr('data-src') || ''
        if (!title || !href) return
        const slug = href.replace('/manhwa/', '').replace(/\/$/, '')
        if (results.some((r) => r.id === slug)) return
        if (title.toLowerCase().includes(lowerQuery)) {
          results.push({ id: slug, title, cover })
        }
      })
    }
    return results.slice(0, limit)
  },

  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    const $ = await fetchHTML(`${BASE_URL}/manhwa/${mangaId}/`)
    if (!$) return null
    const title = $('.main-info-title').first().text().trim()
    if (!title) return null
    const cover =
      $('.img-cover').first().attr('src') ||
      $('meta[property="og:image"]').attr('content') ||
      ''
    const description = $('.short-desc-content p').first().text().trim()
    return {
      id: mangaId,
      title,
      cover,
      description,
      authors: [],
      artists: [],
      genres: [],
      altTitles: [],
      status: undefined,
      year: null,
      lastVolume: null,
      lastChapter: null,
    }
  },

  async getChapters(
    mangaId: string,
    limit = 100,
    _offset = 0,
    _lang = 'en'
  ): Promise<SourceChapter[]> {
    const $ = await fetchHTML(`${BASE_URL}/manhwa/${mangaId}/`)
    if (!$) return []
    const chapters: SourceChapter[] = []
    $('.chapter-list a').each((_, el) => {
      const a = $(el)
      const href = a.attr('href') || ''
      const name = a.find('.chapter-name').text().trim()
      if (!href) return
      const match = href.match(/\/manhwa\/[^/]+\/([^/]+)\/$/)
      const chapterSlug = match?.[1] || ''
      if (!chapterSlug) return
      const id = `${mangaId}/${chapterSlug}`
      if (chapters.some((c) => c.id === id)) return
      const numMatch = name.match(/Chapter\s+(\d+)/i) || chapterSlug.match(/(\d+)/)
      const chapterNumber = numMatch?.[1] || chapterSlug
      chapters.push({
        id,
        chapterNumber,
        title: name || `Chapter ${chapterNumber}`,
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
  },

  async getChapterPages(chapterId: string): Promise<SourcePage[]> {
    const $ = await fetchHTML(`${BASE_URL}/manhwa/${chapterId}/`)
    if (!$) return []
    const pages: SourcePage[] = []
    $('.reading-content img').each((index, el) => {
      const src =
        $(el).attr('data-src')?.trim() ||
        $(el).attr('src')?.trim() ||
        ''
      if (src) pages.push({ url: src, index })
    })
    return pages
  },
}
