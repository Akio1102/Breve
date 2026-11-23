import { formatTAC, formatValor } from '@engine/formato'
import type { InstruccionTAC, PasoTraza } from '@engine/types'
import { clsx } from 'clsx'
import { ArrowRight } from 'lucide-react'
import { Suspense } from 'react'
import { useT } from '@/i18n/useT'
import {
  isStale,
  numeroDePaso,
  totalDePasos,
  tracedExecution,
  useAppStore,
  useCurrentEvent,
} from '@/store/appStore'
import { Badge } from '@/ui/Badge'
import { ArbolDelPaso } from './arbolDiferido'

function Cambios({
  event,
  prev,
}: {
  event: PasoTraza
  prev: PasoTraza | undefined
}) {
  const t = useT()
  const antes = new Map((prev?.simbolos ?? []).map((s) => [s.nombre, s]))
  const filas = event.cambios.flatMap((s) => {
    const a = antes.get(s.nombre)
    if (a && a.valor === s.valor) return []
    return [{ s, antes: a }]
  })
  if (filas.length === 0) return null
  return (
    <ul aria-label={t.stepCard.changes} className="flex flex-col gap-0.5">
      {filas.map(({ s, antes: a }) => (
        <li
          key={s.nombre}
          className="flex animate-enter flex-wrap items-baseline gap-x-1.5 font-mono text-xs"
        >
          <span className="text-text">{s.nombre}</span>
          {a ? (
            <>
              <span className="text-muted line-through decoration-muted/50">
                {formatValor(a.valor, a.tipo)}
              </span>
              <ArrowRight
                size={12}
                className="self-center text-muted"
                aria-label={t.stepCard.becomes}
              />
              <span className="text-val">{formatValor(s.valor, s.tipo)}</span>
            </>
          ) : (
            <>
              <span className="text-fn">{s.tipo}</span>
              <span className="text-val">{formatValor(s.valor, s.tipo)}</span>
              <span className="font-sans text-[11px] text-ok">
                {t.vars.new}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}

function useCodigoEjecutado(): readonly InstruccionTAC[] | null {
  return useAppStore((s) => {
    const x = tracedExecution(s)
    const r = s.result
    if (!x || !r?.ok) return null
    return x !== s.execution && r.optimizado
      ? r.optimizado.tresDirecciones
      : r.tresDirecciones
  })
}

const MAX_CUADRUPLAS = 9

function CuadruplasDeLinea({ event }: { event: PasoTraza }) {
  const codigo = useCodigoEjecutado()
  const t = useT()
  if (!codigo || event.cuadrupla === undefined) return null
  const actual = event.cuadrupla
  const siguiente = event.siguiente
  const indices: number[] = []
  codigo.forEach((i, k) => {
    if (i.linea === event.linea) indices.push(k)
  })
  if (!indices.includes(actual)) return null
  const pos = indices.indexOf(actual)
  const desde = Math.max(
    0,
    Math.min(
      pos - Math.floor(MAX_CUADRUPLAS / 2),
      indices.length - MAX_CUADRUPLAS,
    ),
  )
  const visibles = indices.slice(desde, desde + MAX_CUADRUPLAS)
  const despues = indices.length - desde - visibles.length
  const fuera =
    siguiente !== undefined &&
    siguiente < codigo.length &&
    !indices.includes(siguiente) &&
    event.accion !== 'terminar' &&
    event.accion !== 'errorEjecucion'
  return (
    <figure
      aria-label={t.stepCard.quads}
      className="rounded border border-border/60 bg-editor px-1 py-1 font-mono text-xs"
    >
      <figcaption className="px-1 pb-0.5 font-sans text-[11px] text-muted">
        {t.stepCard.quads}
      </figcaption>
      <ol>
        {desde > 0 && (
          <li className="px-1 text-muted">{t.stepCard.quadsMore(desde)}</li>
        )}
        {visibles.map((k) => {
          const esActual = k === actual
          const esSiguiente = k === siguiente && !esActual
          return (
            <li
              key={k}
              aria-current={esActual ? 'step' : undefined}
              className={clsx(
                'flex items-baseline gap-2 rounded px-1',
                esActual && 'bg-surface-2 ring-1 ring-inset ring-accent/50',
              )}
            >
              <span className="w-6 shrink-0 text-right text-muted tabular-nums">
                {k}
              </span>
              <code className={clsx('break-all', !esActual && 'text-muted')}>
                {formatTAC(codigo[k])}
              </code>
              {esActual && (
                <span className="ml-auto shrink-0 font-sans text-[11px] text-accent">
                  {t.stepCard.quadsNow}
                </span>
              )}
              {esSiguiente && (
                <span className="ml-auto shrink-0 font-sans text-[11px] text-muted">
                  ← {t.stepCard.quadsNext}
                </span>
              )}
            </li>
          )
        })}
        {despues > 0 && (
          <li className="px-1 text-muted">{t.stepCard.quadsMore(despues)}</li>
        )}
      </ol>
      {fuera && (
        <p className="px-1 pt-0.5 font-sans text-[11px] text-muted">
          {t.stepCard.quadsJump(
            siguiente,
            codigo[siguiente].linea ?? event.linea,
          )}
        </p>
      )}
    </figure>
  )
}

function Idle() {
  const stale = useAppStore(isStale)
  const result = useAppStore((s) => s.result)
  const t = useT()
  if (stale) return t.stepCard.stale
  if (!result) return t.stepCard.stale
  if (result.faseFallida === 'lexico' || result.faseFallida === 'sintactico')
    return t.stepCard.fixErrors
  if (result.faseFallida === 'semantico') return t.stepCard.readyWithErrors
  return t.stepCard.ready
}

export function StepCard({ className }: { className?: string }) {
  const { event, prev } = useCurrentEvent()
  const semantica = useAppStore((s) => s.traceKind === 'semantic')
  const numero = useAppStore(numeroDePaso)
  const total = useAppStore(totalDePasos)
  const t = useT()

  if (!event) {
    return (
      <section
        aria-label={t.stepCard.label}
        data-tour="paso"
        className={clsx('border-l-2 border-border py-1 pl-3', className)}
      >
        <p className="text-sm text-muted">
          <Idle />
        </p>
      </section>
    )
  }

  const isError = event.accion === 'error' || event.accion === 'errorEjecucion'
  const isWarning = event.accion === 'advertencia'
  return (
    <section
      aria-label={t.stepCard.label}
      data-tour="paso"
      className={clsx(
        'flex flex-col gap-2 border-l-2 py-1 pl-3',
        isError ? 'border-danger' : isWarning ? 'border-warn' : 'border-text',
        className,
      )}
    >
      <div className="flex items-baseline gap-2">
        <h2
          className={clsx(
            'text-sm font-medium',
            isError && 'text-danger',
            isWarning && 'text-warn',
          )}
        >
          {t.stepCard.actions[event.accion]}
        </h2>
        {event.vuelta !== undefined && (
          <Badge tone="accent">
            {t.stepCard.vuelta(event.vuelta, event.vueltas)}
          </Badge>
        )}
        <span className="ml-auto font-mono text-xs text-muted tabular-nums">
          L{event.linea}
          {event.cuadrupla !== undefined &&
            ` · ${t.stepCard.quad(event.cuadrupla)}`}{' '}
          · {numero}/{total}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed">
        {event.papel
          ? t.stepCard.papel(event.papel)
          : t.stepCard.explain[event.accion]}
      </p>
      {event.detalle && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-surface-2 px-2 py-1.5 font-mono text-xs">
          <code className="break-all">{event.detalle}</code>
          {event.resultado && (
            <>
              <ArrowRight
                size={13}
                className="shrink-0 text-muted"
                aria-label={t.stepCard.gives}
              />
              <code
                className={clsx(
                  'break-all',
                  isError
                    ? 'text-danger'
                    : isWarning
                      ? 'text-warn'
                      : 'text-val',
                )}
              >
                {event.resultado}
              </code>
            </>
          )}
        </div>
      )}
      <Cambios event={event} prev={prev} />
      {semantica ? (
        <Suspense fallback={null}>
          <ArbolDelPaso event={event} />
        </Suspense>
      ) : (
        <CuadruplasDeLinea event={event} />
      )}
    </section>
  )
}
