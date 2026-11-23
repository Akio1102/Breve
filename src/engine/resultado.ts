import type { ResultadoLexico } from './lexer'
import type { ResultadoSemantico } from './semantico'
import type {
  Diagnostico,
  FaseCompilacion,
  Programa,
  ResultadoCompilacion,
  Token,
} from './types'

export const SIN_CODIGO = {
  get tresDirecciones() {
    return []
  },
  get tripletas() {
    return []
  },
  get cuadruplas() {
    return []
  },
} satisfies Pick<
  ResultadoCompilacion,
  'tresDirecciones' | 'tripletas' | 'cuadruplas'
>

const vacio = (tokens: Token[]): ResultadoCompilacion => ({
  ok: false,
  faseFallida: null,
  tokens,
  ast: null,
  tablaSimbolos: [],
  optimizado: null,
  ...SIN_CODIGO,
  errores: [],
  advertencias: [],
  traza: [],
})

export function resultadoLexico(lex: ResultadoLexico): ResultadoCompilacion {
  return { ...vacio(lex.tokens), faseFallida: 'lexico', errores: lex.errores }
}

export function resultadoSintactico(
  tokens: Token[],
  errores: Diagnostico[],
  ast: Programa | null = null,
): ResultadoCompilacion {
  return { ...vacio(tokens), faseFallida: 'sintactico', errores, ast }
}

export function resultadoInterno(
  fase: FaseCompilacion,
  e: unknown,
): ResultadoCompilacion {
  const detalle = e instanceof Error ? e.message : String(e)
  return {
    ...vacio([]),
    faseFallida: fase,
    errores: [
      {
        fase,
        linea: 1,
        columna: 1,
        mensaje: `error interno del compilador (${detalle}); el programa puede ser demasiado grande o anidado`,
      },
    ],
  }
}

export function resultadoSemantico(
  tokens: Token[],
  sem: ResultadoSemantico,
): ResultadoCompilacion {
  const base: ResultadoCompilacion = {
    ...vacio(tokens),
    ast: sem.ast,
    tablaSimbolos: sem.tabla.listar(),
    errores: sem.errores,
    advertencias: sem.advertencias,
    traza: sem.traza,
  }
  return sem.errores.length > 0 ? { ...base, faseFallida: 'semantico' } : base
}
