import { compile, ejecutar } from '@engine/compile'
import { FUENTE_POTENCIA } from '@engine/ejemplos'
import { pasosDeEjecucion } from '@engine/pasosEjecucion'
import type { PasoTraza } from '@engine/types'
import { describe, expect, it } from 'vitest'

function pasos(src: string, entrada: string[], optimizado = false) {
  const r = compile(src)
  if (!r.ok) throw new Error(r.errores[0]?.mensaje)
  const o = r.optimizado
  const codigo = optimizado && o ? o : r
  const x = ejecutar(
    {
      tablaSimbolos: r.tablaSimbolos,
      tresDirecciones: codigo.tresDirecciones,
      cuadruplas: codigo.cuadruplas,
    },
    entrada,
  )
  return pasosDeEjecucion(
    { tresDirecciones: codigo.tresDirecciones, tablaSimbolos: r.tablaSimbolos },
    r.ast,
    x,
  )
}

const vueltas = (ps: PasoTraza[], linea: number) =>
  ps
    .filter((p) => p.linea === linea)
    .map((p) => p.vuelta)
    .filter((v, i, a) => i === 0 || v !== a[i - 1])

describe('vueltas del rep en la traza de la ejecución', () => {
  for (const optimizado of [false, true])
    it(`potencia.brv con 5 vueltas (${optimizado ? 'optimizado' : 'original'})`, () => {
      const ps = pasos(FUENTE_POTENCIA, ['Ana', '2', '5'], optimizado)
      const l9 = ps.filter((p) => p.linea === 9)
      expect(l9.every((p) => p.vueltas === 5)).toBe(true)
      expect(vueltas(ps, 9)).toEqual(
        optimizado ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
      )
      for (let v = 1; v <= 5; v++)
        expect(
          l9.filter(
            (p) =>
              p.vuelta === v && p.cambios.some((c) => c.nombre === 'potencia'),
          ),
        ).toHaveLength(1)
    })

  it('un rep sin vueltas: preparación y salida', () => {
    const ps = pasos(FUENTE_POTENCIA, ['Ana', '2', '0'])
    expect(vueltas(ps, 9)).toEqual([0, 1])
    expect(ps.find((p) => p.linea === 9)?.vueltas).toBe(0)
  })

  it('un error dentro del ciclo deja la vuelta sin total', () => {
    const ps = pasos('va ent x = 1\nrep 40 x = x * 3\ndi x', [])
    const ultimo = ps.at(-1)
    expect(ultimo?.accion).toBe('errorEjecucion')
    expect(ultimo?.vueltas).toBeUndefined()
    expect(ps.filter((p) => p.linea === 2).at(-2)?.vuelta).toBeGreaterThan(19)
  })

  it('un rep desenrollado (G4) no tiene vueltas', () => {
    const ps = pasos('va ent s\nrep 3 s = s + 2\ndi s', [], true)
    expect(ps.some((p) => p.vuelta !== undefined)).toBe(false)
  })
})

describe('papel de cada cuádrupla', () => {
  it('rep original: inicio, condición, salida, incremento y vuelta atrás', () => {
    const ps = pasos(FUENTE_POTENCIA, ['Ana', '2', '1'])
    const tipos = ps.filter((p) => p.linea === 9).map((p) => p.papel?.tipo)
    expect(tipos).toEqual([
      'repInicio',
      'repCondicion',
      'repSalida',
      undefined,
      undefined,
      'repIncremento',
      'repIncremento',
      'repVuelve',
      'repCondicion',
      'repSalida',
    ])
    const salidas = ps.filter((p) => p.papel?.tipo === 'repSalida')
    expect(salidas.map((p) => p.papel)).toEqual([
      { tipo: 'repSalida', sale: false, destino: 14 },
      { tipo: 'repSalida', sale: true, destino: 14 },
    ])
  })

  it('rep optimizado: la condición al final vuelve atrás (G2)', () => {
    const ps = pasos(FUENTE_POTENCIA, ['Ana', '2', '2'], true)
    const sigue = ps.filter((p) => p.papel?.tipo === 'repSigue')
    expect(sigue.map((p) => p.papel)).toEqual([
      { tipo: 'repSigue', sigue: true, destino: 8 },
      { tipo: 'repSigue', sigue: false, destino: 8 },
    ])
  })

  it('si: la condición y el final de la rama', () => {
    const ps = pasos(FUENTE_POTENCIA, ['Ana', '2', '5'])
    const l12 = ps.filter((p) => p.linea === 12)
    expect(l12.map((p) => p.papel).filter(Boolean)).toEqual([
      {
        tipo: 'siCondicion',
        condicion: 't5',
        verdadera: false,
        salta: false,
        destino: 20,
      },
      { tipo: 'siFin', destino: 21 },
    ])
  })
})
