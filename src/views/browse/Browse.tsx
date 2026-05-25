'use client'

import { sourceList } from '@/lib/sources'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { togglePinSource } from '@/store/slices/library/librarySlice'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import classNames from 'classnames'

function getGradient(str: string) {
  const gradients = [
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
    'linear-gradient(135deg, #c3cfe2 0%, #c3cfe2 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
    'linear-gradient(135deg, #93a5cf 0%, #e4efe9 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43ea80 0%, #38f8d4 100%)',
    'linear-gradient(135deg, #f83600 0%, #f9d423 100%)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

const Browse = () => {
  const [search, setSearch] = useState('')
  const [healthData, setHealthData] = useState<Record<string, any>>({})
  const dispatch = useAppDispatch()
  const pinnedSources = useAppSelector((state) => state.library.pinnedSources)

  useEffect(() => {
    fetch('/api/source/health')
      .then(res => res.json())
      .then(res => {
        if (res.data) {
          const healthMap = res.data.reduce((acc: any, item: any) => {
            acc[item.sourceId] = item
            return acc
          }, {})
          setHealthData(healthMap)
        }
      })
      .catch(() => {})
  }, [])

  const filteredSources = sourceList.filter((source) =>
    source.name.toLowerCase().includes(search.toLowerCase())
  )

  // Sort: pinned first, then alphabetical
  const sortedSources = [...filteredSources].sort((a, b) => {
    const aPinned = pinnedSources.includes(a.id)
    const bPinned = pinnedSources.includes(b.id)
    if (aPinned && !bPinned) return -1
    if (!aPinned && bPinned) return 1
    return a.name.localeCompare(b.name)
  })

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(togglePinSource(id))
  }

  return (
    <div className="container py-5">
      <style>{`
        .source-card {
          background-color: #151e2e;
          border: 1px solid #1f2a3d;
          border-radius: 1rem;
          transition: all 0.25s cubic-bezier(0.165, 0.84, 0.44, 1);
          box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        }
        .source-card:hover {
          transform: translateY(-4px);
          background-color: #1a2538;
          border-color: #2a3a52;
          box-shadow: 0 12px 24px rgba(0,0,0,0.3);
        }
        .search-input-wrapper {
          position: relative;
          max-width: 400px;
          width: 100%;
        }
        .search-input-sleek {
          background-color: #111827;
          border: 1px solid #374151;
          color: #f3f4f6;
          border-radius: 9999px;
          padding: 0.75rem 1.5rem 0.75rem 2.75rem;
          width: 100%;
          transition: all 0.2s ease;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .search-input-sleek:focus {
          background-color: #1f2937;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
          outline: none;
        }
        .search-icon-pos {
          position: absolute;
          left: 1.1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }
        .header-title {
          font-weight: 800;
          font-size: 2rem;
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .source-avatar {
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .pin-btn {
          transition: all 0.2s ease;
        }
        .pin-btn:hover {
          transform: scale(1.15);
        }
      `}</style>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
        <div>
          <h2 className="header-title mb-1">Manga Sources</h2>
          <p className="text-muted mb-0">Discover and switch between {sourceList.length} aggregated providers</p>
        </div>
        <div className="search-input-wrapper">
          <i className="fa-solid fa-search search-icon-pos"></i>
          <input
            type="text"
            className="search-input-sleek"
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="row g-4 animate-fade-in">
        {sortedSources.map((source) => {
          const isPinned = pinnedSources.includes(source.id)
          const health = healthData[source.id]
          const status = health?.status || 'unknown'

          return (
            <div key={source.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
              <Link 
                href={`/browse/${source.id}`}
                className="source-card text-decoration-none d-flex align-items-center p-3 h-100"
              >
                {/* Avatar */}
                <div
                  className="source-avatar rounded-circle d-flex justify-content-center align-items-center flex-shrink-0 text-white fw-bold fs-4 shadow-sm"
                  style={{
                    width: '54px',
                    height: '54px',
                    background: getGradient(source.name)
                  }}
                >
                  {source.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="ms-3 flex-grow-1 overflow-hidden">
                  <h6 className="mb-1 text-white text-truncate fw-bold" style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>{source.name}</h6>
                  <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="badge rounded-pill px-2 py-1" style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '0.65rem', border: '1px solid #334155' }}>
                      <i className={`fa-solid ${source.type === 'api' ? 'fa-code text-primary' : 'fa-spider text-success'} me-1`}></i>
                      {source.type.toUpperCase()}
                    </span>
                    {health?.lastLatency > 0 && (
                      <span className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        <i className="fa-solid fa-bolt-lightning text-warning me-1"></i>
                        {health.lastLatency}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Status & Pin */}
                <div className="d-flex flex-column align-items-end ms-2 h-100 justify-content-between">
                  <button
                    onClick={(e) => handleTogglePin(e, source.id)}
                    className="btn btn-sm p-1 rounded-circle border-0 pin-btn"
                    style={{ color: isPinned ? '#3b82f6' : '#475569' }}
                    title={isPinned ? "Unpin source" : "Pin source"}
                  >
                    <i className={classNames("fa-solid fa-thumbtack", !isPinned && "fa-rotate-by")} style={!isPinned ? { transform: 'rotate(45deg)' } : {}}></i>
                  </button>
                  <div className="mt-auto mb-1" title={`Status: ${status}`}>
                    <span
                      className="d-block rounded-circle"
                      style={{
                        width: '8px', height: '8px',
                        backgroundColor: status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : status === 'slow' ? '#eab308' : '#64748b',
                        boxShadow: `0 0 8px ${status === 'online' ? '#22c55e' : status === 'offline' ? '#ef4444' : status === 'slow' ? '#eab308' : '#64748b'}`
                      }}
                    ></span>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
        {sortedSources.length === 0 && (
          <div className="col-12 py-5 text-center">
             <div className="text-muted mb-3"><i className="fa-regular fa-folder-open fa-3x"></i></div>
             <h5 className="text-white">No sources found</h5>
             <p className="text-muted">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Browse
