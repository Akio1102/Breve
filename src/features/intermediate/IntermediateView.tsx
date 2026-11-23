import { type BloqueBasico, bloquesBasicos } from '@engine/bloques'
import { campo, destinosDeSalto, esSalto, formatTAC } from '@engine/formato'
import { PASADAS } from '@engine/optimizador'
import { destinosDeTripletas } from '@engine/tripletas'
import type {
  CodigoOptimizado,
  Cuadrupla,
  InstruccionTAC,
  Tripleta,
} from '@engine/types'
import { clsx } from 'clsx'
import { type ReactNode, useEffect, useRef } from 'react'
import { useT } from '@/i18n/useT'
import {
  type AppState,
  currentEvent,
  executionOptOf,
  type IrView,
  isExecuted,
  isStale,
  useAppStore,
} from '@/store/appStore'
import { EMPTY } from '@/store/selectors'
import { EmptyState } from '@/ui/Badge'
import { TabPanel, Tabs } from '@/ui/Tabs'
import { useVirtualRows } from '@/ui/useVirtualRows'
import { SpacerRow } from '@/ui/VirtualSpacer'

const VIEWS: IrView[] = ['tac', 'triplets', 'quads', 'blocks']

type Kind = 'asig' | 'bin' | 'io' | 'jump' | 'halt'

const KIND_CLASS: Record<Kind, string> = {
  asig: 'text-text',
  bin: 'text-val',
  io: 'text-str',
  jump: 'text-kw',
  halt: 'text-muted',
}

function kindOf(i: InstruccionTAC): Kind {
  if (i.op === 'read' || i.op === 'write') return 'io'
  if (esSalto(i)) return 'jump'
  return i.op
}

function kindOfTriplet(t: Tripleta): Kind {
  if (t.op === '=') return 'asig'
  if (t.op === 'read' || t.op === 'write') return 'io'
  if (t.op === 'if' || t.op === 'ifFalse' || t.op === 'goto') return 'jump'
  if (t.op === 'halt') return 'halt'
  return 'bin'
}

