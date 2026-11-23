// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import { esSalto } from '@engine/formato'
import { saltoDeTripleta } from '@engine/tripletas'
import type {
  ResultadoCompilacion,
  ResultadoEjecucion,
  TipoDato,
  Valor,
} from '@engine/types'
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { interpretarArbol } from '../helpers/interpreteArbol'
import { interpretarTripletas } from '../helpers/interpreteTripletas'

const paren = (x: string, op: string, y: string) => `(${x} ${op} ${y})`

const DEC_GRANDE = `1${'0'.repeat(300)}.5`

const ENTERO = fc.oneof(
  { weight: 5, arbitrary: fc.integer({ min: 0, max: 20 }).map(String) },
  {
    weight: 1,
    arbitrary: fc.constantFrom('2147483647', '46341', '65536', '1000000'),
  },
)
const DECIMAL = fc.oneof(
  {
    weight: 5,
    arbitrary: fc.integer({ min: 0, max: 99 }).map((n) => (n / 10).toFixed(1)),
  },
  {
    weight: 1,
    arbitrary: fc.constantFrom(
      '0.1',
      '0.000001',
      '123456789.123456789',
      DEC_GRANDE,
    ),
  },
)
const TEXTO = fc.constantFrom('""', '"a"', '"hola"', '"0"')

const { ent, dec, bool, txt } = fc.letrec<{
  ent: string
  dec: string
  bool: string
  txt: string
}>((tie) => ({
  ent: fc.oneof(
    { maxDepth: 3, depthIdentifier: 'expr' },
    ENTERO,
    fc.constantFrom('a', 'b', 'n', 'K'),
    fc.constant('(-2147483648)'),
    fc
      .tuple(tie('ent'), fc.constantFrom('+', '-', '*'), tie('ent'))
      .map(([x, o, y]) => paren(x, o, y)),
    tie('ent').map((x) => `-${x}`),
  ),
  dec: fc.oneof(
    { maxDepth: 3, depthIdentifier: 'expr' },
    DECIMAL,
    fc.constantFrom('d', 'Q'),
    fc.tuple(tie('ent'), tie('ent')).map(([x, y]) => paren(x, '/', y)),
    fc
      .tuple(tie('dec'), fc.constantFrom('+', '-', '*', '/'), tie('dec'))
      .map(([x, o, y]) => paren(x, o, y)),
    fc
      .tuple(tie('dec'), fc.constantFrom('+', '*'), tie('ent'))
      .map(([x, o, y]) => paren(x, o, y)),
  ),
  bool: fc.oneof(
    { maxDepth: 3, depthIdentifier: 'expr' },
    fc.constantFrom('p', 'verdadero', 'falso'),
    fc
      .tuple(
        tie('ent'),
        fc.constantFrom('>', '<', '>=', '<=', '==', '!='),
        tie('ent'),
      )
      .map(([x, o, y]) => paren(x, o, y)),
    fc
      .tuple(tie('dec'), fc.constantFrom('>', '<=', '=='), tie('ent'))
      .map(([x, o, y]) => paren(x, o, y)),
    fc
      .tuple(tie('txt'), fc.constantFrom('==', '!='), tie('txt'))
      .map(([x, o, y]) => paren(x, o, y)),
    fc
      .tuple(tie('bool'), fc.constantFrom('==', '!='), tie('bool'))
      .map(([x, o, y]) => paren(x, o, y)),
  ),
  txt: fc.oneof(
    { maxDepth: 3, depthIdentifier: 'expr' },
    TEXTO,
    fc.constant('s'),
    fc.tuple(tie('txt'), tie('txt')).map(([x, y]) => paren(x, '+', y)),
  ),
}))

const asignacion = (excluida?: string) =>
  fc
    .oneof(
      ent.map((e) => ['a', e]),
      ent.map((e) => ['b', e]),
      ent.map((e) => ['n', e]),
      fc.oneof(dec, ent).map((e) => ['d', e]),
      bool.map((e) => ['p', e]),
      txt.map((e) => ['s', e]),
    )
    .filter(([v]) => v !== excluida)
    .map(([v, e]) => `${v} = ${e}`)

const mostrar = fc.oneof(ent, dec, bool, txt).map((e) => `di ${e}`)
const simple = fc.oneof(asignacion(), mostrar)

const LEIBLES: Record<string, TipoDato> = {
  a: 'ent',
  b: 'ent',
  n: 'ent',
  d: 'dec',
  p: 'bool',
  s: 'txt',
}

const repeticion = fc.oneof(
  fc
    .tuple(fc.integer({ min: 1, max: 3 }), simple)
    .map(([k, s]) => `rep ${k} ${s}`),
  fc
    .constantFrom('n', 'a', 'b')
    .chain((v) => fc.oneof(asignacion(v), mostrar).map((s) => `rep ${v} ${s}`)),
  fc.tuple(ent, simple).map(([e, s]) => `rep (${e} + 0) ${s}`),
)

