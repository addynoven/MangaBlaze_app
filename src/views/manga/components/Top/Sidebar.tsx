import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { CSSTransition } from 'react-transition-group'
import type { SourceMangaDetail } from '@/lib/sources'

type SidebarTopProps = {
  manga: SourceMangaDetail
}

const SidebarTop = ({ manga }: SidebarTopProps) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState('0px')
  const [openInfo, setOpenInfo] = useState(true)

  useEffect(() => {
    if (nodeRef.current && nodeRef.current.clientHeight) {
      setHeight(nodeRef.current.clientHeight + 'px')
    }
  }, [openInfo])

  const handleOpenInfo = () => setOpenInfo((prev) => !prev)

  const authors = manga.authors || []
  const artists = manga.artists || []
  const allCreators = [...new Set([...authors, ...artists])]

  const tags = manga.genres?.slice(0, 8) || []
  const year = manga.year

  return (
    <>
      <button
        id="info-rating-btn"
        className="btn collapsed"
        data-toggle="collapse"
        data-target="#info-rating"
        type="button"
        onClick={handleOpenInfo}
      >
        <i className="fa-solid fa-circle-info"></i>
        <span className="mx-2">More information & Rating</span>
        <i className="fa-solid fa-star"></i>
      </button>

      <aside
        className="sidebar"
        style={
          {
            '--height': height,
          } as React.CSSProperties
        }
      >
        <CSSTransition
          in={openInfo}
          timeout={300}
          classNames="menu"
          mountOnEnter
          unmountOnExit
          nodeRef={nodeRef}
        >
          <div ref={nodeRef} className="collapse d-block" id="info-rating">
            <div className="meta">
              {allCreators.length > 0 && (
                <div>
                  <span>Author:</span>
                  <span>
                    {allCreators.map((a, i) => (
                      <span key={`${a}-${i}`}>{i > 0 ? ', ' : ''}{a}</span>
                    ))}
                  </span>
                </div>
              )}
              {year && (
                <div>
                  <span>Published:</span>
                  <span> {year} to ? </span>
                </div>
              )}
              {tags.length > 0 && (
                <div>
                  <span>Genres:</span>
                  <span>
                    {tags.map((tag) => (
                      <Link key={tag} href={`/genre/${tag.toLowerCase().replace(/\s+/g, '-')}`}>
                        {tag}
                      </Link>
                    ))}
                  </span>
                </div>
              )}
            </div>
            <div className="rating-box" data-id={manga.id} data-score="0">
              <div className="score">
                <div>
                  <span className="live-score">--</span>/ <span>10</span>
                </div>
                <span className="live-label">by -- reviews</span>
              </div>
              <div className="stars">
                {[1,2,3,4,5].map((s) => (
                  <span key={s}>
                    <i className="fa-solid fa-star"></i>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CSSTransition>
      </aside>
    </>
  )
}

export default SidebarTop
