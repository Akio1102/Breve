import type { OpBinario, TipoDato } from './types'

export type OpAritmetico = '+' | '-' | '*' | '/'
export type OpComparacion = '>' | '<' | '>=' | '<=' | '==' | '!='

export const ENT_MAX = 2_147_483_647

export const TXT_MAX = 100_000

export const esComparacion = (op: OpBinario): op is OpComparacion =>
  ['>', '<', '>=', '<=', '==', '!='].includes(op)

export const esNumero = (t: TipoDato) => t === 'ent' || t === 'dec'

export const TABLA_ARITMETICA: Readonly<
  Record<TipoDato, Readonly<Record<TipoDato, TipoDato | null>>>
> = {
  ent: { ent: 'ent', dec: 'dec', txt: null, bool: null },
  dec: { ent: 'dec', dec: 'dec', txt: null, bool: null },
  txt: { ent: null, dec: null, txt: 'txt', bool: null },
  bool: { ent: null, dec: null, txt: null, bool: null },
}

export function tipoAritmetico(
  op: OpAritmetico,
  izq: TipoDato,
  der: TipoDato,
): TipoDato | null {
  const t = TABLA_ARITMETICA[izq][der]
  if (t === 'txt' && op !== '+') return null
  if (t === 'ent' && op === '/') return 'dec'
  return t
}

export function motivoAritmetico(
  op: OpAritmetico,
  izq: TipoDato,
  der: TipoDato,
): string {
  if (izq === 'bool' || der === 'bool')
    return 'no se puede operar con valores bool'
  if (izq === 'txt' && der === 'txt')
    return `con texto solo se puede usar '+' (concatenación)`
  if (op === '+') return 'no se puede sumar texto y número'
  return `'${op}' solo funciona con números`
}

export function comparacionValida(
  op: OpComparacion,
  izq: TipoDato,
  der: TipoDato,
): boolean {
  if (esNumero(izq) && esNumero(der)) return true
  return (op === '==' || op === '!=') && izq === der
}

export function motivoComparacion(op: OpComparacion): string {
  return op === '==' || op === '!='
    ? 'solo se comparan números entre sí, textos entre sí o bool entre sí'
    : `'${op}' solo compara números`
}

export function asignable(
  destino: TipoDato,
  origen: TipoDato,
): 'igual' | 'conversion' | null {
  if (destino === origen) return 'igual'
  if (destino === 'dec' && origen === 'ent') return 'conversion'
  return null
}
