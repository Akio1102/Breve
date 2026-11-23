import { X } from 'lucide-react'
import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { Button, IconButton } from '@/ui/Button'
import { TOUR_TARGETS } from './steps'

const PAD = 6
const CARD_W = 340

function findTarget(id: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(
    `[data-tour="${id}"]`,
  )) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

export default function Tour() {
  const stepIndex = useAppStore((s) => s.tourStep)
  const setTour = useAppStore((s) => s.setTour)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  })
  const card = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const direction = useRef<1 | -1>(1)
  const t = useT()

  const open = stepIndex !== null
  const targetId = open ? TOUR_TARGETS[stepIndex] : null
  const step = open ? t.tour.steps[stepIndex] : null

  useEffect(() => {
    if (open) returnFocus.current = document.activeElement
    else if (returnFocus.current instanceof HTMLElement)
      returnFocus.current.focus()
  }, [open])

  useLayoutEffect(() => {
    if (!targetId) return
    const target = findTarget(targetId)
    if (!target) {
      const next = (stepIndex ?? 0) + direction.current
      setTour(next >= 0 && next < TOUR_TARGETS.length ? next : null)
      return
    }
    target.scrollIntoView?.({ block: 'nearest' })
    const measure = () => {
      setRect(target.getBoundingClientRect())
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    }
    measure()
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(target)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [targetId, stepIndex, setTour])

  useEffect(() => {
    if (targetId)
      card.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [targetId])

  if (!step || stepIndex === null) return null

  const last = stepIndex === TOUR_TARGETS.length - 1
  const close = () => setTour(null)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    if (e.key !== 'Tab' || !card.current) return
    const items = [
      ...card.current.querySelectorAll<HTMLElement>('button:not(:disabled)'),
    ]
    if (items.length === 0) return
    const first = items[0]
    const lastEl = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      lastEl.focus()
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault()
      first.focus()
    }
  }

  const mobile = viewport.w < 768
  let cardStyle: React.CSSProperties = { left: 16, right: 16, bottom: 16 }
  if (rect && !mobile) {
    const w = Math.min(CARD_W, viewport.w - 32)
    const left = Math.min(Math.max(16, rect.left), viewport.w - w - 16)
    const below = rect.bottom + PAD + 12
    const fitsBelow = below + 200 < viewport.h
    cardStyle = fitsBelow
      ? { left, top: below, width: w }
      : {
          left,
          bottom: Math.max(16, viewport.h - rect.top + PAD + 12),
          width: w,
        }
    if (rect.height > viewport.h * 0.6)
      cardStyle = {
        left: Math.min(rect.right + 16, viewport.w - w - 16),
        top: rect.top + 16,
        width: w,
      }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={close} aria-hidden />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-md transition-all duration-200"
          style={{
            left: rect.left - PAD,
            top: rect.top - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow:
              '0 0 0 2px var(--color-text), 0 0 0 9999px var(--color-scrim)',
          }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        onKeyDown={onKeyDown}
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="absolute flex flex-col gap-3 rounded-lg border border-muted/40 bg-raised p-4 text-text shadow-xl shadow-black/20"
        style={cardStyle}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-xs text-muted">
              {t.tour.progress(stepIndex + 1, TOUR_TARGETS.length)}
            </p>
            <h2 id="tour-title" className="text-sm font-medium">
              {step.title}
            </h2>
          </div>
          <IconButton label={t.tour.close} onClick={close}>
            <X size={16} aria-hidden />
          </IconButton>
        </div>
        <p id="tour-body" className="text-sm leading-relaxed">
          {step.body}
        </p>
        <div className="flex items-center justify-end gap-2">
          {stepIndex > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                direction.current = -1
                setTour(stepIndex - 1)
              }}
            >
              {t.tour.prev}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            data-autofocus
            onClick={() => {
              direction.current = 1
              setTour(last ? null : stepIndex + 1)
            }}
          >
            {last ? t.tour.finish : t.tour.next}
          </Button>
        </div>
      </div>
    </div>
  )
}
