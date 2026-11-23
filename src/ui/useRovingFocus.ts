import { type KeyboardEvent, useCallback, useRef, useState } from 'react'

const NEXT: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => Math.min(i + 1, n - 1),
  ArrowRight: (i, n) => Math.min(i + 1, n - 1),
  ArrowUp: (i) => Math.max(i - 1, 0),
  ArrowLeft: (i) => Math.max(i - 1, 0),
  Home: () => 0,
  End: (_, n) => n - 1,
}

export interface RovingItemProps {
  'data-roving': number
  tabIndex: number
  onFocus(e: React.FocusEvent<HTMLElement>): void
  onKeyDown(e: KeyboardEvent<HTMLElement>): void
}

const indexOf = (el: HTMLElement) => Number(el.dataset.roving)

export function useRovingFocus<T extends HTMLElement>(count: number) {
  const group = useRef<T>(null)
  const [active, setActive] = useState(0)
  const current = Math.min(active, Math.max(count - 1, 0))
  const countRef = useRef(count)
  countRef.current = count

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    const move = NEXT[e.key]
    const n = countRef.current
    if (!move || n === 0) return
    e.preventDefault()
    const next = move(indexOf(e.currentTarget), n)
    setActive(next)
    group.current
      ?.querySelector<HTMLElement>(`[data-roving="${next}"]`)
      ?.focus()
  }, [])

  const onFocus = useCallback(
    (e: React.FocusEvent<HTMLElement>) => setActive(indexOf(e.currentTarget)),
    [],
  )

  const itemProps = (i: number): RovingItemProps => ({
    'data-roving': i,
    tabIndex: i === current ? 0 : -1,
    onFocus,
    onKeyDown,
  })

  return { group, itemProps }
}
