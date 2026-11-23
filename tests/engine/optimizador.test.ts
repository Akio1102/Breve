// @vitest-environment node
import { alcanzables, bloquesBasicos } from '@engine/bloques'
import { compile, ejecutar } from '@engine/compile'
import {
  ENTRADAS_POTENCIA,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { campo, formatTAC } from '@engine/formato'
import { comoLiteral, optimizar, PASADAS } from '@engine/optimizador'
import { aTripletas } from '@engine/tripletas'
import type { InstruccionTAC, ResultadoCompilacion } from '@engine/types'
import { describe, expect, it } from 'vitest'
import { interpretarTripletas } from '../helpers/interpreteTripletas'

const compilar = (fuente: string) => {
  const r = compile(fuente)
  expect(r.errores).toEqual([])
  return r
}
const opt = (fuente: string) =>
  compilar(fuente).optimizado?.tresDirecciones.map(formatTAC)
const cambios = (fuente: string) => compilar(fuente).optimizado?.cambios
const comoPrograma = (r: ResultadoCompilacion) => ({
  ...r,
  cuadruplas: r.optimizado?.cuadruplas ?? [],
  tresDirecciones: r.optimizado?.tresDirecciones ?? [],
})

describe('O1: bloques básicos y grafo de flujo', () => {
  it('potencia.brv: líderes, aristas y predecesores', () => {
    const r = compilar(FUENTE_POTENCIA)
    const b = bloquesBasicos(r.tresDirecciones)
    expect(b.map((x) => [x.inicio, x.fin])).toEqual([
      [0, 6],
      [7, 8],
      [9, 13],
      [14, 17],
      [18, 19],
      [20, 20],
      [21, 21],
    ])
    expect(b.map((x) => x.sucesores)).toEqual([
      [1],
      [2, 3],
      [1],
      [4, 5],
      [6],
      [6],
      [],
    ])
    expect(b[1].predecesores).toEqual([0, 2])
    expect(b[6].predecesores).toEqual([4, 5])
  })

  it('un programa sin saltos es un solo bloque; sin código, ninguno', () => {
    expect(bloquesBasicos(compilar('di 1\ndi 2').tresDirecciones)).toHaveLength(
      1,
    )
    expect(bloquesBasicos([])).toEqual([])
  })

  it('alcanzables desde el primer bloque', () => {
    const codigo: InstruccionTAC[] = [
      { op: 'goto', salto: 2 },
      { op: 'write', origen: '1' },
      { op: 'halt' },
    ]
    const b = bloquesBasicos(codigo)
    expect([...alcanzables(b)].sort()).toEqual([0, 2])
    expect(alcanzables([])).toEqual(new Set())
  })
})

describe('pasadas del optimizador', () => {
  it('el ejemplo del plan: 10 instrucciones → 5', () => {
    const r = compilar(
      'cn ent K = 2 * 3\nva ent x = K * 4 + 0\ndi x * 1\ndi x * 1',
    )
    expect(r.tresDirecciones).toHaveLength(10)
    expect(r.optimizado?.tresDirecciones.map(formatTAC)).toEqual([
      'K = 6',
      'x = 24',
      'write 24',
      'write 24',
      'halt',
    ])
  })

  it('O2: propaga constantes por el grafo y pliega', () => {
    expect(
      opt(
        'va ent a, b\nva bool c\nlee c\nsi c a = 2 no a = 1 + 1\nlee b\ndi a * b',
      ),
    ).toEqual([
      'read c',
      'if c goto 4',
      'a = 2',
      'goto 5',
      'a = 2',
      'read b',
      't2 = b + b',
      'write t2',
      'halt',
    ])
  })

  it('O2: una variable que vale distinto en cada rama no es constante', () => {
    expect(
      opt('va ent a\nva bool c\nlee c\nsi c a = 1 no a = 2\ndi a + 1'),
    ).toContain('t1 = a + 1')
  })

  it('O2: no pliega lo que fallaría al ejecutar', () => {
    const r = compilar('va ent a = 2147483647\ndi a + 1')
    expect(r.optimizado?.tresDirecciones.map(formatTAC)).toContain(
      't1 = 2147483647 + 1',
    )
    expect(ejecutar(comoPrograma(r), []).error?.mensaje).toMatch(
      /^desbordamiento de ent/,
    )
  })

  it('O2: una condición constante elimina la rama que nunca se ejecuta', () => {
    expect(opt('si verdadero di "sí" no di "no"')).toEqual([
      'write "sí"',
      'halt',
    ])
    expect(opt('va ent x = 3\nsi x > 5 di "grande"')).toEqual(['x = 3', 'halt'])
  })

  it('O2: la constante se escribe con el tipo de quien la guarda', () => {
    expect(opt('va dec d = 5\ndi d')).toEqual(['d = 5', 'write 5.0', 'halt'])
    const r = compilar('va dec d = 5\ndi d')
    expect(ejecutar(comoPrograma(r), []).salida).toEqual(['5.0'])
  })

  it('O2: los ciclos no son constantes', () => {
    expect(opt('va ent s = 0, n\nlee n\nrep n s = s + 1\ndi s')).toContain(
      's = s + 1',
    )
  })

  it('O3: simplificación algebraica', () => {
    const fuente = (e: string) => `va ent x\nlee x\ndi ${e}`
    for (const e of ['x + 0', '0 + x', 'x - 0', 'x * 1', '1 * x'])
      expect(opt(fuente(e))).toEqual(['read x', 'write x', 'halt'])
    expect(opt(fuente('x * 0'))).toEqual(['read x', 'write 0', 'halt'])
    expect(cambios(fuente('x * 1'))?.O3).toBe(1)
  })

  it('O3: x * 0 no se simplifica en dec', () => {
    expect(opt('va dec x\nlee x\ndi x * 0.0')).toContain('t1 = x * 0.0')
  })

  it('O3: x / 1 conserva el tipo dec al escribir', () => {
    const r = compilar('va ent x\nlee x\ndi x / 1')
    expect(ejecutar(comoPrograma(r), ['7']).salida).toEqual(['7.0'])
  })

  it('O4: une la operación con su copia al destino', () => {
    expect(opt('va ent a\nlee a\na = a * a\ndi a')).toEqual([
      'read a',
      'a = a * a',
      'write a',
      'halt',
    ])
  })

  it('O4: no une si los tipos son distintos (cambiaría la comprobación de desbordamiento)', () => {
    expect(opt('va ent a\nlee a\nva dec d = a * a\ndi d')).toContain('d = t1')
  })

  it('O5: subexpresiones comunes dentro del bloque', () => {
    expect(opt('va ent a, b\nlee a\nlee b\ndi a * b\ndi b * a')).toEqual([
      'read a',
      'read b',
      't1 = a * b',
      'write t1',
      'write t1',
      'halt',
    ])
    expect(cambios('va ent a, b\nlee a\nlee b\ndi a * b\ndi b * a')?.O5).toBe(1)
  })

  it('O5: se olvida una subexpresión cuando cambia un operando', () => {
    expect(opt('va ent a, b\nlee a\nlee b\ndi a * b\nlee a\ndi a * b')).toEqual(
      [
        'read a',
        'read b',
        't1 = a * b',
        'write t1',
        'read a',
        't1 = a * b',
        'write t1',
        'halt',
      ],
    )
  })

  it('O5: la concatenación no es conmutativa', () => {
    expect(opt('va txt a, b\nlee a\nlee b\ndi a + b\ndi b + a')).toEqual([
      'read a',
      'read b',
      't1 = a + b',
      'write t1',
      't1 = b + a',
      'write t1',
      'halt',
    ])
  })

  it('O6: quita temporales sin usar pero no operaciones que pueden fallar', () => {
    const codigo: InstruccionTAC[] = [
      { op: 'read', destino: 'a' },
      { op: 'bin', destino: 't1', izq: 'a', operador: '>', der: '0' },
      { op: 'bin', destino: 't2', izq: 'a', operador: '*', der: 'a' },
      { op: 'halt' },
    ]
    const tabla = compilar('va ent a\nlee a\ndi a').tablaSimbolos
    const t = (nombre: string, tipo: 'ent' | 'bool') => ({
      ...tabla[0],
      nombre,
      tipo,
      categoria: 'temporal' as const,
    })
    const r = optimizar(codigo, [...tabla, t('t1', 'bool'), t('t2', 'ent')])
    expect(r.tresDirecciones.map(formatTAC)).toEqual([
      'read a',
      't2 = a * a',
      'halt',
    ])
  })

  it('O7 y G1: un si sin no salta con la comparación negada', () => {
    expect(opt('va ent n\nlee n\nsi n > 0 di "pos"')).toEqual([
      'read n',
      'if n <= 0 goto 3',
      'write "pos"',
      'halt',
    ])
    expect(cambios('va ent n\nlee n\nsi n > 0 di "pos"')).toMatchObject({
      O7: 1,
      G1: 1,
    })
  })

  it('O7: un salto a un goto va directo a su destino', () => {
    const codigo: InstruccionTAC[] = [
      { op: 'read', destino: 'c' },
      { op: 'if', condicion: 'c', salto: 3 },
      { op: 'write', origen: '1' },
      { op: 'goto', salto: 5 },
      { op: 'write', origen: '2' },
      { op: 'halt' },
    ]
    const tabla = compilar('va bool c\nlee c\ndi c').tablaSimbolos
    const r = optimizar(codigo, tabla)
    expect(r.tresDirecciones.map(formatTAC)).toEqual([
      'read c',
      'if c goto 3',
      'write 1',
      'halt',
    ])
    expect(r.cambios.O7).toBeGreaterThan(0)
  })

  it('O8: reutiliza temporales del mismo tipo, también entre bloques', () => {
    const r = compilar(
      'va ent a\nlee a\ndi a * 2\nsi a > 1 di a * 3\ndi a * 4\ndi a * 5',
    )
    const temporales = (codigo: InstruccionTAC[]) =>
      new Set(
        codigo.flatMap((i) =>
          'destino' in i && /^t\d+$/.test(i.destino) ? [i.destino] : [],
        ),
      )
    expect(temporales(r.tresDirecciones).size).toBe(5)
    expect(temporales(r.optimizado?.tresDirecciones ?? []).size).toBe(1)
    expect(r.optimizado?.cambios.O8).toBe(3)
  })

  it('O8: no mezcla temporales de distinto tipo', () => {
    const codigo = opt('va ent a\nlee a\ndi a * 2\ndi a > 1') ?? []
    expect(codigo).toEqual([
      'read a',
      't1 = a + a',
      'write t1',
      't2 = a > 1',
      'write t2',
      'halt',
    ])
  })
})

describe('el código optimizado', () => {
  it('potencia.brv: misma salida, menos instrucciones ejecutadas', () => {
    const r = compilar(FUENTE_POTENCIA)
    const ejecutadas = ENTRADAS_POTENCIA.map((entrada) => {
      const lineas = entrada.split('\n')
      const original = ejecutar(r, lineas)
      const optimizado = ejecutar(comoPrograma(r), lineas)
      expect(optimizado.salida).toEqual(original.salida)
      return [original.instrucciones, optimizado.instrucciones]
    })
    expect(ejecutadas).toEqual([
      [51, 29],
      [50, 28],
      [16, 14],
      [3, 3],
      [3, 3],
    ])
    expect(r.tresDirecciones).toHaveLength(22)
    expect(r.optimizado?.tresDirecciones).toHaveLength(18)
  })

  it('tripletas y cuádruplas del código optimizado', () => {
    const r = compilar('va ent n\nlee n\nsi n > 0 di n * 2')
    expect(r.optimizado?.tripletas).toEqual([
      { op: 'read', arg1: 'n', arg2: '' },
      { op: '<=', arg1: 'n', arg2: '0' },
      { op: 'if', arg1: '(1)', arg2: '(5)' },
      { op: '+', arg1: 'n', arg2: 'n' },
      { op: 'write', arg1: '(3)', arg2: '' },
      { op: 'halt', arg1: '', arg2: '' },
    ])
    expect(r.optimizado?.cuadruplas[1]).toEqual({
      op: 'if<=',
      arg1: 'n',
      arg2: '0',
      resultado: '4',
    })
  })

  it('tripletas: un temporal reutilizado apunta a su cálculo más reciente', () => {
    const r = compilar('va ent a\nlee a\ndi a * 2\ndi a * 3')
    expect(r.optimizado?.tresDirecciones.map(formatTAC)).toEqual([
      'read a',
      't1 = a + a',
      'write t1',
      't1 = a * 3',
      'write t1',
      'halt',
    ])
    expect(r.optimizado?.tripletas.map((t) => t.arg1)).toEqual([
      'a',
      'a',
      '(1)',
      'a',
      '(3)',
      '',
    ])
  })

  describe('tripletas con una variable como destino (Q1)', () => {
    const texto = (r: ResultadoCompilacion) =>
      r.optimizado?.tripletas.map(
        (t, k) => `(${k}) ${t.op} ${campo(t.arg1)} ${campo(t.arg2)}`,
      )

    it('x = a op b son dos tripletas: la operación y la asignación', () => {
      const r = compilar('va ent a\nlee a\na = a * a\ndi a')
      expect(r.optimizado?.tresDirecciones.map(formatTAC)).toEqual([
        'read a',
        'a = a * a',
        'write a',
        'halt',
      ])
      expect(texto(r)).toEqual([
        '(0) read a –',
        '(1) * a a',
        '(2) = a (1)',
        '(3) write a –',
        '(4) halt – –',
      ])
      expect(r.optimizado?.origenTripletas).toEqual([0, 1, 1, 2, 3])
    })

    it('el ejemplo de la revisión: write lee la variable, no la tripleta de una rama', () => {
      const r = compilar(
        'va ent a\nva bool c\nlee a\nlee c\nsi c a = a + 1 no a = 5\ndi a',
      )
      expect(texto(r)).toEqual([
        '(0) read a –',
        '(1) read c –',
        '(2) if c (5)',
        '(3) = a 5',
        '(4) goto (7) –',
        '(5) + a 1',
        '(6) = a (5)',
        '(7) write a –',
        '(8) halt – –',
      ])
      for (const [entrada, salida] of [
        [['3', 'verdadero'], ['4']],
        [['3', 'falso'], ['5']],
      ])
        expect(
          interpretarTripletas(
            r.optimizado?.tripletas ?? [],
            r.tablaSimbolos,
            entrada,
          ).salida,
        ).toEqual(salida)
    })

    it('potencia.brv: el contador y potencia se guardan en cada vuelta', () => {
      const r = compilar(FUENTE_POTENCIA)
      const t = texto(r) ?? []
      expect(t).toHaveLength(23)
      expect(t.slice(7, 16)).toEqual([
        '(7) >= 0 exponente',
        '(8) if (7) (15)',
        '(9) * potencia base',
        '(10) = potencia (9)',
        '(11) + _c1 1',
        '(12) = _c1 (11)',
        '(13) < _c1 exponente',
        '(14) if (13) (9)',
        '(15) write "Resultado:" –',
      ])
      expect(t[16]).toBe('(16) write potencia –')
      for (const entrada of ENTRADAS_POTENCIA) {
        const lineas = entrada.split('\n')
        const x = ejecutar(comoPrograma(r), lineas)
        const y = interpretarTripletas(
          r.optimizado?.tripletas ?? [],
          r.tablaSimbolos,
          lineas,
        )
        if (x.error) continue
        expect(y.salida).toEqual(x.salida)
      }
    })

    it('una variable del usuario llamada tN como destino no se vuelve referencia', () => {
      const r = compilar('va ent t9\nlee t9\nt9 = t9 * 2\ndi t9')
      expect(texto(r)).toContain('(2) = t9 (1)')
      expect(texto(r)).toContain('(3) write t9 –')
    })

    it('sin optimizar hay una tripleta por instrucción (I6 no cambia)', () => {
      const r = compilar(FUENTE_POTENCIA)
      expect(r.tripletas).toHaveLength(r.tresDirecciones.length)
      expect(aTripletas(r.tresDirecciones)).toEqual(r.tripletas)
    })
  })

  it('cuenta los cambios de cada pasada y las rondas', () => {
    const o = compilar(FUENTE_TIPOS).optimizado
    expect(Object.keys(o?.cambios ?? {})).toEqual([...PASADAS])
    expect(o?.rondas).toBeGreaterThanOrEqual(1)
  })

  it('un programa con errores no tiene código optimizado', () => {
    expect(compile('di x').optimizado).toBeNull()
  })

  it('el límite de instrucciones es la única diferencia permitida (Q2)', () => {
    const r = compilar('rep 18000 di 1')
    const x = ejecutar(r, [])
    const y = ejecutar(comoPrograma(r), [])
    expect(x).toMatchObject({ ok: false, limiteAlcanzado: true })
    expect(x.salida).toHaveLength(16_667)
    expect(y).toMatchObject({ ok: true, limiteAlcanzado: false })
    expect(y.salida).toHaveLength(18_000)
  })
})

describe('comoLiteral', () => {
  it('escribe cada tipo como un literal del lenguaje', () => {
    expect(comoLiteral(6, 'ent')).toBe('6')
    expect(comoLiteral(-3, 'ent')).toBe('-3')
    expect(comoLiteral(6, 'dec')).toBe('6.0')
    expect(comoLiteral(2.5, 'dec')).toBe('2.5')
    expect(comoLiteral(true, 'bool')).toBe('verdadero')
    expect(comoLiteral(false, 'bool')).toBe('falso')
    expect(comoLiteral('ab', 'txt')).toBe('"ab"')
  })

  it('rechaza lo que no se puede escribir como literal', () => {
    expect(comoLiteral(1e21, 'dec')).toBeNull()
    expect(comoLiteral(1e-7, 'dec')).toBeNull()
    expect(comoLiteral('a"b', 'txt')).toBeNull()
    expect(comoLiteral('x', 'ent')).toBeNull()
    expect(comoLiteral(1, 'bool')).toBeNull()
    expect(comoLiteral(1, 'txt')).toBeNull()
    expect(comoLiteral('1', 'dec')).toBeNull()
  })
})

describe('código generado (G1 a G4)', () => {
  const ejecutadas = (fuente: string, entrada: string[] = []) => {
    const r = compilar(fuente)
    const x = ejecutar(r, entrada)
    const y = ejecutar(comoPrograma(r), entrada)
    expect(y.salida).toEqual(x.salida)
    expect(y.error?.mensaje).toEqual(x.error?.mensaje)
    return [x.instrucciones, y.instrucciones]
  }

  it('G1: la comparación y el salto en una instrucción', () => {
    const r = compilar('va ent a, b\nlee a\nlee b\nsi a >= b di 1 no di 2')
    expect(r.optimizado?.tresDirecciones.map(formatTAC)).toContain(
      'if a >= b goto 5',
    )
    expect(r.optimizado?.cuadruplas.find((c) => c.op === 'if>=')).toEqual({
      op: 'if>=',
      arg1: 'a',
      arg2: 'b',
      resultado: '5',
    })
    expect(opt('va ent a = 3\nsi a > 1 di "sí"')).toEqual([
      'a = 3',
      'write "sí"',
      'halt',
    ])
  })

  it('G2: la condición del rep va al final; cada vuelta, 2 de control', () => {
    expect(opt('va ent n\nlee n\nrep n di n')).toEqual([
      'read n',
      '_c1 = 0',
      'if 0 >= n goto 6',
      'write n',
      '_c1 = _c1 + 1',
      'if _c1 < n goto 3',
      'halt',
    ])
    expect(ejecutadas('va ent n\nlee n\nrep n di n', ['10'])).toEqual([65, 34])
    expect(ejecutadas('va ent n\nlee n\nrep n di n', ['0'])).toEqual([5, 4])
  })

  it('G3: el ejemplo del plan, rep 100 s = s + a * b: de 807 a 306', () => {
    const fuente = 'va ent s, a, b\nlee a\nlee b\nrep 100 s = s + a * b\ndi s'
    expect(opt(fuente)).toEqual([
      'read a',
      'read b',
      '_c1 = 0',
      't2 = a * b',
      's = s + t2',
      '_c1 = _c1 + 1',
      'if _c1 < 100 goto 4',
      'write s',
      'halt',
    ])
    expect(ejecutadas(fuente, ['3', '4'])).toEqual([807, 306])
  })

  it('G3: con un número de vueltas que se lee, sube después de la guarda', () => {
    const fuente = 'va ent s, a, n\nlee a\nlee n\nrep n s = s + a * 2\ndi s'
    const c = opt(fuente) ?? []
    const guarda = c.findIndex((i) => i.startsWith('if 0 >= n goto'))
    expect(c[guarda + 1]).toBe('t2 = a + a')
    const r = compilar(fuente.replace('a * 2', 'a * 3'))
    const y = ejecutar(comoPrograma(r), ['2147483647', '0'])
    expect(y.error).toBeNull()
    expect(y.salida).toEqual(['0'])
    expect(compilar(fuente).optimizado?.cambios.G3).toBeGreaterThanOrEqual(1)
  })

  it('G3: no adelanta un error a algo que el cuerpo escribe antes', () => {
    const fuente =
      'va ent x, a\nlee a\nrep 2 x = x + 1\nrep 3 di x + a * a\ndi x'
    const r = compilar(fuente)
    const x = ejecutar(r, ['2147483647'])
    const y = ejecutar(comoPrograma(r), ['2147483647'])
    expect(y.salida).toEqual(x.salida)
    expect(y.error?.mensaje).toEqual(x.error?.mensaje)
  })

  it('G4: desenrolla un rep corto de número fijo y O2 lo pliega', () => {
    expect(opt('va ent s = 0\nrep 3 s = s + 2\ndi s')).toEqual([
      's = 0',
      's = 2',
      's = 4',
      's = 6',
      'write 6',
      'halt',
    ])
    expect(ejecutadas('va ent s = 0\nrep 3 s = s + 2\ndi s')).toEqual([27, 6])
  })

  it('G4: no desenrolla si el código crecería', () => {
    const fuente = 'va ent s\nlee s\nrep 8 di s * s + s'
    const r = compilar(fuente)
    expect(r.optimizado?.cambios.G4).toBe(0)
    expect(r.optimizado?.tresDirecciones.length).toBeLessThanOrEqual(
      r.tresDirecciones.length,
    )
  })
})

describe('O3: reducción de fuerza y x - x', () => {
  const opt = (src: string) =>
    (compile(src).optimizado?.tresDirecciones ?? []).map(formatTAC)

  it('x * 2 y 2 * x pasan a x + x', () => {
    expect(opt('va ent x\nlee x\ndi x * 2')).toContain('t1 = x + x')
    expect(opt('va dec x\nlee x\ndi 2 * x')).toContain('t1 = x + x')
  })

  it('x - x pasa a 0 con el tipo del destino', () => {
    expect(opt('va ent x\nlee x\ndi x - x')).toContain('write 0')
    expect(opt('va dec x\nlee x\ndi x - x')).toContain('write 0.0')
  })

  it('el desbordamiento de x + x es el mismo que el de x * 2', () => {
    const r = compile('va ent x\nlee x\ndi x * 2')
    const o = r.optimizado
    if (!o) throw new Error('sin optimizar')
    const original = ejecutar(r, ['2000000000'])
    const optimizado = ejecutar(
      { ...r, cuadruplas: o.cuadruplas, tresDirecciones: o.tresDirecciones },
      ['2000000000'],
    )
    expect(optimizado.error?.mensaje).toBe(original.error?.mensaje)
    expect(original.error?.mensaje).toMatch(/^desbordamiento de ent/)
  })
})
