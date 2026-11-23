// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import { ENTRADAS_POTENCIA, FUENTE_POTENCIA } from '@engine/ejemplos'
import { pasosDeEjecucion } from '@engine/pasosEjecucion'
import { describe, expect, it } from 'vitest'

const preparar = (fuente: string, entrada: string[] = []) => {
  const r = compile(fuente)
  const x = ejecutar(r, entrada)
  return { r, x, pasos: pasosDeEjecucion(r, r.ast, x) }
}

describe('traza de la ejecución (T1)', () => {
  const { r, x, pasos } = preparar(
    FUENTE_POTENCIA,
    ENTRADAS_POTENCIA[0].split('\n'),
  )

  it('un paso por cuádrupla ejecutada, más la memoria inicial', () => {
    expect(pasos).toHaveLength(x.instrucciones + 1)
    expect(pasos[0]).toMatchObject({ accion: 'arranque', cuadrupla: 0 })
    expect(pasos.at(-1)).toMatchObject({
      accion: 'terminar',
      detalle: 'halt',
      cuadrupla: 21,
    })
    expect(pasos.map((p) => p.cuadrupla).slice(1, 10)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ])
  })

  it('cada paso dice qué hizo y qué cambió en la memoria', () => {
    expect(pasos[1]).toMatchObject({
      accion: 'copiar',
      detalle: 'potencia = 1',
      resultado: 'potencia = 1',
      linea: 4,
    })
    expect(pasos[1].cambios.map((s) => [s.nombre, s.valor])).toEqual([
      ['potencia', 1],
    ])
    expect(pasos[2]).toMatchObject({
      accion: 'leerEntrada',
      resultado: 'nombre = "Ana"',
    })
    const hola = pasos.find((p) => p.accion === 'escribir')
    expect(hola).toMatchObject({ detalle: 'write t1', resultado: 'Hola Ana' })
    const op = pasos.find((p) => p.detalle === 't3 = potencia * base')
    expect(op).toMatchObject({ accion: 'calcular', resultado: 't3 = 2' })
  })

  it('los saltos dicen adónde sigue el programa', () => {
    const ifs = pasos.filter((p) => p.detalle === 'if t2 goto 14')
    expect(ifs.map((p) => p.resultado)).toEqual([
      'pc = 9',
      'pc = 9',
      'pc = 9',
      'pc = 9',
      'pc = 9',
      'pc = 14',
    ])
    expect(ifs.at(-1)?.siguiente).toBe(14)
    const goto = pasos.find((p) => p.detalle === 'goto 7')
    expect(goto).toMatchObject({ accion: 'saltar', resultado: 'pc = 7' })
  })

  it('la tabla de cada paso tiene los valores de la memoria hasta ese paso', () => {
    const valor = (k: number, nombre: string) =>
      pasos[k].simbolos.find((s) => s.nombre === nombre)?.valor
    expect(valor(0, 'potencia')).toBe(0)
    expect(valor(1, 'potencia')).toBe(1)
    const final = pasos.at(-1)
    for (const s of r.tablaSimbolos)
      expect(
        final?.simbolos.find((x) => x.nombre === s.nombre)?.valor,
        s.nombre,
      ).toEqual(x.memoria[s.nombre] ?? s.valor)
  })

  it('la salida escrita hasta cada paso', () => {
    expect(pasos[0].salida).toBe(0)
    expect(pasos.at(-1)?.salida).toBe(x.salida.length)
    const k = pasos.findIndex((p) => p.accion === 'escribir')
    expect(pasos[k - 1].salida).toBe(0)
    expect(pasos[k].salida).toBe(1)
  })

  it('los pasos se agrupan por instrucción del programa', () => {
    const rep = pasos.filter((p) => p.linea === 9)
    expect(new Set(rep.map((p) => p.instr))).toEqual(new Set([7]))
  })
})

describe('traza de la ejecución con errores', () => {
  it('un error de ejecución es el último paso', () => {
    const { pasos } = preparar('va ent a = 0\ndi 1 / a')
    expect(pasos.at(-1)).toMatchObject({
      accion: 'errorEjecucion',
      detalle: 't1 = 1 / a',
      resultado: 'división entre cero',
      linea: 2,
    })
  })

  it('el límite de instrucciones agrega un paso con el error', () => {
    const { x, pasos } = preparar('va ent s\nrep 100000 s = s + 1')
    expect(x.limiteAlcanzado).toBe(true)
    expect(pasos).toHaveLength(x.instrucciones + 2)
    expect(pasos.at(-1)?.accion).toBe('errorEjecucion')
    expect(pasos.at(-1)?.resultado).toMatch(/límite de 100 000/)
  })
})
