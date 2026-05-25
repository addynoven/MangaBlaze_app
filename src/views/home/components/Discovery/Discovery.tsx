'use client'

import { useEffect, useState } from 'react'
import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import { getMangaType, formatDate } from '@/utils/manga'

const Discovery = () => {
  const [data, setData] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/manga/discovery')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          const items = res.data.map((m: any): Genre => ({
            id: m.id,
            image: m.cover || '/images/placeholder.png',
            type: getMangaType(m.genres),
            title: m.title,
            source: m.source,
            chapters: [{
              info: m.lastChapter ? `Chap ${m.lastChapter}` : 'View details',
              date: formatDate(m.year ? String(m.year) : undefined),
              chapterId: m.id
            }]
          }))
          setData(items)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (data.length === 0 && !loading) return null

  return (
    <section className="discovery-section py-4 animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Recommended for You</h2>
        <span className="text-muted small">Trending across top sources</span>
      </div>
      <Loading loading={loading} type="gif">
        <div className="original card-lg">
          {data.map((item, index) => (
            <Card key={`${item.source}-${item.id}`} item={item} index={index + 1} />
          ))}
        </div>
      </Loading>
    </section>
  )
}

export default Discovery
