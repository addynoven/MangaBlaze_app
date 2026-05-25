// Transformers: convert unified Source types into UI shapes
import type { SourceManga, SourceChapter } from '@/lib/sources'

export interface MangaCardItem {
  id: string
  image: string
  type: string
  title: string
  chapters: {
    info: string
    date: string
    lang: null
    chapterId: string
  }[]
}

export interface TrendingItem {
  id: string
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

export interface PosterItem {
  id: string
  image: string
  title: string
}

function getMangaType(manga: SourceManga): string {
  const genres = manga.genres || []
  if (genres.some((g) => g.toLowerCase().includes('manhua'))) return 'Manhua'
  if (genres.some((g) => g.toLowerCase().includes('manhwa'))) return 'Manhwa'
  if (genres.some((g) => g.toLowerCase().includes('one-shot'))) return 'One_shot'
  return 'Manga'
}

export function toCardItem(
  manga: SourceManga,
  chapters?: SourceChapter[]
): MangaCardItem {
  const type = getMangaType(manga)

  const chapterList =
    chapters?.slice(0, 3).map((ch) => ({
      info: `Chap ${ch.chapterNumber || '?'} ${ch.language?.toUpperCase() || 'EN'}`,
      date: formatDate(ch.readableAt || ch.publishedAt),
      lang: null,
      chapterId: ch.id,
    })) || []

  return {
    id: manga.id,
    image: manga.cover,
    type,
    title: manga.title,
    chapters: chapterList,
  }
}

export function toTrendingItem(manga: SourceManga): TrendingItem {
  const genres = (manga.genres || []).slice(0, 3)
  const status = manga.status || 'unknown'
  const releasing =
    status === 'completed'
      ? 'Completed'
      : status === 'hiatus'
        ? 'Hiatus'
        : 'Releasing'

  return {
    id: manga.id,
    image: manga.cover,
    title: manga.title,
    desc: (manga.description || '').slice(0, 160) + '...',
    releasing,
    chapterAndVolume: manga.lastChapter || manga.lastVolume
      ? `Chap ${manga.lastChapter || '?'} - Vol ${manga.lastVolume || '?'}`
      : '',
    genres: genres.length > 0 ? genres : ['Action', 'Adventure'],
  }
}

export function toPosterItem(manga: SourceManga): PosterItem {
  return {
    id: manga.id,
    image: manga.cover,
    title: manga.title,
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
