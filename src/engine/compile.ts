import { aCuadruplas } from './cuadruplas'
import {
  ejecutar as ejecutarCuadruplas,
  type Programa,
  trazaVacia,
} from './ejecutor'
import { nombresTemporales } from './formato'
import { generarIntermedio } from './intermedio'
import { analizarLexico } from './lexer'
import { optimizar } from './optimizador'
import { analizarSintactico } from './parser'
import {
  resultadoInterno,
  resultadoLexico,
  resultadoSemantico,
  resultadoSintactico,
} from './resultado'
import { analizarSemantico } from './semantico'
import { aTripletas, tripletasConOrigen } from './tripletas'
import type {
  CodigoOptimizado,
  FaseCompilacion,
  InstruccionTAC,
  ResultadoCompilacion,
  ResultadoEjecucion,
  Simbolo,
} from './types'

export function compile(fuente: string): ResultadoCompilacion {
  let fase: FaseCompilacion = 'lexico'
  try {
    const lex = analizarLexico(fuente)
    if (lex.errores.length > 0) return resultadoLexico(lex)
    fase = 'sintactico'
    const sin = analizarSintactico(lex.tokens)
    if (sin.errores.length > 0)
      return resultadoSintactico(lex.tokens, sin.errores, sin.ast)
    fase = 'semantico'
    const sem = analizarSemantico(sin.ast)
    if (sem.errores.length > 0) return resultadoSemantico(lex.tokens, sem)

    fase = 'intermedio'
    const { tresDirecciones, temporales } = generarIntermedio(sem.ast)
    for (const [nombre, tipo, linea] of temporales)
      sem.tabla.insertar(nombre, tipo, 'temporal', linea)
    const tablaSimbolos = sem.tabla.listar()
    const resultado: ResultadoCompilacion = {
      ...resultadoSemantico(lex.tokens, sem),
      ok: true,
      tresDirecciones,
      tripletas: [],
      cuadruplas: aCuadruplas(tresDirecciones),
      optimizado: null,
    }
    bajoDemanda(resultado, 'tripletas', () =>
      aTripletas(tresDirecciones, nombresTemporales(tablaSimbolos)),
    )
    return bajoDemanda(resultado, 'optimizado', () =>
      codigoOptimizado(tresDirecciones, tablaSimbolos),
    )
  } catch (e) {
    return resultadoInterno(fase, e)
  }
}

function bajoDemanda<K extends 'optimizado' | 'tripletas'>(
  r: ResultadoCompilacion,
  clave: K,
  calcular: () => ResultadoCompilacion[K],
): ResultadoCompilacion {
  let calculado = false
  let valor: ResultadoCompilacion[K]
  Object.defineProperty(r, clave, {
    enumerable: true,
    configurable: true,
    get: () => {
      if (!calculado) {
        valor = calcular()
        calculado = true
      }
      return valor
    },
  })
  return r
}

function codigoOptimizado(
  codigo: InstruccionTAC[],
  tabla: readonly Simbolo[],
): CodigoOptimizado | null {
  try {
    const { tresDirecciones, cambios, rondas } = optimizar(codigo, tabla)
    const { tripletas, origen } = tripletasConOrigen(
      tresDirecciones,
      nombresTemporales(tabla),
    )
    return {
      tresDirecciones,
      tripletas,
      origenTripletas: origen,
      cuadruplas: aCuadruplas(tresDirecciones),
      cambios,
      rondas,
    }
  } catch {
    return null
  }
}

export function ejecutar(
  programa: Programa,
  entrada: readonly string[],
): ResultadoEjecucion {
  try {
    return ejecutarCuadruplas(programa, entrada)
  } catch (e) {
    return {
      ok: false,
      salida: [],
      memoria: {},
      instrucciones: 0,
      limiteAlcanzado: false,
      traza: trazaVacia(),
      error: {
        fase: 'ejecucion',
        cuadrupla: 0,
        linea: 1,
        columna: 1,
        mensaje: `error interno del ejecutor: ${(e as Error).message}`,
      },
    }
  }
}
