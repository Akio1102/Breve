import { calcular, ErrorEjecucion, literal } from '@engine/ejecutor'
import { textoSalida, VALOR_POR_DEFECTO } from '@engine/formato'
import { type OpAritmetico, tipoAritmetico } from '@engine/tipos'
import { saltoDeTripleta } from '@engine/tripletas'
import type { Simbolo, TipoDato, Tripleta, Valor } from '@engine/types'

export interface SalidaTripletas {
  salida: string[]
  memoria: Record<string, Valor>
  error: string | null
}

const COMPARACIONES = new Set(['>', '<', '>=', '<=', '==', '!='])
const redondear = (v: number) => Number(v.toPrecision(15))

export function interpretarTripletas(
  tripletas: readonly Tripleta[],
  tabla: readonly Simbolo[],
  entrada: readonly string[],
  limite = 1_000_000,
): SalidaTripletas {
  const tipos = new Map(tabla.map((s) => [s.nombre, s.tipo]))
  const memoria: Record<string, Valor> = {}
  for (const s of tabla)
    if (s.categoria !== 'temporal')
      memoria[s.nombre] = VALOR_POR_DEFECTO[s.tipo]
  const resultados: Valor[] = []
  const tiposResultado: TipoDato[] = []
  const salida: string[] = []
  const valores = entrada.map((l) => l.trim())
  let leidos = 0

  const ref = (a: string) => {
    const m = /^\((\d+)\)$/.exec(a)
    return m ? Number(m[1]) : null
  }
  const valor = (a: string): Valor => {
    const k = ref(a)
    if (k !== null) {
      if (!(k in resultados)) throw new Error(`(${k}) todavía no se calculó`)
      return resultados[k]
    }
    const lit = literal(a)
    if (lit) return lit[0]
    return memoria[a] ?? VALOR_POR_DEFECTO[tipos.get(a) ?? 'ent']
  }
  const tipoDe = (a: string): TipoDato => {
    const k = ref(a)
    if (k !== null) return tiposResultado[k]
    const tipo = literal(a)?.[1] ?? tipos.get(a)
    if (!tipo) throw new Error(`'${a}' no tiene tipo`)
    return tipo
  }
  const leer = (nombre: string): Valor => {
    if (leidos >= valores.length)
      throw new ErrorEjecucion('entrada insuficiente')
    const texto = valores[leidos++]
    switch (tipos.get(nombre)) {
      case 'ent':
        return Number.parseInt(texto, 10)
      case 'dec':
        return redondear(Number.parseFloat(texto))
      case 'bool':
        return texto === 'verdadero'
      default:
        return texto
    }
  }

  let pc = 0
  let ejecutadas = 0
  try {
    while (pc < tripletas.length) {
      if (++ejecutadas > limite) throw new Error('límite del intérprete')
      const t = tripletas[pc]
      let siguiente = pc + 1
      switch (t.op) {
        case 'halt':
          siguiente = tripletas.length
          break
        case '=':
          memoria[t.arg1] = valor(t.arg2)
          break
        case 'read':
          memoria[t.arg1] = leer(t.arg1)
          break
        case 'write':
          salida.push(textoSalida(valor(t.arg1), tipoDe(t.arg1)))
          break
        case 'if':
        case 'ifFalse':
        case 'goto': {
          const destino = saltoDeTripleta(t) as number
          const salta =
            t.op === 'goto' || (valor(t.arg1) === true) === (t.op === 'if')
          if (salta) siguiente = destino
          break
        }
        default: {
          const tipo = COMPARACIONES.has(t.op)
            ? 'bool'
            : tipoAritmetico(
                t.op as OpAritmetico,
                tipoDe(t.arg1),
                tipoDe(t.arg2),
              )
          if (!tipo) throw new Error(`tipos inválidos en (${pc})`)
          resultados[pc] = calcular(t.op, valor(t.arg1), valor(t.arg2), tipo)
          tiposResultado[pc] = tipo
        }
      }
      pc = siguiente
    }
  } catch (e) {
    if (!(e instanceof ErrorEjecucion)) throw e
    return { salida, memoria, error: e.message }
  }
  return { salida, memoria, error: null }
}
