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
                date: new Date(m.progress.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                lang: 'EN',
                chapterId: m.progress.chapterId
              }]
            } as any))
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
        lang: 'EN',
        chapterId: m.lastReadChapterId || ''
      }]
    } as any))
  }, [signedIn, localHistory])

  const displayData = signedIn ? data : localData
  const isActuallyLoading = signedIn ? loading : false

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">
        <span className="text-primary">Reading</span> History
      </h2>
      <Loading loading={isActuallyLoading} type="gif">
        {displayData.length > 0 ? (
          <div className="original card-lg animate-fade-in">
            {displayData.map((item, index) => (
              <Card key={`${(item as any).source}-${item.id}`} item={item as any} index={index + 1} />
            ))}
          </div>
        ) : (
          <div className="text-center py-5 glass-panel animate-fade-in mx-auto" style={{ maxWidth: '500px' }}>
             <div className="mb-4">
               <i className="fa-solid fa-clock-rotate-left text-primary" style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 15px rgba(59,130,246,0.5))' }}></i>
             </div>
             <h3 className="fw-bold mb-2">Your history is empty</h3>
             <p className="text-muted">Manga you read will appear here.</p>
          </div>
        )}
      </Loading>
    </div>
  )
}

export default History
