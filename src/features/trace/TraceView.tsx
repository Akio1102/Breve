import type { AccionTraza, PasoTraza } from '@engine/types'
import { clsx } from 'clsx'
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/i18n/useT'
import {
  activeTrace,
  isRunning,
  pasoOculto,
  TRACE_DETAILS,
  TRACE_KINDS,
  useAppStore,
} from '@/store/appStore'
import { EmptyState } from '@/ui/Badge'
import { IconButton } from '@/ui/Button'
import { Segmented } from '@/ui/Segmented'
import { useVirtualRows } from '@/ui/useVirtualRows'
import { SpacerItem } from '@/ui/VirtualSpacer'
import {
  ACTION_CLASS,
  ACTION_ICON,
  agruparTraza,
  type GrupoTraza,
} from './acciones'

function TraceKindSelect({ className }: { className?: string }) {
  const kind = useAppStore((s) => s.traceKind)
  const setKind = useAppStore((s) => s.setTraceKind)
  const t = useT()
  return (
    <Segmented
      legend={t.debug.traceKind}
      value={kind}
      onChange={setKind}
      className={className}
      items={TRACE_KINDS.map((k) => ({
        id: k,
        label: t.debug.traceKinds[k],
        title: t.debug.traceKindHint[k],
      }))}
    />
  )
}

function TraceDetailSelect() {
  const detail = useAppStore((s) => s.traceDetail)
  const setDetail = useAppStore((s) => s.setTraceDetail)
  const t = useT()
  return (
    <Segmented
      legend={t.trace.detail}
      value={detail}
      onChange={setDetail}
      className="mr-1"
      items={TRACE_DETAILS.map((d) => ({
        id: d,
        label: d === 'full' ? t.trace.detailFull : t.trace.detailSummary,
        title: t.trace.detailHint[d],
      }))}
    />
  )
}

type Fila =
  | { tipo: 'grupo'; grupo: GrupoTraza; pasos: number }
  | {
      tipo: 'vuelta'
      clave: string
      vuelta: number
      vueltas: number | undefined
      pasos: number
      abierta: boolean
    }
  | { tipo: 'paso'; i: number; enVuelta: boolean }

const StepRow = memo(function StepRow({
  i,
  paso,
  current,
  onGo,
  title,
  enVuelta,
}: {
  i: number
  paso: PasoTraza
  current: boolean
  onGo(i: number): void
  title: string
  enVuelta: boolean
}) {
  const Icon = ACTION_ICON[paso.accion]
  return (
    <button
      type="button"
      onClick={() => onGo(i)}
      aria-current={current ? 'step' : undefined}
      title={title}
      className={clsx(
        'flex w-full items-start gap-2 rounded py-0.5 pr-1.5 text-left hover:bg-surface-2',
        enVuelta ? 'pl-10' : 'pl-6',
        current && 'bg-surface-2 ring-1 ring-inset ring-accent/50',
      )}
    >
      <span className="w-8 shrink-0 text-right text-muted tabular-nums">
        {i + 1}
      </span>
      <Icon
        size={13}
        aria-hidden
        className={clsx(
          'mt-px shrink-0',
          ACTION_CLASS[paso.accion] ?? 'text-muted',
        )}
      />
      <span className={clsx('break-all', ACTION_CLASS[paso.accion])}>
        {paso.detalle}
        {paso.resultado && (
          <>
            <span className="text-muted"> → </span>
            <span className="text-text">{paso.resultado}</span>
          </>
        )}
      </span>
    </button>
  )
})

