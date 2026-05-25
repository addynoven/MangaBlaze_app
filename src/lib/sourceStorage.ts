// Simple localStorage-based source preference
const SOURCE_KEY = 'mangafire-source'
const DEFAULT_SOURCE = 'mangadex'

export function getSelectedSource(): string {
  if (typeof window === 'undefined') return DEFAULT_SOURCE
  return localStorage.getItem(SOURCE_KEY) || DEFAULT_SOURCE
}

export function setSelectedSource(sourceId: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOURCE_KEY, sourceId)
}
