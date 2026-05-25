import { useState, useEffect } from 'react'

import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import { getSelectedSource } from '@/lib/sourceStorage'
import { reportSourceHealth } from '@/utils/health'
import { formatDate, getMangaType } from '@/utils/manga'

const Content = ({ sourceId }: { sourceId?: string }) => {
  const [data, setData] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const source = sourceId || getSelectedSource()
    const start = Date.now()
    fetch(`/api/manga/updated?limit=12&source=${source}`)
      .then((res) => res.json())
      .then((res) => {
        const latency = Date.now() - start
        const items = (res.data || [])
          .map((manga: { id: string; cover?: string; title?: string; genres?: string[]; lastChapter?: string; year?: number }): Genre | null => {
            if (!manga) return null
            return {
              id: manga.id,
              image: manga.cover || '/images/placeholder.png',
              type: getMangaType(manga.genres),
              title: manga.title || 'Unknown',
              chapters: [{
                info: manga.lastChapter ? `Chap ${manga.lastChapter}` : 'New chapter',
                date: formatDate(manga.year ? String(manga.year) : undefined),
                lang: null,
                chapterId: manga.id,
              }],
            }
          })
          .filter(Boolean) as Genre[]

        // Deduplicate by manga id
        const seen = new Set<string>()
        const unique = items.filter((item, idx) => {
          const id = item.id || `unknown-${idx}`
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })

        reportSourceHealth(source, unique.length > 0, latency)
        setData(unique)
        setLoading(false)
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(source, false, latency, 'Network error')
        setLoading(false)
      })
  }, [sourceId])

  return (
    <Loading loading={loading} type="gif">
      <div className="tab-content" data-name="all">
        <div className="original card-lg">
          {data.map((item, index) => (
            <Card key={item.id || index} item={item} index={index + 1} />
          ))}
        </div>
      </div>
    </Loading>
  )
}

export default Content
