// @vitest-environment node
import { compile } from '@engine/compile'
import { describe, expect, it } from 'vitest'
import { arbolAbstracto, arbolDerivacion } from '@/arbol/arbol'
import {
  ancestros,
  dibujarArbol,
  nodoEnColumna,
  nodoPorId,
  textoAtributos,
} from '@/arbol/layout'

const arbol = (fuente: string) => {
  const ast = compile(fuente).ast
  if (!ast) throw new Error('debe tener árbol')
  return arbolAbstracto(ast)
}

describe('dibujo del árbol (A1)', () => {
  const raiz = arbol('va ent x = 2 + 3 * 4').hijos[0]
  const d = dibujarArbol(raiz, false)
  const por = (etiqueta: string) => {
    const n = d.nodos.find((x) => x.etiqueta === etiqueta)
    if (!n) throw new Error(etiqueta)
    return n
  }

  it('los operadores arriba y los operandos abajo, en orden', () => {
    expect(por('va ent x =').y).toBeLessThan(por('+').y)
    expect(por('+').y).toBeLessThan(por('*').y)
    expect(por('2').x).toBeLessThan(por('*').x)
    expect(por('3').x).toBeLessThan(por('4').x)
    expect(por('3').y).toBe(por('4').y)
  })

  it('los vecinos no se tocan y todo cabe en el dibujo', () => {
    const nivel = [por('3'), por('4')]
    expect(nivel[1].x - nivel[0].x).toBeGreaterThanOrEqual(
      (nivel[0].ancho + nivel[1].ancho) / 2,
    )
    for (const n of d.nodos) {
      expect(n.x - n.ancho / 2).toBeGreaterThanOrEqual(0)
      expect(n.x + n.ancho / 2).toBeLessThanOrEqual(d.ancho)
      expect(n.y + n.alto).toBeLessThanOrEqual(d.alto)
    }
    expect(d.aristas).toHaveLength(d.nodos.length - 1)
  })

  it('con atributos: el tipo sube y dtype baja (M12)', () => {
    const conAttrs = dibujarArbol(arbol('va ent a, b = 1').hijos[0], true)
    const flecha = (hijo: string) =>
      conAttrs.aristas.find((a) => a.hijo.etiqueta === hijo)?.flecha
    expect(flecha('b =')).toBe('baja')
    expect(flecha('1')).toBe('sube')
    expect(conAttrs.nodos.find((n) => n.etiqueta === '1')?.atributos).toBe(
      '↑ent 1',
    )
    expect(dibujarArbol(raiz, false).aristas.every((a) => !a.flecha)).toBe(true)
    const todo = dibujarArbol(arbol('va ent a, b = 1\nva dec d'), true)
    expect(
      todo.aristas
        .filter((a) => a.padre.nodo.clase === 'programa')
        .every((a) => a.flecha === null),
    ).toBe(true)
  })

  it('el papel de cada hijo va encima y cuenta en su ancho', () => {
    const si = arbol('va ent x\nsi x > 1 di 1 no di 2').hijos[1]
    const d2 = dibujarArbol(si, false, (n) => n.rol ?? '')
    expect(d2.nodos.map((n) => n.rol).filter(Boolean)).toEqual([
      'cond',
      'whenTrue',
      'whenFalse',
    ])
    const entonces = d2.nodos.find((n) => n.rol === 'whenTrue')
    expect(entonces?.ancho).toBeGreaterThanOrEqual('whenTrue'.length * 6)
  })

  it('textoAtributos: los sintetizados juntos, los heredados con su nombre', () => {
    expect(
      textoAtributos([
        { name: 'tipo', value: 'ent', kind: 'syn' },
        { name: 'valor', value: '2', kind: 'syn' },
      ]),
    ).toBe('↑ent 2')
    expect(textoAtributos([{ name: 'dtype', value: 'dec', kind: 'inh' }])).toBe(
      '↓dtype=dec',
    )
  })
})

describe('enlace con el editor (A6)', () => {
  it('cada nodo sabe dónde empieza y termina en su línea', () => {
    const r = arbol('va ent x = (2 + 3) * 4\nlee x')
    const va = r.hijos[0]
    expect([va.desde, va.hasta]).toEqual([1, 23])
    const por = va.hijos[0]
    expect([por.texto, por.desde, por.hasta]).toEqual(['*', 12, 23])
    expect([por.hijos[0].desde, por.hijos[0].hasta]).toEqual([12, 19])
    const lee = r.hijos[1]
    expect([lee.desde, lee.hasta]).toEqual([1, 6])
  })

  it('el cursor elige el nodo más profundo que lo contiene', () => {
    const r = arbol('di 2 + 3 * 4')
    expect(nodoEnColumna(r, 1, 4)?.texto).toBe('2')
    expect(nodoEnColumna(r, 1, 6)?.texto).toBe('+')
    expect(nodoEnColumna(r, 1, 10)?.texto).toBe('*')
    expect(nodoEnColumna(r, 1, 1)?.texto).toBe('di')
    expect(nodoEnColumna(r, 2, 1)).toBeNull()
  })

  it('en la derivación, los tokens de posición exacta también', () => {
    const ast = compile('di 2 + 3').ast
    if (!ast) throw new Error('árbol')
    const d = arbolDerivacion(ast)
    expect(nodoEnColumna(d, 1, 8)?.clase).toBe('ENTERO')
    expect(nodoEnColumna(d, 1, 6)?.clase).toBe('MAS')
  })

  it('ancestros y nodo por id', () => {
    const r = arbol('di 2 + 3')
    expect(ancestros('0.0.0.1')).toEqual(['0', '0.0', '0.0.0'])
    expect(nodoPorId(r, '0.0.0.1')?.texto).toBe('3')
    expect(nodoPorId(r, '0.9')).toBeNull()
  })
})
