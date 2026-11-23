import { formatValor } from '@engine/formato'
import type { PasoTraza } from '@engine/types'
import { evaluateWatch, type WatchResult } from '@engine/watch'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { useT } from '@/i18n/useT'
import { activeTrace, useAppStore, useCurrentEvent } from '@/store/appStore'
import { cambiosHasta, historia, puntos } from './historia'

const ULTIMOS = 8

function Historial({
  nombre,
  trace,
  step,
}: {
  nombre: string
  trace: readonly PasoTraza[]
  step: number
}) {
  const t = useT()
  const h = useMemo(() => historia(trace, nombre), [trace, nombre])
  const n = cambiosHasta(h, step)
  if (n < 2) return null
  const valores = h.valores.slice(0, n)
  const desde = Math.max(0, n - ULTIMOS)
  const numeros =
    h.tipo === 'ent' || h.tipo === 'dec' ? (valores as number[]) : null
  const linea = numeros ? puntos(numeros) : ''
  return (
    <div className="mt-1 flex flex-col gap-1">
      <ol
        aria-label={t.watches.history(nombre, n)}
        className="flex flex-wrap items-baseline gap-x-1 font-mono text-[11px] text-muted"
      >
        {desde > 0 && <li aria-hidden>…</li>}
        {valores.slice(desde).map((v, i) => {
          const k = desde + i
          const ultimo = k === n - 1
          return (
            <li
              key={h.pasos[k]}
              title={t.watches.atStep(h.pasos[k] + 1)}
              className={clsx(
                'flex items-baseline gap-x-1',
                ultimo && 'animate-enter text-val',
              )}
            >
              {k > desde && <span aria-hidden>→</span>}
              {formatValor(v, h.tipo ?? undefined)}
            </li>
          )
        })}
      </ol>
      {linea && (
        <svg
          aria-hidden
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="h-5 w-full"
        >
          <polyline
            points={linea}
            fill="none"
            className="stroke-val"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </div>
  )
}

import { Badge } from '@/ui/Badge'
import { Button, IconButton } from '@/ui/Button'

function same(a: WatchResult, b: WatchResult) {
  return (
    a.ok === b.ok &&
    (a.ok
      ? a.value === (b as typeof a).value
      : a.error === (b as typeof a).error)
  )
}

export function WatchesView({ className }: { className?: string }) {
  const watches = useAppStore((s) => s.watches)
  const addWatch = useAppStore((s) => s.addWatch)
  const removeWatch = useAppStore((s) => s.removeWatch)
  const { event, prev } = useCurrentEvent()
  const trace = useAppStore(activeTrace)
  const step = useAppStore((s) => s.step)
  const [draft, setDraft] = useState('')
  const t = useT()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    addWatch(draft)
    setDraft('')
  }

  return (
    <div
      className={clsx('flex flex-col gap-3 p-3', className)}
      data-tour="vigiladas"
    >
      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="watch-input" className="sr-only">
          {t.watches.inputLabel}
        </label>
        <input
          id="watch-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.watches.placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-9 min-w-0 flex-1 rounded border border-border bg-editor px-2.5 font-mono text-[13px] placeholder:text-muted max-md:h-11"
        />
        <Button type="submit" size="md" disabled={!draft.trim()}>
          {t.watches.add}
        </Button>
      </form>
      {watches.length === 0 ? (
        <p className="text-sm text-muted">{t.watches.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {watches.map((w, i) => {
            const now = evaluateWatch(w, event)
            const before = prev ? evaluateWatch(w, prev) : null
            const changed = !!event && !!before && !same(now, before)
            return (
              <li
                key={w}
                className={clsx(
                  'flex items-start gap-2 rounded-md border px-2.5 py-1.5',
                  changed ? 'border-muted/60 bg-surface-2/60' : 'border-border',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="truncate font-mono text-xs">{w}</code>
                    {changed && (
                      <Badge tone="accent">{t.watches.changed}</Badge>
                    )}
                  </div>
                  {!event ? (
                    <p className="text-xs text-muted">{t.watches.pending}</p>
                  ) : now.ok ? (
                    <p className="font-mono text-xs break-all text-val">
                      {now.value}{' '}
                      <span className="text-muted">({now.type})</span>
                    </p>
                  ) : (
                    <p className="text-xs text-danger">
                      {t.watches.errors[now.error]}
                    </p>
                  )}
                  {changed && before?.ok && (
                    <p className="font-mono text-[11px] text-muted">
                      {t.watches.before(before.value)}
                    </p>
                  )}
                  {event && now.ok && (
                    <Historial nombre={w.trim()} trace={trace} step={step} />
                  )}
                </div>
                <IconButton
                  label={t.watches.remove(w)}
                  onClick={() => removeWatch(i)}
                  size="sm"
                >
                  <X size={14} aria-hidden />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
