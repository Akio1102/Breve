// @vitest-environment node
import { compile } from '@engine/compile'
import { FUENTE_TIPOS } from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import {
  aplanar,
  arbolAbstracto,
  arbolComoTexto,
  arbolDerivacion,
  carpetas,
  conLineasDescartadas,
  expandidoPorDefecto,
  marcarDiagnosticos,
  type Nodo,
  PLEGAR_DESDE,
} from '@/arbol/arbol'
import { nodoPorId } from '@/arbol/layout'

const programa = (fuente: string) => {
  const ast = compile(fuente).ast
  if (!ast) throw new Error('debe tener árbol')
  return ast
}
const abstracto = (fuente: string, attrs = false) =>
  arbolComoTexto(arbolAbstracto(programa(fuente)), attrs)
const derivacion = (fuente: string, attrs = false) =>
  arbolComoTexto(arbolDerivacion(programa(fuente)), attrs)
const primera = (texto: string) =>
  texto
    .split('\n')
    .slice(1)
    .filter((l) => l)
    .map((l) => l.slice(3))

describe('árbol abstracto (por defecto)', () => {
  it('va ent x = 2 + 3 * 4: la precedencia, sin tokens de puntuación', () => {
    expect(primera(abstracto('va ent x = 2 + 3 * 4'))).toEqual([
      'va ent x =  instruccion',
      '└─ +  aritm',
      '   ├─ 2  ENTERO',
      '   └─ *  termino',
      '      ├─ 3  ENTERO',
      '      └─ 4  ENTERO',
    ])
  })

  it('8 - 3 - 2 asocia a la izquierda', () => {
    expect(primera(abstracto('di 8 - 3 - 2'))).toEqual([
      'di  instruccion',
      '└─ -  aritm',
      '   ├─ -  aritm',
      '   │  ├─ 8  ENTERO',
      '   │  └─ 3  ENTERO',
      '   └─ 2  ENTERO',
    ])
  })

  it('dtype nace en va y se usa en cada variable; tipo y valor suben', () => {
    const t = abstracto(FUENTE_TIPOS, true)
    expect(t).toContain('va ent  instruccion ↑dtype=ent\n')
    expect(t).toContain('x  var ↓dtype=ent\n')
    expect(t).toContain('y  var ↓dtype=ent\n')
    expect(t).toContain('va ent edad =  instruccion ↓dtype=ent\n')
    expect(t).toContain('20  ENTERO ↑tipo=ent ↑valor=20\n')
    expect(t).toContain('*  termino ↑tipo=dec\n')
    expect(t).toContain(
      'cn dec iva =  instruccion ↓dtype=dec ↓categoria=constante',
    )
  })

  it('si y rep: el papel de cada hijo', () => {
    const raiz = arbolAbstracto(programa(FUENTE_TIPOS))
    const si = raiz.hijos[5]
    expect(si.texto).toBe('si')
    expect(si.hijos.map((h) => [h.rol, h.texto])).toEqual([
      ['cond', '>='],
      ['whenTrue', 'di'],
      ['whenFalse', 'di'],
    ])
    expect(si.hijos[1].clase).toBe('simple')
    const rep = raiz.hijos[6]
    expect(rep.hijos.map((h) => [h.rol, h.texto])).toEqual([
      ['times', '3'],
      ['body', 'edad ='],
    ])
  })

  it('solo las instrucciones de primer nivel llevan su línea', () => {
    const raiz = arbolAbstracto(programa(FUENTE_TIPOS))
    expect(raiz.hijos.every((h) => h.esInstruccion)).toBe(true)
    expect(raiz.hijos.map((h) => h.linea)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(raiz.hijos[5].hijos.some((h) => h.esInstruccion)).toBe(false)
    expect(raiz.hijos[0].hijos[0].instr).toBe(0)
  })

  it('los ids son caminos desde la raíz', () => {
    const raiz = arbolAbstracto(programa('di 1 + 2'))
    expect(raiz.id).toBe('0')
    expect(raiz.hijos[0].hijos[0].hijos.map((h) => h.id)).toEqual([
      '0.0.0.0',
      '0.0.0.1',
    ])
  })
})

describe('árbol de derivación (A2): fiel a la gramática G', () => {
  it('va ent edad = 20: cada no terminal hasta el token', () => {
    expect(primera(derivacion('va ent edad = 20'))).toEqual([
      'instruccion',
      '├─ va  VA',
      '├─ tipo',
      '│  └─ ent  T_ENT',
      '└─ listaVars',
      '   └─ var',
      '      ├─ edad  ID',
      '      ├─ =  IGUAL',
      '      └─ expr',
      '         └─ aritm',
      '            └─ termino',
      '               └─ factor',
      '                  └─ 20  ENTERO',
      '↵  SALTO',
    ])
  })

  it('2 + 3 * 4: aritm → aritm + termino y termino → termino * factor', () => {
    const t = primera(derivacion('di 2 + 3 * 4'))
    expect(t.slice(0, 13)).toEqual([
      'instruccion',
      '├─ di  DI',
      '└─ expr',
      '   └─ aritm',
      '      ├─ aritm',
      '      │  └─ termino',
      '      │     └─ factor',
      '      │        └─ 2  ENTERO',
      '      ├─ +  MAS',
      '      └─ termino',
      '         ├─ termino',
      '         │  └─ factor',
      '         │     └─ 3  ENTERO',
    ])
  })

  it('los paréntesis: factor → ( expr )', () => {
    const t = derivacion('di (2 + 3) * 4')
    expect(t).toContain('├─ (  PAR_ABRE')
    expect(t).toContain('└─ )  PAR_CIERRA')
    const doble = derivacion('di ((7))')
    expect(doble.match(/PAR_ABRE/g)).toHaveLength(2)
  })

  it('listaVars → var , listaVars (recursiva por la derecha)', () => {
    const t = primera(derivacion('va ent a, b'))
    expect(t).toEqual([
      'instruccion',
      '├─ va  VA',
      '├─ tipo',
      '│  └─ ent  T_ENT',
      '└─ listaVars',
      '   ├─ var',
      '   │  └─ a  ID',
      '   ├─ ,  COMA',
      '   └─ listaVars',
      '      └─ var',
      '         └─ b  ID',
      '↵  SALTO',
    ])
  })

  it('si con no: SI expr simple NO simple', () => {
    const raiz = arbolDerivacion(programa('va ent x\nsi x > 1 di 1 no x = 2'))
    const si = raiz.hijos[2]
    expect(si.hijos.map((h) => h.clase)).toEqual([
      'SI',
      'expr',
      'simple',
      'NO',
      'simple',
    ])
    expect(si.hijos[1].hijos.map((h) => h.clase)).toEqual([
      'aritm',
      'COMP',
      'aritm',
    ])
  })

  it('el tipo sintetizado no se repite en las producciones unitarias', () => {
    const t = derivacion('di 5', true)
    expect(t).toContain('expr ↑tipo=ent ↑valor=5\n')
    expect(t).toContain('aritm\n')
    expect(t).toContain('termino\n')
    expect(t).toContain('factor ↑tipo=ent ↑valor=5\n')
  })
})

describe('lista plegable (A3)', () => {
  const raiz = arbolAbstracto(programa(FUENTE_TIPOS))
  const todo = () => true

  it('guías, último hijo, posición y padre de cada fila', () => {
    const filas = aplanar(raiz, todo)
    expect(filas[0]).toMatchObject({ nivel: 0, padre: -1, expandido: true })
    const si = filas.findIndex((f) => f.nodo.texto === 'si')
    const cond = filas[si + 1]
    expect(cond).toMatchObject({
      nivel: 2,
      padre: si,
      posicion: 1,
      hermanos: 3,
      ultimo: false,
      guias: [true],
    })
    const ultimaInstr = filas.findLast((f) => f.nivel === 1)
    expect(ultimaInstr?.ultimo).toBe(true)
    const nieto = filas.at(-1)
    expect(nieto?.guias).toEqual([false])
  })

  it('un nodo plegado esconde sus descendientes', () => {
    const plegadoSi = (n: Nodo) => n.texto !== 'si'
    const filas = aplanar(raiz, plegadoSi)
    const si = filas.find((f) => f.nodo.texto === 'si')
    expect(si?.expandido).toBe(false)
    expect(filas).toHaveLength(aplanar(raiz, todo).length - 9)
    expect(filas.find((f) => f.nodo.texto === 'x')?.expandido).toBeNull()
  })

  it(`con más de ${PLEGAR_DESDE} instrucciones empiezan plegadas`, () => {
    const grande = arbolAbstracto(
      programa(
        Array(PLEGAR_DESDE + 1)
          .fill('di 1 + 2')
          .join('\n'),
      ),
    )
    const filas = aplanar(grande, (n) =>
      expandidoPorDefecto(n, PLEGAR_DESDE + 1),
    )
    expect(filas).toHaveLength(1 + PLEGAR_DESDE + 1)
    expect(filas[1].expandido).toBe(false)
    expect(expandidoPorDefecto(grande.hijos[0], PLEGAR_DESDE)).toBe(true)
  })

  it('carpetas: los nodos que tienen hijos', () => {
    const ids = carpetas(arbolAbstracto(programa('di 1 + 2')))
    expect(ids).toEqual(['0', '0.0', '0.0.0'])
  })
})

describe('árbol con errores (A5)', () => {
  it('las líneas descartadas llevan una marca, en el orden de las líneas', () => {
    const r = compile('va ent a = 1\nva x\ndi a\ndi (a\n')
    expect(r.faseFallida).toBe('sintactico')
    const raiz = conLineasDescartadas(
      arbolAbstracto(r.ast as NonNullable<typeof r.ast>),
      r.errores,
    )
    expect(
      raiz.hijos.map((h) => [h.linea, h.descartada !== undefined]),
    ).toEqual([
      [1, false],
      [2, true],
      [3, false],
      [4, true],
    ])
    expect(raiz.hijos[1].descartada).toBe(r.errores[0].mensaje)
    expect(raiz.hijos.map((h) => h.id)).toEqual(['0.0', '0.1', '0.2', '0.3'])
  })

  it('el nodo de cada error semántico y de cada advertencia', () => {
    const r = compile('va ent x = 1 + "a"\nva ent y')
    const raiz = arbolAbstracto(r.ast as NonNullable<typeof r.ast>)
    const marcas = marcarDiagnosticos(raiz, r.errores, r.advertencias)
    const por = (nivel: string) =>
      [...marcas]
        .filter(([, m]) => m.nivel === nivel)
        .map(([id]) => nodoPorId(raiz, id)?.texto)
    expect(por('error')).toEqual(['+'])
    expect(por('advertencia')).toEqual(['va ent x =', 'va ent y'])
  })
})
