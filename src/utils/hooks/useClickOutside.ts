import { useEffect, useRef } from 'react'

const useClickOutside = (callback: () => void) => {
  const domNode = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const eventHandler = (event: MouseEvent) => {
      if (
        domNode.current &&
        !domNode.current.contains(event.target as Node)
      ) {
        callback()
      }
    }
    document.addEventListener('mousedown', eventHandler)

    return () => {
      document.removeEventListener('mousedown', eventHandler)
    }
  })
  return domNode as React.RefObject<HTMLDivElement | null>
}

export default useClickOutside
