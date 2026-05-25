import type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'

export const giantitpSource: MangaSource = {
  id: 'giantitp',
  name: 'The Order Of The Stick (OOTS)',
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
