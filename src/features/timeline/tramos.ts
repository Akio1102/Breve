import type { PasoTraza } from '@engine/types'

export interface Tramo {
  desde: number
  hasta: number
  linea: number
  vuelta?: number
  vueltas?: number
}

const MAX_TRAMOS = 120

export function tramos(trace: readonly PasoTraza[]): Tramo[] {
  const armar = (conVueltas: boolean) => {
    const out: Tramo[] = []
    trace.forEach((p, i) => {
      const u = out.at(-1)
      const vuelta = conVueltas ? p.vuelta : undefined
      if (u && trace[u.desde].instr === p.instr && u.vuelta === vuelta)
        u.hasta = i
      else
        out.push({
          desde: i,
          hasta: i,
          linea: p.linea,
          ...(vuelta === undefined ? {} : { vuelta, vueltas: p.vueltas }),
        })
    })
    return out
  }
  const todos = armar(true)
  if (todos.length <= MAX_TRAMOS) return todos
  const porLinea = armar(false)
  return porLinea.length <= MAX_TRAMOS ? porLinea : []
}
