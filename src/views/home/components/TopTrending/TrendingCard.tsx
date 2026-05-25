import Link from 'next/link'

import { TrendingItem } from '@/lib/mangadex/transform'

type TrendingCardProps = {
  item: TrendingItem
  index: number
}

function TrendingCard(props: TrendingCardProps) {
  const { item, index } = props
  return (
    <div className="swiper-inner">
      <div className="bookmark">
        <div className="dropleft width-limit favourite" data-id="63">
          <button
            className="btn"
            data-toggle="dropdown"
            data-placeholder="false"
          >
            <i className="fa-solid fa-circle-bookmark"></i>
          </button>
          <div className="dropdown-menu dropdown-menu-right folders"></div>
        </div>
      </div>
      <div className="info">
        <div className="above">
          <span>{item.releasing}</span>
          <Link className="unit" href={`/manga/${item.id}`}>
            {item.title}
          </Link>
        </div>
        <div className="below">
          <span>{item.desc}</span>
          <p>{item.chapterAndVolume}</p>
          <div>
            {item.genres.map((genre) => {
              const slug = genre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
              return (
                <Link key={genre} href={`/genre/${slug}`}>
                  {genre}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <Link href={`/manga/${item.id}`} className="poster">
        <div>
          <img src={item.image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = '/images/placeholder.png' }} />
        </div>
      </Link>
    </div>
  )
}

export default TrendingCard
