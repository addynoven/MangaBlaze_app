import Link from 'next/link'

import { Poster as PosterType } from '@/@types/common'
import { proxiedImageUrl } from '@/utils/manga'

type PosterProps = {
  item: PosterType
  index?: number
}

const Poster = (props: PosterProps) => {
  const { item, index } = props
  const sourceParam = item.source ? `?source=${item.source}` : ''
  return (
    <Link href={`/manga/${item.id || 'unknown'}${sourceParam}`}>
      {index ? <b>{index}</b> : null}
      <div className="poster">
        <div>
          <img
            src={proxiedImageUrl(item.image)}
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
