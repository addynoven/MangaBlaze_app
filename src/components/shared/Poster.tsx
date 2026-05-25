import Link from 'next/link'

import { Poster as PosterType } from '@/@types/common'

type PosterProps = {
  item: PosterType
  index?: number
}

const Poster = (props: PosterProps) => {
  const { item, index } = props
  return (
    <Link href={`/manga/${item.id || 'unknown'}`}>
      {index ? <b>{index}</b> : null}
      <div className="poster">
        <div>
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/images/placeholder.png'
            }}
          />
        </div>
      </div>
      <span>{item.title}</span>
    </Link>
  )
}

export default Poster
