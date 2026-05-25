'use client'

import { useState } from 'react'
import { sourceList } from '@/lib/sources'
import { useAppSelector } from '@/store/hook'
import classNames from 'classnames'

const Sources = () => {
  const pinnedSources = useAppSelector((state) => state.library.pinnedSources)
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filteredSources = sourceList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  // Initially show pinned sources + top 5 others
  const displayedSources = showAll ? filteredSources : filteredSources.filter(s => pinnedSources.includes(s.id)).concat(
    filteredSources.filter(s => !pinnedSources.includes(s.id)).slice(0, 5)
  )

  return (
    <div className="filter-group">
      <div className="title">Sources</div>
      <div className="search-sm mb-2">
        <input 
          type="text" 
          className="form-control form-control-sm" 
          placeholder="Filter sources..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}
        />
      </div>
      <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: 200 }}>
        {displayedSources.map((source) => (
          <div key={source.id} className="form-check mb-1">
            <input
              className="form-check-input"
              type="checkbox"
              name="source[]"
              value={source.id}
              id={`source-${source.id}`}
              defaultChecked={pinnedSources.includes(source.id)}
            />
            <label className={classNames("form-check-label small", pinnedSources.includes(source.id) && "text-primary fw-bold")} htmlFor={`source-${source.id}`}>
              {source.name}
            </label>
          </div>
        ))}
      </div>
      {!showAll && filteredSources.length > displayedSources.length && (
        <button 
          type="button" 
          className="btn btn-link btn-sm p-0 mt-1" 
          onClick={() => setShowAll(true)}
          style={{ fontSize: 11 }}
        >
          Show all ({filteredSources.length})
        </button>
      )}
    </div>
  )
}

export default Sources
