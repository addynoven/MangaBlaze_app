'use client'

import { useEffect, useState } from 'react'
import { Card, Loading } from '@/components/shared'
import { Genre } from '@/@types/common'
import Link from 'next/link'
import classNames from 'classnames'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { setUnreadUpdates } from '@/store/slices/library/librarySlice'
import { toast } from 'react-hot-toast'

interface LibraryManga extends Genre {
  libraryStatus: string
  isNew?: boolean
}

interface LibraryStats {
  totalBookmarks: number
  estimatedChaptersRead: number
  mangaRead: number
  topGenres: { name: string; count: number }[]
}

const Library = () => {
  const dispatch = useAppDispatch()
  const unreadUpdates = useAppSelector((state) => state.library.unreadUpdates)
  const localBookmarks = useAppSelector((state) => state.library.bookmarks)
  const signedIn = useAppSelector((state) => state.auth.session.signedIn)
  
  const [data, setData] = useState<LibraryManga[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reading')
  const [stats, setStats] = useState<LibraryStats | null>(null)

  const statuses = [
    { id: 'reading', label: 'Reading' },
    { id: 'plan_to_read', label: 'Plan to Read' },
    { id: 'on_hold', label: 'On Hold' },
    { id: 'completed', label: 'Completed' },
    { id: 'dropped', label: 'Dropped' },
    { id: 'stats', label: 'Statistics' },
  ]

  useEffect(() => {
    document.title = 'Library - MangaBlaze'
    
    if (signedIn) {
      // Fetch bookmarks from API
      fetch('/api/user/bookmark')
        .then(res => res.json())
        .then(res => {
          if (res.data) {
            const items = res.data.map((m: any): LibraryManga => ({
              id: m.realId,
              image: m.coverUrl || '/images/placeholder.png',
              type: 'Manga',
              title: m.title,
              source: m.sourceId,
              libraryStatus: m.status,
              chapters: m.progress ? [{
                info: `Read: Ch. ${m.progress.chapterNumber}`,
                date: new Date(m.progress.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                chapterId: m.progress.chapterId
              }] : []
            }))
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
    } else {
      // Use local bookmarks
      setData(localBookmarks.map(m => ({
        ...m,
        image: m.cover,
        libraryStatus: m.status || 'reading',
        chapters: m.lastReadChapter ? [{
          info: `Read: Ch. ${m.lastReadChapter}`,
          date: m.updatedAt ? new Date(m.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently',
          chapterId: m.lastReadChapterId || ''
        }] : []
      })))
      setLoading(false)
    }
  }, [dispatch, signedIn, localBookmarks])

  useEffect(() => {
    if (activeTab === 'stats') {
      if (signedIn) {
        fetch('/api/user/library/stats')
          .then(res => res.json())
          .then(res => setStats(res.data))
          .catch(() => {})
      } else {
        // Calculate basic stats from local data
        const genreMap = new Map<string, number>()
        // Note: local data might not have tags unless we save them. 
        // For MVP, just show totals.
        setStats({
          totalBookmarks: localBookmarks.length,
          estimatedChaptersRead: 0, 
          mangaRead: localBookmarks.filter(m => m.lastReadChapter).length,
          topGenres: []
        })
      }
    }
  }, [activeTab, signedIn, localBookmarks])

  const handleExport = async () => {
    if (signedIn) {
      try {
        const res = await fetch('/api/user/backup/export')
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mangablaze-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        toast.success('Backup exported successfully!')
      } catch (e) {
        toast.error('Failed to export backup')
      }
    } else {
      // Export local data
      const backup = {
        version: 1,
        timestamp: new Date().toISOString(),
        library: localBookmarks,
        history: []
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mangablaze-local-backup.json`
      a.click()
      toast.success('Local backup exported!')
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string)
        if (signedIn) {
          const res = await fetch('/api/user/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backup)
          })
          const data = await res.json()
          if (data.success) {
            toast.success(`Imported ${data.count} titles! Refreshing...`)
            setTimeout(() => window.location.reload(), 2000)
          } else {
            toast.error(data.error || 'Import failed')
          }
        } else {
          // Import to local Redux (TODO: implement setBookmarksLocal action or loop)
          toast.error('Local import not yet implemented. Please login to import.')
        }
      } catch (err) {
        toast.error('Invalid backup file')
      }
    }
    reader.readAsText(file)
  }

  const filteredData = data.filter(item => item.libraryStatus === activeTab)
    .map(item => ({
      ...item,
      isNew: unreadUpdates.includes(item.id as string)
    }))

  return (
    <div className="container py-4">
      {!signedIn && (
        <div className="alert bg-primary/10 border border-primary/20 text-primary mb-4 rounded-xl d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <i className="fa-solid fa-circle-info mr-3"></i>
            <span>You are in <b>Guest Mode</b>. Login to sync your library across devices.</span>
          </div>
          <Link href="#" className="btn btn-primary btn-sm rounded-pill px-3">Login Now</Link>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <h2 className="mb-0 fw-bold">My Library</h2>
        <div className="d-flex gap-2 align-items-center">
          <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" title="Export Backup" onClick={handleExport}>
            <i className="fa-solid fa-cloud-arrow-down mr-1"></i> Export
          </button>
          <label className="btn btn-sm btn-outline-secondary rounded-pill px-3 mb-0 cursor-pointer" title="Import Backup" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-cloud-arrow-up mr-1"></i> Import
            <input type="file" className="d-none" accept=".json" onChange={handleImport} />
          </label>
          <span className="badge bg-primary rounded-pill px-3 py-2">{data.length} Total</span>
        </div>
      </div>

      <div className="nav nav-pills mb-5 flex-nowrap overflow-auto pb-2 custom-scrollbar">
        {statuses.map(s => {
          const count = data.filter(item => item.libraryStatus === s.id).length
          const hasUpdate = data.some(item => item.libraryStatus === s.id && unreadUpdates.includes(item.id as string))
          return (
            <button
              key={s.id}
              className={classNames(
                "nav-link position-relative mr-2 px-4 py-2 transition-all", 
                activeTab === s.id ? "active bg-primary shadow-sm" : "bg-secondary-subtle text-muted"
              )}
              onClick={() => setActiveTab(s.id)}
              style={{ borderRadius: 20, whiteSpace: 'nowrap', fontWeight: activeTab === s.id ? 600 : 400 }}
            >
              {s.id === 'stats' ? (
                 <i className="fa-solid fa-chart-simple mr-2"></i>
              ) : null}
              {s.label} {s.id !== 'stats' ? `(${count})` : ''}
              {hasUpdate && (
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle shadow-sm">
                  <span className="visually-hidden">New updates</span>
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Loading loading={loading} type="gif">
        <div className="animate-fade-in">
          {activeTab === 'stats' ? (
            <div className="stats-dashboard">
              {stats ? (
                <div className="row g-4">
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="bg-secondary-subtle p-4 rounded text-center h-100">
                      <div className="display-5 fw-bold text-primary">{stats.totalBookmarks}</div>
                      <div className="text-muted small">Total Bookmarks</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="bg-secondary-subtle p-4 rounded text-center h-100">
                      <div className="display-5 fw-bold text-success">{stats.estimatedChaptersRead}</div>
                      <div className="text-muted small">Chapters Read</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-lg-3">
                    <div className="bg-secondary-subtle p-4 rounded text-center h-100">
                      <div className="display-5 fw-bold text-info">{stats.mangaRead}</div>
                      <div className="text-muted small">Manga Progressed</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-12 col-lg-3">
                    <div className="bg-secondary-subtle p-4 rounded h-100">
                      <div className="text-white fw-bold mb-2">Top Genres</div>
                      <div className="d-flex flex-wrap gap-2">
                        {stats.topGenres?.map((g) => (
                          <span key={g.name} className="badge bg-primary">
                            {g.name} ({g.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5">Loading statistics...</div>
              )}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="original card-lg">
              {filteredData.map((item, index) => (
                <Card key={item.id || index} item={item} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 bg-secondary-subtle rounded">
               <i className="fa-regular fa-book-bookmark fa-3xl mb-3 text-muted"></i>
               <h3>No manga in &quot;{statuses.find(s => s.id === activeTab)?.label}&quot;</h3>
               <p className="text-muted">Explore sources in the Browse section and add manga to your library.</p>
               <Link href="/browse" className="btn btn-primary mt-3">Go to Browse</Link>
            </div>
          )}
        </div>
      </Loading>
    </div>
  )
}

export default Library
