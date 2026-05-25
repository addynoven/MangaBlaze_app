import classNames from 'classnames'
import { useMemo } from 'react'
import { proxiedImageUrl } from '@/utils/manga'

type ImageProps = {
  wrapperClassName: string
  imageClassName: string
  number: number
  src?: string
}

const Image = (props: ImageProps) => {
  const { wrapperClassName, imageClassName, number, src } = props
  
  const proxiedSrc = useMemo(() => proxiedImageUrl(src), [src])

  return (
    <div data-number={number} className={classNames('img', wrapperClassName)}>
      <img
        data-number={number}
        className={imageClassName}
        src={proxiedSrc}
        alt={`Page ${number}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/images/placeholder.png'
        }}
      />
    </div>
  )
}

export default Image
