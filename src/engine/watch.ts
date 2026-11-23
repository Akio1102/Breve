import { formatSimbolo } from './formato'
import type { PasoTraza, TipoDato } from './types'

export type WatchResult =
  | { ok: true; value: string; type: TipoDato }
  | { ok: false; error: 'noStep' | 'onlyNames' | 'undeclared' }

export function evaluateWatch(
  expression: string,
  paso: PasoTraza | undefined,
): WatchResult {
  if (!paso) return { ok: false, error: 'noStep' }
  const nombre = expression.trim()
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nombre))
    return { ok: false, error: 'onlyNames' }
  const s = paso.simbolos.find((x) => x.nombre === nombre)
  if (!s) return { ok: false, error: 'undeclared' }
  return { ok: true, value: formatSimbolo(s), type: s.tipo }
}
