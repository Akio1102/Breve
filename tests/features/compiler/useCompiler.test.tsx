import { FUENTE_TIPOS } from '@engine/ejemplos'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AUTO_COMPILE_MAX_CHARS,
  AUTO_COMPILE_MS,
  useCompiler,
} from '@/features/compiler/useCompiler'
import { errorCount, isStale, useAppStore } from '@/store/appStore'

const store = () => useAppStore.getState()

describe('compilación automática', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    store().loadFile('tipos.brv', FUENTE_TIPOS)
  })
  afterEach(() => vi.useRealTimers())

  it('compila al dejar de escribir, no en cada tecla', () => {
    renderHook(() => useCompiler())
    store().setSource('va ent x = 1\ndi y')
    vi.advanceTimersByTime(AUTO_COMPILE_MS - 50)
    store().setSource('va ent x = 1\ndi yy')
    vi.advanceTimersByTime(AUTO_COMPILE_MS - 50)
    expect(isStale(store())).toBe(true)
    vi.advanceTimersByTime(100)
    expect(isStale(store())).toBe(false)
    expect(store().result?.errores[0].mensaje).toMatch(/'yy'/)
  })

  it('mientras se escribe, cuenta los errores de la última compilación', () => {
    renderHook(() => useCompiler())
    store().setSource('di y')
    vi.advanceTimersByTime(AUTO_COMPILE_MS)
    expect(errorCount(store())).toBe(1)
    store().setSource('di yy')
    expect(errorCount(store())).toBe(1)
  })

  it('no compila solo un código muy grande', () => {
    renderHook(() => useCompiler())
    store().setSource(`di 1\n${'// x\n'.repeat(AUTO_COMPILE_MAX_CHARS / 5)}`)
    vi.advanceTimersByTime(AUTO_COMPILE_MS * 2)
    expect(isStale(store())).toBe(true)
  })

  it('deja de compilar al desmontarse', () => {
    const { unmount } = renderHook(() => useCompiler())
    unmount()
    store().setSource('di 2')
    vi.advanceTimersByTime(AUTO_COMPILE_MS * 2)
    expect(isStale(store())).toBe(true)
  })
})
