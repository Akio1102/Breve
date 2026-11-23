import { redondear, textoSalida, VALOR_POR_DEFECTO } from './formato'
import { ENT_MAX, TXT_MAX } from './tipos'
import type {
  Cuadrupla,
  InstruccionTAC,
  ResultadoCompilacion,
  ResultadoEjecucion,
  Simbolo,
  TipoDato,
  TrazaEjecucion,
  Valor,
} from './types'

export const trazaVacia = (): TrazaEjecucion => ({
  pc: [],
  escrituras: { paso: [], nombre: [], valor: [] },
  salida: [],
})

export const MAX_INSTRUCCIONES = 100_000
export const ENT_MIN = -ENT_MAX - 1

export type Programa = Pick<
  ResultadoCompilacion,
  'cuadruplas' | 'tresDirecciones' | 'tablaSimbolos'
>

export class ErrorEjecucion extends Error {}

class LimiteAlcanzado extends ErrorEjecucion {}

const fallar = (mensaje: string): never => {
  throw new ErrorEjecucion(mensaje)
}

const miles = (n: number) => String(n).replace(/\B(?=(\d{3})+$)/g, ' ')

const sinCeroNegativo = (v: number) => (v === 0 ? 0 : v)

function convertir(texto: string, tipo: TipoDato): Valor | undefined {
  switch (tipo) {
    case 'txt':
      return texto
    case 'bool':
      return texto === 'verdadero'
        ? true
        : texto === 'falso'
          ? false
          : undefined
    case 'ent': {
      if (!/^[+-]?\d+$/.test(texto)) return undefined
      const v = sinCeroNegativo(Number.parseInt(texto, 10))
      return v >= ENT_MIN && v <= ENT_MAX ? v : undefined
    }
    case 'dec': {
      if (!/^[+-]?\d+(\.\d+)?$/.test(texto)) return undefined
      const v = sinCeroNegativo(Number.parseFloat(texto))
      return Number.isFinite(v) ? v : undefined
    }
  }
}

const esNumeroBienEscrito = (texto: string, tipo: TipoDato) =>
  (tipo === 'ent' && /^[+-]?\d+$/.test(texto)) ||
  (tipo === 'dec' && /^[+-]?\d+(\.\d+)?$/.test(texto))

export function literal(a: string): [Valor, TipoDato] | undefined {
  if (a.startsWith('"')) return [a.slice(1, -1), 'txt']
  if (a === 'verdadero') return [true, 'bool']
  if (a === 'falso') return [false, 'bool']
  if (/^-?\d/.test(a))
    return a.includes('.') ? [Number(a), 'dec'] : [Number(a), 'ent']
  return undefined
}

function aritmetica(
  a: number,
  b: number,
  f: (x: number, y: number) => number,
  tipo: TipoDato | undefined,
): number {
  const v = sinCeroNegativo(f(a, b))
  if (tipo !== 'ent') {
    if (!Number.isFinite(v))
      fallar('desbordamiento de dec: el resultado no cabe en 8 bytes')
    return v
  }
  if (v > ENT_MAX || v < ENT_MIN)
    fallar(
      `desbordamiento de ent: el resultado ${v} no cabe en 4 bytes (de ${ENT_MIN} a ${ENT_MAX})`,
    )
  return v
}

const igualesValores = (a: Valor, b: Valor) =>
  typeof a === 'number' && typeof b === 'number'
    ? redondear(a) === redondear(b)
    : a === b

function concatenar(a: string, b: string): string {
  const largo = a.length + b.length
  if (largo > TXT_MAX)
    fallar(
      `desbordamiento de txt: el texto tendría ${miles(largo)} caracteres (máximo ${miles(TXT_MAX)})`,
    )
  return a + b
}

export function calcular(
  op: string,
  a: Valor,
  b: Valor,
  tipo: TipoDato | undefined,
): Valor {
  switch (op) {
    case '+':
      if (typeof a === 'string') return concatenar(a, String(b))
      return aritmetica(a as number, b as number, (x, y) => x + y, tipo)
    case '-':
      return aritmetica(a as number, b as number, (x, y) => x - y, tipo)
    case '*':
      return aritmetica(a as number, b as number, (x, y) => x * y, tipo)
    case '/':
      if (b === 0) fallar('división entre cero')
      return aritmetica(a as number, b as number, (x, y) => x / y, tipo)
    case '>':
      return redondear(a as number) > redondear(b as number)
    case '<':
      return redondear(a as number) < redondear(b as number)
    case '>=':
      return redondear(a as number) >= redondear(b as number)
    case '<=':
      return redondear(a as number) <= redondear(b as number)
    case '==':
      return igualesValores(a, b)
    case '!=':
      return !igualesValores(a, b)
    default:
      return fallar(`operación desconocida '${op}'`)
  }
}

const describirTipo: Record<TipoDato, string> = {
  ent: 'ent (un entero, p. ej. 5 o -3)',
  dec: 'dec (un número, p. ej. 2.5)',
  txt: 'txt',
  bool: 'bool (verdadero o falso)',
}

