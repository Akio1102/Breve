import {
  FASES,
  type Fase,
  type ResultadoCompilacion,
  type ResultadoEjecucion,
} from '@engine/types'

export type PhaseStatus = 'ok' | 'error' | 'pending'

export function phaseStatuses(s: {
  result: ResultadoCompilacion | null
  stale: boolean
  execution?: ResultadoEjecucion | null
}): Record<Fase, PhaseStatus> {
  const out = {} as Record<Fase, PhaseStatus>
  const failed = s.result?.faseFallida
    ? FASES.indexOf(s.result.faseFallida)
    : FASES.indexOf('ejecucion')
  FASES.forEach((p, i) => {
    if (p === 'ejecucion') return
    if (!s.result || s.stale || i > failed) out[p] = 'pending'
    else out[p] = i === failed ? 'error' : 'ok'
  })
  const ex = s.result?.ok && !s.stale ? s.execution : null
  out.ejecucion = !ex ? 'pending' : ex.ok ? 'ok' : 'error'
  return out
}
