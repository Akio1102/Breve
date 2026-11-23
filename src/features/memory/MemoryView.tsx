import { formatSimbolo } from '@engine/formato'
import { clsx } from 'clsx'
import { useT } from '@/i18n/useT'
import { useCurrentEvent } from '@/store/appStore'
import { EmptyState } from '@/ui/Badge'
import { heapBg, heapBorder } from '@/ui/heapColors'

export function MemoryView({ className }: { className?: string }) {
  const { event } = useCurrentEvent()
  const t = useT()
  if (!event) return <EmptyState>{t.memory.empty}</EmptyState>

  const symbols = [...event.simbolos].sort((a, b) => a.direccion - b.direccion)
  const total = symbols.reduce((n, s) => Math.max(n, s.direccion + s.tamano), 0)

  return (
    <div className={clsx('flex flex-col gap-3 overflow-auto p-3', className)}>
      <div>
        <h3 className="text-xs font-medium">{t.memory.title}</h3>
        <p className="text-[11px] text-muted">{t.memory.hint}</p>
      </div>
      {symbols.length === 0 ? (
        <p className="text-xs text-muted">{t.memory.noSymbols}</p>
      ) : (
        <>
          <div
            className="flex h-7 overflow-hidden rounded border border-border"
            aria-hidden
          >
            {symbols.map((s, i) => (
              <span
                key={s.nombre}
                title={`${s.nombre}: ${s.direccion}–${s.direccion + s.tamano - 1}`}
                className={clsx(
                  'flex items-center justify-center overflow-hidden border-r border-bg font-mono text-[10px] font-semibold text-bg last:border-r-0',
                  heapBg(i),
                )}
                style={{ flexGrow: s.tamano, flexBasis: 0 }}
              >
                {s.nombre}
              </span>
            ))}
          </div>
          <ol className="flex flex-col gap-1.5">
            {symbols.map((s, i) => (
              <li
                key={s.nombre}
                className={clsx(
                  'flex items-center gap-3 rounded border-l-4 bg-surface-2/40 px-2 py-1 font-mono text-xs',
                  heapBorder(i),
                )}
              >
                <span className="w-16 shrink-0 text-muted tabular-nums">
                  {s.direccion}–{s.direccion + s.tamano - 1}
                </span>
                <span className="w-16 shrink-0 truncate">{s.nombre}</span>
                <span className="w-9 shrink-0 text-fn">{s.tipo}</span>
                <span className="min-w-0 flex-1 truncate text-val">
                  {formatSimbolo(s)}
                </span>
                <span className="shrink-0 text-[11px] text-muted">
                  {t.memory.bytes(s.tamano)}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-muted">{t.memory.total(total)}</p>
        </>
      )}
    </div>
  )
}
