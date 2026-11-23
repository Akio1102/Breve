// @vitest-environment node
import { compile } from '@engine/compile'
import { FUENTE_TIPOS } from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import { back, shouldPause, stepInto, stepOver } from '@/store/navigation'

const trace = compile(FUENTE_TIPOS)?.traza ?? []
const last = trace.length - 1

describe('navegación por la traza', () => {
  it('siguiente paso y atrás no se salen de la traza', () => {
    expect(stepInto(trace, 0)).toBe(1)
    expect(stepInto(trace, last)).toBe(last)
    expect(stepInto([], 0)).toBe(0)
    expect(back(0)).toBe(0)
    expect(back(3)).toBe(2)
  })

  it('siguiente línea salta todos los pasos de la línea actual', () => {
    const i = trace.findIndex((p) => p.linea === 7)
    const next = stepOver(trace, i)
    expect(trace[next].linea).toBe(8)
    expect(trace.slice(i, next).every((p) => p.linea === 7)).toBe(true)
    expect(stepOver(trace, last)).toBe(last)
  })

  it('siguiente línea se detiene en un punto de interrupción', () => {
    expect(trace[stepOver(trace, 0, new Set([1]))].linea).toBe(1)
  })

  it('pausa al final y en los puntos de interrupción, no en el inicio', () => {
    const bps = new Set([1])
    expect(shouldPause(trace, 0, bps)).toBe(false)
    expect(shouldPause(trace, 1, bps)).toBe(true)
    expect(shouldPause(trace, 5, bps)).toBe(false)
    expect(shouldPause(trace, last, new Set())).toBe(true)
  })
})
