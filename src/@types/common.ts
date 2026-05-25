import { ReactNode, CSSProperties } from 'react'

export interface CommonProps {
  className?: string
  children?: ReactNode
  style?: CSSProperties
}

export type TableQueries = {
  total?: number
  pageIndex?: number
  pageSize?: number
  query?: string
  sort?: {
    order: 'asc' | 'desc' | ''
    key: string | number
  }
}

export type Genre = {
  id?: string
  image: string
  type: string
  title: string
  chapters: {
    info: string
    date: string
    lang: null
    chapterId?: string
  }[]
}

export type GenreTrending = {
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

export type Poster = {
  id?: string
  image: string
  title: string
  link?: string
}

export enum EnumFilter {
  'type' = 'type',
  'genre' = 'genre',
  'status' = 'status',
  'language' = 'language',
  'year' = 'year',
  'length' = 'length',
  'sort' = 'sort',
}

export type FilterDropdown = {
  id: string | undefined
  value: string
  label: string
  checked?: boolean
}

export type CommonFilterProps = {
  data: FilterDropdown[]
  value: EnumFilter
  onToggle: () => void
  open: boolean
  dropdownClassName?: string
  type?: 'checkbox' | 'radio'
}

export enum ENUM_READ_BY {
  CHAPTER = 'chapter',
  VOLUME = 'volume',
}
