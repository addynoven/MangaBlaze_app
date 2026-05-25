import { useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Pagination } from 'swiper/modules'

import Head from './Head'
import { Loading, Poster } from '@/components/shared'
import { toPosterItem, PosterItem } from '@/components/shared/Poster'
import { getSelectedSource } from '@/lib/sourceStorage'
import { reportSourceHealth } from '@/utils/health'

const MostViewed = ({ sourceId }: { sourceId?: string }) => {
  const [data, setData] = useState<PosterItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const source = sourceId || getSelectedSource()
    const start = Date.now()
    fetch(`/api/manga/popular?limit=10&source=${source}`)
      .then((res) => res.json())
      .then((res) => {
        const latency = Date.now() - start
        const items = res.data?.map(toPosterItem) || []
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

  return (
    <section className="home-swiper" id="most-viewed">
      <Head />
      <Loading loading={loading} type="gif">
        <div className="container">
          <div className="swiper-container swiper-container-initialized swiper-container-horizontal">
            <Swiper
              modules={[EffectFade, Pagination]}
              pagination={{
                clickable: true,
                el: '.mostviewed-pagination',
              }}
              loop={true}
              slidesPerView={1}
            >
              {data.map((item, index) => (
                <SwiperSlide key={index} className="unit">
                  <Poster item={item} index={index + 1} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </Loading>
    </section>
  )
}

export default MostViewed
