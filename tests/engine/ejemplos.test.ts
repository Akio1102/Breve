// @vitest-environment node
import { compile } from '@engine/compile'
import {
  FUENTE_ERROR_EJECUCION,
  FUENTE_ERROR_LEXICO,
  FUENTE_ERROR_SEMANTICO,
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { formatTAC, formatValor } from '@engine/formato'
import { evaluateWatch } from '@engine/watch'
import { describe, expect, it } from 'vitest'

const potencia = compile(FUENTE_POTENCIA)
if (!potencia) throw new Error('potencia.brv debe compilar')

const ESPERADO_6_4 = [
  'potencia = 1',
  'read nombre',
  'read base',
  'read exponente',
  't1 = "Hola " + nombre',
  'write t1',
  '_c1 = 0',
  't2 = _c1 >= exponente',
  'if t2 goto 14',
  't3 = potencia * base',
  'potencia = t3',
  't4 = _c1 + 1',
  '_c1 = t4',
  'goto 7',
  'write "Resultado:"',
  'write potencia',
  't5 = potencia > 100',
  'if t5 goto 20',
  'write "Resultado pequeño"',
  'goto 21',
  'write "Resultado grande"',
  'halt',
]

describe('compilación de los ejemplos', () => {
  it('cualquier programa válido compila', () => {
    expect(compile('di 1\n').ok).toBe(true)
    expect(potencia.ok).toBe(true)
    expect(compile(FUENTE_TIPOS)?.ok).toBe(true)
    expect(compile(FUENTE_ERROR_EJECUCION)?.ok).toBe(true)
  })

  it('potencia.brv produce las 22 instrucciones del documento', () => {
    expect(potencia.tresDirecciones.map(formatTAC)).toEqual(ESPERADO_6_4)
  })

  it('tripletas y cuádruplas: mismo número de instrucciones y conversión desde tres direcciones', () => {
    for (const r of [potencia, compile(FUENTE_TIPOS)]) {
      expect(r?.tripletas).toHaveLength(r?.tresDirecciones.length ?? -1)
      expect(r?.cuadruplas).toHaveLength(r?.tresDirecciones.length ?? -1)
    }
    expect(potencia.tripletas[9]).toEqual({
      op: '*',
      arg1: 'potencia',
      arg2: 'base',
    })
    expect(potencia.cuadruplas[9]).toEqual({
      op: '*',
      arg1: 'potencia',
      arg2: 'base',
      resultado: 't3',
    })
    expect(potencia.tripletas[8]).toEqual({
      op: 'if',
      arg1: '(7)',
      arg2: '(14)',
    })
    expect(potencia.tripletas[12]).toEqual({
      op: '=',
      arg1: '_c1',
      arg2: '(11)',
    })
    expect(potencia.cuadruplas[13]).toEqual({
      op: 'goto',
      arg1: '',
      arg2: '',
      resultado: '7',
    })
    const conTemporal = potencia.tripletas.flatMap((t) => [t.arg1, t.arg2])
    expect(conTemporal.some((a) => /^t\d+$/.test(a))).toBe(false)
  })

  it('tabla de símbolos de potencia.brv: variables y temporales con su dirección', () => {
    expect(
      potencia.tablaSimbolos.map((s) => [
        s.nombre,
        s.categoria,
        s.tipo,
        s.direccion,
      ]),
    ).toEqual([
      ['nombre', 'variable', 'txt', 0],
      ['base', 'variable', 'ent', 4],
      ['exponente', 'variable', 'ent', 8],
      ['potencia', 'variable', 'ent', 12],
      ['t1', 'temporal', 'txt', 16],
      ['_c1', 'temporal', 'ent', 20],
      ['t2', 'temporal', 'bool', 24],
      ['t3', 'temporal', 'ent', 25],
      ['t4', 'temporal', 'ent', 29],
      ['t5', 'temporal', 'bool', 33],
    ])
    const pot = potencia.tablaSimbolos[3]
    expect(pot).toMatchObject({ valor: 1, lineasReferencia: [9, 11, 12] })
  })

  it('el análisis semántico es estático: lee marca inicializada sin valor', () => {
    const leer = potencia.traza.filter((p) => p.accion === 'leer')
    expect(leer.map((p) => p.detalle)).toEqual([
      'lee nombre : txt',
      'lee base : ent',
      'lee exponente : ent',
    ])
    const fin = potencia.traza.at(-1)
    expect(fin?.accion).toBe('fin')
    expect(fin?.simbolos.find((s) => s.nombre === 'base')).toMatchObject({
      valor: 0,
      inicializado: true,
    })
    expect(fin?.simbolos.some((s) => s.categoria === 'temporal')).toBe(false)
  })

  it('advertencias y traza del ejemplo de tipos', () => {
    const r = compile(FUENTE_TIPOS)
    expect(r?.advertencias).toHaveLength(2)
    expect(r?.traza[0].accion).toBe('inicio')
    expect(r?.traza[1].detalle).toBe('insertar(edad, ent, variable)')
  })

  it('cada ejemplo con errores falla en su fase y no genera código', () => {
    expect(compile(FUENTE_ERROR_LEXICO)?.faseFallida).toBe('lexico')
    const sin = compile(FUENTE_ERROR_SINTACTICO)
    expect(sin?.faseFallida).toBe('sintactico')
    expect(sin?.errores).toHaveLength(5)
    const sem = compile(FUENTE_ERROR_SEMANTICO)
    expect(sem?.faseFallida).toBe('semantico')
    expect(sem?.errores.every((e) => e.fase === 'semantico')).toBe(true)
    expect(
      sem?.errores.some((e) => /leer en la constante/.test(e.mensaje)),
    ).toBe(true)
    expect(sem?.traza.length).toBeGreaterThan(0)
    expect(sem?.cuadruplas).toEqual([])
  })

  it('formato de valores', () => {
    expect(formatValor(0, 'dec')).toBe('0.0')
    expect(formatValor(1.9, 'dec')).toBe('1.9')
    expect(formatValor('Ana')).toBe('"Ana"')
    expect(formatValor(true)).toBe('verdadero')
  })

  it('vigiladas: busca en la tabla del paso', () => {
    const traza = potencia.traza
    expect(evaluateWatch('potencia', traza.at(-1))).toEqual({
      ok: true,
      value: '1',
      type: 'ent',
    })
    expect(evaluateWatch('potencia', traza[0])).toEqual({
      ok: false,
      error: 'undeclared',
    })
    expect(evaluateWatch('1 +', traza[0])).toEqual({
      ok: false,
      error: 'onlyNames',
    })
    expect(evaluateWatch('x', undefined)).toEqual({
      ok: false,
      error: 'noStep',
    })
  })
})
