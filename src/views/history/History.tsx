'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import { useAppSelector } from '@/store/hook'

const History = () => {
  const signedIn = useAppSelector((state) => state.auth.session.signedIn)
  const localHistory = useAppSelector((state) => state.library.history)
  
  const [data, setData] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'History - MangaBlaze'
    
    if (signedIn) {
      fetch('/api/user/history')
        .then(res => res.json())
        .then(res => {
          if (res.data) {
            const items = res.data.map((m: { 
              realId: string; 
              coverUrl?: string; 
              title: string; 
              sourceId: string; 
              progress: { chapterNumber: string; updatedAt: string; chapterId: string } 
            }): Genre => ({
              id: m.realId,
              image: m.coverUrl || '/images/placeholder.png',
              type: 'Manga',
              title: m.title,
              source: m.sourceId,
              chapters: [{
                info: `Last read: Ch. ${m.progress.chapterNumber}`,
                date: new Date(m.progress.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                chapterId: m.progress.chapterId
              }]
            }))
            setData(items)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [signedIn])

  // Use useMemo for local history to avoid synchronous setState in effect
  const localData = useMemo(() => {
    if (signedIn) return []
    return localHistory.map(m => ({
      ...m,
      image: m.cover,
      chapters: [{
        info: `Last read: Ch. ${m.lastReadChapter}`,
        date: m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
        chapterId: m.lastReadChapterId || ''
      }]
    }))
  }, [signedIn, localHistory])

  const displayData = signedIn ? data : localData
  const isActuallyLoading = signedIn ? loading : false

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">Reading History</h2>
      <Loading loading={isActuallyLoading} type="gif">
        {displayData.length > 0 ? (
          <div className="original card-lg animate-fade-in">
            {displayData.map((item, index) => (
              <Card key={`${item.source}-${item.id}`} item={item} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-5 bg-secondary-subtle rounded animate-fade-in">
             <i className="fa-regular fa-history fa-3xl mb-3 text-muted"></i>
             <h3>Your history is empty</h3>
             <p className="text-muted">Manga you read will appear here.</p>
          </div>
        )}
      </Loading>
    </div>
  )
}

export default History
