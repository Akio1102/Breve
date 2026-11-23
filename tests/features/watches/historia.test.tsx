import { compile, ejecutar } from '@engine/compile'
import { ENTRADAS_POTENCIA, FUENTE_POTENCIA } from '@engine/ejemplos'
import { pasosDeEjecucion } from '@engine/pasosEjecucion'
import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { StepCard } from '@/features/inspector/StepCard'
import { cambiosHasta, historia, puntos } from '@/features/watches/historia'
import { WatchesView } from '@/features/watches/WatchesView'
import { activeTrace, useAppStore } from '@/store/appStore'

const potencia = () => {
  const r = compile(FUENTE_POTENCIA)
  const x = ejecutar(r, ENTRADAS_POTENCIA[0].split('\n'))
  return pasosDeEjecucion(r, r.ast, x)
}

describe('historia de una vigilada (T7)', () => {
  it('con la traza de la ejecución, potencia pasa por 1, 2, 4, 8, 16, 32', () => {
    const h = historia(potencia(), 'potencia')
    expect(h.valores).toEqual([0, 1, 2, 4, 8, 16, 32])
    expect(h.tipo).toBe('ent')
    expect(h.pasos[0]).toBe(0)
  })

  it('cuántos cambios hubo hasta un paso', () => {
    const h = { pasos: [0, 3, 7], valores: [0, 1, 2], tipo: 'ent' as const }
    expect(cambiosHasta(h, 0)).toBe(1)
    expect(cambiosHasta(h, 6)).toBe(2)
    expect(cambiosHasta(h, 7)).toBe(3)
    expect(cambiosHasta(h, 100)).toBe(3)
  })

  it('el minigráfico usa como mucho 200 puntos y siempre el último', () => {
    expect(puntos([5])).toBe('')
    const p = puntos(Array.from({ length: 1000 }, (_, i) => i)).split(' ')
    expect(p.length).toBeLessThanOrEqual(201)
    expect(p.at(-1)).toBe('100.00,1.00')
    expect(p[0]).toBe('0.00,19.00')
  })
})

describe('vigiladas y paso actual en la interfaz (T6, T7)', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      lang: 'es',
      traceKind: 'execution',
      optimized: false,
      input: ENTRADAS_POTENCIA[0],
      watches: ['potencia'],
      execution: null,
      executedKey: null,
      mode: 'edit',
    })
    useAppStore.getState().loadFile('potencia.brv', FUENTE_POTENCIA)
    act(() => useAppStore.getState().startDebugging())
  })

  it('la vigilada muestra los valores que tomó hasta el paso', () => {
    render(<WatchesView />)
    const n = activeTrace(useAppStore.getState()).length
    act(() => useAppStore.getState().goTo(n - 1))
    const lista = screen.getByRole('list', {
      name: 'Valores de potencia hasta este paso (7)',
    })
    expect(lista).toHaveTextContent('0→1→2→4→8→16→32')
    expect(document.querySelector('polyline')).not.toBeNull()
  })

  it('la tarjeta dice qué cambió: el valor de antes y el de ahora', () => {
    render(<StepCard />)
    const k = activeTrace(useAppStore.getState()).findIndex(
      (p) => p.detalle === 'potencia = t3',
    )
    act(() => useAppStore.getState().goTo(k))
    const cambios = screen.getByRole('list', {
      name: 'Lo que cambió en la tabla en este paso',
    })
    expect(within(cambios).getByRole('listitem')).toHaveTextContent(
      /^potencia1\s*2$/,
    )
  })

  it('en la traza semántica, un dibujo pequeño marca el nodo del paso', () => {
    act(() => useAppStore.getState().setTraceKind('semantic'))
    render(<StepCard />)
    const k = activeTrace(useAppStore.getState()).findIndex((p) =>
      p.detalle.startsWith('potencia * base'),
    )
    act(() => useAppStore.getState().goTo(k))
    const dibujo = screen.getByRole('figure', {
      name: 'El nodo del árbol que analiza este paso',
    })
    expect(
      dibujo.querySelector('rect.stroke-accent')?.parentElement,
    ).toHaveTextContent('*')
  })
})
