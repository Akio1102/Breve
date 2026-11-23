// @vitest-environment node
import { compile } from '@engine/compile'
import { FUENTE_ERROR_LEXICO, FUENTE_POTENCIA } from '@engine/ejemplos'
import { RESERVADAS } from '@engine/lenguaje'
import {
  type AFD,
  AFD_CADENA,
  AFD_ID,
  AFD_NUMERO,
  analizarLexico,
  ER,
  recorrer,
} from '@engine/lexer'
import { describe, expect, it } from 'vitest'

const tipos = (fuente: string) =>
  analizarLexico(fuente).tokens.map((t) => t.tipo)
const errores = (fuente: string) => analizarLexico(fuente).errores

describe('lexer: tokens', () => {
  it('potencia.brv', () => {
    const { tokens, errores } = analizarLexico(FUENTE_POTENCIA)
    expect(errores).toEqual([])
    expect(tokens[0]).toMatchObject({ tipo: 'SALTO', linea: 1, columna: 51 })
    expect(tokens.filter((t) => t.tipo === 'SALTO')).toHaveLength(12)
    expect(tokens.map((t) => t.lexema).join(' ')).toContain(
      'rep exponente potencia = potencia * base',
    )
    const si = tokens.filter((t) => t.linea === 12).map((t) => t.tipo)
    expect(si).toEqual([
      'SI',
      'ID',
      'COMP',
      'ENTERO',
      'DI',
      'CADENA',
      'NO',
      'DI',
      'CADENA',
      'SALTO',
    ])
    expect(tokens.at(-2)).toMatchObject({
      valor: 'Resultado pequeño',
      columna: 47,
    })
  })

  it('las 13 palabras reservadas, lee incluida; el resto son ID', () => {
    expect(RESERVADAS.size).toBe(13)
    expect(tipos([...RESERVADAS.keys()].join(' '))).toEqual([
      ...RESERVADAS.values(),
    ])
    expect(tipos('lee nombre\n')).toEqual(['LEE', 'ID', 'SALTO'])
    expect(tipos('va valor dia sino lees Va')).toEqual([
      'VA',
      'ID',
      'ID',
      'ID',
      'ID',
      'ID',
    ])
  })

  it('nombres del prototipo de Object son identificadores', () => {
    expect(tipos('va ent constructor, toString\n')).toEqual([
      'VA',
      'T_ENT',
      'ID',
      'COMA',
      'ID',
      'SALTO',
    ])
  })

  it('lexema, valor, línea y columna', () => {
    const { tokens } = analizarLexico('va dec iva = 0.19\ndi "Ana"\n')
    expect(tokens.map((t) => t.tipo)).toEqual([
      'VA',
      'T_DEC',
      'ID',
      'IGUAL',
      'DECIMAL',
      'SALTO',
      'DI',
      'CADENA',
      'SALTO',
    ])
    expect(tokens[4]).toMatchObject({
      lexema: '0.19',
      valor: 0.19,
      linea: 1,
      columna: 14,
    })
    expect(tokens[7]).toMatchObject({ valor: 'Ana', linea: 2, columna: 4 })
  })

  it('ENTERO y DECIMAL', () => {
    const { tokens } = analizarLexico('20 3.14 007')
    expect(tokens.map((t) => [t.tipo, t.valor])).toEqual([
      ['ENTERO', 20],
      ['DECIMAL', 3.14],
      ['ENTERO', 7],
    ])
  })

  it('verdadero y falso llevan su valor', () => {
    expect(
      analizarLexico('verdadero falso').tokens.map((t) => t.valor),
    ).toEqual([true, false])
  })

  it('operadores de dos caracteres antes que los de uno', () => {
    const { tokens } = analizarLexico('a>=b<=c==d!=e>f<g=h,(i+j-k*l/m)')
    expect(
      tokens.filter((t) => t.tipo === 'COMP').map((t) => t.lexema),
    ).toEqual(['>=', '<=', '==', '!=', '>', '<'])
    expect(tipos('=(+-*/),')).toEqual([
      'IGUAL',
      'PAR_ABRE',
      'MAS',
      'MENOS',
      'POR',
      'ENTRE',
      'PAR_CIERRA',
      'COMA',
    ])
  })

  it('ignora espacios, tabuladores, \\r y comentarios', () => {
    const { tokens } = analizarLexico('\tva  ent x // comentario: @ "\r\ndi x')
    expect(tokens.map((t) => t.tipo)).toEqual([
      'VA',
      'T_ENT',
      'ID',
      'SALTO',
      'DI',
      'ID',
    ])
    expect(tokens[0].columna).toBe(2)
    expect(tokens[4]).toMatchObject({ linea: 2, columna: 1 })
  })

  it('varias líneas vacías o de comentario forman un solo SALTO', () => {
    const { tokens } = analizarLexico('di 1\n\n  \n// nada\n\ndi 2')
    expect(tokens.map((t) => t.tipo)).toEqual([
      'DI',
      'ENTERO',
      'SALTO',
      'DI',
      'ENTERO',
    ])
    expect(tokens[3].linea).toBe(6)
  })

  it('la división no se confunde con un comentario', () => {
    expect(tipos('a / b')).toEqual(['ID', 'ENTRE', 'ID'])
  })
})

