import { alcanzables, bloquesBasicos } from './bloques'
import { calcular, literal } from './ejecutor'
import {
  esSalto,
  esSaltoCondicional,
  nombresTemporales,
  VALOR_POR_DEFECTO,
} from './formato'
import type {
  IdPasada,
  InstruccionTAC,
  OpComparacionTAC,
  Simbolo,
  TipoDato,
  Valor,
} from './types'

export type { IdPasada }

export const PASADAS: readonly IdPasada[] = [
  'O2',
  'O3',
  'O4',
  'O5',
  'O6',
  'O7',
  'O8',
  'G1',
  'G2',
  'G3',
  'G4',
]

export interface ResultadoOptimizacion {
  tresDirecciones: InstruccionTAC[]
  cambios: Record<IdPasada, number>
  rondas: number
}

const MAX_RONDAS = 50

export const PRESUPUESTO_FLUJO = 50_000

const MAX_BARRIDOS = 50

export function optimizar(
  codigo: readonly InstruccionTAC[],
  tabla: readonly Simbolo[],
): ResultadoOptimizacion {
  const o = new Optimizador(tabla)
  let cod = o.desenrollar(codigo.map((i) => ({ ...i })))
  let rondas = 0
  while (rondas < MAX_RONDAS) {
    rondas++
    const antes = o.total()
    cod = compactar(o.constantes(cod))
    cod = compactar(o.algebraica(cod))
    cod = compactar(o.locales(cod))
    cod = compactar(o.unirCopias(cod))
    cod = compactar(o.compararYSaltar(cod))
    cod = compactar(o.saltos(cod))
    cod = compactar(o.invertirCiclos(cod))
    cod = o.sacarInvariantes(cod)
    cod = compactar(o.muerto(cod))
    if (o.total() === antes) break
  }
  o.reutilizar(cod)
  return { tresDirecciones: cod, cambios: o.cambios, rondas }
}

type Codigo = (InstruccionTAC | null)[]

function compactar(cod: Codigo): InstruccionTAC[] {
  if (!cod.includes(null)) return cod as InstruccionTAC[]
  const nueva: number[] = []
  let n = 0
  for (const i of cod) {
    nueva.push(n)
    if (i) n++
  }
  nueva.push(n)
  const out: InstruccionTAC[] = []
  for (const i of cod) {
    if (!i) continue
    out.push(
      esSalto(i) && nueva[i.salto] !== i.salto
        ? { ...i, salto: nueva[i.salto] }
        : i,
    )
  }
  return out
}

function usos(i: InstruccionTAC): string[] {
  switch (i.op) {
    case 'asig':
      return [i.origen]
    case 'bin':
      return [i.izq, i.der]
    case 'write':
      return [i.origen]
    case 'if':
    case 'ifFalse':
      return [i.condicion]
    case 'ifCmp':
      return [i.izq, i.der]
    default:
      return []
  }
}

function paraCadaUso(i: InstruccionTAC, f: (a: string) => void) {
  switch (i.op) {
    case 'asig':
    case 'write':
      f(i.origen)
      return
    case 'bin':
    case 'ifCmp':
      f(i.izq)
      f(i.der)
      return
    case 'if':
    case 'ifFalse':
      f(i.condicion)
  }
}

function mapearUsos(
  i: InstruccionTAC,
  f: (a: string) => string,
): InstruccionTAC {
  switch (i.op) {
    case 'asig':
    case 'write': {
      const origen = f(i.origen)
      return origen === i.origen ? i : { ...i, origen }
    }
    case 'bin': {
      const izq = f(i.izq)
      const der = f(i.der)
      return izq === i.izq && der === i.der ? i : { ...i, izq, der }
    }
    case 'if':
    case 'ifFalse': {
      const condicion = f(i.condicion)
      return condicion === i.condicion ? i : { ...i, condicion }
    }
    case 'ifCmp': {
      const izq = f(i.izq)
      const der = f(i.der)
      return izq === i.izq && der === i.der ? i : { ...i, izq, der }
    }
    default:
      return i
  }
}

function destino(i: InstruccionTAC): string | undefined {
  return i.op === 'asig' || i.op === 'bin' || i.op === 'read'
    ? i.destino
    : undefined
}

