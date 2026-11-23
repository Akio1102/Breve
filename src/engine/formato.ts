import type { InstruccionTAC, Simbolo, TipoDato, Token, Valor } from './types'

export const TAMANO: Record<TipoDato, number> = {
  ent: 4,
  dec: 8,
  txt: 4,
  bool: 1,
}

export const VALOR_POR_DEFECTO: Record<TipoDato, Valor> = {
  ent: 0,
  dec: 0,
  txt: '',
  bool: false,
}

export const redondear = (v: number) => Number(v.toPrecision(15))

export function formatValor(v: Valor, tipo?: TipoDato): string {
  if (typeof v === 'boolean') return v ? 'verdadero' : 'falso'
  if (typeof v === 'string') return `"${v}"`
  const n = redondear(v) === 0 ? 0 : redondear(v)
  if (tipo === 'dec' && Number.isInteger(n)) return n.toFixed(1)
  return String(n)
}

export function textoSalida(v: Valor, tipo?: TipoDato): string {
  return typeof v === 'string' ? v : formatValor(v, tipo)
}

export function formatSimbolo(s: Simbolo): string {
  return formatValor(s.valor, s.tipo)
}

export function tokenText(t: Token): string {
  return t.tipo === 'SALTO' ? '↵' : t.lexema
}

export function formatTAC(i: InstruccionTAC): string {
  switch (i.op) {
    case 'asig':
      return `${i.destino} = ${i.origen}`
    case 'bin':
      return `${i.destino} = ${i.izq} ${i.operador} ${i.der}`
    case 'read':
      return `read ${i.destino}`
    case 'write':
      return `write ${i.origen}`
    case 'if':
      return `if ${i.condicion} goto ${i.salto}`
    case 'ifFalse':
      return `ifFalse ${i.condicion} goto ${i.salto}`
    case 'ifCmp':
      return `if ${i.izq} ${i.operador} ${i.der} goto ${i.salto}`
    case 'goto':
      return `goto ${i.salto}`
    case 'halt':
      return 'halt'
  }
}

export const campo = (s: string) => s || '–'

export const esSalto = (
  i: InstruccionTAC,
): i is Extract<InstruccionTAC, { salto: number }> =>
  i.op === 'if' || i.op === 'ifFalse' || i.op === 'ifCmp' || i.op === 'goto'

export const esSaltoCondicional = (i: InstruccionTAC) =>
  i.op === 'if' || i.op === 'ifFalse' || i.op === 'ifCmp'

export function destinosDeSalto(
  codigo: readonly InstruccionTAC[],
): Set<number> {
  const out = new Set<number>()
  for (const i of codigo) if (esSalto(i)) out.add(i.salto)
  return out
}

export function nombresTemporales(tabla: readonly Simbolo[]): Set<string> {
  return new Set(
    tabla
      .filter((s) => s.categoria === 'temporal' && /^t\d+$/.test(s.nombre))
      .map((s) => s.nombre),
  )
}
