import { type Diagnostico, FASES } from '@engine/types'
import { clsx } from 'clsx'
import { AlertTriangle, CircleX, Undo2 } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { currentExecution, useAppStore } from '@/store/appStore'
import { EMPTY } from '@/store/selectors'
import { EmptyState } from '@/ui/Badge'
import { Button } from '@/ui/Button'

function ProblemItem({
  d,
  severity,
}: {
  d: Diagnostico
  severity: 'error' | 'warning'
}) {
  const focusLine = useAppStore((s) => s.focusLine)
  const t = useT()
  const Icon = severity === 'error' ? CircleX : AlertTriangle
  return (
    <li>
      <button
        type="button"
        onClick={() => focusLine(d.linea, d.columna)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-2"
      >
        <Icon
          size={15}
          className={clsx(
            'mt-0.5 shrink-0',
            severity === 'error' ? 'text-danger' : 'text-warn',
          )}
          aria-label={
            severity === 'error' ? t.problems.error : t.problems.warning
          }
        />
        <span className="flex-1">{d.mensaje}</span>
        <span className="shrink-0 font-mono text-xs text-muted">
          {t.problems.phaseShort[d.fase]} · {d.linea}:{d.columna}
        </span>
      </button>
    </li>
  )
}

export function ProblemsView({ className }: { className?: string }) {
  const compileErrors = useAppStore((s) => s.result?.errores ?? EMPTY)
  const runError = useAppStore((s) => currentExecution(s)?.error ?? null)
  const errors = runError ? [...compileErrors, runError] : compileErrors
  const canRestore = useAppStore(
    (s) => s.lastGoodSource !== s.source && !!s.result?.faseFallida,
  )
  const restore = useAppStore((s) => s.restoreLastGood)
  const t = useT()

  return (
    <div className={clsx('overflow-auto', className)}>
      {errors.length === 0 ? (
        <EmptyState>{t.problems.empty}</EmptyState>
      ) : (
        FASES.map((fase) => {
          const list = errors.filter((e) => e.fase === fase)
          if (list.length === 0) return null
          return (
            <section key={fase} aria-label={t.problems.phases[fase]}>
              <h3 className="border-b border-border bg-surface-2/50 px-3 py-1 text-xs text-muted">
                {t.problems.phases[fase]} ({list.length})
              </h3>
              <ul className="divide-y divide-border">
                {list.map((d) => (
                  <ProblemItem
                    key={`${d.linea}:${d.columna}:${d.mensaje}`}
                    d={d}
                    severity="error"
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}
      {canRestore && (
        <div className="border-t border-border p-3">
          <Button
            size="sm"
            icon={<Undo2 size={14} aria-hidden />}
            onClick={restore}
          >
            {t.problems.restore}
          </Button>
        </div>
      )}
    </div>
  )
}

export function WarningsView({ className }: { className?: string }) {
  const warnings = useAppStore((s) => s.result?.advertencias ?? EMPTY)
  const t = useT()
  if (warnings.length === 0)
    return <EmptyState>{t.problems.warningsEmpty}</EmptyState>
  return (
    <ul className={clsx('divide-y divide-border overflow-auto', className)}>
      {warnings.map((d) => (
        <ProblemItem
          key={`${d.linea}:${d.columna}:${d.mensaje}`}
          d={d}
          severity="warning"
        />
      ))}
    </ul>
  )
}
