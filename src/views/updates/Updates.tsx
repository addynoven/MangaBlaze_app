'use client'

import { useEffect, useState } from 'react'
import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { setUnreadUpdates } from '@/store/slices/library/librarySlice'

const Updates = () => {
  const dispatch = useAppDispatch()
  const unreadUpdates = useAppSelector((state) => state.library.unreadUpdates)
  const [data, setData] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Updates - MangaBlaze'
    
    fetch('/api/user/updates')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          const items = res.data.map((item: { 
            manga: { realId: string; coverUrl?: string; title: string; sourceId: string }; 
            latestChapter: { chapterNumber: string; publishedAt: string; id: string } 
          }): Genre => ({
            id: item.manga.realId,
            image: item.manga.coverUrl || '/images/placeholder.png',
            type: 'Manga',
            title: item.manga.title || 'Unknown',
            source: item.manga.sourceId,
            chapters: [{
              info: `Chap ${item.latestChapter.chapterNumber}`,
              date: new Date(item.latestChapter.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              lang: 'EN',
              chapterId: item.latestChapter.id
            }]
          } as any))
          setData(items)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Trigger Library Sync
    fetch('/api/user/library/sync')
      .then(res => res.json())
      .then(res => {
        if (res.unreadMangaIds) {
          dispatch(setUnreadUpdates(res.unreadMangaIds))
        }
      })
      .catch(() => {})
  }, [dispatch])

  const mappedData = data.map(item => ({
    ...item,
    isNew: unreadUpdates.includes(item.id!)
  }))

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">
        <span className="text-primary">Recent</span> Updates
      </h2>
      <Loading loading={loading} type="gif">
        {mappedData.length > 0 ? (
          <div className="original card-lg">
            {mappedData.map((item, index) => (
              <Card key={`${(item as any).source}-${item.id}`} item={item as any} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-5 glass-panel animate-fade-in mx-auto" style={{ maxWidth: '500px' }}>
             <div className="mb-4">
               <i className="fa-solid fa-clock-rotate-left text-primary" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.5))' }}></i>
             </div>
             <h3 className="fw-bold mb-2">No recent updates</h3>
             <p className="text-muted">New chapters from your bookmarked manga will appear here.</p>
          </div>
        )}
      </Loading>
    </div>
  )
}

export default Updates
