// @vitest-environment node
import { compile } from '@engine/compile'
import {
  FUENTE_ERROR_EJECUCION,
  FUENTE_ERROR_SEMANTICO,
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { analizarLexico } from '@engine/lexer'
import { analizarSintactico } from '@engine/parser'
import type { Expr, Instr } from '@engine/types'
import { describe, expect, it } from 'vitest'

const parse = (fuente: string) => {
  const lex = analizarLexico(fuente)
  expect(lex.errores).toEqual([])
  return analizarSintactico(lex.tokens)
}

const instrs = (fuente: string): Instr[] => {
  const r = parse(fuente)
  expect(r.errores).toEqual([])
  return r.ast.instrucciones
}

const exprDe = (codigo: string): Expr => {
  const [i] = instrs(`di ${codigo}`)
  if (i.tipo !== 'Di') throw new Error('se esperaba di')
  return i.valor
}

const forma = (e: Expr): string => {
  switch (e.tipo) {
    case 'Lit':
      return e.lexema
    case 'Id':
      return e.nombre
    case 'Unaria':
      return `(-${forma(e.expr)})`
    case 'Binaria':
      return `(${forma(e.izq)} ${e.op} ${forma(e.der)})`
  }
}

const errores = (fuente: string) =>
  parse(fuente).errores.map((e) => [e.linea, e.columna, e.largo, e.mensaje])

const sinAnot = (x: unknown): unknown =>
  JSON.parse(JSON.stringify(x, (k, v) => (k === 'anot' ? undefined : v)))

describe('parser: árbol', () => {
  it.each([
    ['potencia.brv', FUENTE_POTENCIA],
    ['tipos.brv', FUENTE_TIPOS],
    ['error-semantico.brv', FUENTE_ERROR_SEMANTICO],
    ['division.brv', FUENTE_ERROR_EJECUCION],
  ])('%s: el mismo árbol que el del motor simulado', (_, fuente) => {
    const esperado = compile(fuente).ast
    expect(esperado).not.toBeNull()
    expect(parse(fuente)).toEqual({ ast: sinAnot(esperado), errores: [] })
  })

  it('precedencia: 2 + 3 * 4 es 2 + (3 * 4)', () => {
    expect(forma(exprDe('2 + 3 * 4'))).toBe('(2 + (3 * 4))')
    expect(forma(exprDe('2 * 3 + 4'))).toBe('((2 * 3) + 4)')
    expect(forma(exprDe('(2 + 3) * 4'))).toBe('((2 + 3) * 4)')
  })

  it('asociatividad a la izquierda', () => {
    expect(forma(exprDe('8 - 3 - 2'))).toBe('((8 - 3) - 2)')
    expect(forma(exprDe('8 / 4 / 2'))).toBe('((8 / 4) / 2)')
  })

  it('los comparadores tienen la menor precedencia', () => {
    expect(forma(exprDe('a + 1 >= b * 2'))).toBe('((a + 1) >= (b * 2))')
  })

  it('el menos unario tiene la mayor precedencia', () => {
    expect(forma(exprDe('-a * 2'))).toBe('((-a) * 2)')
    expect(forma(exprDe('- -3'))).toBe('(-(-3))')
    expect(forma(exprDe('2 - -3'))).toBe('(2 - (-3))')
  })

  it('literales de los cuatro tipos', () => {
    const e = exprDe('verdadero')
    expect(e).toMatchObject({ tipo: 'Lit', tipoDato: 'bool', valor: true })
    expect(exprDe('falso')).toMatchObject({ valor: false, lexema: 'falso' })
    expect(exprDe('3.5')).toMatchObject({ tipoDato: 'dec', valor: 3.5 })
    expect(exprDe('7')).toMatchObject({ tipoDato: 'ent', valor: 7 })
    expect(exprDe('"hola"')).toMatchObject({
      tipoDato: 'txt',
      valor: 'hola',
      lexema: '"hola"',
    })
  })

  it('posiciones: palabra clave, identificador y operador', () => {
    const [si] = instrs('va ent x\nsi x > 1 x = x - 1 no di x')
      .slice(1)
      .map((i) => i)
    expect(si).toMatchObject({
      tipo: 'Si',
      linea: 2,
      columna: 1,
      cond: { tipo: 'Binaria', op: '>', columna: 6 },
      entonces: { tipo: 'Asig', nombre: 'x', columna: 10 },
      sino: { tipo: 'Di', columna: 23, valor: { columna: 26 } },
    })
  })

  it('va con varias variables, con y sin valor', () => {
    expect(instrs('va dec a, b = 1.5, c')).toMatchObject([
      {
        tipo: 'Va',
        tipoDato: 'dec',
        vars: [
          { nombre: 'a', columna: 8 },
          { nombre: 'b', valor: { valor: 1.5 } },
          { nombre: 'c' },
        ],
      },
    ])
    expect(instrs('va dec a')[0]).not.toHaveProperty('vars.0.valor')
  })

  it('cn, lee, asignación y rep', () => {
    expect(
      instrs('cn bool ok = verdadero\nlee n\nn = n + 1\nrep n di n'),
    ).toMatchObject([
      { tipo: 'Cn', tipoDato: 'bool', nombre: 'ok' },
      { tipo: 'Lee', nombre: 'n' },
      { tipo: 'Asig', nombre: 'n', valor: { op: '+' } },
      { tipo: 'Rep', veces: { nombre: 'n' }, cuerpo: { tipo: 'Di' } },
    ])
  })

  it('si sin no', () => {
    const [si] = instrs('si verdadero di 1')
    expect(si).toMatchObject({ tipo: 'Si', entonces: { tipo: 'Di' } })
    expect(si).not.toHaveProperty('sino')
  })

  it('programa vacío, solo comentarios o sin salto final', () => {
    expect(instrs('')).toEqual([])
    expect(instrs('// nada\n\n')).toEqual([])
    expect(instrs('di 1')).toHaveLength(1)
  })
})

describe('parser: errores', () => {
  it('error-sintactico.brv: los cinco errores en una sola pasada', () => {
    expect(errores(FUENTE_ERROR_SINTACTICO)).toEqual([
      [
        1,
        4,
        4,
        "se esperaba un tipo de dato (ent, dec, txt, bool) después de 'va' y se encontró 'edad'",
      ],
      [2, 8, 1, "la constante 'x' debe inicializarse (falta '= expr')"],
      [3, 1, 3, "se esperaba un identificador después de 'lee'"],
      [
        4,
        12,
        2,
        'se esperaba una instrucción simple (di o asignación) después de la condición',
      ],
      [
        5,
        4,
        1,
        "paréntesis sin cerrar: se esperaba ')' antes del fin de línea",
      ],
    ])
  })

  it('modo pánico: sigue en la línea siguiente y conserva las correctas', () => {
    const r = parse('di (1 +\ndi 2\nva x\ndi 3')
    expect(r.errores.map((e) => e.linea)).toEqual([1, 3])
    expect(r.ast.instrucciones.map((i) => i.linea)).toEqual([2, 4])
  })

  it('un solo error por línea', () => {
    expect(errores('va = = =')).toHaveLength(1)
  })

  it('rep sin instrucción y no sin instrucción', () => {
    expect(errores('rep 3')).toEqual([
      [
        1,
        5,
        1,
        'se esperaba una instrucción simple (di o asignación) después del número de repeticiones',
      ],
    ])
    expect(errores('si a di 1 no')[0][3]).toBe(
      "se esperaba una instrucción simple (di o asignación) después de 'no'",
    )
  })

  it('dentro de si y rep solo va una instrucción simple', () => {
    expect(errores('si a va ent b')[0][3]).toBe(
      "se esperaba una instrucción simple (di o asignación) después de la condición y se encontró 'va'",
    )
    expect(errores('rep 2 lee x')[0]).toEqual([
      1,
      7,
      3,
      "se esperaba una instrucción simple (di o asignación) después del número de repeticiones y se encontró 'lee'",
    ])
  })

  it('expresión que falta o está incompleta', () => {
    expect(errores('di')).toEqual([
      [1, 1, 2, "se esperaba una expresión después de 'di'"],
    ])
    expect(errores('va ent x =')[0][3]).toBe(
      "se esperaba una expresión después de '='",
    )
    expect(errores('di 2 + * 3')[0]).toEqual([
      1,
      8,
      1,
      "se esperaba una expresión después de '+' y se encontró '*'",
    ])
  })

  it('asignación sin =, sobrantes y paréntesis', () => {
    expect(errores('x 5')[0][3]).toBe(
      "se esperaba '=' después de 'x' y se encontró '5'",
    )
    expect(errores('di 1 2')[0]).toEqual([
      1,
      6,
      1,
      "se esperaba el fin de la línea después de '1' y se encontró '2'",
    ])
    expect(errores('di (1 2)')[0][3]).toBe("se esperaba ')' y se encontró '2'")
    expect(errores('di 1)')[0][3]).toBe(
      "se esperaba el fin de la línea después de '1' y se encontró ')'",
    )
  })

  it('instrucciones que no pueden empezar así', () => {
    expect(errores('5 = x')[0][3]).toBe(
      "se esperaba una instrucción (va, cn, lee, di, si, rep o una asignación) y se encontró '5'",
    )
    expect(errores('no di 1')[0][3]).toMatch(/'no' solo puede ir/)
    expect(errores('va ent')[0]).toEqual([
      1,
      4,
      3,
      "se esperaba un identificador después de 'ent'",
    ])
    expect(errores('va ent a,')[0][3]).toBe(
      "se esperaba un identificador después de ','",
    )
  })

  it('comparaciones encadenadas', () => {
    expect(errores('di 1 < 2 < 3')[0]).toEqual([
      1,
      10,
      1,
      "no se pueden encadenar comparaciones: sobra '<'",
    ])
  })
})

describe('compile()', () => {
  it('con errores sintácticos se detiene con el árbol de las líneas correctas (A5)', () => {
    const r = compile('va x\n')
    expect(r).toMatchObject({ ok: false, faseFallida: 'sintactico' })
    expect(r.ast?.instrucciones).toEqual([])
    expect(r.tokens).toHaveLength(3)
    const parcial = compile('va ent a = 1\nva x\ndi a')
    expect(parcial.ast?.instrucciones.map((i) => i.linea)).toEqual([1, 3])
    expect(parcial.tablaSimbolos).toEqual([])
  })
})
