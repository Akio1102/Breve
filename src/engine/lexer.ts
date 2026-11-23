import { RESERVADAS } from './lenguaje'
import type { Diagnostico, TipoToken, Token, Valor } from './types'

export const ER: Readonly<Partial<Record<TipoToken, RegExp>>> = {
  ID: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  DECIMAL: /^[0-9]+\.[0-9]+$/,
  ENTERO: /^[0-9]+$/,
  CADENA: /^"[^"\n\r]*"$/,
  COMP: /^(>=|<=|==|!=|>|<)$/,
  IGUAL: /^=$/,
  COMA: /^,$/,
  MAS: /^\+$/,
  MENOS: /^-$/,
  POR: /^\*$/,
  ENTRE: /^\/$/,
  PAR_ABRE: /^\($/,
  PAR_CIERRA: /^\)$/,
  SALTO: /^\n+$/,
}

export type Clase =
  | 'letra'
  | 'digito'
  | 'guion_bajo'
  | 'punto'
  | 'comilla'
  | 'salto'
  | 'otro'

export function claseDe(ch: string): Clase {
  if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) return 'letra'
  if (ch >= '0' && ch <= '9') return 'digito'
  if (ch === '_') return 'guion_bajo'
  if (ch === '.') return 'punto'
  if (ch === '"') return 'comilla'
  if (ch === '\n' || ch === '\r') return 'salto'
  return 'otro'
}

export interface AFD {
  nombre: string
  inicial: string
  aceptacion: Readonly<Record<string, TipoToken>>
  transiciones: Readonly<Record<string, Partial<Record<Clase, string>>>>
}

const todasMenos = (excluidas: Clase[], destino: string) =>
  Object.fromEntries(
    (
      [
        'letra',
        'digito',
        'guion_bajo',
        'punto',
        'comilla',
        'salto',
        'otro',
      ] as Clase[]
    )
      .filter((c) => !excluidas.includes(c))
      .map((c) => [c, destino]),
  ) as Partial<Record<Clase, string>>

export const AFD_ID: AFD = {
  nombre: 'Identificadores',
  inicial: 'q0',
  aceptacion: { q1: 'ID' },
  transiciones: {
    q0: { letra: 'q1' },
    q1: { letra: 'q1', digito: 'q1', guion_bajo: 'q1' },
  },
}

export const AFD_NUMERO: AFD = {
  nombre: 'Números',
  inicial: 'q0',
  aceptacion: { q1: 'ENTERO', q3: 'DECIMAL' },
  transiciones: {
    q0: { digito: 'q1' },
    q1: { digito: 'q1', punto: 'q2' },
    q2: { digito: 'q3' },
    q3: { digito: 'q3' },
  },
}

export const AFD_CADENA: AFD = {
  nombre: 'Cadenas',
  inicial: 'q0',
  aceptacion: { q2: 'CADENA' },
  transiciones: {
    q0: { comilla: 'q1' },
    q1: { ...todasMenos(['comilla', 'salto'], 'q1'), comilla: 'q2' },
    q2: {},
  },
}

export const AUTOMATAS: readonly AFD[] = [AFD_ID, AFD_NUMERO, AFD_CADENA]

interface Recorrido {
  estado: string
  largo: number
  aceptado: { tipo: TipoToken; largo: number } | null
}

export function recorrer(afd: AFD, fuente: string, inicio: number): Recorrido {
  let estado = afd.inicial
  let i = inicio
  let aceptado: Recorrido['aceptado'] = null
  while (i < fuente.length) {
    const sig = afd.transiciones[estado]?.[claseDe(fuente[i])]
    if (!sig) break
    estado = sig
    i++
    const tipo = afd.aceptacion[estado]
    if (tipo) aceptado = { tipo, largo: i - inicio }
  }
  return { estado, largo: i - inicio, aceptado }
}

const SIMBOLOS: [string, TipoToken][] = [
  ['>=', 'COMP'],
  ['<=', 'COMP'],
  ['==', 'COMP'],
  ['!=', 'COMP'],
  ['>', 'COMP'],
  ['<', 'COMP'],
  ['=', 'IGUAL'],
  [',', 'COMA'],
  ['+', 'MAS'],
  ['-', 'MENOS'],
  ['*', 'POR'],
  ['/', 'ENTRE'],
  ['(', 'PAR_ABRE'],
  [')', 'PAR_CIERRA'],
]

export interface ResultadoLexico {
  tokens: Token[]
  errores: Diagnostico[]
}

