import { esSalto } from './formato'
import type { InstruccionTAC } from './types'

export interface BloqueBasico {
  id: number
  inicio: number
  fin: number
  sucesores: number[]
  predecesores: number[]
}

export function bloquesBasicos(
  codigo: readonly InstruccionTAC[],
): BloqueBasico[] {
  if (codigo.length === 0) return []

  const lideres = new Set<number>([0])
  codigo.forEach((i, k) => {
    if (esSalto(i)) lideres.add(i.salto)
    if ((esSalto(i) || i.op === 'halt') && k + 1 < codigo.length)
      lideres.add(k + 1)
  })
  const inicios = [...lideres]
    .filter((k) => k < codigo.length)
    .sort((a, b) => a - b)

  const bloqueDe = new Map<number, number>()
  const bloques: BloqueBasico[] = inicios.map((inicio, id) => {
    bloqueDe.set(inicio, id)
    const fin = (inicios[id + 1] ?? codigo.length) - 1
    return { id, inicio, fin, sucesores: [], predecesores: [] }
  })

  for (const b of bloques) {
    const ultima = codigo[b.fin]
    const siguiente = b.id + 1 < bloques.length ? b.id + 1 : null
    const sigue = ultima.op !== 'goto' && ultima.op !== 'halt'
    const salto = esSalto(ultima) ? bloqueDe.get(ultima.salto) : undefined
    const destinos = [sigue ? siguiente : null, salto ?? null]
    for (const d of destinos)
      if (d !== null && !b.sucesores.includes(d)) b.sucesores.push(d)
  }
  for (const b of bloques)
    for (const s of b.sucesores) bloques[s].predecesores.push(b.id)
  return bloques
}

export function alcanzables(bloques: readonly BloqueBasico[]): Set<number> {
  const vistos = new Set<number>()
  const pendientes = bloques.length > 0 ? [0] : []
  while (pendientes.length > 0) {
    const b = pendientes.pop() as number
    if (vistos.has(b)) continue
    vistos.add(b)
    pendientes.push(...bloques[b].sucesores)
  }
  return vistos
}
