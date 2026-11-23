import { calcular, ErrorEjecucion } from '@engine/ejecutor'
import { textoSalida, VALOR_POR_DEFECTO } from '@engine/formato'
import type { Expr, Instr, Programa, TipoDato, Valor } from '@engine/types'

export interface SalidaArbol {
  salida: string[]
  memoria: Record<string, Valor>
  error: string | null
}

export function interpretarArbol(
  programa: Programa,
  entrada: readonly string[],
): SalidaArbol {
  const memoria: Record<string, Valor> = {}
  const tipos = new Map<string, TipoDato>()
  const salida: string[] = []
  let leidos = 0

  const declarar = (nombre: string, tipo: TipoDato) => {
    tipos.set(nombre, tipo)
    memoria[nombre] = VALOR_POR_DEFECTO[tipo]
  }
  for (const i of programa.instrucciones) {
    if (i.tipo === 'Va') for (const v of i.vars) declarar(v.nombre, i.tipoDato)
    if (i.tipo === 'Cn') declarar(i.nombre, i.tipoDato)
  }

  const tipoDe = (e: Expr): TipoDato => {
    if (!e.anot) throw new Error('árbol sin anotar')
    return e.anot.tipo
  }

  function evaluar(e: Expr): Valor {
    switch (e.tipo) {
      case 'Lit':
        return e.valor
      case 'Id':
        return memoria[e.nombre]
      case 'Unaria':
        return calcular('-', 0, evaluar(e.expr), tipoDe(e))
      case 'Binaria': {
        const a = evaluar(e.izq)
        const b = evaluar(e.der)
        return calcular(e.op, a, b, tipoDe(e))
      }
    }
  }

  function leer(nombre: string) {
    if (leidos >= entrada.length)
      throw new ErrorEjecucion('entrada insuficiente')
    const texto = entrada[leidos++].trim()
    const tipo = tipos.get(nombre) as TipoDato
    memoria[nombre] =
      tipo === 'ent'
        ? Number.parseInt(texto, 10)
        : tipo === 'dec'
          ? Number.parseFloat(texto)
          : tipo === 'bool'
            ? texto === 'verdadero'
            : texto
  }

  function ejecutar(i: Instr) {
    switch (i.tipo) {
      case 'Va':
        for (const v of i.vars)
          if (v.valor) memoria[v.nombre] = evaluar(v.valor)
        return
      case 'Cn':
      case 'Asig':
        memoria[i.nombre] = evaluar(i.valor)
        return
      case 'Lee':
        leer(i.nombre)
        return
      case 'Di':
        salida.push(textoSalida(evaluar(i.valor), tipoDe(i.valor)))
        return
      case 'Si':
        if (evaluar(i.cond) === true) ejecutar(i.entonces)
        else if (i.sino) ejecutar(i.sino)
        return
      case 'Rep': {
        const veces = evaluar(i.veces) as number
        for (let c = 0; c < veces; c++) ejecutar(i.cuerpo)
        return
      }
    }
  }

  try {
    for (const i of programa.instrucciones) ejecutar(i)
  } catch (e) {
    if (!(e instanceof ErrorEjecucion)) throw e
    return { salida, memoria, error: e.message }
  }
  return { salida, memoria, error: null }
}
