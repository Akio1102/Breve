// @vitest-environment node
import { compile } from '@engine/compile'
import { analizarLexico } from '@engine/lexer'
import { analizarSintactico } from '@engine/parser'
import type { Expr } from '@engine/types'
import { describe, expect, it } from 'vitest'
import { posicionDeColumna } from '@/features/editor/execLine'

function fragmentos(fuente: string) {
  const lineas = fuente.split('\n')
  return compile(fuente).traza.map((p) =>
    p.columna === undefined
      ? `${p.accion}`
      : `${p.accion} [${[...lineas[p.linea - 1]]
          .slice(p.columna - 1, p.columna - 1 + (p.largo ?? 0))
          .join('')}] ${p.detalle}`,
  )
}

const expr = (fuente: string): Expr => {
  const [i] = analizarSintactico(analizarLexico(fuente).tokens).ast
    .instrucciones
  if (i.tipo !== 'Di') throw new Error('se esperaba di')
  return i.valor
}

describe('extensión de las expresiones (parser)', () => {
  it('una operación va de su primer operando al final del último', () => {
    const e = expr('di 2 + 3 * 4')
    expect([e.desde, e.hasta]).toEqual([4, 13])
    if (e.tipo !== 'Binaria') throw new Error()
    expect([e.der.desde, e.der.hasta]).toEqual([8, 13])
  })

  it('los paréntesis forman parte de la expresión que rodean', () => {
    const e = expr('di (2 + 3) * 4')
    if (e.tipo !== 'Binaria') throw new Error()
    expect([e.izq.desde, e.izq.hasta]).toEqual([4, 11])
    expect([e.desde, e.hasta]).toEqual([4, 15])
  })

  it('el menos unario empieza en el signo; un emoji cuenta como un carácter', () => {
    expect([expr('di -x').desde, expr('di -x').hasta]).toEqual([4, 6])
    expect([expr('di "😀a"').desde, expr('di "😀a"').hasta]).toEqual([4, 8])
  })
})

describe('traza con el fragmento y el código de cada paso', () => {
  it('cada operación señala su subexpresión y la escribe con su precedencia', () => {
    expect(fragmentos('di 2 + 3 * 4')).toEqual([
      'inicio',
      'operacion [3 * 4] 3 * 4 : ent * ent',
      'operacion [2 + 3 * 4] 2 + (3 * 4) : ent + ent (suma)',
      'mostrar [di 2 + 3 * 4] di 2 + (3 * 4) : ent',
      'fin',
    ])
  })

  it('dos usos del mismo nombre en una línea se distinguen', () => {
    const f = fragmentos('va ent x = 1\nsi x > 0 di "a" no di x')
    const busquedas = compile('va ent x = 1\nsi x > 0 di "a" no di x')
      .traza.filter((p) => p.accion === 'buscar')
      .map((p) => [p.linea, p.columna])
    expect(busquedas).toEqual([
      [2, 4],
      [2, 23],
    ])
    expect(f).toContain('condicion [x > 0] si x > 0 : bool')
  })

  it('declarar, asignar, leer y rep señalan lo suyo', () => {
    const f = fragmentos('va ent n\nlee n\nva dec d = n * 2\nrep n di d')
    expect(f).toContain('insertar [n] insertar(n, ent, variable)')
    expect(f).toContain('leer [lee n] lee n : ent')
    expect(f).toContain('asignar [n * 2] d = n * 2 : dec ← ent')
    expect(f).toContain('repetir [n] rep n : ent')
    expect(f).toContain('mostrar [di d] di d : dec')
  })

  it('los errores y advertencias señalan su fragmento', () => {
    expect(fragmentos('di "a" == 3')).toContain(
      'error [==] "a" == 3 : txt == ent',
    )
    expect(fragmentos('va ent x\ndi x')).toContain(
      'advertencia [x] x sin valor explícito ni lee',
    )
  })

  it('un código muy largo se abrevia en el detalle', () => {
    const suma = Array(40).fill('1').join(' + ')
    const op = compile(`di ${suma}`)
      .traza.filter((p) => p.accion === 'operacion')
      .at(-1)
    expect(op?.detalle.length).toBeLessThan(80)
    expect(op?.detalle).toContain('… : ent + ent (suma)')
  })
})

describe('columnas del compilador en el editor', () => {
  const linea = (text: string) => ({ from: 10, to: 10 + text.length, text })

  it('sin caracteres especiales, la columna 1 es el inicio de la línea', () => {
    expect(posicionDeColumna(linea('di 1'), 1)).toBe(10)
    expect(posicionDeColumna(linea('di 1'), 4)).toBe(13)
  })

  it('un emoji ocupa dos unidades en el editor pero una columna', () => {
    expect(posicionDeColumna(linea('di "😀a"'), 6)).toBe(10 + 6)
  })

  it('una columna más allá del final se queda en el final', () => {
    expect(posicionDeColumna(linea('di 1'), 99)).toBe(14)
  })
})