function Operands({ text }: { text: string }) {
  const parts = text.split(/(\b_c\d+\b|\bt\d+\b|"[^"]*")/)
  return (
    <>
      {parts.map((p, i) =>
        /^(_c|t)\d+$/.test(p) ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: partes fijas de un texto
          <span key={i} className="text-fn">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  )
}

const executedOriginal = (s: AppState) =>
  isExecuted(s) && executionOptOf(s)
    ? (s.execution?.instrucciones ?? null)
    : null
const executedOptimized = (s: AppState) =>
  isExecuted(s) ? (executionOptOf(s)?.instrucciones ?? null) : null
const executedAtLimit = (s: AppState) =>
  isExecuted(s) &&
  (!!s.execution?.limiteAlcanzado || !!executionOptOf(s)?.limiteAlcanzado)

const th = 'px-2 py-1.5 font-normal whitespace-nowrap'
const td = 'px-2 py-0.5 whitespace-nowrap'

export function IntermediateView({ className }: { className?: string }) {
  const result = useAppStore((s) => (isStale(s) ? null : s.result))
  const view = useAppStore((s) => s.irView)
  const setView = useAppStore((s) => s.setIrView)
  const optimizedPref = useAppStore((s) => s.optimized)
  const setOptimized = useAppStore((s) => s.setOptimized)
  const executedBefore = useAppStore(executedOriginal)
  const executedAfter = useAppStore(executedOptimized)
  const atLimit = useAppStore(executedAtLimit)
  const focusLine = useAppStore((s) => s.focusLine)
  const t = useT()
  const ti = t.intermediate
  const scroll = useRef<HTMLDivElement>(null)
  const opt0 = optimizedPref ? result?.optimizado : null
  const filasTabla =
    view === 'blocks'
      ? 0
      : view === 'triplets'
        ? (opt0?.tripletas ?? result?.tripletas ?? EMPTY).length
        : (opt0?.tresDirecciones ?? result?.tresDirecciones ?? EMPTY).length
  const virtual = useVirtualRows({
    count: filasTabla,
    scrollRef: scroll,
    estimate: 21,
  })

  const paso = useAppStore((s) =>
    s.traceKind === 'execution' ? currentEvent(s) : undefined,
  )
  const pcActual = paso?.cuadrupla
  const saltoA =
    paso?.accion === 'saltar' &&
    paso.siguiente !== undefined &&
    paso.siguiente !== (paso.cuadrupla ?? 0) + 1
      ? paso.siguiente
      : undefined
  const origen0 = opt0 ? opt0.origenTripletas : null
  const filaActual =
    pcActual === undefined
      ? -1
      : view === 'triplets' && origen0
        ? origen0.indexOf(pcActual)
        : pcActual
  const { mostrar } = virtual
  useEffect(() => {
    if (filaActual >= 0) mostrar(filaActual)
  }, [filaActual, mostrar])

  const original = result?.tresDirecciones ?? EMPTY
  if (!result?.ok || original.length === 0)
    return <EmptyState>{ti.empty}</EmptyState>

  const opt = optimizedPref ? result.optimizado : undefined
  const optimized = optimizedPref && !!opt
  const sinOptimizado = opt === null
  const code = optimized ? opt.tresDirecciones : original
  const triplets = optimized ? opt.tripletas : result.tripletas
  const tripletOrigin = optimized ? opt.origenTripletas : null
  const quads = optimized ? opt.cuadruplas : result.cuadruplas
  const targets = destinosDeSalto(code)
  const c = ti.columns

  const row = (
    n: number,
    cells: ReactNode,
    {
      instr = n,
      ins = code[instr],
      numero = n,
      kind = kindOf(ins),
      target = targets.has(n),
    }: {
      instr?: number
      ins?: InstruccionTAC
      numero?: ReactNode
      kind?: Kind
      target?: boolean
    } = {},
  ) => {
    const linea = ins.linea
    const actual = instr === pcActual
    const llegada = instr === saltoA
    return (
      <tr
        key={n}
        ref={virtual.medir}
        data-index={n}
        aria-current={actual ? 'step' : undefined}
        className={clsx(
          'border-b border-border/60',
          KIND_CLASS[kind],
          linea && 'cursor-pointer hover:bg-surface-2',
          actual && 'bg-accent/15 ring-1 ring-accent/50 ring-inset',
          llegada && 'bg-fn/10',
        )}
        onClick={linea ? () => focusLine(linea) : undefined}
        title={linea ? ti.fromLine(linea) : undefined}
      >
        <td className={clsx(td, 'text-right text-muted')}>
          {llegada && (
            <span className="mr-1 font-semibold text-fn" title={ti.jumpLands}>
              ↳
            </span>
          )}
          {target && !llegada && (
            <span className="mr-1 text-kw" title={ti.jumpTarget}>
              ▸
            </span>
          )}
          {numero}
        </td>
        {cells}
      </tr>
    )
  }

  const tacRows = (desde: number, hasta: number) =>
    code.slice(desde, hasta + 1).map((ins, k) =>
      row(
        desde + k,
        <td className={td}>
          <Operands text={formatTAC(ins)} />
        </td>,
      ),
    )

  let table: ReactNode
  if (view === 'tac') {
    table = (
      <table aria-label={ti.views.tac} className="font-mono text-xs">
        <thead className="sticky top-0 bg-surface text-left text-[11px] text-muted">
          <tr className="border-b border-border">
            <th className={clsx(th, 'text-right')}>{c.n}</th>
            <th className={th}>{c.instruction}</th>
          </tr>
        </thead>
        <tbody>
          <SpacerRow height={virtual.antes} cols={2} />
          {virtual.indices.map((n) => tacRows(n, n))}
          <SpacerRow height={virtual.despues} cols={2} />
        </tbody>
      </table>
    )
  } else if (view === 'blocks') {
    table = <BlocksView code={code} rows={tacRows} />
  } else {
    const isQuads = view === 'quads'
    const rows: (Tripleta | Cuadrupla)[] = isQuads ? quads : triplets
    const tripletTargets = isQuads ? null : destinosDeTripletas(triplets)
    const opciones = (r: Tripleta | Cuadrupla, n: number) =>
      isQuads
        ? {}
        : {
            instr: tripletOrigin?.[n] ?? n,
            numero: `(${n})`,
            kind: kindOfTriplet(r),
            target: tripletTargets?.has(n),
          }
    table = (
      <>
        {!isQuads && triplets.length !== code.length && (
          <p className="px-3 pt-2 text-[11px] text-muted">
            {ti.ownNumbering(triplets.length)}
          </p>
        )}
        <table aria-label={ti.views[view]} className="font-mono text-xs">
          <thead className="sticky top-0 bg-surface text-left text-[11px] text-muted">
            <tr className="border-b border-border">
              <th className={clsx(th, 'text-right')}>{c.n}</th>
              <th className={th}>{c.op}</th>
              <th className={th}>{c.arg1}</th>
              <th className={th}>{c.arg2}</th>
              {isQuads && <th className={th}>{c.result}</th>}
            </tr>
          </thead>
          <tbody>
            <SpacerRow height={virtual.antes} cols={isQuads ? 5 : 4} />
            {virtual.indices
              .map((n) => [rows[n], n] as const)
              .map(([r, n]) =>
                row(
                  n,
                  <>
                    <td className={td}>{r.op}</td>
                    <td className={td}>
                      <Operands text={campo(r.arg1)} />
                    </td>
                    <td className={td}>
                      <Operands text={campo(r.arg2)} />
                    </td>
                    {isQuads && (
                      <td className={td}>
                        <Operands text={campo((r as Cuadrupla).resultado)} />
                      </td>
                    )}
                  </>,
                  opciones(r, n),
                ),
              )}
            <SpacerRow height={virtual.despues} cols={isQuads ? 5 : 4} />
          </tbody>
        </table>
      </>
    )
  }

  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 border-b border-border px-1">
        <Tabs
          items={VIEWS.map((id) => ({ id, label: ti.views[id] }))}
          value={view}
          onChange={setView}
          label={ti.label}
          idPrefix="ir"
        />
        <label
          className={clsx(
            'inline-flex items-center gap-1.5 px-2 text-xs max-md:min-h-11',
            sinOptimizado ? 'opacity-50' : 'cursor-pointer',
          )}
          title={sinOptimizado ? ti.noOptimized : ti.optimizedHint}
        >
          <input
            type="checkbox"
            checked={optimized}
            onChange={(e) => setOptimized(e.target.checked)}
            className="accent-current"
          />
          {ti.optimized}
        </label>
        <span className="ml-auto px-2 text-[11px] text-muted">
          {optimized
            ? ti.comparison(original.length, code.length)
            : ti.count(code.length)}
          {optimized &&
            executedBefore !== null &&
            executedAfter !== null &&
            (atLimit ? (
              <> · {ti.executedAtLimit}</>
            ) : (
              <> · {ti.executedComparison(executedBefore, executedAfter)}</>
            ))}
        </span>
      </div>
      <TabPanel
        ref={scroll}
        id={view}
        tab={view}
        idPrefix="ir"
        className="min-h-0 flex-1 overflow-auto"
      >
        {table}
        {optimized && opt && <PassesSummary opt={opt} />}
        <ul
          aria-label={ti.legendLabel}
          className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px]"
        >
          {(Object.keys(KIND_CLASS) as Kind[]).map((k) => (
            <li key={k} className={KIND_CLASS[k]}>
              ■ <span className="text-muted">{ti.legend[k]}</span>
            </li>
          ))}
          <li className="text-fn">
            ■ <span className="text-muted">{ti.legend.temp}</span>
          </li>
          <li className="text-kw">
            ▸ <span className="text-muted">{ti.jumpTarget}</span>
          </li>
        </ul>
      </TabPanel>
    </div>
  )
}

function PassesSummary({ opt }: { opt: CodigoOptimizado }) {
  const ti = useT().intermediate
  return (
    <section
      aria-label={ti.passesLabel}
      className="border-t border-border px-3 py-2 text-[11px]"
    >
      <h3 className="mb-1 text-muted">{ti.passesLabel}</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {PASADAS.map((p) => (
          <li
            key={p}
            className={opt.cambios[p] > 0 ? 'text-text' : 'text-muted'}
          >
            {ti.passes[p]}:{' '}
            <span className="font-mono">{ti.passCount(opt.cambios[p])}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted">{ti.rounds(opt.rondas)}</p>
    </section>
  )
}

function BlocksView({
  code,
  rows,
}: {
  code: readonly InstruccionTAC[]
  rows: (desde: number, hasta: number) => ReactNode
}) {
  const tb = useT().intermediate.blocks
  const blocks = bloquesBasicos(code)
  const name = (b: number) => `B${b}`
  const links = (ids: number[], empty: string) =>
    ids.length > 0 ? ids.map(name).join(', ') : empty

  return (
    <section aria-label={tb.label} className="flex flex-col gap-2 p-2">
      <p className="text-[11px] text-muted">
        {tb.count(blocks.length)}. {tb.hint}
      </p>
      <ol className="flex flex-col gap-2">
        {blocks.map((b: BloqueBasico) => (
          <li
            key={b.id}
            aria-label={`${name(b.id)}: ${tb.range(b.inicio, b.fin)}`}
            className="max-w-full overflow-x-auto rounded border border-border"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 border-b border-border bg-surface-2 px-2 py-1 text-[11px]">
              <span className="font-mono font-semibold text-text">
                {name(b.id)}
              </span>
              <span className="text-muted">{tb.range(b.inicio, b.fin)}</span>
              <span className="text-muted">
                {tb.from}: {links(b.predecesores, tb.entry)}
              </span>
            </div>
            <table className="font-mono text-xs">
              <tbody>{rows(b.inicio, b.fin)}</tbody>
            </table>
            <div className="border-t border-border/60 px-2 py-1 text-[11px] text-muted">
              → {tb.to}: {links(b.sucesores, tb.end)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
