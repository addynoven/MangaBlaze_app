import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Pagination, Navigation } from 'swiper/modules'

import Head from './Head'
import { Poster } from '@/components/shared'
import { toPosterItem, PosterItem } from '@/utils/manga'
import { getSelectedSource } from '@/lib/sourceStorage'
import { reportSourceHealth } from '@/utils/health'

const NewRelease = ({ sourceId }: { sourceId?: string }) => {
  const [data, setData] = useState<PosterItem[]>([])

  useEffect(() => {
    const source = sourceId || getSelectedSource()
    const start = Date.now()
    fetch(`/api/manga/latest?limit=20&source=${source}`)
      .then((res) => res.json())
      .then((res) => {
        const latency = Date.now() - start
        const items = res.data?.map((m: any) => toPosterItem(m, source)) || []
        reportSourceHealth(source, items.length > 0, latency)
        setData(items)
      })
      .catch(() => {
        const latency = Date.now() - start
        reportSourceHealth(source, false, latency, 'Network error')
      })
  }, [sourceId])

  if (data.length === 0) return null

  return (
    <section className="home-swiper">
      <Head />
      <div className="container">
        <Swiper
          modules={[EffectFade, Pagination, Navigation]}
          pagination={{
            clickable: true,
            el: '.completed-pagination',
          }}
          navigation={{
            nextEl: '.completed-button-next',
            prevEl: '.completed-button-prev',
          }}
          loop={true}
          slidesPerView={1}
        >
          {data.map((item, index) => (
            <SwiperSlide key={index} className="unit">
              <Poster item={item} index={index + 1} />
            </SwiperSlide>
          ))}
          <div className="completed-pagination"></div>
        </Swiper>
      </div>
    </section>
  )
}

export default NewRelease
