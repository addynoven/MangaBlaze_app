import { mangadexSource } from './mangadex'
import { asurascansSource } from './asurascans'
import { comickSource } from './comick'
import type { MangaSource } from './types'

// We will maintain the old record for backward compatibility while we migrate
export const sources: Record<string, MangaSource> = {
  mangadex: mangadexSource,
  asurascans: asurascansSource,
  comick: comickSource,
}

// In the future, this will be a dynamic loader that scans src/lib/extensions/*
export const sourceList = Object.values(sources)

export const defaultSource = mangadexSource

export function getSource(id?: string): MangaSource {
  if (!id) return defaultSource
  return sources[id] || defaultSource
}

export type { MangaSource, SourceManga, SourceMangaDetail, SourceChapter, SourcePage } from './types'
export { BaseSource } from './BaseSource'
