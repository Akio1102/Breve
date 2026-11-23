import { formatSimbolo, formatValor } from '@engine/formato'
import type { Simbolo } from '@engine/types'
import { clsx } from 'clsx'
import { useRef } from 'react'
import { useT } from '@/i18n/useT'
import { currentExecution, isStale, useAppStore } from '@/store/appStore'
import { EMPTY } from '@/store/selectors'
import { EmptyState } from '@/ui/Badge'
import { useVirtualRows } from '@/ui/useVirtualRows'
import { SpacerRow } from '@/ui/VirtualSpacer'

export function SymbolsView({ className }: { className?: string }) {
  const all: readonly Simbolo[] = useAppStore(
    (s) => s.result?.tablaSimbolos ?? EMPTY,
  )
  const hasAst = useAppStore(
    (s) =>
      !!s.result?.ast &&
      s.result.faseFallida !== 'lexico' &&
      s.result.faseFallida !== 'sintactico',
  )
  const focusLine = useAppStore((s) => s.focusLine)
  const showTemps = useAppStore((s) => s.showTemps)
  const setShowTemps = useAppStore((s) => s.setShowTemps)
  const execution = useAppStore((s) =>
    isStale(s) ? null : currentExecution(s),
  )
  const t = useT()
  const scroll = useRef<HTMLDivElement>(null)
  const symbols = showTemps
    ? all
    : all.filter((s) => s.categoria !== 'temporal')
  const rows = useVirtualRows({
    count: symbols.length,
    scrollRef: scroll,
    estimate: 25,
  })

  if (!hasAst) return <EmptyState>{t.symbols.empty}</EmptyState>

  const temps = all.filter((s) => s.categoria === 'temporal').length
  const memoria = execution?.memoria
  const valor = (s: Simbolo) => {
    if (!memoria) return formatSimbolo(s)
    const v = memoria[s.nombre]
    return v === undefined ? '—' : formatValor(v, s.tipo)
  }

  const c = t.symbols.columns
  const th = 'px-2 py-1.5 font-normal whitespace-nowrap'
  return (
    <div ref={scroll} className={clsx('overflow-auto', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-3 py-1.5 text-[11px] text-muted">
        <span>{memoria ? t.symbols.finalValues : t.symbols.initialValues}</span>
        {temps > 0 && (
          <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 max-md:min-h-11">
            <input
              type="checkbox"
              checked={showTemps}
              onChange={(e) => setShowTemps(e.target.checked)}
              className="accent-current"
            />
            {t.symbols.showTemps(temps)}
          </label>
        )}
      </div>
      <table
        aria-label={t.symbols.label}
        aria-rowcount={symbols.length + 1}
        className="w-full border-collapse font-mono text-xs"
      >
        <thead className="sticky top-0 bg-surface text-left text-[11px] text-muted">
          <tr className="border-b border-border" aria-rowindex={1}>
            <th className={clsx(th, 'text-right')}>{c.numero}</th>
            <th className={th}>{c.nombre}</th>
            <th className={th}>{c.categoria}</th>
            <th className={th}>{c.tipo}</th>
            <th className={clsx(th, 'text-right')}>{c.tamano}</th>
            <th className={clsx(th, 'text-right')}>{c.direccion}</th>
            <th className={th}>{c.valor}</th>
            <th className={clsx(th, 'text-right')}>{c.lineaDecl}</th>
            <th className={th}>{c.lineasRef}</th>
          </tr>
        </thead>
        <tbody>
          <SpacerRow height={rows.antes} cols={9} />
          {rows.indices
            .map((i) => symbols[i])
            .map((s, k) => (
              <tr
                key={s.nombre}
                ref={rows.medir}
                data-index={rows.indices[k]}
                aria-rowindex={rows.indices[k] + 2}
                className="border-b border-border/60"
              >
                <td className="px-2 py-1 text-right text-muted">{s.numero}</td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    onClick={() => focusLine(s.lineaDeclaracion)}
                    className="rounded hover:underline"
                  >
                    {s.nombre}
                  </button>
                </td>
                <td
                  className={clsx(
                    'px-2 py-1',
                    s.categoria === 'constante' && 'text-kw',
                    s.categoria === 'temporal' && 'text-fn',
                  )}
                >
                  {t.symbols.categories[s.categoria]}
                </td>
                <td className="px-2 py-1 text-fn">{s.tipo}</td>
                <td className="px-2 py-1 text-right">{s.tamano}</td>
                <td className="px-2 py-1 text-right">{s.direccion}</td>
                <td className="px-2 py-1 text-val">{valor(s)}</td>
                <td className="px-2 py-1 text-right">{s.lineaDeclaracion}</td>
                <td className="px-2 py-1">
                  {s.lineasReferencia.length
                    ? s.lineasReferencia.join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          <SpacerRow height={rows.despues} cols={9} />
        </tbody>
      </table>
    </div>
  )
}
