import { clsx } from 'clsx'
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

interface SplitPaneProps {
  first: ReactNode
  second: ReactNode
  orientation?: 'vertical' | 'horizontal'
  initial?: number
  min?: number
  max?: number
  label: string
  storageKey?: string
  className?: string
}

const STEP = 5

function readPct(key: string | undefined): number | null {
  if (!key) return null
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

export function SplitPane({
  first,
  second,
  orientation = 'vertical',
  initial = 64,
  min = 20,
  max = 88,
  label,
  storageKey,
  className,
}: SplitPaneProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const [pct, setPct] = useState(() => clamp(readPct(storageKey) ?? initial))
  const box = useRef<HTMLDivElement>(null)
  const row = orientation === 'horizontal'

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, String(Math.round(pct)))
    } catch {}
  }, [pct, storageKey])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !box.current) return
    const r = box.current.getBoundingClientRect()
    const size = row ? r.width : r.height
    const offset = row ? e.clientX - r.left : e.clientY - r.top
    if (size > 0) setPct(clamp((offset / size) * 100))
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, number> = row
      ? { ArrowLeft: pct - STEP, ArrowRight: pct + STEP, Home: min, End: max }
      : { ArrowUp: pct - STEP, ArrowDown: pct + STEP, Home: min, End: max }
    if (!(e.key in next)) return
    e.preventDefault()
    setPct(clamp(next[e.key]))
  }

  return (
    <div
      ref={box}
      className={clsx('flex min-h-0', row ? 'flex-row' : 'flex-col', className)}
    >
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={{ flex: `${pct} 1 0` }}
      >
        {first}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: un separador movible no tiene elemento nativo */}
      <div
        role="separator"
        aria-label={label}
        aria-orientation={row ? 'vertical' : 'horizontal'}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
        className={clsx(
          "relative z-10 shrink-0 touch-none bg-border transition-colors before:absolute before:content-[''] hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
          row
            ? 'w-px cursor-col-resize before:inset-y-0 before:-inset-x-1'
            : 'h-px cursor-row-resize before:inset-x-0 before:-inset-y-1',
        )}
      />
      <div
        className="min-h-0 min-w-0 overflow-hidden"
        style={{ flex: `${100 - pct} 1 0` }}
      >
        {second}
      </div>
    </div>
  )
}