const esLiteral = (a: string) => {
  const c = a.charCodeAt(0)
  if (c === 34 || (c >= 48 && c <= 57)) return true
  if (c === 45) {
    const d = a.charCodeAt(1)
    return d >= 48 && d <= 57
  }
  return a === 'verdadero' || a === 'falso'
}
const COMPARACIONES = new Set(['>', '<', '>=', '<=', '==', '!='])

const NEGAR: Record<OpComparacionTAC, OpComparacionTAC> = {
  '>': '<=',
  '<=': '>',
  '<': '>=',
  '>=': '<',
  '==': '!=',
  '!=': '==',
}

export const DESENROLLAR_HASTA = 8

export function comoLiteral(v: Valor, tipo: TipoDato): string | null {
  switch (tipo) {
    case 'bool':
      return typeof v === 'boolean' ? (v ? 'verdadero' : 'falso') : null
    case 'txt':
      return typeof v === 'string' && !/["\n\r]/.test(v) ? `"${v}"` : null
    case 'ent': {
      const s = String(v)
      return typeof v === 'number' && /^-?\d+$/.test(s) ? s : null
    }
    case 'dec': {
      if (typeof v !== 'number') return null
      const s = Number.isInteger(v) ? v.toFixed(1) : String(v)
      return /^-?\d+\.\d+$/.test(s) ? s : null
    }
  }
}

const NAC = Symbol('no constante')
type Estado = Map<string, Valor | typeof NAC>

function encuentro(a: Estado, b: Estado): Estado {
  const r: Estado = new Map(a)
  for (const [k, vb] of b) {
    const va = r.get(k)
    if (va === undefined) r.set(k, vb)
    else if (va !== vb) r.set(k, NAC)
  }
  return r
}

function igualesEstados(a: Estado, b: Estado): boolean {
  if (a.size !== b.size) return false
  for (const [k, v] of a) if (b.get(k) !== v) return false
  return true
}

class Optimizador {
  readonly cambios: Record<IdPasada, number> = {
    O2: 0,
    O3: 0,
    O4: 0,
    O5: 0,
    O6: 0,
    O7: 0,
    O8: 0,
    G1: 0,
    G2: 0,
    G3: 0,
    G4: 0,
  }
  private readonly tipos = new Map<string, TipoDato>()
  private readonly temporales: ReadonlySet<string>
  private readonly inicial: Estado = new Map()

  constructor(tabla: readonly Simbolo[]) {
    this.temporales = nombresTemporales(tabla)
    for (const s of tabla) {
      this.tipos.set(s.nombre, s.tipo)
      if (s.categoria !== 'temporal')
        this.inicial.set(s.nombre, VALOR_POR_DEFECTO[s.tipo])
    }
  }

  total(): number {
    return Object.values(this.cambios).reduce((a, b) => a + b, 0)
  }

  private tipoDe(a: string): TipoDato | undefined {
    return literal(a)?.[1] ?? this.tipos.get(a)
  }

  private valorEn(e: Estado, a: string): Valor | typeof NAC {
    const lit = literal(a)
    if (lit) return lit[0]
    return e.get(a) ?? NAC
  }

  private transferir(e: Estado, i: InstruccionTAC) {
    if (i.op === 'asig') e.set(i.destino, this.valorEn(e, i.origen))
    else if (i.op === 'read') e.set(i.destino, NAC)
    else if (i.op === 'bin') {
      const a = this.valorEn(e, i.izq)
      const b = this.valorEn(e, i.der)
      e.set(i.destino, this.plegar(i, a, b) ?? NAC)
    }
  }

  private plegar(
    i: Extract<InstruccionTAC, { op: 'bin' }>,
    a: Valor | typeof NAC,
    b: Valor | typeof NAC,
  ): Valor | undefined {
    if (a === NAC || b === NAC) return undefined
    try {
      return calcular(i.operador, a, b, this.tipos.get(i.destino))
    } catch {
      return undefined
    }
  }

  constantes(cod: InstruccionTAC[]): Codigo {
    const bloques = bloquesBasicos(cod)
    const global = bloques.length * (this.inicial.size + 1) <= PRESUPUESTO_FLUJO
    const entrada = global
      ? this.flujo(cod, bloques)
      : this.entradaLocal(bloques)
    if (!entrada) return cod.slice()

    const out: Codigo = cod.slice()
    for (const b of bloques) {
      const inicio = entrada[b.id]
      if (!inicio) continue
      const e = new Map(inicio)
      for (let k = b.inicio; k <= b.fin; k++) {
        const original = cod[k]
        out[k] = this.reescribir(original, e)
        this.transferir(e, original)
      }
    }
    return out
  }

  private flujo(
    cod: InstruccionTAC[],
    bloques: ReturnType<typeof bloquesBasicos>,
  ): (Estado | undefined)[] | null {
    const entrada: (Estado | undefined)[] = []
    const salida: (Estado | undefined)[] = []
    let cambio = true
    for (let barrido = 0; cambio; barrido++) {
      if (barrido > MAX_BARRIDOS) return null
      cambio = false
      for (const b of bloques) {
        let e: Estado | undefined =
          b.id === 0 ? new Map(this.inicial) : undefined
        for (const p of b.predecesores) {
          const s = salida[p]
          if (s) e = e ? encuentro(e, s) : s
        }
        if (!e) continue
        entrada[b.id] = e
        const s = new Map(e)
        for (let k = b.inicio; k <= b.fin; k++) this.transferir(s, cod[k])
        const previa = salida[b.id]
        if (previa && igualesEstados(previa, s)) continue
        salida[b.id] = s
        cambio = true
      }
    }
    return entrada
  }

  private entradaLocal(
    bloques: ReturnType<typeof bloquesBasicos>,
  ): (Estado | undefined)[] {
    const vivos = alcanzables(bloques)
    return bloques.map((b) =>
      !vivos.has(b.id)
        ? undefined
        : b.id === 0 && b.predecesores.length === 0
          ? new Map(this.inicial)
          : new Map(),
    )
  }

  private reescribir(i: InstruccionTAC, e: Estado): InstruccionTAC | null {
    let cambio = false
    const nueva = mapearUsos(i, (a) => {
      if (esLiteral(a)) return a
      const v = e.get(a)
      const tipo = this.tipos.get(a)
      if (v === undefined || v === NAC || !tipo) return a
      const lit = comoLiteral(v, tipo)
      if (lit === null) return a
      cambio = true
      return lit
    })
    if (cambio) this.cambios.O2++

    if (nueva.op === 'bin') {
      const v = this.plegar(
        nueva,
        this.valorEn(e, nueva.izq),
        this.valorEn(e, nueva.der),
      )
      const tipo = this.tipos.get(nueva.destino)
      const lit = v === undefined || !tipo ? null : comoLiteral(v, tipo)
      if (lit !== null) {
        this.cambios.O2++
        return {
          op: 'asig',
          destino: nueva.destino,
          origen: lit,
          linea: nueva.linea,
        }
      }
    }
    if (nueva.op === 'ifCmp' && esLiteral(nueva.izq) && esLiteral(nueva.der)) {
      this.cambios.O2++
      const v = this.plegar(
        {
          op: 'bin',
          destino: '',
          izq: nueva.izq,
          operador: nueva.operador,
          der: nueva.der,
        },
        this.valorEn(e, nueva.izq),
        this.valorEn(e, nueva.der),
      )
      return v === true
        ? { op: 'goto', salto: nueva.salto, linea: nueva.linea }
        : null
    }
    if (
      (nueva.op === 'if' || nueva.op === 'ifFalse') &&
      esLiteral(nueva.condicion)
    ) {
      this.cambios.O2++
      const salta = (nueva.condicion === 'verdadero') === (nueva.op === 'if')
      return salta
        ? { op: 'goto', salto: nueva.salto, linea: nueva.linea }
        : null
    }
    return nueva
  }

  algebraica(cod: InstruccionTAC[]): Codigo {
    return cod.map((i) => {
      if (i.op !== 'bin') return i
      const r = this.simplificar(i)
      if (r !== null) {
        this.cambios.O3++
        return { op: 'asig', destino: i.destino, origen: r, linea: i.linea }
      }
      const f = this.reducirFuerza(i)
      if (f === null) return i
      this.cambios.O3++
      return f
    })
  }

  private reducirFuerza(
    i: Extract<InstruccionTAC, { op: 'bin' }>,
  ): InstruccionTAC | null {
    if (i.operador !== '*') return null
    const dos = (a: string) => literal(a)?.[0] === 2
    const x = dos(i.der) ? i.izq : dos(i.izq) ? i.der : null
    if (x === null || literal(x)) return null
    return { ...i, operador: '+', izq: x, der: x }
  }

  private simplificar(
    i: Extract<InstruccionTAC, { op: 'bin' }>,
  ): string | null {
    const num = (a: string) => {
      const lit = literal(a)
      return lit && typeof lit[0] === 'number' ? lit[0] : undefined
    }
    const izq = num(i.izq)
    const der = num(i.der)
    switch (i.operador) {
      case '+':
        if (der === 0) return i.izq
        if (izq === 0) return i.der
        return null
      case '-':
        if (der === 0) return i.izq
        if (i.izq === i.der && !literal(i.izq))
          return comoLiteral(0, this.tipos.get(i.destino) ?? 'ent')
        return null
      case '*':
        if (der === 1) return i.izq
        if (izq === 1) return i.der
        if ((der === 0 || izq === 0) && this.tipos.get(i.destino) === 'ent')
          return '0'
        return null
      case '/':
        return der === 1 ? i.izq : null
      default:
        return null
    }
  }

  locales(cod: InstruccionTAC[]): Codigo {
    const out: Codigo = cod.slice()
    for (const b of bloquesBasicos(cod)) {
      const copias = new Map<string, string>()
      const calculadas = new Map<
        string,
        { destino: string; operandos: string[] }
      >()
      const copiasDe = new Map<string, Set<string>>()
      const calculadasCon = new Map<string, Set<string>>()
      const indexar = (
        indice: Map<string, Set<string>>,
        n: string,
        v: string,
      ) => {
        const s = indice.get(n)
        if (s) s.add(v)
        else indice.set(n, new Set([v]))
      }
      const olvidar = (d: string) => {
        copias.delete(d)
        for (const t of copiasDe.get(d) ?? [])
          if (copias.get(t) === d) copias.delete(t)
        copiasDe.delete(d)
        for (const c of calculadasCon.get(d) ?? []) {
          const v = calculadas.get(c)
          if (v && (v.destino === d || v.operandos.includes(d)))
            calculadas.delete(c)
        }
        calculadasCon.delete(d)
      }
      for (let k = b.inicio; k <= b.fin; k++) {
        let i = mapearUsos(cod[k], (a) => {
          const c = copias.get(a)
          if (c === undefined) return a
          this.cambios.O4++
          return c
        })

        if (i.op === 'bin') {
          const clave = this.clave(i)
          const previa = calculadas.get(clave)
          if (
            previa &&
            this.tipos.get(previa.destino) === this.tipos.get(i.destino)
          ) {
            this.cambios.O5++
            i = {
              op: 'asig',
              destino: i.destino,
              origen: previa.destino,
              linea: i.linea,
            }
          }
        }

        const d = destino(i)
        if (d !== undefined) {
          olvidar(d)
          if (
            i.op === 'asig' &&
            this.temporales.has(d) &&
            !esLiteral(i.origen) &&
            i.origen !== d &&
            this.tipos.get(i.origen) === this.tipos.get(d)
          ) {
            copias.set(d, i.origen)
            indexar(copiasDe, i.origen, d)
          }
          if (i.op === 'bin' && i.izq !== d && i.der !== d) {
            const clave = this.clave(i)
            calculadas.set(clave, { destino: d, operandos: [i.izq, i.der] })
            for (const n of [d, i.izq, i.der]) indexar(calculadasCon, n, clave)
          }
        }
        out[k] = i
      }
    }
    return out
  }

  private clave(i: Extract<InstruccionTAC, { op: 'bin' }>): string {
    const conmutativo =
      i.operador === '*' ||
      i.operador === '==' ||
      i.operador === '!=' ||
      (i.operador === '+' &&
        this.tipoDe(i.izq) !== 'txt' &&
        this.tipoDe(i.der) !== 'txt')
    const [a, b] =
      conmutativo && i.der < i.izq ? [i.der, i.izq] : [i.izq, i.der]
    return `${i.operador}\u0000${a}\u0000${b}`
  }

  unirCopias(cod: InstruccionTAC[]): Codigo {
    const usosDe = this.usosHastaRedefinir(cod)
    const destinos = new Set(cod.filter(esSalto).map((i) => i.salto))
    const out: Codigo = cod.slice()
    for (let k = 0; k + 1 < cod.length; k++) {
      const a = out[k]
      const b = cod[k + 1]
      if (
        !a ||
        (a.op !== 'bin' && a.op !== 'asig') ||
        b.op !== 'asig' ||
        b.origen !== a.destino ||
        !this.temporales.has(a.destino) ||
        usosDe[k] !== 1 ||
        destinos.has(k + 1) ||
        this.tipos.get(a.destino) !== this.tipos.get(b.destino)
      )
        continue
      this.cambios.O4++
      out[k] = { ...a, destino: b.destino }
      out[k + 1] = null
      k++
    }
    return out
  }

  private usosHastaRedefinir(cod: readonly InstruccionTAC[]): number[] {
    const out: number[] = []
    const pendientes = new Map<string, number>()
    for (let k = cod.length - 1; k >= 0; k--) {
      const d = destino(cod[k])
      if (d !== undefined) {
        out[k] = pendientes.get(d) ?? 0
        pendientes.set(d, 0)
      }
      paraCadaUso(cod[k], (a) => {
        if (!esLiteral(a)) pendientes.set(a, (pendientes.get(a) ?? 0) + 1)
      })
    }
    return out
  }

  private contarUsos(cod: readonly InstruccionTAC[]): Map<string, number> {
    const n = new Map<string, number>()
    const contar = (a: string) => {
      if (!esLiteral(a)) n.set(a, (n.get(a) ?? 0) + 1)
    }
    for (const i of cod) paraCadaUso(i, contar)
    return n
  }

  muerto(cod: InstruccionTAC[]): Codigo {
    const out: Codigo = cod.slice()
    const bloques = bloquesBasicos(cod)
    const vivos = alcanzables(bloques)
    for (const b of bloques)
      if (!vivos.has(b.id))
        for (let k = b.inicio; k <= b.fin; k++) {
          if (k === cod.length - 1 && cod[k].op === 'halt') continue
          out[k] = null
          this.cambios.O6++
        }

    const usosDe = this.contarUsos(out.filter((i) => i !== null))
    out.forEach((i, k) => {
      if (!i || (i.op !== 'asig' && i.op !== 'bin')) return
      if (!this.temporales.has(i.destino) || usosDe.has(i.destino)) return
      if (i.op === 'bin' && !this.noFalla(i)) return
      out[k] = null
      this.cambios.O6++
    })
    return out
  }

  private noFalla(i: Extract<InstruccionTAC, { op: 'bin' }>): boolean {
    return (
      COMPARACIONES.has(i.operador) ||
      (i.operador === '+' && this.tipos.get(i.destino) === 'txt')
    )
  }

  saltos(cod: InstruccionTAC[]): Codigo {
    const out: Codigo = cod.map((i) => {
      if (!esSalto(i)) return i
      let destinoFinal = i.salto
      for (let n = 0; n < cod.length; n++) {
        const j = cod[destinoFinal]
        if (j?.op !== 'goto' || j.salto === destinoFinal) break
        destinoFinal = j.salto
      }
      if (destinoFinal === i.salto) return i
      this.cambios.O7++
      return { ...i, salto: destinoFinal }
    })

    const destinos = new Set(
      out
        .filter((i) => i && esSalto(i))
        .map((i) => (i as { salto: number }).salto),
    )
    for (let k = 0; k < out.length; k++) {
      const i = out[k]
      if (!i || !esSalto(i)) continue
      if (i.salto === k + 1) {
        out[k] = null
        this.cambios.O7++
        continue
      }
      const j = out[k + 1]
      if (
        (i.op === 'if' || i.op === 'ifFalse' || i.op === 'ifCmp') &&
        i.salto === k + 2 &&
        j?.op === 'goto' &&
        !destinos.has(k + 1)
      ) {
        out[k] =
          i.op === 'ifCmp'
            ? { ...i, operador: NEGAR[i.operador], salto: j.salto }
            : { ...i, op: i.op === 'if' ? 'ifFalse' : 'if', salto: j.salto }
        out[k + 1] = null
        this.cambios.O7++
      }
    }
    return out
  }

  compararYSaltar(cod: InstruccionTAC[]): Codigo {
    const usosDe = this.usosHastaRedefinir(cod)
    const destinos = new Set(cod.filter(esSalto).map((i) => i.salto))
    const out: Codigo = cod.slice()
    for (let k = 0; k + 1 < cod.length; k++) {
      const a = cod[k]
      const b = cod[k + 1]
      if (
        a.op !== 'bin' ||
        !COMPARACIONES.has(a.operador) ||
        !this.temporales.has(a.destino) ||
        (b.op !== 'if' && b.op !== 'ifFalse') ||
        b.condicion !== a.destino ||
        usosDe[k] !== 1 ||
        destinos.has(k + 1)
      )
        continue
      const op = a.operador as OpComparacionTAC
      out[k] = {
        op: 'ifCmp',
        izq: a.izq,
        operador: b.op === 'if' ? op : NEGAR[op],
        der: a.der,
        salto: b.salto,
        linea: b.linea ?? a.linea,
      }
      out[k + 1] = null
      this.cambios.G1++
      k++
    }
    return out
  }

  invertirCiclos(cod: InstruccionTAC[]): Codigo {
    const out: Codigo = cod.slice()
    cod.forEach((i, k) => {
      if (i.op !== 'goto' || i.salto === k || i.salto === k + 1) return
      const c = cod[i.salto]
      const linea = c?.linea ?? i.linea
      const salto = i.salto + 1
      if (!c || !esSaltoCondicional(c) || c.salto !== k + 1) return
      if (c.op === 'ifCmp')
        out[k] = { ...c, operador: NEGAR[c.operador], salto, linea }
      else if (c.op === 'if')
        out[k] = { op: 'ifFalse', condicion: c.condicion, salto, linea }
      else if (c.op === 'ifFalse')
        out[k] = { op: 'if', condicion: c.condicion, salto, linea }
      this.cambios.G2++
    })
    return out
  }

  sacarInvariantes(cod: InstruccionTAC[]): InstruccionTAC[] {
    const escrituras = new Map<string, number>()
    for (const i of cod) {
      const d = destino(i)
      if (d !== undefined) escrituras.set(d, (escrituras.get(d) ?? 0) + 1)
    }
    const llegadas = new Map<number, number>()
    for (const i of cod)
      if (esSalto(i)) llegadas.set(i.salto, (llegadas.get(i.salto) ?? 0) + 1)
    for (let e = 0; e < cod.length; e++) {
      const s = cod[e]
      if (!esSaltoCondicional(s) || !esSalto(s) || s.salto >= e) continue
      const b = s.salto
      if (llegadas.get(b) !== 1) continue
      let lineal = true
      for (let k = b; k < e; k++)
        if (esSalto(cod[k]) || (k > b && llegadas.has(k))) lineal = false
      if (!lineal) continue
      const escritos = new Set<string>()
      for (let k = b; k <= e; k++) {
        const d = destino(cod[k])
        if (d !== undefined) escritos.add(d)
      }
      let seguro = true
      for (let j = b; j < e; j++) {
        const i = cod[j]
        const invariante =
          i.op === 'bin' &&
          this.temporales.has(i.destino) &&
          escrituras.get(i.destino) === 1 &&
          usos(i).every((a) => esLiteral(a) || !escritos.has(a))
        const noFalla = i.op === 'bin' && COMPARACIONES.has(i.operador)
        if (invariante && (seguro || noFalla)) {
          this.cambios.G3++
          return rotar(cod, b, j)
        }
        seguro &&=
          (noFalla || i.op === 'asig') &&
          !!destino(i) &&
          this.temporales.has(destino(i) as string)
      }
    }
    return cod
  }

  desenrollar(cod: InstruccionTAC[]): InstruccionTAC[] {
    const out: InstruccionTAC[] = []
    const nueva = new Array<number>(cod.length + 1)
    let p = 0
    while (p < cod.length) {
      const rep = this.repDesenrollable(cod, p)
      if (!rep) {
        nueva[p] = out.length
        out.push(cod[p])
        p++
        continue
      }
      for (let j = p; j < rep.fin; j++) nueva[j] = out.length
      for (let v = 0; v < rep.veces; v++)
        for (const i of rep.cuerpo) out.push({ ...i })
      this.cambios.G4++
      p = rep.fin
    }
    if (out.length === cod.length && out.every((i, k) => i === cod[k]))
      return cod
    nueva[cod.length] = out.length
    return out.map((i) => (esSalto(i) ? { ...i, salto: nueva[i.salto] } : i))
  }

  private repDesenrollable(
    cod: readonly InstruccionTAC[],
    p: number,
  ): { fin: number; veces: number; cuerpo: InstruccionTAC[] } | null {
    if (p + 6 >= cod.length) return null
    const ini = cod[p]
    const cmp = cod[p + 1]
    const si = cod[p + 2]
    if (
      ini.op !== 'asig' ||
      !/^_c\d+$/.test(ini.destino) ||
      ini.origen !== '0' ||
      cmp.op !== 'bin' ||
      cmp.operador !== '>=' ||
      cmp.izq !== ini.destino ||
      !/^\d+$/.test(cmp.der) ||
      si.op !== 'if' ||
      si.condicion !== cmp.destino
    )
      return null
    const c = ini.destino
    const fin = si.salto
    const q = fin - 3
    const inc = cod[q]
    const copia = cod[q + 1]
    const vuelta = cod[q + 2]
    if (
      q < p + 3 ||
      inc?.op !== 'bin' ||
      inc.izq !== c ||
      copia?.op !== 'asig' ||
      copia.destino !== c ||
      vuelta?.op !== 'goto' ||
      vuelta.salto !== p + 1
    )
      return null
    const cuerpo = cod.slice(p + 3, q)
    const veces = Number(cmp.der)
    if (
      veces < 1 ||
      veces > DESENROLLAR_HASTA ||
      veces * cuerpo.length > fin - p ||
      cuerpo.some((i) => esSalto(i) || usos(i).includes(c))
    )
      return null
    return { fin, veces, cuerpo }
  }

  reutilizar(cod: InstruccionTAC[]) {
    const bloques = bloquesBasicos(cod)
    const bloqueDe: number[] = []
    for (const b of bloques)
      for (let k = b.inicio; k <= b.fin; k++) bloqueDe[k] = b.id
    const defs = new Map<string, number[]>()
    const ultimoUso = new Map<string, number>()
    const usosFuera = new Set<string>()
    cod.forEach((i, k) => {
      const d = destino(i)
      if (!d || !this.temporales.has(d)) return
      const lista = defs.get(d)
      if (lista) lista.push(k)
      else defs.set(d, [k])
    })
    cod.forEach((i, k) => {
      for (const a of usos(i)) {
        if (!this.temporales.has(a)) continue
        const def = defs.get(a)?.[0]
        if (def === undefined || bloqueDe[def] !== bloqueDe[k] || def >= k)
          usosFuera.add(a)
        ultimoUso.set(a, k)
      }
    })
    const candidato = (t: string) =>
      this.temporales.has(t) && defs.get(t)?.length === 1 && !usosFuera.has(t)

    const libres = new Map<TipoDato, string[]>()
    const nombre = new Map<string, string>()
    for (const b of bloques) {
      const liberar = (t: string) => {
        const tipo = this.tipos.get(t) as TipoDato
        libres.set(tipo, [...(libres.get(tipo) ?? []), nombre.get(t) ?? t])
      }
      for (let k = b.inicio; k <= b.fin; k++) {
        const original = cod[k]
        let i = mapearUsos(original, (a) => nombre.get(a) ?? a)
        for (const a of new Set(usos(original)))
          if (candidato(a) && ultimoUso.get(a) === k) liberar(a)
        const d = destino(original)
        if (d && candidato(d)) {
          const tipo = this.tipos.get(d) as TipoDato
          const libre = libres.get(tipo)?.shift()
          if (libre !== undefined) {
            nombre.set(d, libre)
            i = { ...i, destino: libre } as InstruccionTAC
            this.cambios.O8++
          }
          if (!ultimoUso.has(d)) liberar(d)
        }
        cod[k] = i
      }
    }
  }
}

function rotar(
  cod: readonly InstruccionTAC[],
  b: number,
  j: number,
): InstruccionTAC[] {
  const out = [
    ...cod.slice(0, b),
    cod[j],
    ...cod.slice(b, j),
    ...cod.slice(j + 1),
  ]
  return out.map((i) =>
    esSalto(i) && i.salto >= b && i.salto <= j
      ? { ...i, salto: i.salto + 1 }
      : i,
  )
}
