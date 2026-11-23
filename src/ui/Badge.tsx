import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type Tone = 'neutral' | 'accent' | 'danger' | 'ok' | 'warn' | 'val'

const TONES: Record<Tone, string> = {
  neutral: 'text-muted',
  accent: 'text-text',
  danger: 'text-danger',
  ok: 'text-ok',
  warn: 'text-warn',
  val: 'text-val',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center text-[11px] leading-4',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-muted">{children}</p>
}
