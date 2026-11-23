// @vitest-environment node
import { compile } from '@engine/compile'
import { FUENTE_TIPOS } from '@engine/ejemplos'
import { describe, expect, it } from 'vitest'
import { outputText, simbolosView } from '@/store/selectors'

const r = compile(FUENTE_TIPOS)
const traza = r?.traza ?? []

describe('selectores', () => {
  it('marca los símbolos nuevos y los modificados', () => {
    expect(simbolosView(undefined, undefined)).toEqual([])
    const nuevo = simbolosView(traza[1], traza[0])
    expect(nuevo.map((v) => [v.simbolo.nombre, v.change])).toEqual([
      ['edad', 'new'],
    ])
    const cambio = simbolosView(traza[2], traza[1])
    expect(cambio[0].change).toBe('changed')
    expect(simbolosView(traza[3], traza[2])[0].change).toBeNull()
    expect(simbolosView(traza[1], undefined)[0].change).toBeNull()
  })

  it('texto de la salida: una línea por write', () => {
    const salida = ['Ana es adulta', '1.9', '0']
    expect(outputText(salida)).toBe('Ana es adulta\n1.9\n0\n')
    expect(outputText([])).toBe('')
    expect(outputText(salida, 1)).toBe('Ana es adulta\n')
  })
})
