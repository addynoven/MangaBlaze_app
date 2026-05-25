'use client'

import { sourceList } from '@/lib/sources'
import { useAppDispatch, useAppSelector } from '@/store/hook'
import { togglePinSource } from '@/store/slices/library/librarySlice'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import classNames from 'classnames'

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

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch(togglePinSource(id))
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Browse Sources</h2>
        <div className="search-box">
          <input
            type="text"
            className="form-control"
            placeholder="Search sources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="row g-3 animate-fade-in">
        {filteredSources.map((source) => {
          const isPinned = pinnedSources.includes(source.id)
          const health = healthData[source.id]
          const status = health?.status || 'unknown'

          return (
            <div key={source.id} className="col-6 col-md-4 col-lg-3">
              <div className="position-relative h-100">
                <Link 
                  href={`/browse/${source.id}`}
                  className="card h-100 text-decoration-none bg-secondary-subtle hover-shadow"
                >
                  <div className="card-body d-flex flex-column justify-content-center align-items-center p-4">
                    <div className="source-icon mb-2 position-relative">
                       <i className="fa-regular fa-globe fa-2xl"></i>
                       <span 
                         className={classNames(
                           "position-absolute bottom-0 end-0 p-1 border border-light rounded-circle",
                           status === 'online' ? 'bg-success' : status === 'offline' ? 'bg-danger' : status === 'slow' ? 'bg-warning' : 'bg-secondary'
                         )}
                         style={{ width: 12, height: 12 }}
                         title={`Status: ${status}`}
                       ></span>
                    </div>
                    <h5 className="card-title text-center mb-0 text-white">{source.name}</h5>
                    <div className="d-flex align-items-center mt-2 gap-2">
                       <span className="badge bg-primary">{source.type}</span>
                       {health?.lastLatency > 0 && (
                         <span className="text-muted small">
                           <i className="fa-solid fa-bolt-lightning fa-xs mr-1"></i>
                           {health.lastLatency}ms
                         </span>
                       )}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={(e) => handleTogglePin(e, source.id)}
                  className={classNames(
                    "btn btn-sm position-absolute top-0 end-0 m-2",
                    isPinned ? "text-primary" : "text-muted"
                  )}
                  title={isPinned ? "Unpin source" : "Pin source"}
                >
                  <i 
                    className={classNames("fa-solid fa-thumbtack", !isPinned && "fa-rotate-by")} 
                    style={!isPinned ? { transform: 'rotate(45deg)' } : {}}
                  ></i>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Browse
