// @vitest-environment node
import { compile } from '@engine/compile'
import { aCuadruplas } from '@engine/cuadruplas'
import {
  codigoReferencia,
  FUENTE_ERROR_EJECUCION,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { formatTAC } from '@engine/formato'
import { generarIntermedio } from '@engine/intermedio'
import { analizarLexico } from '@engine/lexer'
import { analizarSintactico } from '@engine/parser'
import { analizarSemantico } from '@engine/semantico'
import { aTripletas } from '@engine/tripletas'
import { describe, expect, it } from 'vitest'

const generar = (fuente: string) => {
  const sin = analizarSintactico(analizarLexico(fuente).tokens)
  expect(sin.errores).toEqual([])
  const sem = analizarSemantico(sin.ast)
  expect(sem.errores).toEqual([])
  return generarIntermedio(sem.ast)
}

const tac = (fuente: string) =>
  generar(fuente).tresDirecciones.map((i, n) => `${n}: ${formatTAC(i)}`)

describe('código intermedio: los ejemplos (I6)', () => {
  it.each([
    ['potencia.brv', FUENTE_POTENCIA],
    ['tipos.brv', FUENTE_TIPOS],
    ['division.brv', FUENTE_ERROR_EJECUCION],
  ])('%s: igual al código de referencia', (_, fuente) => {
    const ref = codigoReferencia(fuente)
    const r = compile(fuente)
    expect(r.tresDirecciones).toMatchObject(ref?.tresDirecciones ?? [])
    expect(r.tripletas).toEqual(ref?.tripletas)
    expect(r.cuadruplas).toEqual(ref?.cuadruplas)
    expect(generar(fuente).temporales).toEqual(ref?.temporales)
  })

  it('los temporales van a la tabla de símbolos, después de las variables', () => {
    const tabla = compile(FUENTE_POTENCIA).tablaSimbolos
    expect(
      tabla.map((s) => `${s.nombre}:${s.categoria}:${s.direccion}`),
    ).toEqual([
      'nombre:variable:0',
      'base:variable:4',
      'exponente:variable:8',
      'potencia:variable:12',
      't1:temporal:16',
      '_c1:temporal:20',
      't2:temporal:24',
      't3:temporal:25',
      't4:temporal:29',
      't5:temporal:33',
    ])
  })
})

describe('código intermedio: traducción (I1 a I3)', () => {
  it('operaciones: un temporal por operación, en orden', () => {
    expect(tac('di 2 + 3 * 4')).toEqual([
      '0: t1 = 3 * 4',
      '1: t2 = 2 + t1',
      '2: write t2',
      '3: halt',
    ])
  })

  it('menos unario: tN = 0 - a', () => {
    expect(tac('va ent x = -5\ndi -x')).toEqual([
      '0: t1 = 0 - 5',
      '1: x = t1',
      '2: t2 = 0 - x',
      '3: write t2',
      '4: halt',
    ])
  })

  it('va sin valor no genera nada; con varias variables, una por una', () => {
    expect(tac('va ent a, b = 2, c = b\ndi a + c')).toEqual([
      '0: b = 2',
      '1: c = b',
      '2: t1 = a + c',
      '3: write t1',
      '4: halt',
    ])
  })

  it('cn, lee y asignación', () => {
    expect(tac('cn dec k = 1.5\nva dec x\nlee x\nx = x * k\ndi x')).toEqual([
      '0: k = 1.5',
      '1: read x',
      '2: t1 = x * k',
      '3: x = t1',
      '4: write x',
      '5: halt',
    ])
  })

  it('si sin no', () => {
    expect(tac('va ent a = 1\nsi a > 0 di "pos"\ndi "fin"')).toEqual([
      '0: a = 1',
      '1: t1 = a > 0',
      '2: if t1 goto 4',
      '3: goto 5',
      '4: write "pos"',
      '5: write "fin"',
      '6: halt',
    ])
  })

  it('si con una variable bool como condición', () => {
    expect(tac('va bool b = verdadero\nsi b di 1 no di 2')).toEqual([
      '0: b = verdadero',
      '1: if b goto 4',
      '2: write 2',
      '3: goto 5',
      '4: write 1',
      '5: halt',
    ])
  })

  it('dos rep usan _c1 y _c2; las vueltas se calculan una sola vez', () => {
    expect(tac('va ent n = 2, s\nrep n * 2 s = s + 1\nrep 3 di s')).toEqual([
      '0: n = 2',
      '1: t1 = n * 2',
      '2: _c1 = 0',
      '3: t2 = _c1 >= t1',
      '4: if t2 goto 10',
      '5: t3 = s + 1',
      '6: s = t3',
      '7: t4 = _c1 + 1',
      '8: _c1 = t4',
      '9: goto 3',
      '10: _c2 = 0',
      '11: t5 = _c2 >= 3',
      '12: if t5 goto 17',
      '13: write s',
      '14: t6 = _c2 + 1',
      '15: _c2 = t6',
      '16: goto 11',
      '17: halt',
    ])
    expect(
      generar('rep 1 di 1\nrep 1 di 2')
        .temporales.filter(([n]) => n.startsWith('_c'))
        .map(([n]) => n),
    ).toEqual(['_c1', '_c2'])
  })

  it('programa vacío: solo halt', () => {
    expect(tac('')).toEqual(['0: halt'])
  })

  it('cada instrucción guarda su línea del programa (menos halt)', () => {
    const { tresDirecciones } = generar('va ent a = 1\n\nrep 2 a = a + 1')
    expect(tresDirecciones.map((i) => i.linea)).toEqual([
      1,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      undefined,
    ])
  })

  it('los temporales no chocan con variables llamadas tN', () => {
    expect(tac('va ent t1 = 1, t3 = 2\ndi t1 + t3 * 2')).toEqual([
      '0: t1 = 1',
      '1: t3 = 2',
      '2: t2 = t3 * 2',
      '3: t4 = t1 + t2',
      '4: write t4',
      '5: halt',
    ])
    const tabla = compile('va ent t1 = 1\ndi t1 + 1\n').tablaSimbolos
    expect(tabla.map((s) => s.nombre)).toEqual(['t1', 't2'])
  })

  it('el árbol debe venir anotado', () => {
    const sin = analizarSintactico(analizarLexico('di 1 + 2').tokens)
    expect(() => generarIntermedio(sin.ast)).toThrow('anotado')
  })
})

describe('tripletas y cuádruplas (I4, I5)', () => {
  it('cada forma de instrucción', () => {
    const { tresDirecciones } = generar(
      'va ent a\nlee a\nsi a > 1 di a\nrep 2 a = a - 1',
    )
    expect(
      aTripletas(tresDirecciones).map((t) => `${t.op} ${t.arg1} ${t.arg2}`),
    ).toEqual([
      'read a ',
      '> a 1',
      'if (1) (4)',
      'goto (5) ',
      'write a ',
      '= _c1 0',
      '>= _c1 2',
      'if (6) (13)',
      '- a 1',
      '= a (8)',
      '+ _c1 1',
      '= _c1 (10)',
      'goto (6) ',
      'halt  ',
    ])
    expect(
      aCuadruplas(tresDirecciones).map(
        (c) => `${c.op} ${c.arg1} ${c.arg2} ${c.resultado}`,
      ),
    ).toEqual([
      'read   a',
      '> a 1 t1',
      'if t1  4',
      'goto   5',
      'write a  ',
      '= 0  _c1',
      '>= _c1 2 t2',
      'if t2  13',
      '- a 1 t3',
      '= t3  a',
      '+ _c1 1 t4',
      '= t4  _c1',
      'goto   6',
      'halt   ',
    ])
  })

  it('en las tripletas un temporal usado por otra operación es una referencia', () => {
    const tri = aTripletas(generar('di (1 + 2) * 3').tresDirecciones)
    expect(tri.slice(0, 3)).toEqual([
      { op: '+', arg1: '1', arg2: '2' },
      { op: '*', arg1: '(0)', arg2: '3' },
      { op: 'write', arg1: '(1)', arg2: '' },
    ])
  })

  it('una variable del usuario llamada tN no se vuelve referencia', () => {
    const tri = aTripletas(generar('va ent t2 = 1\ndi t2 + 1').tresDirecciones)
    expect(tri[1]).toEqual({ op: '+', arg1: 't2', arg2: '1' })
  })

  it('mismo número de tripletas y cuádruplas que de instrucciones', () => {
    const r = compile('va ent a = 1\nsi a > 0 di a no di 0\nrep a di a\n')
    expect(r.tripletas).toHaveLength(r.tresDirecciones.length)
    expect(r.cuadruplas).toHaveLength(r.tresDirecciones.length)
  })
})
