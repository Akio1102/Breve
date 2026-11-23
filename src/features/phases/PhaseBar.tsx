import { FASES, type Fase } from '@engine/types'
import { clsx } from 'clsx'
import { Check, X } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { currentExecution, useAppStore } from '@/store/appStore'
import { type PhaseStatus, phaseStatuses } from './phaseStatus'

const ICONS: Record<PhaseStatus, typeof Check | null> = {
  ok: Check,
  error: X,
  pending: null,
}

export function PhaseBar({
  className,
  onSelect,
}: {
  className?: string
  onSelect(phase: Fase): void
}) {
  const result = useAppStore((s) => s.result)
  const stale = useAppStore((s) => s.compiledSource !== s.source)
  const execution = useAppStore(currentExecution)
  const statuses = phaseStatuses({ result, stale, execution })
  const t = useT()

  return (
    <nav
      aria-label={t.phases.label}
      data-tour="fases"
      className={clsx('flex items-center gap-1 overflow-x-auto', className)}
    >
      <ol className="flex items-center gap-1 max-sm:gap-0.5">
        {FASES.map((p, i) => {
          const st = statuses[p]
          const Icon = ICONS[st]
          return (
            <li key={p} className="flex items-center gap-1">
              {i > 0 && (
                <span className="px-0.5 text-border max-md:hidden" aria-hidden>
                  /
                </span>
              )}
              <button
                type="button"
                data-status={st}
                title={t.phases.hint[p]}
                onClick={() => onSelect(p)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs whitespace-nowrap transition-colors hover:bg-surface-2 max-md:min-h-11 max-sm:px-1',
                  st === 'ok' && 'text-text',
                  st === 'error' && 'text-danger',
                  st === 'pending' && 'text-muted',
                )}
              >
                {Icon && (
                  <Icon
                    size={12}
                    aria-hidden
                    className={clsx(st === 'ok' && 'text-ok')}
                  />
                )}
                {t.phases.names[p]}
                <span className="sr-only">: {t.phases.status[st]}</span>
              </button>
            </li>
          )
        })}
      </ol>
      {stale && (
        <span className="ml-2 text-xs text-muted" aria-live="polite">
          {t.phases.stale}
        </span>
      )}
    </nav>
  )
}
