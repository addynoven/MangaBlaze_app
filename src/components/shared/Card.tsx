'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Genre } from '@/@types/common'

type CardProps = {
  item: Genre & { id?: string }
  index: number
}

const Card = (props: CardProps) => {
  const { item } = props
  const mangaId = item.id || 'unknown'
  const sourceParam = (item as any).source ? `?source=${(item as any).source}` : ''

  return (
    <div className="unit item-47969">
      <div className="inner">
        <Link
          href={`/manga/${mangaId}${sourceParam}`}
          className="poster tooltipstered"
        >
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
            {(item as any).isNew && (
              <span 
                className="position-absolute badge bg-danger" 
                style={{ top: 10, left: 10, zIndex: 10, fontSize: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                NEW
              </span>
            )}
          </div>
        </Link>
        <div className="info">
          <div>
            <span className="type">{item.type}</span>
          </div>
          <Link href={`/manga/${mangaId}${sourceParam}`}>{item.title}</Link>
          <ul className="content" data-name="chap">
            {item.chapters.map((chap, i) => (
              <li key={i}>
                <Link href={`/read/${mangaId}/en/${chap.chapterId || 'chapter-1'}${sourceParam}`}>
                  <span>
                    {chap.info} <b>{chap.lang || 'EN'}</b>
                  </span>
                  <span>{chap.date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Card
