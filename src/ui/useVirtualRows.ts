import { useVirtualizer } from '@tanstack/react-virtual'
import { type RefObject, useCallback, useMemo } from 'react'

export const VIRTUALIZAR_DESDE = 300

export interface VirtualRows {
  virtual: boolean
  indices: number[]
  antes: number
  despues: number
  medir: (el: Element | null) => void
  mostrar(i: number): void
}

const nada = () => {}

export function useVirtualRows({
  count,
  scrollRef,
  estimate,
  overscan = 12,
  desde = VIRTUALIZAR_DESDE,
}: {
  count: number
  scrollRef: RefObject<HTMLElement | null>
  estimate: number
  overscan?: number
  desde?: number
}): VirtualRows {
  const virtual = count > desde
  const v = useVirtualizer({
    count: virtual ? count : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimate,
    overscan,
    initialRect: { width: 800, height: 600 },
  })

  const mostrar = useCallback(
    (i: number) => {
      if (virtual) v.scrollToIndex(i, { align: 'auto' })
      else
        scrollRef.current
          ?.querySelector<HTMLElement>(`[data-index="${i}"]`)
          ?.scrollIntoView?.({ block: 'nearest' })
    },
    [virtual, v, scrollRef],
  )

  const items = virtual ? v.getVirtualItems() : null
  const todas = useMemo(
    () => (virtual ? [] : Array.from({ length: count }, (_, i) => i)),
    [virtual, count],
  )
  if (!items)
    return {
      virtual,
      indices: todas,
      antes: 0,
      despues: 0,
      medir: nada,
      mostrar,
    }
  const antes = items[0]?.start ?? 0
  const despues = Math.max(0, v.getTotalSize() - (items.at(-1)?.end ?? 0))
  return {
    virtual,
    indices: items.map((i) => i.index),
    antes,
    despues,
    medir: v.measureElement,
    mostrar,
  }
}
