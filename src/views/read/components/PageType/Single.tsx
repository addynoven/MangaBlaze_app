import React, { useEffect } from 'react'
import classNames from 'classnames'
import { EffectFade } from 'swiper/modules'
import { Swiper, SwiperSlide, SwiperRef } from 'swiper/react'
import Image from '../Image'
import { fitClassName } from '../../Read'
import { PAGE_ENUM } from '@/constants/page.constant'
import {
  setActiveSwiper,
  setPageIndex,
  useAppDispatch,
  useAppSelector,
} from '@/store'

type SingleProps = {
  swiperRef?: React.RefObject<SwiperRef | null>
  pages: string[]
}

const Single = (props: SingleProps) => {
  const { swiperRef, pages } = props
  const dispatch = useAppDispatch()
  const { pageType, fitType, activeSwiper, pageIndex, isSwiping } =
    useAppSelector((state) => state.theme)

  useEffect(() => {
    if (!swiperRef) return
    if (swiperRef.current && swiperRef.current.swiper) {
      swiperRef.current?.swiper.slideTo(activeSwiper - 1)
    }
  }, [swiperRef, activeSwiper])

  if (pageType !== PAGE_ENUM.SINGLE) return <></>

  if (isSwiping) {
    return (
      <Swiper
        ref={swiperRef}
        modules={[EffectFade]}
        speed={500}
        grabCursor={true}
        slidesPerView="auto"
        className="pages singlepage"
        wrapperClass="page fit-w"
        onSlideChange={(swiper) => {
          dispatch(setPageIndex(swiper.activeIndex + 1))
          dispatch(setActiveSwiper(swiper.activeIndex + 1))
        }}
      >
        {pages.map((src, index) => (
          <SwiperSlide key={index} className="img loaded">
            <img
              src={src}
              className={fitClassName[fitType]}
              referrerPolicy="no-referrer"
              alt={`Page ${index + 1}`}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    )
  }

  if (!isSwiping) {
    return (
      <div className={classNames('page', fitClassName[fitType])}>
        {pages.map((src, index) => (
          <Image
            key={index}
            src={src}
            number={index + 1}
            wrapperClassName={classNames(
              'loaded',
              pageIndex === index + 1 ? 'd-block' : 'd-none'
            )}
            imageClassName={fitClassName[fitType]}
          />
        ))}
      </div>
    )
  }
}

export default Single
