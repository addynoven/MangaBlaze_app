import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import classNames from 'classnames'

import { ShareSocial } from '@/components/shared'
import Modal from '@/components/ui/Modal'
import type { SourceMangaDetail, SourceChapter } from '@/lib/sources'
import { getSelectedSource } from '@/lib/sourceStorage'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { toggleBookmarkLocal } from '@/store/slices/library/librarySlice'

type ContentTopProps = {
  manga: SourceMangaDetail
  chapters: SourceChapter[]
  sourceId?: string
  resolvedSources?: { sourceId: string, mangaId: string, title: string }[]
  onSwitchSource?: (sourceId: string, mangaId: string) => void
}

const ContentTop = ({ manga, chapters, sourceId, resolvedSources = [], onSwitchSource }: ContentTopProps) => {
  const [isReadMore, setIsReadMore] = useState(false)
  
  const dispatch = useAppDispatch()
  const signedIn = useAppSelector((state) => state.auth.session.signedIn)
  const localBookmarks = useAppSelector((state) => state.library.bookmarks)
  const localHistory = useAppSelector((state) => state.library.history)

  const [isBookmarked, setIsBookmarked] = useState(false)
  const [libraryStatus, setLibraryStatus] = useState('reading')
  const [progress, setProgress] = useState<{ chapterId?: string; chapterNumber?: string } | null>(null)
  const [loadingBookmark, setLoadingBookmark] = useState(false)
  
  const activeSourceId = sourceId || getSelectedSource()

  const statuses = [
    { id: 'reading', label: 'Reading' },
    { id: 'plan_to_read', label: 'Plan to Read' },
    { id: 'on_hold', label: 'On Hold' },
    { id: 'completed', label: 'Completed' },
    { id: 'dropped', label: 'Dropped' },
  ]

  useEffect(() => {
    if (!manga.id) return

    if (signedIn) {
      // Check bookmark and progress from API
      Promise.all([
        fetch(`/api/user/bookmark/check?mangaId=${manga.id}&sourceId=${activeSourceId}`).then(res => res.json()),
        fetch(`/api/user/progress?mangaId=${manga.id}&sourceId=${activeSourceId}`).then(res => res.json())
      ]).then(([bookmarkRes, progressRes]) => {
        Promise.resolve().then(() => {
          setIsBookmarked(bookmarkRes.bookmarked)
          if (bookmarkRes.status) setLibraryStatus(bookmarkRes.status)
          setProgress(progressRes.data)
        })
      }).catch(() => {})
    } else {
      // Check local Redux state
      const local = localBookmarks.find(m => m.id === manga.id && m.source === activeSourceId)
      const hist = localHistory.find(m => m.id === manga.id && m.source === activeSourceId)
      
      Promise.resolve().then(() => {
        setIsBookmarked(!!local)
        if (local?.status) setLibraryStatus(local.status)
        if (hist) setProgress({ chapterId: hist.lastReadChapterId, chapterNumber: hist.lastReadChapter })
      })
    }
  }, [manga.id, activeSourceId, signedIn, localBookmarks, localHistory])

  const handleUpdateStatus = async (newStatus: string) => {
    if (signedIn) {
      setLoadingBookmark(true)
      try {
        const res = await fetch('/api/user/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mangaId: manga.id,
            sourceId: activeSourceId,
            status: newStatus,
            mangaData: {
              title: manga.title,
              cover: manga.cover,
              description: manga.description,
              status: manga.status,
              year: manga.year
            }
          })
        })

        const data = await res.json()
        setIsBookmarked(data.bookmarked)
        setLibraryStatus(newStatus)
        toast.success(`Moved to ${statuses.find(s => s.id === newStatus)?.label}`)
      } catch (error) {
        toast.error('Failed to update status')
      } finally {
        setLoadingBookmark(false)
      }
    } else {
      // Update local Redux state
      dispatch(toggleBookmarkLocal({
        id: manga.id,
        title: manga.title,
        cover: manga.cover,
        source: activeSourceId,
        status: newStatus
      }))
      toast.success(`Saved locally to ${statuses.find(s => s.id === newStatus)?.label}`)
    }
  }

  const handleToggleBookmark = async () => {
    if (isBookmarked) {
       if (signedIn) {
         setLoadingBookmark(true)
         try {
           const res = await fetch('/api/user/bookmark', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ mangaId: manga.id, sourceId: activeSourceId })
           })
           const data = await res.json()
           setIsBookmarked(data.bookmarked)
           toast.success('Removed from library')
         } catch (e) {
           toast.error('Failed to remove from library')
         } finally {
           setLoadingBookmark(false)
         }
       } else {
         dispatch(toggleBookmarkLocal({ id: manga.id, title: manga.title, cover: manga.cover, source: activeSourceId }))
         toast.success('Removed from local library')
       }
    } else {
       handleUpdateStatus('reading')
    }
  }

  const handleMigrate = async (newSourceId: string, newMangaId: string) => {
    if (!isBookmarked) return
    
    if (!signedIn) {
      toast.error('Please login to use migration tool')
      return
    }

    const confirm = window.confirm(`Are you sure you want to migrate your bookmark and history to ${newSourceId.toUpperCase()}?`)
    if (!confirm) return

    setLoadingBookmark(true)
    try {
      const res = await fetch('/api/user/library/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromMangaId: `${activeSourceId}:${manga.id}`,
          toSourceId: newSourceId,
          toMangaId: newMangaId
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Migration successful!')
        window.location.href = `/manga/${newMangaId}?source=${newSourceId}`
      } else {
        toast.error(data.error || 'Migration failed')
      }
    } catch (e) {
      toast.error('Migration failed')
    } finally {
      setLoadingBookmark(false)
    }
  }

  const handleOpenModal = () => setIsReadMore(true)
  const handleCloseModal = () => setIsReadMore(false)

  const title = manga.title
  const description = manga.description || ''
  const cover = manga.cover
  const status = manga.status
  const statusLabel = status === 'completed' ? 'Completed' : status === 'hiatus' ? 'Hiatus' : 'Releasing'

  const readableChapters = (chapters || []).filter(
    (c) => !c.isUnavailable
  )
  
  let readingUrl = '#'
  let readingLabel = 'Start Reading'
  
  if (progress && progress.chapterId) {
    readingUrl = `/read/${manga.id}/en/${progress.chapterId}${activeSourceId ? `?source=${activeSourceId}` : ''}`
    readingLabel = `Continue Ch. ${progress.chapterNumber || '?'}`
  } else {
    const firstChapter = readableChapters[readableChapters.length - 1] || readableChapters[0]
    readingUrl = firstChapter?.externalUrl || (firstChapter ? `/read/${manga.id}/en/${firstChapter.id}${activeSourceId ? `?source=${activeSourceId}` : ''}` : '#')
    readingLabel = 'Start Reading'
  }

  const isExternal = readingUrl.startsWith('http')
  const firstChapterTarget = isExternal ? '_blank' : undefined
  const firstChapterRel = isExternal ? 'noopener noreferrer' : undefined

  return (
    <aside className="content">
      <div className="poster">
        <div>
          <img src={cover} alt={title} loading="lazy" referrerPolicy="no-referrer" />
        </div>
      </div>
      <div className="info">
        <p>{statusLabel}</p>
        <h1>{title}</h1>
        <h6>{title}</h6>
        <div className="actions">
          <Link
            className="btn btn-lg btn-primary readnow"
            href={readingUrl}
            target={firstChapterTarget}
            rel={firstChapterRel}
          >
            <span>{readingLabel}</span>
            <span>{readingLabel === 'Start Reading' ? 'Read Now' : 'Continue'}</span>
            <i className="fa-solid fa-play fa-xs"></i>
          </Link>
          <div className="bookmark favourite dropdown">
            <button 
              className={classNames("btn btn-lg h-100", isBookmarked ? "btn-primary" : "btn-secondary1")} 
              type="button"
              onClick={handleToggleBookmark}
              disabled={loadingBookmark}
            >
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              <i className={classNames("fa-bookmark fa-xs", isBookmarked ? "fa-solid" : "fa-regular")}></i>
            </button>
            {isBookmarked && (
              <>
                <button 
                  className="btn btn-lg btn-primary dropdown-toggle dropdown-toggle-split" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.2)' }}
                >
                  <span className="visually-hidden">Toggle Dropdown</span>
                </button>
                <ul className="dropdown-menu dropdown-menu-dark">
                  {statuses.map(s => (
                    <li key={s.id}>
                      <button 
                        className={classNames("dropdown-item", libraryStatus === s.id && "active")}
                        onClick={() => handleUpdateStatus(s.id)}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Source Selector */}
        <div className="mt-3">
          <div className="text-muted mb-2 small uppercase fw-bold">Available Sources</div>
          <div className="d-flex flex-wrap gap-2">
            <button 
              className="btn btn-sm btn-outline-primary active"
              disabled
            >
              {activeSourceId.toUpperCase()} (Active)
            </button>
            {resolvedSources.map((s) => (
              <div key={`${s.sourceId}-${s.mangaId}`} className="btn-group">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => onSwitchSource?.(s.sourceId, s.mangaId)}
                >
                  {s.sourceId.toUpperCase()}
                </button>
                {isBookmarked && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    title="Migrate bookmark to this source"
                    onClick={() => handleMigrate(s.sourceId, s.mangaId)}
                    disabled={loadingBookmark}
                  >
                    <i className="fa-solid fa-truck-fast"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="min-info mt-3">
          <Link href="/type/manga">Manga</Link>
          <span>
            <i className="fa-regular fa-folder-bookmark"></i> 0
          </span>
          <span>
            <b>-- MAL</b> by -- users
          </span>
        </div>
        <div className="description">
          {description.slice(0, 200)}{description.length > 200 ? '...' : ''}
        </div>
        {description.length > 200 && (
          <button className="readmore" onClick={handleOpenModal}>
            Read more +
          </button>
        )}
        <ShareSocial className="mt-3 justify-content-center justify-content-md-start" />
      </div>

      <Modal open={isReadMore} onClose={handleCloseModal}>
        {description}
      </Modal>
    </aside>
  )
}

export default ContentTop
