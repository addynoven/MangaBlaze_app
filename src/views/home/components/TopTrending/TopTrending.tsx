import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'

import TrendingCard from './TrendingCard'
import { toTrendingItem, TrendingItem } from './TrendingCard'
import { getSelectedSource } from '@/lib/sourceStorage'
import { reportSourceHealth } from '@/utils/health'

const TopTrending = ({ sourceId }: { sourceId?: string }) => {
  const [data, setData] = useState<TrendingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const source = sourceId || getSelectedSource()
    const start = Date.now()
    fetch(`/api/manga/popular?limit=5&source=${source}`)
      .then((res) => res.json())
      .then((res) => {
        const latency = Date.now() - start
        const items = res.data?.map(toTrendingItem) || []
        reportSourceHealth(source, items.length > 0, latency)
        setData(items)
        setLoading(false)
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(source, false, latency, 'Network error')
        setLoading(false)
      })
  }, [sourceId])

  if (loading || data.length === 0) {
    return (
      <div className="top-carousel" id="top-trending" style={{ minHeight: 320 }}>
        <div className="swiper-container"></div>
      </div>
    )
  }

  return (
    <div className="top-carousel" id="top-trending">
      <div className="container">
        <div className="swiper-container swiper-container-initialized swiper-container-horizontal">
          <Swiper
            navigation={{
              nextEl: '.trending-button-next',
              prevEl: '.trending-button-prev',
            }}
            modules={[Autoplay, Navigation]}
            autoplay={{
              delay: 5000,
              disableOnInteraction: false,
            }}
            loop={true}
            slidesPerView={1}
          >
            {data.map((item, index) => (
              <SwiperSlide key={index}>
                <TrendingCard item={item} index={index + 1} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="trending-button-prev"></div>
        <div className="trending-button-next"></div>
      </div>
    </div>
  )
}

export default TopTrending
