import type { PasoTraza, TipoDato, Valor } from '@engine/types'

export interface Historia {
  pasos: number[]
  valores: Valor[]
  tipo: TipoDato | null
}

export function historia(
  trace: readonly PasoTraza[],
  nombre: string,
): Historia {
  const h: Historia = { pasos: [], valores: [], tipo: null }
  trace.forEach((p, k) => {
    for (const s of p.cambios) {
      if (s.nombre !== nombre) continue
      h.tipo = s.tipo
      if (h.valores.length === 0 || h.valores.at(-1) !== s.valor) {
        h.pasos.push(k)
        h.valores.push(s.valor)
      }
    }
  })
  return h
}

export function cambiosHasta(h: Historia, k: number): number {
  let lo = 0
  let hi = h.pasos.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (h.pasos[mid] <= k) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function puntos(valores: readonly number[], max = 200): string {
  if (valores.length < 2) return ''
  const paso = Math.max(1, Math.ceil(valores.length / max))
  const usados = valores.filter(
    (_, i) => i % paso === 0 || i === valores.length - 1,
  )
  const min = Math.min(...usados)
  const rango = Math.max(...usados) - min || 1
  return usados
    .map(
      (v, i) =>
        `${((i / (usados.length - 1)) * 100).toFixed(2)},${(20 - ((v - min) / rango) * 18 - 1).toFixed(2)}`,
    )
    .join(' ')
}
