import { useEffect, useState } from 'react'
import {
  ContentBottom,
  ContentTop,
  SidebarBottom,
  SidebarTop,
} from './components'
import type { SourceMangaDetail, SourceChapter } from '@/lib/sources'
import { getSelectedSource } from '@/lib/sourceStorage'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { clearUpdate } from '@/store/slices/library/librarySlice'
import { reportSourceHealth } from '@/utils/health'

interface SourceMatch {
  sourceId: string
  mangaId: string
  title: string
  cover?: string
}

type MangaPageProps = {
  mangaId: string
  sourceId?: string
}

const MangaPage = ({ mangaId, sourceId }: MangaPageProps) => {
  const dispatch = useAppDispatch()
  const pinnedSources = useAppSelector((state) => state.library.pinnedSources)
  const [manga, setManga] = useState<SourceMangaDetail | null>(null)
  const [chapters, setChapters] = useState<SourceChapter[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvedSources, setResolvedSources] = useState<SourceMatch[]>([])
  
  const [activeMangaId, setActiveMangaId] = useState(mangaId)
  const [activeSourceId, setActiveSourceId] = useState(sourceId || getSelectedSource())

  useEffect(() => {
    if (mangaId) {
      dispatch(clearUpdate(mangaId))
    }
  }, [mangaId, dispatch])

  useEffect(() => {
    if (!activeMangaId) return
    setLoading(true)
    const start = Date.now()

    Promise.all([
      fetch(`/api/manga/detail?id=${activeMangaId}&source=${activeSourceId}`).then((r) => r.json()),
      fetch(`/api/manga/detail/feed?id=${activeMangaId}&limit=500&source=${activeSourceId}`).then((r) => r.json()),
    ])
      .then(([mangaRes, feedRes]) => {
        const latency = Date.now() - start
        reportSourceHealth(activeSourceId, !!mangaRes, latency)
        setManga(mangaRes || null)
        setChapters(feedRes?.data || [])
        setLoading(false)
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(activeSourceId, false, latency, 'Network error')
        setLoading(false)
      })
  }, [activeMangaId, activeSourceId])

  // Resolve other sources in background
  useEffect(() => {
    if (!manga?.title || pinnedSources.length <= 1) return

    const otherSources = pinnedSources.filter(s => s !== activeSourceId).join(',')
    if (!otherSources) return

    fetch(`/api/manga/resolve?title=${encodeURIComponent(manga.title)}&sources=${otherSources}`)
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          setResolvedSources(res.data as SourceMatch[])
        }
      })
      .catch(() => {})
  }, [manga?.title, pinnedSources, activeSourceId])

  const handleSwitchSource = (newSourceId: string, newMangaId: string) => {
    setActiveSourceId(newSourceId)
    setActiveMangaId(newMangaId)
  }

  useEffect(() => {
    if (manga) {
      document.title = `${manga.title || 'Manga'} - MangaBlaze`
    }
  }, [manga])

  if (loading) {
    return (
      <div className="main-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    )
  }

  if (!manga) {
    return (
      <div className="container py-5 text-center">
        <h2>Manga not found</h2>
      </div>
    )
  }

  return (
    <div id="main">
      <div className="manga-detail">
        <div className="detail-bg">
          <img src={manga.cover} alt="" style={{ opacity: 0 }} />
        </div>
        <div className="container">
          <div className="main-inner">
            <ContentTop 
              manga={manga} 
              chapters={chapters} 
              sourceId={activeSourceId}
              resolvedSources={resolvedSources}
              onSwitchSource={handleSwitchSource}
            />
            <SidebarTop manga={manga} />
          </div>
        </div>
      </div>
      <div className="container">
        <div className="main-inner manga-bottom">
          <ContentBottom manga={manga} chapters={chapters} />
          <SidebarBottom />
        </div>
      </div>
    </div>
  )
}

export default MangaPage
