'use client'

import { useEffect, useState } from 'react'
import Manga from '@/views/manga'

export default function RandomPage() {
  const [mangaId, setMangaId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/manga/popular?limit=50')
      .then((r) => r.json())
      .then((res) => {
        const data = res.data || []
        const random = data[Math.floor(Math.random() * data.length)]
        if (random) setMangaId(random.id)
      })
  }, [])

  if (!mangaId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Finding random manga...</span>
        </div>
      </div>
    )
  }

  return <Manga mangaId={mangaId} />
}