function valorToken(tipo: TipoToken, lexema: string): Valor | undefined {
  if (tipo === 'ENTERO') return Number.parseInt(lexema, 10)
  if (tipo === 'DECIMAL') return Number.parseFloat(lexema)
  if (tipo === 'CADENA') return lexema.slice(1, -1)
  if (tipo === 'VERDADERO') return true
  if (tipo === 'FALSO') return false
  return undefined
}

const ancho = (texto: string) => anchoEntre(texto, 0, texto.length)

function anchoEntre(fuente: string, desde: number, hasta: number): number {
  let n = hasta - desde
  for (let k = desde; k < hasta; k++) {
    const c = fuente.charCodeAt(k)
    if (c >= 0xd800 && c <= 0xdbff && k + 1 < hasta) {
      const d = fuente.charCodeAt(k + 1)
      if (d >= 0xdc00 && d <= 0xdfff) {
        n--
        k++
      }
    }
  }
  return n
}

export function analizarLexico(fuente: string): ResultadoLexico {
  const tokens: Token[] = []
  const errores: Diagnostico[] = []
  let i = 0
  let linea = 1
  let columna = 1

  const emitir = (tipo: TipoToken, lexema: string) => {
    const valor = valorToken(tipo, lexema)
    const token: Token = { tipo, lexema, linea, columna }
    if (valor !== undefined) token.valor = valor
    tokens.push(token)
  }
  const error = (mensaje: string, lexema: string) => {
    errores.push({
      fase: 'lexico',
      linea,
      columna,
      largo: Math.max(1, ancho(lexema)),
      mensaje,
    })
  }
  const avanzar = (n: number) => {
    columna += anchoEntre(fuente, i, i + n)
    i += n
  }

  while (i < fuente.length) {
    const ch = fuente[i]

    if (
      ch === ' ' ||
      ch === '\t' ||
      (ch === '\r' && fuente[i + 1] === '\n') ||
      (ch === '\uFEFF' && i === 0)
    ) {
      avanzar(1)
      continue
    }

    if (ch === '\n' || ch === '\r') {
      const ultimo = tokens.at(-1)
      if (ultimo?.tipo === 'SALTO') ultimo.lexema += '\n'
      else emitir('SALTO', '\n')
      i++
      linea++
      columna = 1
      continue
    }

    if (fuente.startsWith('//', i)) {
      let fin = i
      while (fin < fuente.length && claseDe(fuente[fin]) !== 'salto') fin++
      avanzar(fin - i)
      continue
    }

    const clase = claseDe(ch)

    if (clase === 'letra') {
      const { aceptado } = recorrer(AFD_ID, fuente, i)
      const lexema = fuente.slice(i, i + (aceptado?.largo ?? 1))
      emitir(RESERVADAS.get(lexema) ?? 'ID', lexema)
      avanzar(lexema.length)
      continue
    }

    if (clase === 'guion_bajo') {
      let fin = i + 1
      while (fin < fuente.length && /[a-zA-Z0-9_]/.test(fuente[fin])) fin++
      const lexema = fuente.slice(i, fin)
      error(
        `identificador no válido '${lexema}': no puede empezar por '_'`,
        lexema,
      )
      avanzar(lexema.length)
      continue
    }

    if (clase === 'digito') {
      const r = recorrer(AFD_NUMERO, fuente, i)
      if (r.estado === 'q2') {
        const lexema = fuente.slice(i, i + r.largo)
        error(
          `número mal formado '${lexema}': se esperaba un dígito después del punto`,
          lexema,
        )
        avanzar(r.largo)
        continue
      }
      const lexema = fuente.slice(i, i + r.largo)
      emitir(AFD_NUMERO.aceptacion[r.estado], lexema)
      avanzar(lexema.length)
      continue
    }

    if (clase === 'comilla') {
      const r = recorrer(AFD_CADENA, fuente, i)
      const lexema = fuente.slice(i, i + r.largo)
      if (r.aceptado) emitir('CADENA', lexema)
      else error('cadena sin cerrar: falta la comilla final (")', lexema)
      avanzar(r.largo)
      continue
    }

    const simbolo = SIMBOLOS.find(([s]) => fuente.startsWith(s, i))
    if (simbolo) {
      emitir(simbolo[1], simbolo[0])
      avanzar(simbolo[0].length)
      continue
    }

    const cp = String.fromCodePoint(fuente.codePointAt(i) ?? 0)
    error(`carácter no válido '${cp}'`, cp)
    avanzar(cp.length)
  }

  return { tokens, errores }
}
