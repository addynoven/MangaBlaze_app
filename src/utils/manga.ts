export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getMangaType(genres?: string[]): string {
  if (!genres) return 'Manga'
  if (genres.some((g) => g.toLowerCase().includes('manhua'))) return 'Manhua'
  if (genres.some((g) => g.toLowerCase().includes('manhwa'))) return 'Manhwa'
  if (genres.some((g) => g.toLowerCase().includes('one-shot'))) return 'One_shot'
  return 'Manga'
}