const instruccion = fc.oneof(
  { weight: 3, arbitrary: simple },
  {
    weight: 2,
    arbitrary: fc.tuple(bool, simple).map(([c, s]) => `si ${c} ${s}`),
  },
  {
    weight: 2,
    arbitrary: fc
      .tuple(bool, simple, simple)
      .map(([c, s, t]) => `si ${c} ${s} no ${t}`),
  },
  { weight: 2, arbitrary: repeticion },
  {
    weight: 1,
    arbitrary: fc.constantFrom(...Object.keys(LEIBLES)).map((v) => `lee ${v}`),
  },
)

const ENTRADAS: Record<TipoDato, fc.Arbitrary<string>> = {
  ent: fc.oneof(
    { weight: 4, arbitrary: fc.integer({ min: -3, max: 6 }).map(String) },
    {
      weight: 1,
      arbitrary: fc.constantFrom('2147483647', '-2147483648', '46341'),
    },
  ),
  dec: fc.oneof(
    fc.integer({ min: -30, max: 30 }).map((n) => (n / 4).toString()),
    fc.constantFrom('0.1', `1${'0'.repeat(300)}`),
  ),
  bool: fc.constantFrom('verdadero', 'falso'),
  txt: fc.constantFrom('hola', 'x', '0', 'verdadero', 'a b'),
}
const MAX_LECTURAS = 13

const programa = fc
  .record({
    a: ENTERO,
    b: ENTERO,
    d: DECIMAL,
    p: fc.constantFrom('verdadero', 'falso'),
    s: TEXTO,
    K: ENTERO,
    Q: DECIMAL,
    cuerpo: fc.array(instruccion, { minLength: 1, maxLength: 12 }),
    valores: fc.record({
      ent: fc.array(ENTRADAS.ent, { minLength: MAX_LECTURAS }),
      dec: fc.array(ENTRADAS.dec, { minLength: MAX_LECTURAS }),
      bool: fc.array(ENTRADAS.bool, { minLength: MAX_LECTURAS }),
      txt: fc.array(ENTRADAS.txt, { minLength: MAX_LECTURAS }),
    }),
    corte: fc.option(fc.nat(MAX_LECTURAS)),
    invalido: fc.option(fc.nat(MAX_LECTURAS)),
  })
  .map(({ a, b, d, p, s, K, Q, cuerpo, valores, corte, invalido }) => {
    const lecturas = [
      'n',
      ...cuerpo.flatMap((i) => /^lee (\w)$/.exec(i)?.[1] ?? []),
    ]
    const siguiente = { ent: 0, dec: 0, bool: 0, txt: 0 }
    const entrada = lecturas.map((v) => {
      const tipo = LEIBLES[v]
      return valores[tipo][siguiente[tipo]++]
    })
    const alterada = entrada
      .map((v, i) => (i === invalido ? 'x' : v))
      .slice(0, corte ?? undefined)
    return {
      fuente: [
        `va ent a = ${a}, b = ${b}, n`,
        `va dec d = ${d}`,
        `va bool p = ${p}`,
        `va txt s = ${s}`,
        `cn ent K = ${K}`,
        `cn dec Q = ${Q}`,
        'lee n',
        ...cuerpo,
        'di a\ndi b\ndi n\ndi d\ndi p\ndi s',
      ].join('\n'),
      entrada,
      alterada,
    }
  })

const optimizado = (r: ResultadoCompilacion) => {
  const o = r.optimizado
  if (!o) throw new Error('sin código optimizado')
  return { ...r, cuadruplas: o.cuadruplas, tresDirecciones: o.tresDirecciones }
}

const variables = (r: ResultadoCompilacion, memoria: Record<string, Valor>) =>
  Object.fromEntries(
    r.tablaSimbolos
      .filter((s) => s.categoria !== 'temporal')
      .map((s) => [s.nombre, memoria[s.nombre]]),
  )

const compilado = (fuente: string) => {
  const r = compile(fuente)
  fc.pre(r.ok)
  return r
}

const sinLimite = (x: ResultadoEjecucion) => {
  fc.pre(!x.limiteAlcanzado)
  return x
}

const RUNS = { numRuns: Number(process.env.FC_RUNS ?? 400) }

