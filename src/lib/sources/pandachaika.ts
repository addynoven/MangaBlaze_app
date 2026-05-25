import * as cheerio from 'cheerio'
import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://panda.chaika.moe'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

async function fetchHTML(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, next: { revalidate: 300 } })
  if (!res.ok) throw new Error(`PandaChaika fetch error: ${res.status} ${url}`)
  return cheerio.load(await res.text())
}

export const pandachaikaSource: MangaSource = {
  id: 'pandachaika',
  name: 'PandaChaika',
  type: 'scraper',
  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    try {
      return []
    } catch {
      return []
    }
  },
  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    try {
      return null
    } catch {
      return null
    }
  },
  async getChapters(_mangaId: string, _limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    try {
      return []
    } catch {
      return []
    }
  },
  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    try {
      return []
    } catch {
      return []
    }
  },
}
