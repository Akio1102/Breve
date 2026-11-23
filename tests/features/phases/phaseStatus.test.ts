// @vitest-environment node
import { compile, ejecutar } from '@engine/compile'
import {
  FUENTE_ERROR_LEXICO,
  FUENTE_ERROR_SEMANTICO,
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import { phaseStatuses } from '@/features/phases/phaseStatus'

const st = (src: string, stale = false) =>
  Object.values(phaseStatuses({ result: compile(src), stale }))

describe('estado de las fases', () => {
  it('programa válido: compilación correcta y ejecución pendiente', () => {
    expect(st(FUENTE_TIPOS)).toEqual(['ok', 'ok', 'ok', 'ok', 'pending'])
  })

  it('la ejecución queda correcta o con errores según la entrada', () => {
    const result = compile(FUENTE_POTENCIA)
    const run = (entrada: string) =>
      phaseStatuses({
        result,
        stale: false,
        execution: ejecutar(result, entrada.split('\n')),
      }).ejecucion
    expect(run('Ana\n2\n5')).toBe('ok')
    expect(run('Ana\nabc\n5')).toBe('error')
    expect(
      phaseStatuses({ result, stale: false, execution: null }).ejecucion,
    ).toBe('pending')
  })

  it('la fase que falla queda en error y las siguientes pendientes', () => {
    const P = 'pending'
    expect(st(FUENTE_ERROR_LEXICO)).toEqual(['error', P, P, P, P])
    expect(st(FUENTE_ERROR_SINTACTICO)).toEqual(['ok', 'error', P, P, P])
    expect(st(FUENTE_ERROR_SEMANTICO)).toEqual(['ok', 'ok', 'error', P, P])
  })

  it('cualquier programa válido compila', () => {
    expect(st('di 1\n')).toEqual(['ok', 'ok', 'ok', 'ok', 'pending'])
  })

  it('sin resultado o con cambios sin compilar: pendiente', () => {
    expect(
      new Set(Object.values(phaseStatuses({ result: null, stale: false }))),
    ).toEqual(new Set(['pending']))
    expect(new Set(st(FUENTE_TIPOS, true))).toEqual(new Set(['pending']))
  })
})
