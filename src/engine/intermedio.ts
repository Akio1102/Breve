import { esSalto } from './formato'
import type { Expr, Instr, InstruccionTAC, Programa, TipoDato } from './types'

export type Temporal = [nombre: string, tipo: TipoDato, linea: number]

export interface ResultadoIntermedio {
  tresDirecciones: InstruccionTAC[]
  temporales: Temporal[]
}

export function generarIntermedio(programa: Programa): ResultadoIntermedio {
  const usados = new Set(
    programa.instrucciones.flatMap((i) =>
      i.tipo === 'Va'
        ? i.vars.map((v) => v.nombre)
        : i.tipo === 'Cn'
          ? [i.nombre]
          : [],
    ),
  )
  const g = new Generador(usados)
  for (const i of programa.instrucciones) g.instruccion(i)
  g.emitir({ op: 'halt' })
  return { tresDirecciones: g.resolver(), temporales: g.temporales }
}

interface Etiqueta {
  posicion: number | null
}

type Salto = { indice: number; etiqueta: Etiqueta }

class Generador {
  private readonly codigo: InstruccionTAC[] = []
  private readonly saltos: Salto[] = []
  readonly temporales: Temporal[] = []
  private nTemporal = 0
  private nContador = 0
  private readonly usados: ReadonlySet<string>

  constructor(usados: ReadonlySet<string>) {
    this.usados = usados
  }

  emitir(i: InstruccionTAC) {
    this.codigo.push(i)
  }

  private temporal(tipo: TipoDato, linea: number): string {
    let nombre = `t${++this.nTemporal}`
    while (this.usados.has(nombre)) nombre = `t${++this.nTemporal}`
    this.temporales.push([nombre, tipo, linea])
    return nombre
  }

  private contador(linea: number): string {
    const nombre = `_c${++this.nContador}`
    this.temporales.push([nombre, 'ent', linea])
    return nombre
  }

  private etiqueta(): Etiqueta {
    return { posicion: null }
  }

  private colocar(e: Etiqueta) {
    e.posicion = this.codigo.length
  }

  private saltoSi(condicion: string, destino: Etiqueta, linea: number) {
    this.saltos.push({ indice: this.codigo.length, etiqueta: destino })
    this.emitir({ op: 'if', condicion, salto: -1, linea })
  }

  private irA(destino: Etiqueta, linea: number) {
    this.saltos.push({ indice: this.codigo.length, etiqueta: destino })
    this.emitir({ op: 'goto', salto: -1, linea })
  }

  resolver(): InstruccionTAC[] {
    for (const { indice, etiqueta } of this.saltos) {
      const i = this.codigo[indice]
      if (etiqueta.posicion === null || !esSalto(i))
        throw new Error('etiqueta sin colocar')
      i.salto = etiqueta.posicion
    }
    return this.codigo
  }

  instruccion(i: Instr) {
    const linea = i.linea
    switch (i.tipo) {
      case 'Va':
        for (const v of i.vars)
          if (v.valor)
            this.emitir({
              op: 'asig',
              destino: v.nombre,
              origen: this.expr(v.valor),
              linea,
            })
        return
      case 'Cn':
      case 'Asig':
        this.emitir({
          op: 'asig',
          destino: i.nombre,
          origen: this.expr(i.valor),
          linea,
        })
        return
      case 'Lee':
        this.emitir({
          op: 'read',
          destino: i.nombre,
          linea,
          columna: i.posNombre.columna,
          largo: i.nombre.length,
        })
        return
      case 'Di':
        this.emitir({ op: 'write', origen: this.expr(i.valor), linea })
        return
      case 'Si': {
        const v = this.etiqueta()
        const f = this.etiqueta()
        this.saltoSi(this.expr(i.cond), v, linea)
        if (i.sino) this.instruccion(i.sino)
        this.irA(f, linea)
        this.colocar(v)
        this.instruccion(i.entonces)
        this.colocar(f)
        return
      }
      case 'Rep': {
        const veces = this.expr(i.veces)
        const enRep = { linea, columna: i.columna, largo: 3 }
        const c = this.contador(linea)
        const inicio = this.etiqueta()
        const fin = this.etiqueta()
        this.emitir({ op: 'asig', destino: c, origen: '0', linea })
        this.colocar(inicio)
        const tA = this.temporal('bool', linea)
        this.emitir({
          op: 'bin',
          destino: tA,
          izq: c,
          operador: '>=',
          der: veces,
          ...enRep,
        })
        this.saltoSi(tA, fin, linea)
        this.instruccion(i.cuerpo)
        const tB = this.temporal('ent', linea)
        this.emitir({
          op: 'bin',
          destino: tB,
          izq: c,
          operador: '+',
          der: '1',
          ...enRep,
        })
        this.emitir({ op: 'asig', destino: c, origen: tB, linea })
        this.irA(inicio, linea)
        this.colocar(fin)
        return
      }
    }
  }

  private expr(e: Expr): string {
    switch (e.tipo) {
      case 'Lit':
        return e.lexema
      case 'Id':
        return e.nombre
      case 'Unaria': {
        const a = this.expr(e.expr)
        const t = this.temporal(this.tipo(e), e.linea)
        this.emitir({
          op: 'bin',
          destino: t,
          izq: '0',
          operador: '-',
          der: a,
          linea: e.linea,
          columna: e.columna,
          largo: 1,
        })
        return t
      }
      case 'Binaria': {
        const izq = this.expr(e.izq)
        const der = this.expr(e.der)
        const t = this.temporal(this.tipo(e), e.linea)
        this.emitir({
          op: 'bin',
          destino: t,
          izq,
          operador: e.op,
          der,
          linea: e.linea,
          columna: e.columna,
          largo: e.op.length,
        })
        return t
      }
    }
  }

  private tipo(e: Expr): TipoDato {
    if (!e.anot) throw new Error('el árbol no está anotado')
    return e.anot.tipo
  }
}
