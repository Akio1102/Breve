// @vitest-environment node
import { compile } from '@engine/compile'
import { FUENTE_TIPOS } from '@engine/ejemplos'
import { CADA } from '@engine/traza'
import type { PasoTraza, Simbolo } from '@engine/types'
import { describe, expect, it } from 'vitest'

function programaLargo(n: number): string {
  const l: string[] = []
  for (let i = 0; i < n; i++) l.push(`va ent v${i} = ${i}`)
  for (let i = 1; i < n; i++) l.push(`v${i} = v${i - 1} + v${i}`)
  l.push(`di v${n - 1}`)
  return l.join('\n')
}

function tablaIngenua(traza: PasoTraza[], k: number): Simbolo[] {
  const ultimos = new Map<number, Simbolo>()
  for (let i = 0; i <= k; i++)
    for (const s of traza[i].cambios) ultimos.set(s.numero, s)
  return [...ultimos.values()].sort((a, b) => a.numero - b.numero)
}

describe('traza: tabla de cada paso a partir de los cambios', () => {
  const { traza } = compile(programaLargo(80))

  it('tiene varios puntos de control', () => {
    expect(traza.length).toBeGreaterThan(CADA * 4)
  })

  it('cada paso da la misma tabla que repetir sus cambios', () => {
    const orden = [...traza.keys()].reverse()
    orden.push(0, CADA, CADA - 1, CADA + 1, traza.length - 1, 5, 5)
    for (const k of orden)
      expect(traza[k].simbolos).toEqual(tablaIngenua(traza, k))
  })

  it('pedir el mismo paso dos veces da el mismo arreglo', () => {
    expect(traza[10].simbolos).toBe(traza[10].simbolos)
  })

  it('la tabla final coincide con la de la compilación (sin temporales)', () => {
    const r = compile(FUENTE_TIPOS)
    const final = r.traza.at(-1)?.simbolos ?? []
    expect(final.map((s) => s.nombre)).toEqual(
      r.tablaSimbolos
        .filter((s) => s.categoria !== 'temporal')
        .map((s) => s.nombre),
    )
  })

  it('el JSON de un paso lleva los cambios, no la tabla completa', () => {
    const json = JSON.parse(JSON.stringify(traza.at(-1)))
    expect(json).not.toHaveProperty('simbolos')
    expect(json).toHaveProperty('cambios')
  })

  it('un paso que no cambia la tabla no tiene cambios', () => {
    const buscar = traza.find(
      (p) => p.accion === 'buscar' && p.cambios.length === 0,
    )
    expect(buscar).toBeDefined()
  })

  it('crece linealmente: cada paso guarda solo sus cambios', {
    timeout: 60_000,
  }, () => {
    const r = compile(programaLargo(5000))
    expect(r.ok).toBe(true)
    const guardados = r.traza.reduce((n, p) => n + p.cambios.length, 0)
    expect(guardados).toBeLessThan(r.traza.length * 2)
    expect(JSON.stringify(r).length).toBeGreaterThan(0)
  })
})
