import type { AccionTraza, PasoTraza } from '@engine/types'
import { clsx } from 'clsx'
import { Info, ZoomIn, ZoomOut } from 'lucide-react'
import {
  type KeyboardEvent,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useT } from '@/i18n/useT'
import { activeTrace, isRunning, useAppStore } from '@/store/appStore'
import { tramos } from './tramos'

const BUTTONS_MAX = 60
const ZOOMS = [1, 4, 16, 64]
const ANCHO_TARJETA = 288

function StepPreview({
  paso,
  n,
  x,
  ancho,
  id,
}: {
  paso: PasoTraza
  n: number
  x: number
  ancho: number
  id?: string
}) {
  const t = useT()
  const left = Math.max(
    0,
    Math.min(x - ANCHO_TARJETA / 2, ancho - ANCHO_TARJETA),
  )
  return (
    <div
      id={id}
      role="tooltip"
      style={{ left, width: ANCHO_TARJETA }}
      className="pointer-events-none absolute top-full z-40 mt-1 rounded-md border border-muted/40 bg-raised p-2 text-xs shadow-xl shadow-black/20"
    >
      <p className="flex items-baseline gap-2">
        <span className="font-medium">{t.stepCard.actions[paso.accion]}</span>
        <span className="ml-auto font-mono text-[11px] text-muted tabular-nums">
          {n + 1} · L{paso.linea}
          {paso.cuadrupla !== undefined &&
            ` · ${t.stepCard.quad(paso.cuadrupla)}`}
        </span>
      </p>
      {paso.detalle && (
        <p className="mt-1 line-clamp-2 font-mono break-all">
          {paso.detalle}
          {paso.resultado && (
            <>
              <span className="text-muted"> → </span>
              <span className="text-val">{paso.resultado}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function RotulosTramos({ trace }: { trace: PasoTraza[] }) {
  const t = useT()
  const lista = useMemo(() => tramos(trace), [trace])
  const n = trace.length
  if (lista.length === 0) return null
  return (
    <div aria-hidden className="relative h-3.5 overflow-hidden">
      {lista.map((r) => (
        <span
          key={r.desde}
          className="absolute top-0 truncate border-l border-border pl-0.5 text-[10px] leading-3.5 text-muted"
          style={{
            left: `${(r.desde / n) * 100}%`,
            width: `${((r.hasta - r.desde + 1) / n) * 100}%`,
          }}
        >
          {t.timeline.tramo(r.linea, r.vuelta, r.vueltas)}
        </span>
      ))}
    </div>
  )
}

const KIND_CLASS: Partial<Record<AccionTraza, string>> = {
  insertar: 'bg-ok',
  buscar: 'bg-fn',
  operacion: 'bg-kw',
  asignar: 'bg-val',
  condicion: 'bg-h4',
  repetir: 'bg-h4',
  mostrar: 'bg-str',
  advertencia: 'bg-warn',
  error: 'bg-danger',
  copiar: 'bg-val',
  calcular: 'bg-kw',
  leerEntrada: 'bg-str',
  escribir: 'bg-str',
  saltar: 'bg-h4',
  errorEjecucion: 'bg-danger',
}

const KIND_HEIGHT: Partial<Record<AccionTraza, number>> = {
  insertar: 14,
  asignar: 12,
  error: 14,
  advertencia: 12,
  mostrar: 12,
  copiar: 12,
  leerEntrada: 12,
  escribir: 12,
  errorEjecucion: 14,
}

const TimelineButton = memo(function TimelineButton({
  index,
  event,
  current,
  done,
  breakpoint,
  label,
  rotulo,
  onSelect,
  onPreview,
}: {
  index: number
  event: PasoTraza
  current: boolean
  done: boolean
  breakpoint: boolean
  label: string
  rotulo?: { texto: string; pasos: number }
  onSelect(i: number): void
  onPreview(i: number | null, el?: HTMLElement): void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={current}
      tabIndex={current ? 0 : -1}
      data-step={index}
      aria-label={label}
      onClick={() => onSelect(index)}
      onMouseEnter={(e) => onPreview(index, e.currentTarget)}
      onMouseLeave={() => onPreview(null)}
      onFocus={(e) => onPreview(index, e.currentTarget)}
      onBlur={() => onPreview(null)}
      className="group relative flex h-11 min-w-6 flex-1 items-end justify-center pb-2.5"
    >
      {rotulo && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 z-10 truncate border-l border-border pl-0.5 text-left text-[10px] leading-3.5 text-muted"
          style={{
            width: `calc(${rotulo.pasos * 100}% + ${rotulo.pasos - 1}px)`,
          }}
        >
          {rotulo.texto}
        </span>
      )}
      <span
        aria-hidden
        className={clsx(
          'absolute inset-y-0.5 left-1/2 w-6 -translate-x-1/2 rounded transition-colors',
          current ? 'bg-surface-2' : 'group-hover:bg-surface-2/60',
        )}
      />
      <span
        aria-hidden
        className={clsx(
          'relative w-1.5 rounded-full transition-opacity',
          KIND_CLASS[event.accion] ?? 'bg-muted',
          !done && !current && 'opacity-35',
        )}
        style={{ height: `${KIND_HEIGHT[event.accion] ?? 8}px` }}
      />
      {breakpoint && (
        <span
          aria-hidden
          className="absolute top-1 size-1.5 rounded-full bg-danger"
        />
      )}
    </button>
  )
})

const KIND_FILL: Partial<Record<AccionTraza, string>> = {
  insertar: 'fill-ok',
  buscar: 'fill-fn',
  operacion: 'fill-kw',
  asignar: 'fill-val',
  condicion: 'fill-h4',
  repetir: 'fill-h4',
  mostrar: 'fill-str',
  advertencia: 'fill-warn',
  error: 'fill-danger',
  copiar: 'fill-val',
  calcular: 'fill-kw',
  leerEntrada: 'fill-str',
  escribir: 'fill-str',
  saltar: 'fill-h4',
  errorEjecucion: 'fill-danger',
}

const MAX_COLUMNAS = 800

interface Columna {
  accion: AccionTraza
  alto: number
}

function columnas(trace: readonly PasoTraza[]): {
  cols: Columna[]
  escala: number
} {
  const n = trace.length
  const escala = n > MAX_COLUMNAS ? MAX_COLUMNAS / n : 1
  const cols: Columna[] = []
  trace.forEach((e, i) => {
    const c = Math.floor(i * escala)
    const alto = KIND_HEIGHT[e.accion] ?? 8
    if (!cols[c] || alto > cols[c].alto) cols[c] = { accion: e.accion, alto }
  })
  return { cols, escala }
}

const SparkBars = memo(function SparkBars({ trace }: { trace: PasoTraza[] }) {
  const { cols, escala } = columnas(trace)
  const bandas: { desde: number; hasta: number; par: boolean }[] = []
  trace.forEach((e, i) => {
    const ultima = bandas.at(-1)
    if (ultima && trace[ultima.desde].instr === e.instr) ultima.hasta = i
    else bandas.push({ desde: i, hasta: i, par: bandas.length % 2 === 0 })
  })
  const conBandas = bandas.length <= cols.length
  return (
    <g data-capa="pasos">
      {conBandas &&
        bandas.map(
          (b) =>
            b.par && (
              <rect
                key={`b${b.desde}`}
                x={b.desde * escala}
                y={0}
                width={(b.hasta - b.desde + 1) * escala}
                height={10}
                className="fill-surface-2"
              />
            ),
        )}
      {cols.map((c, i) => {
        const h = (c.alto / 14) * 10
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: las columnas no cambian de orden
            key={i}
            x={i}
            y={10 - h}
            width={1}
            height={h}
            className={KIND_FILL[c.accion] ?? 'fill-muted'}
          />
        )
      })}
    </g>
  )
})

function TraceSparkline({ trace, step }: { trace: PasoTraza[]; step: number }) {
  const n = trace.length
  const escala = n > MAX_COLUMNAS ? MAX_COLUMNAS / n : 1
  const w = Math.ceil(n * escala)
  const x = step * escala
  return (
    <svg
      viewBox={`0 0 ${w} 10`}
      preserveAspectRatio="none"
      className="h-4 w-full"
      aria-hidden
    >
      <SparkBars trace={trace} />
      <rect
        x={x + escala}
        y={0}
        width={Math.max(w - x - escala, 0)}
        height={10}
        className="fill-bg/70"
      />
      <rect
        x={x}
        y={0}
        width={Math.max(escala, 1)}
        height={10}
        className="fill-text"
      />
    </svg>
  )
}

function TimelineLegend({ trace }: { trace: PasoTraza[] }) {
  const t = useT()
  const acciones = [...new Set(trace.map((e) => e.accion))].filter(
    (a) => KIND_CLASS[a],
  )
  return (
    <details className="relative shrink-0 self-center">
      <summary
        className="flex size-6 cursor-pointer list-none items-center justify-center rounded text-muted hover:bg-surface-2 max-md:size-11 [&::-webkit-details-marker]:hidden"
        title={t.timeline.legend}
        aria-label={t.timeline.legend}
      >
        <Info size={14} aria-hidden />
      </summary>
      <ul
        aria-label={t.timeline.legend}
        className="absolute right-0 bottom-full z-40 mb-1 flex w-max flex-col gap-1 rounded-md border border-muted/40 bg-raised p-2 text-[11px] shadow-xl shadow-black/20"
      >
        {acciones.map((a) => (
          <li key={a} className="flex items-center gap-2">
            <span
              aria-hidden
              className={clsx('h-2.5 w-1.5 rounded-full', KIND_CLASS[a])}
            />
            {t.stepCard.actions[a]}
          </li>
        ))}
        <li className="flex items-center gap-2 text-muted">
          <span aria-hidden className="h-2.5 w-1.5 rounded-full bg-muted" />
          {t.timeline.otherActions}
        </li>
      </ul>
    </details>
  )
}

export function Timeline({ className }: { className?: string }) {
  const trace = useAppStore(activeTrace)
  const step = useAppStore((s) => s.step)
  const running = useAppStore(isRunning)
  const bps = useAppStore((s) => s.breakpoints)
  const goTo = useAppStore((s) => s.goTo)
  const list = useRef<HTMLDivElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const active = running && trace
  const t = useT()
  const [vista, setVista] = useState<{ paso: number; x: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [conFoco, setConFoco] = useState(false)
  const n = trace?.length ?? 0
  const ventana = Math.min(n, Math.max(BUTTONS_MAX, Math.ceil(n / zoom)))
  const mitad = Math.max(1, Math.floor(ventana / 2))
  const inicio = Math.max(
    0,
    Math.min(Math.floor(step / mitad) * mitad - mitad, n - ventana),
  )
  const tramo = useMemo(
    () => (trace && zoom > 1 ? trace.slice(inicio, inicio + ventana) : trace),
    [trace, zoom, inicio, ventana],
  )
  const ancho = () => caja.current?.clientWidth ?? 0
  const previa = (i: number | null, el?: HTMLElement) => {
    if (i === null || !el || !caja.current) return setVista(null)
    const a = el.getBoundingClientRect()
    const b = caja.current.getBoundingClientRect()
    setVista({ paso: i, x: a.left - b.left + a.width / 2 })
  }

  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }, [step])

  if (!active) {
    return (
      <div
        className={clsx(
          'flex h-10 items-center px-3 text-xs text-muted',
          className,
        )}
        data-tour="linea-tiempo"
      >
        {t.timeline.empty}
      </div>
    )
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: step + 1,
      ArrowLeft: step - 1,
      Home: 0,
      End: trace.length - 1,
    }
    if (!(e.key in map)) return
    e.preventDefault()
    goTo(map[e.key])
    requestAnimationFrame(() =>
      list.current
        ?.querySelector<HTMLElement>('[aria-selected="true"]')
        ?.focus(),
    )
  }

  if (trace.length > BUTTONS_MAX) {
    const tramoN = tramo?.length ?? 0
    const pasoEn = (e: React.MouseEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      const rel = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 0.9999)
      return { paso: inicio + Math.floor(rel * tramoN), x: e.clientX - r.left }
    }
    const puedeAcercar = ventana > BUTTONS_MAX && zoom < (ZOOMS.at(-1) ?? 1)
    const tarjeta =
      vista ??
      (conFoco ? { paso: step, x: ((step - inicio) / tramoN) * ancho() } : null)
    return (
      <div
        className={clsx('flex items-center gap-2 px-3 py-1', className)}
        data-tour="linea-tiempo"
      >
        <div
          ref={caja}
          className="relative flex min-w-0 flex-1 flex-col gap-0.5"
        >
          <RotulosTramos trace={tramo ?? trace} />
          {/* biome-ignore lint/a11y/noStaticElementInteractions: el control accesible es el deslizador de abajo; esto es una ayuda con el ratón */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: con el teclado se usa el deslizador (flechas, Inicio, Fin) */}
          <div
            onMouseMove={(e) => setVista(pasoEn(e))}
            onMouseLeave={() => setVista(null)}
            onClick={(e) => goTo(pasoEn(e).paso)}
            className="cursor-pointer"
          >
            <TraceSparkline trace={tramo ?? trace} step={step - inicio} />
          </div>
          {tarjeta && trace[tarjeta.paso] && (
            <StepPreview
              paso={trace[tarjeta.paso]}
              n={tarjeta.paso}
              x={tarjeta.x}
              ancho={ancho()}
            />
          )}
          <input
            type="range"
            min={0}
            max={trace.length - 1}
            value={step}
            onFocus={() => setConFoco(true)}
            onBlur={() => setConFoco(false)}
            onChange={(e) => goTo(Number(e.target.value))}
            aria-label={t.timeline.label}
            aria-valuetext={t.timeline.stepOf(
              step + 1,
              trace.length,
              trace[step].linea,
              t.stepCard.actions[trace[step].accion],
            )}
            className="w-full accent-[var(--color-accent)]"
          />
        </div>
        <span className="flex shrink-0 items-center gap-0.5 self-center">
          {zoom > 1 && (
            <span className="mr-1 font-mono text-[11px] text-muted tabular-nums">
              {t.timeline.range(inicio + 1, inicio + tramoN, n)}
            </span>
          )}
          <button
            type="button"
            onClick={() => setZoom(ZOOMS[ZOOMS.indexOf(zoom) + 1] ?? zoom)}
            disabled={!puedeAcercar}
            aria-label={t.timeline.zoomIn}
            title={t.timeline.zoomIn}
            className="flex size-6 items-center justify-center rounded text-muted hover:bg-surface-2 disabled:opacity-40 max-md:size-11"
          >
            <ZoomIn size={14} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setZoom(ZOOMS[ZOOMS.indexOf(zoom) - 1] ?? 1)}
            disabled={zoom === 1}
            aria-label={t.timeline.zoomOut}
            title={t.timeline.zoomOut}
            className="flex size-6 items-center justify-center rounded text-muted hover:bg-surface-2 disabled:opacity-40 max-md:size-11"
          >
            <ZoomOut size={14} aria-hidden />
          </button>
        </span>
        <TimelineLegend trace={trace} />
      </div>
    )
  }

  const bpSet = new Set(bps)
  const inicios = new Map(
    tramos(trace).map((r) => [
      r.desde,
      {
        texto: t.timeline.tramo(r.linea, r.vuelta, r.vueltas),
        pasos: r.hasta - r.desde + 1,
      },
    ]),
  )
  const railInset = `calc(0.5rem + (100% - 1rem) / ${trace.length} / 2)`
  return (
    <div
      ref={caja}
      className={clsx('relative flex items-end gap-1 pr-2', className)}
      data-tour="linea-tiempo"
    >
      {vista && trace[vista.paso] && (
        <StepPreview
          paso={trace[vista.paso]}
          n={vista.paso}
          x={vista.x}
          ancho={ancho()}
        />
      )}
      <div
        ref={list}
        role="listbox"
        aria-label={t.timeline.label}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
        className="relative flex min-w-0 flex-1 items-end gap-px overflow-x-auto px-2 py-0.5"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[0.4375rem] h-0.5 rounded-full bg-border"
          style={{ left: railInset, right: railInset }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-muted transition-[width] duration-200"
            style={{
              width: `${(step / Math.max(trace.length - 1, 1)) * 100}%`,
            }}
          />
        </span>
        {trace.map((e, i) => (
          <TimelineButton
            // biome-ignore lint/suspicious/noArrayIndexKey: la traza no cambia de orden
            key={i}
            index={i}
            event={e}
            current={i === step}
            done={i < step}
            breakpoint={e.accion !== 'inicio' && bpSet.has(e.linea)}
            label={t.timeline.step(
              i + 1,
              e.linea,
              t.stepCard.actions[e.accion],
            )}
            rotulo={inicios.get(i)}
            onSelect={goTo}
            onPreview={previa}
          />
        ))}
      </div>
      <TimelineLegend trace={trace} />
    </div>
  )
}
