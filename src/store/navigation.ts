import type { PasoTraza } from '@engine/types'

const hitsBreakpoint = (e: PasoTraza, bps: ReadonlySet<number>) =>
  e.accion !== 'inicio' && bps.has(e.linea)

export type Oculto = (e: PasoTraza) => boolean
const ninguno: Oculto = () => false

export function stepInto(
  trace: PasoTraza[],
  step: number,
  oculto: Oculto = ninguno,
): number {
  const last = Math.max(trace.length - 1, 0)
  let i = step + 1
  while (i < last && oculto(trace[i])) i++
  return Math.min(i, last)
}

export function stepOver(
  trace: PasoTraza[],
  step: number,
  bps: ReadonlySet<number> = new Set(),
  oculto: Oculto = ninguno,
): number {
  const line = trace[step]?.linea
  const last = trace.length - 1
  for (let i = step + 1; i <= last; i++) {
    if (oculto(trace[i]) && i < last) continue
    if (trace[i].linea !== line || hitsBreakpoint(trace[i], bps)) return i
  }
  return Math.max(last, 0)
}

export function back(
  step: number,
  trace: PasoTraza[] = [],
  oculto: Oculto = ninguno,
): number {
  let i = step - 1
  while (i > 0 && trace[i] && oculto(trace[i])) i--
  return Math.max(0, i)
}

export function shouldPause(
  trace: PasoTraza[],
  step: number,
  bps: ReadonlySet<number>,
): boolean {
  const e = trace[step]
  return !e || step >= trace.length - 1 || hitsBreakpoint(e, bps)
}