export function TraceView({ className }: { className?: string }) {
  const trace = useAppStore(activeTrace)
  const kind = useAppStore((s) => s.traceKind)
  const compiledSource = useAppStore((s) => s.compiledSource)
  const step = useAppStore((s) => (isRunning(s) ? s.step : -1))
  const goTo = useAppStore((s) => s.goTo)
  const t = useT()
  const scroll = useRef<HTMLOListElement>(null)
  const [filtro, setFiltro] = useState<AccionTraza | null>(null)
  const [plegados, setPlegados] = useState<ReadonlySet<number>>(new Set())
  const [vueltasAbiertas, setVueltasAbiertas] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const oculto = useAppStore(pasoOculto)

  const grupos = useMemo(() => agruparTraza(trace), [trace])
  const lineas = useMemo(
    () => (compiledSource ?? '').split(/\r\n|\r|\n/),
    [compiledSource],
  )
  const conteo = useMemo(() => {
    const n = new Map<AccionTraza, number>()
    for (const p of trace)
      if (!oculto(p)) n.set(p.accion, (n.get(p.accion) ?? 0) + 1)
    return n
  }, [trace, oculto])
  const visibles = useMemo(
    () => trace.reduce((n, p) => n + (oculto(p) ? 0 : 1), 0),
    [trace, oculto],
  )
  const grupoDelPaso =
    step >= 0
      ? grupos.find((g) => step >= g.desde && step <= g.hasta)
      : undefined
  const vueltaDelPaso = step >= 0 ? trace[step]?.vuelta : undefined
  const vueltaActual =
    grupoDelPaso && vueltaDelPaso !== undefined
      ? `${grupoDelPaso.id}:${vueltaDelPaso}`
      : null

  const tramosPorGrupo = useMemo(
    () =>
      grupos.flatMap((g) => {
        const pasos: number[] = []
        for (let i = g.desde; i <= g.hasta; i++)
          if (!oculto(trace[i]) && (!filtro || trace[i].accion === filtro))
            pasos.push(i)
        if (pasos.length === 0) return []
        const tramos: { vuelta?: number; vueltas?: number; pasos: number[] }[] =
          []
        for (const i of pasos) {
          const v = trace[i].vuelta
          const u = tramos.at(-1)
          if (u && v !== undefined && u.vuelta === v) u.pasos.push(i)
          else tramos.push({ vuelta: v, vueltas: trace[i].vueltas, pasos: [i] })
        }
        return [{ grupo: g, total: pasos.length, tramos }]
      }),
    [grupos, trace, filtro, oculto],
  )

  const filas = useMemo(() => {
    const out: Fila[] = []
    for (const { grupo: g, total, tramos } of tramosPorGrupo) {
      out.push({ tipo: 'grupo', grupo: g, pasos: total })
      if (plegados.has(g.id)) continue
      for (const r of tramos) {
        if (r.vuelta === undefined) {
          for (const i of r.pasos)
            out.push({ tipo: 'paso', i, enVuelta: false })
          continue
        }
        const clave = `${g.id}:${r.vuelta}`
        const abierta =
          filtro !== null ||
          vueltasAbiertas.has(clave) ||
          clave === vueltaActual
        out.push({
          tipo: 'vuelta',
          clave,
          vuelta: r.vuelta,
          vueltas: r.vueltas,
          pasos: r.pasos.length,
          abierta,
        })
        if (abierta)
          for (const i of r.pasos) out.push({ tipo: 'paso', i, enVuelta: true })
      }
    }
    return out
  }, [tramosPorGrupo, plegados, filtro, vueltasAbiertas, vueltaActual])

  const virtual = useVirtualRows({
    count: filas.length,
    scrollRef: scroll,
    estimate: 22,
  })

  const grupoActual = grupoDelPaso
  useEffect(() => {
    if (grupoActual && plegados.has(grupoActual.id))
      setPlegados((p) => {
        const next = new Set(p)
        next.delete(grupoActual.id)
        return next
      })
  }, [grupoActual, plegados])
  const filaActual = filas.findIndex((f) => f.tipo === 'paso' && f.i === step)
  const { mostrar } = virtual
  useEffect(() => {
    if (filaActual >= 0) mostrar(filaActual)
  }, [filaActual, mostrar])

  const label = kind === 'execution' ? t.trace.labelExecution : t.trace.label
  if (trace.length === 0)
    return (
      <div className={clsx('flex min-h-0 flex-col', className)}>
        <div className="flex shrink-0 border-b border-border px-2 py-1.5">
          <TraceKindSelect />
        </div>
        <EmptyState>
          {kind === 'execution' ? t.trace.emptyExecution : t.trace.empty}
        </EmptyState>
      </div>
    )

  const alternarVuelta = (clave: string) =>
    setVueltasAbiertas((p) => {
      const next = new Set(p)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })
  const alternar = (id: number) =>
    setPlegados((p) => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const acciones = [...conteo.keys()]

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-2 py-1.5 text-[11px]">
        <TraceKindSelect className="mr-1" />
        {kind === 'semantic' && <TraceDetailSelect />}
        <fieldset className="flex flex-wrap items-center gap-1">
          <legend className="sr-only">{t.trace.filterLabel}</legend>
          <button
            type="button"
            aria-pressed={filtro === null}
            onClick={() => setFiltro(null)}
            className={clsx(
              'rounded border px-1.5 py-0.5 max-md:min-h-9',
              filtro === null
                ? 'border-text/40 bg-surface-2 text-text'
                : 'border-border text-muted hover:text-text',
            )}
          >
            {t.trace.all} <span className="tabular-nums">{visibles}</span>
          </button>
          {acciones.map((a) => {
            const Icon = ACTION_ICON[a]
            return (
              <button
                key={a}
                type="button"
                aria-pressed={filtro === a}
                onClick={() => setFiltro(filtro === a ? null : a)}
                aria-label={`${t.stepCard.actions[a]} ${conteo.get(a)}`}
                title={t.trace.only(t.stepCard.actions[a])}
                className={clsx(
                  'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 max-md:min-h-9',
                  filtro === a
                    ? 'border-text/40 bg-surface-2 text-text'
                    : 'border-border text-muted hover:text-text',
                )}
              >
                <Icon
                  size={12}
                  aria-hidden
                  className={ACTION_CLASS[a] ?? 'text-muted'}
                />
                <span className="max-md:sr-only">{t.stepCard.actions[a]}</span>
                <span className="tabular-nums">{conteo.get(a)}</span>
              </button>
            )
          })}
        </fieldset>
        <span className="ml-auto flex gap-0.5">
          <IconButton
            size="sm"
            label={t.ast.expandAll}
            tooltipAlign="end"
            onClick={() => setPlegados(new Set())}
          >
            <ChevronsUpDown size={14} aria-hidden />
          </IconButton>
          <IconButton
            size="sm"
            label={t.ast.collapseAll}
            tooltipAlign="end"
            onClick={() => setPlegados(new Set(grupos.map((g) => g.id)))}
          >
            <ChevronsDownUp size={14} aria-hidden />
          </IconButton>
        </span>
      </div>
      <ol
        ref={scroll}
        aria-label={label}
        className="min-h-0 flex-1 overflow-auto p-2 font-mono text-xs"
      >
        <SpacerItem height={virtual.antes} />
        {virtual.indices.map((k) => {
          const f = filas[k]
          if (f.tipo === 'paso')
            return (
              <li key={`p${f.i}`} ref={virtual.medir} data-index={k}>
                <StepRow
                  i={f.i}
                  paso={trace[f.i]}
                  current={f.i === step}
                  onGo={goTo}
                  title={t.stepCard.actions[trace[f.i].accion]}
                  enVuelta={f.enVuelta}
                />
              </li>
            )
          if (f.tipo === 'vuelta')
            return (
              <li key={`v${f.clave}`} ref={virtual.medir} data-index={k}>
                <button
                  type="button"
                  aria-expanded={f.abierta}
                  onClick={() => alternarVuelta(f.clave)}
                  className="flex w-full items-center gap-1.5 rounded py-0.5 pr-1 pl-6 text-left font-sans text-[11px] hover:bg-surface-2"
                >
                  {f.abierta ? (
                    <ChevronDown
                      size={12}
                      aria-hidden
                      className="shrink-0 text-muted"
                    />
                  ) : (
                    <ChevronRight
                      size={12}
                      aria-hidden
                      className="shrink-0 text-muted"
                    />
                  )}
                  <span
                    className={clsx(
                      'font-medium',
                      f.vuelta === 0 ||
                        (f.vueltas !== undefined && f.vuelta > f.vueltas)
                        ? 'text-muted'
                        : 'text-accent',
                    )}
                  >
                    {t.stepCard.vuelta(f.vuelta, f.vueltas)}
                  </span>
                  <span className="ml-auto shrink-0 pl-2 text-muted">
                    {t.trace.steps(f.pasos)}
                  </span>
                </button>
              </li>
            )
          const g = f.grupo
          const abierto = !plegados.has(g.id)
          const codigo = g.especial
            ? t.stepCard.actions[g.especial]
            : (lineas[g.linea - 1] ?? '').trim()
          return (
            <li
              key={`g${g.id}`}
              ref={virtual.medir}
              data-index={k}
              className="pt-1 first:pt-0"
            >
              <button
                type="button"
                aria-expanded={abierto}
                onClick={() => alternar(g.id)}
                className={clsx(
                  'flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-surface-2',
                  grupoActual?.id === g.id && !abierto && 'bg-surface-2',
                )}
              >
                {abierto ? (
                  <ChevronDown
                    size={13}
                    aria-hidden
                    className="shrink-0 text-muted"
                  />
                ) : (
                  <ChevronRight
                    size={13}
                    aria-hidden
                    className="shrink-0 text-muted"
                  />
                )}
                {!g.especial && (
                  <span className="w-8 shrink-0 text-muted">L{g.linea}</span>
                )}
                <span
                  className={clsx(
                    'truncate',
                    g.especial
                      ? 'text-muted italic'
                      : 'font-semibold text-text',
                  )}
                >
                  {codigo}
                </span>
                <span className="ml-auto shrink-0 pl-2 text-[11px] text-muted">
                  {t.trace.steps(f.pasos)}
                </span>
              </button>
            </li>
          )
        })}
        <SpacerItem height={virtual.despues} />
      </ol>
    </div>
  )
}