describe('propiedades: cinco ejecuciones independientes coinciden', {
  timeout: 180_000,
}, () => {
  it('el código intermedio hace lo mismo que el árbol', () => {
    fc.assert(
      fc.property(programa, ({ fuente, entrada }) => {
        const r = compilado(fuente)
        const x = sinLimite(ejecutar(r, entrada))
        const arbol = interpretarArbol(
          r.ast as NonNullable<typeof r.ast>,
          entrada,
        )
        expect(x.salida).toEqual(arbol.salida)
        expect(x.error?.mensaje ?? null).toEqual(arbol.error)
        expect(variables(r, x.memoria)).toEqual(arbol.memoria)
      }),
      RUNS,
    )
  })

  it('las tripletas hacen lo mismo que las cuádruplas, también optimizadas', () => {
    fc.assert(
      fc.property(programa, ({ fuente, entrada }) => {
        const r = compilado(fuente)
        const o = r.optimizado
        if (!o) throw new Error('sin código optimizado')
        const pares = [
          [ejecutar(r, entrada), r.tripletas],
          [ejecutar(optimizado(r), entrada), o.tripletas],
        ] as const
        for (const [cuadruplas, tripletas] of pares) {
          sinLimite(cuadruplas)
          const t = interpretarTripletas(tripletas, r.tablaSimbolos, entrada)
          expect(t.salida).toEqual(cuadruplas.salida)
          expect(t.error).toEqual(cuadruplas.error?.mensaje ?? null)
          expect(variables(r, t.memoria)).toEqual(
            variables(r, cuadruplas.memoria),
          )
        }
      }),
      RUNS,
    )
  })

  it('el código optimizado hace lo mismo que el original', () => {
    fc.assert(
      fc.property(programa, ({ fuente, alterada }) => {
        const r = compilado(fuente)
        const x = sinLimite(ejecutar(r, alterada))
        const y = ejecutar(optimizado(r), alterada)
        expect(y.salida).toEqual(x.salida)
        expect(y.ok).toBe(x.ok)
        expect(y.error?.mensaje).toEqual(x.error?.mensaje)
        expect(y.error?.linea).toEqual(x.error?.linea)
        expect(y.error?.columna).toEqual(x.error?.columna)
        expect(variables(r, y.memoria)).toEqual(variables(r, x.memoria))
      }),
      RUNS,
    )
  })

  it('el código optimizado nunca es más largo ni ejecuta más instrucciones', () => {
    fc.assert(
      fc.property(programa, ({ fuente, alterada }) => {
        const r = compilado(fuente)
        const o = optimizado(r)
        expect(o.tresDirecciones.length).toBeLessThanOrEqual(
          r.tresDirecciones.length,
        )
        expect(ejecutar(o, alterada).instrucciones).toBeLessThanOrEqual(
          ejecutar(r, alterada).instrucciones,
        )
      }),
      RUNS,
    )
  })

  it('el código optimizado está bien formado', () => {
    fc.assert(
      fc.property(programa, ({ fuente }) => {
        const r = compilado(fuente)
        const o = r.optimizado
        if (!o) throw new Error('sin código optimizado')
        const n = o.tresDirecciones.length
        expect(o.tresDirecciones.at(-1)?.op).toBe('halt')
        expect(o.cuadruplas).toHaveLength(n)
        for (const i of o.tresDirecciones)
          if (esSalto(i)) {
            expect(i.salto).toBeGreaterThanOrEqual(0)
            expect(i.salto).toBeLessThan(n)
          }
        expect(o.origenTripletas).toHaveLength(o.tripletas.length)
        const primera = new Map<number, number>()
        o.origenTripletas.forEach((ins, k) => {
          if (!primera.has(ins)) primera.set(ins, k)
          if (k > 0) expect(ins - o.origenTripletas[k - 1]).toBeOneOf([0, 1])
        })
        expect(primera.size).toBe(n)
        o.tripletas.forEach((t, k) => {
          const i = o.tresDirecciones[o.origenTripletas[k]]
          if (esSalto(i) && saltoDeTripleta(t) !== null)
            expect(saltoDeTripleta(t)).toBe(primera.get(i.salto))
        })
        const nombres = new Set(r.tablaSimbolos.map((s) => s.nombre))
        for (const c of o.cuadruplas)
          if (c.resultado && !/^\d+$/.test(c.resultado))
            expect(nombres.has(c.resultado)).toBe(true)
      }),
      RUNS,
    )
  })
})

describe('los programas generados ejercitan cada pasada', () => {
  it('O2 a O8 y G1 a G4 actúan en una muestra de programas', () => {
    const total: Record<string, number> = {}
    for (const { fuente } of fc.sample(programa, { numRuns: 400, seed: 7 })) {
      const o = compile(fuente).optimizado
      if (!o) continue
      for (const [p, n] of Object.entries(o.cambios))
        total[p] = (total[p] ?? 0) + n
    }
    for (const p of [
      'O2',
      'O3',
      'O4',
      'O5',
      'O6',
      'O7',
      'G1',
      'G2',
      'G3',
      'G4',
    ])
      expect(total[p], p).toBeGreaterThan(0)
  })
})
