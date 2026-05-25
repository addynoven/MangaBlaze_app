import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://heytoon.net'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`HeyToon fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const heytoonSource: MangaSource = {
  id: 'heytoon',
  name: 'HeyToon',
  type: 'scraper',
  async search(query: string, limit = 20): Promise<SourceManga[]> {
    try {
      /* Site is blocked by Cloudflare; returning empty results */
      return []
    } catch { return [] }
  },
  async getManga(mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      /* Site is blocked by Cloudflare; returning empty results */
      return null
    } catch { return null }
  },
  async getChapters(mangaId: string, limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      /* Site is blocked by Cloudflare; returning empty results */
      return []
    } catch { return [] }
  },
  async getChapterPages(chapterId: string, mangaId?: string): Promise<SourcePage[]> {
    try {
      /* Site is blocked by Cloudflare; returning empty results */
      return []
    } catch { return [] }
  },
}
