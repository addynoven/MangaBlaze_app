import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

const BASE_URL = 'https://ososedki.com'

export const ososedkiSource: MangaSource = {
  id: 'ososedki',
  name: 'OSOSEDKI',
  type: 'scraper',

  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return []
  },

  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return null
  },

  async getChapters(_mangaId: string, _limit = 100, _offset = 0, _lang = 'en'): Promise<SourceChapter[]> {
    return []
  },

  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    return []
  },
}
