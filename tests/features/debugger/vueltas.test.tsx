import { ENTRADAS_POTENCIA, FUENTE_POTENCIA } from '@engine/ejemplos'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { StepCard } from '@/features/inspector/StepCard'
import { VariablesView } from '@/features/inspector/VariablesView'
import { tramos } from '@/features/timeline/tramos'
import { TraceView } from '@/features/trace/TraceView'
import {
  activeTrace,
  numeroDePaso,
  totalDePasos,
  useAppStore,
} from '@/store/appStore'

const store = () => useAppStore.getState()

function recorrerEjecucion() {
  localStorage.clear()
  useAppStore.setState({
    lang: 'es',
    traceKind: 'execution',
    traceDetail: 'full',
    optimized: false,
    input: ENTRADAS_POTENCIA[0],
    execution: null,
    executedKey: null,
    mode: 'edit',
  })
  store().loadFile('potencia.brv', FUENTE_POTENCIA)
  act(() => store().startDebugging())
}

function irA(f: (i: number) => boolean) {
  const i = activeTrace(store()).findIndex((_, k) => f(k))
  act(() => store().goTo(i))
}

describe('trazas más claras', () => {
  beforeEach(() => localStorage.clear())

  it('la tarjeta explica el papel del paso, dice la vuelta y muestra las cuádruplas de la línea', () => {
    recorrerEjecucion()
    irA((k) => activeTrace(store())[k].papel?.tipo === 'repVuelve')
    render(<StepCard />)
    const tarjeta = screen.getByRole('region', { name: 'Paso actual' })
    expect(tarjeta).toHaveTextContent('Vuelta 1 de 5')
    expect(tarjeta).toHaveTextContent(
      'Fin de la vuelta: vuelve a la condición del rep (cuádrupla 7)',
    )
    const cuadruplas = within(tarjeta).getByRole('figure', {
      name: 'Cuádruplas de esta línea',
    })
    expect(within(cuadruplas).getAllByRole('listitem')).toHaveLength(8)
    expect(cuadruplas.querySelector('[aria-current="step"]')).toHaveTextContent(
      'goto 7',
    )
    expect(cuadruplas).not.toHaveTextContent('halt')
  })

  it('la condición del si dice si es verdadera o falsa y adónde sigue', () => {
    recorrerEjecucion()
    irA((k) => activeTrace(store())[k].papel?.tipo === 'siCondicion')
    render(<StepCard />)
    expect(
      screen.getByRole('region', { name: 'Paso actual' }),
    ).toHaveTextContent(
      'La condición del si (t5) es falsa: sigue con la cuádrupla siguiente.',
    )
  })

  it('la lista agrupa el rep por vueltas, plegadas salvo la del paso actual', async () => {
    const user = userEvent.setup()
    recorrerEjecucion()
    irA((k) => activeTrace(store())[k].vuelta === 2)
    render(<TraceView />)
    const lista = screen.getByRole('list', { name: 'Traza de la ejecución' })
    for (const v of [
      'Preparación del rep',
      'Vuelta 1 de 5',
      'Vuelta 5 de 5',
      'Salida del rep',
    ])
      expect(
        within(lista).getByRole('button', { name: new RegExp(v) }),
      ).toBeInTheDocument()
    expect(
      within(lista).getByRole('button', { name: /Vuelta 2 de 5/ }),
    ).toHaveAttribute('aria-expanded', 'true')
    const v1 = within(lista).getByRole('button', { name: /Vuelta 1 de 5/ })
    expect(v1).toHaveAttribute('aria-expanded', 'false')
    await user.click(v1)
    expect(v1).toHaveAttribute('aria-expanded', 'true')
  })

  it('los filtros llevan el nombre de la acción', () => {
    recorrerEjecucion()
    render(<TraceView />)
    expect(screen.getByRole('button', { name: 'Salto 13' })).toHaveTextContent(
      'Salto13',
    )
  })

  it('la traza resumida quita las búsquedas de la lista y de los controles', async () => {
    const user = userEvent.setup()
    recorrerEjecucion()
    act(() => store().setTraceKind('semantic'))
    render(<TraceView />)
    await user.click(screen.getByRole('button', { name: 'Resumida' }))
    expect(store().traceDetail).toBe('summary')
    expect(screen.getByRole('button', { name: /^Todas/ })).toHaveTextContent(
      '21',
    )
    expect(
      screen.queryByRole('button', { name: /^Buscar en la tabla/ }),
    ).toBeNull()
    act(() => store().goTo(0))
    for (let k = 0; k < 15; k++) {
      act(() => store().stepInto())
      expect(activeTrace(store())[store().step].accion).not.toBe('buscar')
    }
  })

  it('los temporales van aparte y, plegados, dicen cuál cambió', async () => {
    const user = userEvent.setup()
    recorrerEjecucion()
    irA((k) =>
      activeTrace(store())[k].cambios.some(
        (c) => c.nombre === '_c1' && c.valor === 1,
      ),
    )
    render(<VariablesView />)
    const boton = screen.getByRole('button', {
      name: /Temporales y contadores/,
    })
    expect(boton).toHaveTextContent('cambió: _c1 = 1')
    expect(screen.queryByRole('list', { name: /Temporales/ })).toBeNull()
    await user.click(boton)
    expect(screen.getByRole('list', { name: /Temporales/ })).toHaveTextContent(
      '_c1',
    )
  })

  it('la línea de tiempo se rotula por línea y por vuelta', () => {
    recorrerEjecucion()
    const r = tramos(activeTrace(store()))
    const l9 = r.filter((x) => x.linea === 9).map((x) => x.vuelta)
    expect(l9).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('contador de la traza resumida', () => {
  it('cuenta solo los pasos que se ven', () => {
    recorrerEjecucion()
    act(() => {
      store().setTraceKind('semantic')
      store().setTraceDetail('summary')
      store().startDebugging()
    })
    expect(totalDePasos(store())).toBe(21)
    for (let k = 0; k < 5; k++) act(() => store().stepInto())
    expect(numeroDePaso(store())).toBe(6)
    act(() => store().setTraceDetail('full'))
    expect(totalDePasos(store())).toBe(activeTrace(store()).length)
    expect(numeroDePaso(store())).toBe(store().step + 1)
  })
})
