import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

export const ero18xSource: MangaSource = {
  id: 'ero18x',
  name: 'Ero18x',
  type: 'scraper',
  async search(_query: string, _limit = 20): Promise<SourceManga[]> {
    return []
  },
  async getManga(_mangaId: string): Promise<SourceMangaDetail | null> {
    return null
  },
  async getChapters(_mangaId: string, _limit = 100): Promise<SourceChapter[]> {
    return []
  },
  async getChapterPages(_chapterId: string): Promise<SourcePage[]> {
    return []
  },
}