describe('lexer: errores', () => {
  it('carácter no válido y sigue analizando', () => {
    const { tokens, errores } = analizarLexico('va ent x = 5 @\ndi x')
    expect(errores).toEqual([
      {
        fase: 'lexico',
        linea: 1,
        columna: 14,
        largo: 1,
        mensaje: "carácter no válido '@'",
      },
    ])
    expect(tokens.map((t) => t.tipo)).toEqual([
      'VA',
      'T_ENT',
      'ID',
      'IGUAL',
      'ENTERO',
      'SALTO',
      'DI',
      'ID',
    ])
  })

  it('número mal formado: 3.', () => {
    expect(errores('va dec y = 3.')).toEqual([
      {
        fase: 'lexico',
        linea: 1,
        columna: 12,
        largo: 2,
        mensaje:
          "número mal formado '3.': se esperaba un dígito después del punto",
      },
    ])
    const r = analizarLexico('3.14.5')
    expect(r.tokens.map((t) => t.lexema)).toEqual(['3.14', '5'])
    expect(r.errores.map((e) => e.mensaje)).toEqual(["carácter no válido '.'"])
  })

  it('cadena sin cerrar hasta el fin de línea o de archivo', () => {
    const r = analizarLexico('di "Hola\ndi "x')
    expect(r.errores.map((e) => [e.linea, e.columna, e.largo])).toEqual([
      [1, 4, 5],
      [2, 4, 2],
    ])
    expect(r.errores[0].mensaje).toBe(
      'cadena sin cerrar: falta la comilla final (")',
    )
    expect(r.tokens.map((t) => t.tipo)).toEqual(['DI', 'SALTO', 'DI'])
  })

  it('identificador que empieza por _', () => {
    expect(errores('va ent _c1')).toMatchObject([
      {
        columna: 8,
        largo: 3,
        mensaje: "identificador no válido '_c1': no puede empezar por '_'",
      },
    ])
  })

  it('la ñ, las tildes y los emojis fuera de cadenas no son válidos', () => {
    expect(errores('año').map((e) => e.mensaje)).toEqual([
      "carácter no válido 'ñ'",
    ])
    const r = analizarLexico('di 😀 x')
    expect(r.errores[0]).toMatchObject({ columna: 4, largo: 1 })
    expect(r.tokens[1]).toMatchObject({ lexema: 'x', columna: 6 })
    expect(analizarLexico('di "año 😀"').errores).toEqual([])
  })

  it('! solo no es un operador', () => {
    expect(errores('a ! b').map((e) => e.mensaje)).toEqual([
      "carácter no válido '!'",
    ])
  })

  it('error-lexico.brv: los tres errores en una sola pasada', () => {
    const r = compile(FUENTE_ERROR_LEXICO)
    expect(r?.faseFallida).toBe('lexico')
    expect(r?.errores.map((e) => [e.linea, e.columna, e.largo])).toEqual([
      [1, 14, 1],
      [2, 12, 2],
      [3, 4, 5],
    ])
  })

  it('compile() informa los errores léxicos de cualquier código', () => {
    const r = compile('di 1 # 2\n')
    expect(r).toMatchObject({ ok: false, faseFallida: 'lexico', ast: null })
    expect(r?.tokens.map((t) => t.tipo)).toEqual([
      'DI',
      'ENTERO',
      'ENTERO',
      'SALTO',
    ])
    expect(r?.errores).toHaveLength(1)
  })
})

describe('lexer: autómatas', () => {
  const acepta = (afd: AFD, s: string) => {
    const r = recorrer(afd, s, 0)
    return r.largo === s.length && r.aceptado?.largo === s.length
  }

  const MUESTRAS = [
    '',
    'a',
    'Z',
    'x1',
    'edad_2',
    '_c1',
    '1a',
    '0',
    '42',
    '3.',
    '3.14',
    '.5',
    '1.2.3',
    '""',
    '"Ana"',
    '"a"b"',
    '"sin cerrar',
    '"a\nb"',
    '"año 😀"',
    'a b',
    '-1',
  ]

  it.each([
    ['ID', AFD_ID, ER.ID],
    ['CADENA', AFD_CADENA, ER.CADENA],
  ] as const)(
    '%s: el AFD reconoce el mismo lenguaje que su ER',
    (_, afd, er) => {
      for (const s of MUESTRAS) expect(acepta(afd, s), s).toBe(er?.test(s))
    },
  )

  it('números: el AFD reconoce ENTERO ∪ DECIMAL y distingue cuál', () => {
    for (const s of MUESTRAS) {
      const r = recorrer(AFD_NUMERO, s, 0)
      const completo = r.largo === s.length && r.aceptado?.largo === s.length
      const esperado = ER.ENTERO?.test(s)
        ? 'ENTERO'
        : ER.DECIMAL?.test(s)
          ? 'DECIMAL'
          : undefined
      expect(completo ? r.aceptado?.tipo : undefined, s).toBe(esperado)
    }
  })

  it('cada estado de aceptación existe en la tabla de transiciones', () => {
    for (const afd of [AFD_ID, AFD_NUMERO, AFD_CADENA]) {
      for (const q of Object.keys(afd.aceptacion))
        expect(afd.transiciones).toHaveProperty(q)
    }
  })
})
