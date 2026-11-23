import type { PasoTraza, Simbolo } from '@engine/types'

export type VarChange = 'new' | 'changed' | null

export interface SimboloView {
  simbolo: Simbolo
  change: VarChange
}

export function simbolosView(
  cur: PasoTraza | undefined,
  prev: PasoTraza | undefined,
): SimboloView[] {
  if (!cur) return []
  const before = new Map((prev?.simbolos ?? []).map((s) => [s.nombre, s]))
  return cur.simbolos.map((simbolo) => {
    let change: VarChange = null
    if (prev) {
      const old = before.get(simbolo.nombre)
      if (!old) change = 'new'
      else if (old.valor !== simbolo.valor) change = 'changed'
    }
    return { simbolo, change }
  })
}

export function outputText(salida: readonly string[], lineas?: number): string {
  return salida
    .slice(0, lineas)
    .map((l) => `${l}\n`)
    .join('')
}

export const EMPTY: readonly never[] = Object.freeze([])