export function ejecutar(
  programa: Programa,
  entrada: readonly string[],
): ResultadoEjecucion {
  const { cuadruplas, tresDirecciones } = programa
  const tipos = new Map<string, TipoDato>(
    programa.tablaSimbolos.map((s: Simbolo) => [s.nombre, s.tipo]),
  )
  const memoria: Record<string, Valor> = {}
  for (const s of programa.tablaSimbolos)
    if (s.categoria !== 'temporal')
      memoria[s.nombre] = VALOR_POR_DEFECTO[s.tipo]

  const valores = entrada.map((l) => l.trim())
  while (valores.length > 0 && valores.at(-1) === '') valores.pop()
  const lecturas = cuadruplas.filter((c) => c.op === 'read').length

  const salida: string[] = []
  let leidos = 0
  let pc = 0
  let ejecutadas = 0
  const traza = trazaVacia()
  const escribir = (nombre: string, v: Valor) => {
    memoria[nombre] = v
    traza.escrituras.paso.push(ejecutadas - 1)
    traza.escrituras.nombre.push(nombre)
    traza.escrituras.valor.push(v)
  }

  const literales = new Map<string, [Valor, TipoDato]>()
  for (const c of cuadruplas)
    for (const a of [c.arg1, c.arg2]) {
      const lit = literal(a)
      if (lit) literales.set(a, lit)
    }

  const valor = (a: string): Valor =>
    literales.get(a)?.[0] ??
    memoria[a] ??
    VALOR_POR_DEFECTO[tipos.get(a) ?? 'ent']
  const tipoDe = (a: string): TipoDato | undefined =>
    literales.get(a)?.[1] ?? tipos.get(a)

  const operar = (c: Cuadrupla): Valor =>
    calcular(c.op, valor(c.arg1), valor(c.arg2), tipos.get(c.resultado))

  function leer(destino: string) {
    if (leidos >= valores.length)
      fallar(
        `entrada insuficiente: no hay un valor para '${destino}' (se leyeron ${leidos} de ${Math.max(lecturas, leidos + 1)})`,
      )
    const texto = valores[leidos++]
    const tipo = tipos.get(destino) ?? 'txt'
    if (tipo === 'txt' && texto.length > TXT_MAX)
      fallar(
        `entrada fuera de rango: el texto para '${destino}' tiene ${miles(texto.length)} caracteres (máximo ${miles(TXT_MAX)})`,
      )
    const v = convertir(texto, tipo)
    if (v === undefined && esNumeroBienEscrito(texto, tipo))
      fallar(
        tipo === 'ent'
          ? `entrada fuera de rango '${texto}': '${destino}' es ent (de ${ENT_MIN} a ${ENT_MAX})`
          : `entrada fuera de rango '${texto}': no cabe en un dec`,
      )
    if (v === undefined)
      fallar(
        `entrada inválida '${texto}': '${destino}' es de tipo ${describirTipo[tipo]}`,
      )
    escribir(destino, v as Valor)
  }

  try {
    while (pc < cuadruplas.length) {
      if (ejecutadas >= MAX_INSTRUCCIONES)
        throw new LimiteAlcanzado(
          `se superó el límite de ${miles(MAX_INSTRUCCIONES)} instrucciones ejecutadas (¿un rep con demasiadas vueltas?)`,
        )
      const c = cuadruplas[pc]
      ejecutadas++
      traza.pc.push(pc)
      let siguiente = pc + 1
      switch (c.op) {
        case 'halt':
          siguiente = cuadruplas.length
          break
        case '=': {
          escribir(c.resultado, valor(c.arg1))
          break
        }
        case 'read':
          leer(c.resultado)
          break
        case 'write':
          salida.push(textoSalida(valor(c.arg1), tipoDe(c.arg1)))
          traza.salida.push(ejecutadas - 1)
          break
        case 'if':
          if (valor(c.arg1) === true) siguiente = Number(c.resultado)
          break
        case 'ifFalse':
          if (valor(c.arg1) !== true) siguiente = Number(c.resultado)
          break
        case 'if>':
        case 'if<':
        case 'if>=':
        case 'if<=':
        case 'if==':
        case 'if!=':
          if (calcular(c.op.slice(2), valor(c.arg1), valor(c.arg2), 'bool'))
            siguiente = Number(c.resultado)
          break
        case 'goto':
          siguiente = Number(c.resultado)
          break
        default:
          escribir(c.resultado, operar(c))
      }
      pc = siguiente
    }
  } catch (e) {
    if (!(e instanceof ErrorEjecucion)) throw e
    const tac: InstruccionTAC | undefined = tresDirecciones[pc]
    return {
      ok: false,
      salida,
      memoria,
      instrucciones: ejecutadas,
      limiteAlcanzado: e instanceof LimiteAlcanzado,
      traza,
      error: {
        fase: 'ejecucion',
        cuadrupla: pc,
        linea: tac?.linea ?? 1,
        columna: tac?.columna ?? 1,
        largo: tac?.largo ?? 1,
        mensaje: e.message,
      },
    }
  }

  return {
    ok: true,
    salida,
    memoria,
    instrucciones: ejecutadas,
    limiteAlcanzado: false,
    error: null,
    traza,
  }
}
