import { clsx } from 'clsx'
import {
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useId,
  useRef,
} from 'react'

export interface TabItem<T extends string> {
  id: T
  label: ReactNode
  badge?: ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange(id: T): void
  label: string
  className?: string
  idPrefix?: string
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
  idPrefix,
}: TabsProps<T>) {
  const autoId = useId()
  const prefix = idPrefix ?? autoId
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.id === value)
    let next = -1
    if (e.key === 'ArrowRight') next = (i + 1) % items.length
    else if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(items[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={clsx('flex items-stretch gap-1', className)}
    >
      {items.map((t, i) => {
        const selected = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`${prefix}-panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={clsx(
              'relative inline-flex items-center gap-1.5 px-2.5 py-2 text-[13px] whitespace-nowrap transition-colors max-md:min-h-11',
              selected
                ? 'text-text after:absolute after:inset-x-2.5 after:bottom-0 after:h-px after:bg-text'
                : 'text-muted hover:text-text',
            )}
          >
            {t.label}
            {t.badge}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({
  id,
  tab,
  idPrefix,
  className,
  children,
  ref,
}: {
  id: string
  tab: string
  idPrefix: string
  className?: string
  children: ReactNode
  ref?: Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${tab}`}
      className={className}
    >
      {children}
    </div>
  )
}
