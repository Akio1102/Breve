import type { InstruccionTAC, Tripleta } from './types'

export interface ResultadoTripletas {
  tripletas: Tripleta[]
  origen: number[]
}

const ref = (k: number) => `(${k})`

export function aTripletas(
  codigo: readonly InstruccionTAC[],
  temporales?: ReadonlySet<string>,
): Tripleta[] {
  return tripletasConOrigen(codigo, temporales).tripletas
}

export function tripletasConOrigen(
  codigo: readonly InstruccionTAC[],
  temporales?: ReadonlySet<string>,
): ResultadoTripletas {
  const esTemporal = (nombre: string) => temporales?.has(nombre) ?? true
  const primera: number[] = []
  let n = 0
  for (const i of codigo) {
    primera.push(n)
    n += (i.op === 'bin' && !esTemporal(i.destino)) || i.op === 'ifCmp' ? 2 : 1
  }

  const calcula = new Map<string, number>()
  const arg = (s: string) => {
    const k = calcula.get(s)
    return k === undefined ? s : ref(k)
  }
  const salto = (destino: number) => ref(primera[destino] ?? n)

  const tripletas: Tripleta[] = []
  const origen: number[] = []
  const emitir = (k: number, op: string, arg1 = '', arg2 = '') => {
    tripletas.push({ op, arg1, arg2 })
    origen.push(k)
    return tripletas.length - 1
  }

  codigo.forEach((i, k) => {
    switch (i.op) {
      case 'bin': {
        const t = emitir(k, i.operador, arg(i.izq), arg(i.der))
        if (esTemporal(i.destino)) calcula.set(i.destino, t)
        else {
          emitir(k, '=', i.destino, ref(t))
          calcula.delete(i.destino)
        }
        return
      }
      case 'asig':
        emitir(k, '=', i.destino, arg(i.origen))
        calcula.delete(i.destino)
        return
      case 'read':
        emitir(k, 'read', i.destino)
        calcula.delete(i.destino)
        return
      case 'write':
        emitir(k, 'write', arg(i.origen))
        return
      case 'if':
      case 'ifFalse':
        emitir(k, i.op, arg(i.condicion), salto(i.salto))
        return
      case 'ifCmp': {
        const t = emitir(k, i.operador, arg(i.izq), arg(i.der))
        emitir(k, 'if', ref(t), salto(i.salto))
        return
      }
      case 'goto':
        emitir(k, 'goto', salto(i.salto))
        return
      case 'halt':
        emitir(k, 'halt')
    }
  })
  return { tripletas, origen }
}

export function saltoDeTripleta(t: Tripleta): number | null {
  const destino =
    t.op === 'goto' ? t.arg1 : t.op === 'if' || t.op === 'ifFalse' ? t.arg2 : ''
  const m = /^\((\d+)\)$/.exec(destino)
  return m ? Number(m[1]) : null
}

export function destinosDeTripletas(
  tripletas: readonly Tripleta[],
): Set<number> {
  const out = new Set<number>()
  for (const t of tripletas) {
    const d = saltoDeTripleta(t)
    if (d !== null) out.add(d)
  }
  return out
}
