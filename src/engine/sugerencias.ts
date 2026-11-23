import { RESERVADAS } from './lenguaje'
import type { TipoDato } from './types'

export function distancia(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  let ante = new Array<number>(n + 1).fill(0)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const fila = [i]
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1
      let d = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + costo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d = Math.min(d, ante[j - 2] + 1)
      fila.push(d)
    }
    ante = prev
    prev = fila
  }
  return prev[n]
}

const tolerancia = (largo: number) => (largo <= 2 ? 0 : largo <= 5 ? 1 : 2)

export function masParecida(
  palabra: string,
  candidatas: Iterable<string>,
): string | null {
  const minuscula = palabra.toLowerCase()
  let mejor: string | null = null
  let mejorD = Number.POSITIVE_INFINITY
  let empate = false
  for (const c of candidatas) {
    if (c === palabra) continue
    if (c.toLowerCase() === minuscula) return c
    const d = distancia(minuscula, c.toLowerCase())
    if (d > tolerancia(Math.min(palabra.length, c.length))) continue
    if (d < mejorD) {
      mejor = c
      mejorD = d
      empate = false
    } else if (d === mejorD) empate = true
  }
  return empate ? null : mejor
}

const INICIOS = ['va', 'cn', 'lee', 'di', 'si', 'rep']

const TIPOS_DE_OTROS: Readonly<Record<string, TipoDato>> = {
  int: 'ent',
  integer: 'ent',
  entero: 'ent',
  float: 'dec',
  double: 'dec',
  real: 'dec',
  decimal: 'dec',
  string: 'txt',
  str: 'txt',
  texto: 'txt',
  cadena: 'txt',
  boolean: 'bool',
  booleano: 'bool',
}

const TIPOS: TipoDato[] = ['ent', 'dec', 'txt', 'bool']

export const quisoDecir = (s: string | null) =>
  s ? `; ¿quisiste decir '${s}'?` : ''

export const instruccionParecida = (palabra: string) =>
  masParecida(palabra, INICIOS)

export function tipoParecido(palabra: string): TipoDato | null {
  return TIPOS_DE_OTROS[palabra.toLowerCase()] ?? masParecida(palabra, TIPOS)
}

export function identificadorParecido(
  nombre: string,
  declarados: Iterable<string>,
): string | null {
  const reservada = nombre.toLowerCase()
  if (RESERVADAS.has(reservada) && reservada !== nombre) return reservada
  return masParecida(nombre, declarados)
}
