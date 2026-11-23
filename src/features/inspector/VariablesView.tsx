import { formatSimbolo } from '@engine/formato'
import { clsx } from 'clsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { memo, useState } from 'react'
import { useT } from '@/i18n/useT'
import { useAppStore, useCurrentEvent } from '@/store/appStore'
import { type SimboloView, simbolosView } from '@/store/selectors'
import { Badge, EmptyState } from '@/ui/Badge'

const SymbolRow = memo(function SymbolRow({ v }: { v: SimboloView }) {
  const t = useT()
  const s = v.simbolo
  const addWatch = useAppStore((st) => st.addWatch)
  const watched = useAppStore((st) => st.watches.includes(s.nombre))
  return (
    <li
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5',
        v.change === 'new' && 'animate-enter',
        v.change &&
          'relative isolate bg-surface-2/60 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:animate-flash before:bg-val/25 before:opacity-0',
      )}
    >
      <button
        type="button"
        onClick={() => addWatch(s.nombre)}
        disabled={watched}
        title={t.vars.watch(s.nombre)}
        aria-label={t.vars.watch(s.nombre)}
        className="w-20 shrink-0 truncate rounded text-left font-mono text-xs enabled:hover:underline disabled:cursor-default"
      >
        {s.nombre}
      </button>
      <span className="w-9 shrink-0 font-mono text-[11px] text-fn">
        {s.tipo}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-val">
        {formatSimbolo(s)}
      </code>
      {s.categoria === 'constante' && (
        <span className="text-[11px] text-kw">{t.vars.constant}</span>
      )}
      <span className="shrink-0 font-mono text-[11px] text-muted">
        {t.vars.address(s.direccion)}
      </span>
      {v.change === 'new' && <Badge tone="ok">{t.vars.new}</Badge>}
      {v.change === 'changed' && <Badge tone="accent">{t.vars.changed}</Badge>}
    </li>
  )
})

export function VariablesView({ className }: { className?: string }) {
  const { event, prev } = useCurrentEvent()
  const step = useAppStore((s) => s.step)
  const [tempsAbiertos, setTempsAbiertos] = useState(false)
  const t = useT()
  if (!event) return <EmptyState>{t.vars.empty}</EmptyState>
  const todas = simbolosView(event, prev)
  const rows = todas.filter((v) => v.simbolo.categoria !== 'temporal')
  const temps = todas.filter((v) => v.simbolo.categoria === 'temporal')
  const tempsCambiados = temps
    .filter((v) => v.change)
    .map((v) => `${v.simbolo.nombre} = ${formatSimbolo(v.simbolo)}`)
    .join(', ')
  const fila = (v: SimboloView) => (
    <SymbolRow
      key={v.change ? `${v.simbolo.nombre}@${step}` : v.simbolo.nombre}
      v={v}
    />
  )
  return (
    <div className={clsx('p-3', className)}>
      <div className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border px-3 py-1.5 text-xs font-medium">
          {t.vars.title}
        </div>
        {todas.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted">{t.vars.none}</p>
        ) : (
          <>
            <ul
              aria-label={t.vars.variables}
              className="divide-y divide-border/60"
            >
              {rows.map(fila)}
            </ul>
            {temps.length > 0 && (
              <div className="border-t border-border">
                <button
                  type="button"
                  aria-expanded={tempsAbiertos}
                  onClick={() => setTempsAbiertos(!tempsAbiertos)}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-muted hover:bg-surface-2"
                >
                  {tempsAbiertos ? (
                    <ChevronDown size={13} aria-hidden className="shrink-0" />
                  ) : (
                    <ChevronRight size={13} aria-hidden className="shrink-0" />
                  )}
                  <span className="shrink-0">{t.vars.temps(temps.length)}</span>
                  {!tempsAbiertos && tempsCambiados && (
                    <span className="ml-auto truncate font-mono text-[11px] text-val">
                      {t.vars.tempChanged(tempsCambiados)}
                    </span>
                  )}
                </button>
                {tempsAbiertos && (
                  <ul
                    aria-label={t.vars.temps(temps.length)}
                    className="divide-y divide-border/60 border-t border-border/60"
                  >
                    {temps.map(fila)}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
