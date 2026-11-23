import { ENTRADAS_POTENCIA, FUENTE_POTENCIA } from '@engine/ejemplos'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConsoleView } from '@/features/console/ConsoleView'
import { DebugControls, StepCounter } from '@/features/debugger/DebugControls'
import { StepCard } from '@/features/inspector/StepCard'
import { IntermediateView } from '@/features/intermediate/IntermediateView'
import { TraceView } from '@/features/trace/TraceView'
import { activeTrace, currentEvent, useAppStore } from '@/store/appStore'

function setup() {
  localStorage.clear()
  useAppStore.setState({
    lang: 'es',
    traceKind: 'semantic',
    irView: 'quads',
    optimized: false,
    input: ENTRADAS_POTENCIA[0],
    execution: null,
    executedKey: null,
    mode: 'edit',
  })
  useAppStore.getState().loadFile('potencia.brv', FUENTE_POTENCIA)
  return userEvent.setup()
}

const store = () => useAppStore.getState()

describe('recorrer la ejecución (T1)', () => {
  beforeEach(() => localStorage.clear())

  it('elegir Ejecución y recorrer: ejecuta primero y empieza en la memoria inicial', async () => {
    const user = setup()
    render(
      <>
        <DebugControls />
        <StepCounter />
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Ejecución' }))
    expect(store().traceKind).toBe('execution')
    await user.click(screen.getByRole('button', { name: 'Recorrer traza' }))
    expect(store().execution?.ok).toBe(true)
    expect(store().mode).toBe('run')
    expect(currentEvent(store())?.accion).toBe('arranque')
    expect(activeTrace(store())).toHaveLength(52)
    expect(screen.getByText('Paso 1/52')).toBeInTheDocument()
  })

  it('la cuádrupla del paso se resalta y se marca adónde llega el salto', () => {
    setup()
    act(() => {
      store().setTraceKind('execution')
      store().startDebugging()
    })
    render(<IntermediateView />)
    const ifPaso = activeTrace(store()).findIndex(
      (p) => p.detalle === 'if t2 goto 14' && p.siguiente === 14,
    )
    act(() => store().goTo(ifPaso))
    const tabla = screen.getByRole('table', { name: 'Cuádruplas' })
    const actual = within(tabla)
      .getAllByRole('row')
      .find((r) => r.getAttribute('aria-current') === 'step')
    expect(actual).toHaveTextContent(/^8\s*if\s*t2/)
    expect(
      within(tabla).getByTitle('aquí llega el salto del paso actual')
        .parentElement?.parentElement,
    ).toHaveTextContent(/14\s*write\s*"Resultado:"/)
  })

  it('la salida aparece al avanzar y la tarjeta dice la cuádrupla', () => {
    setup()
    act(() => {
      store().setTraceKind('execution')
      store().startDebugging()
    })
    render(
      <>
        <ConsoleView />
        <StepCard />
      </>,
    )
    const log = screen.getByRole('log', { name: 'Salida del programa' })
    expect(log).not.toHaveTextContent('Hola Ana')
    const escribe = activeTrace(store()).findIndex(
      (p) => p.accion === 'escribir',
    )
    act(() => store().goTo(escribe))
    expect(log).toHaveTextContent(/^Hola Ana$/)
    expect(
      screen.getByText(/Recorriendo la ejecución: 1 de 4 líneas escritas/),
    ).toBeInTheDocument()
    expect(screen.getByText(/L8 · cuádrupla 5/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Escritura (write)' }),
    ).toBeInTheDocument()
  })

  it('la pestaña Traza muestra la de la ejecución agrupada por línea', () => {
    setup()
    act(() => {
      store().setTraceKind('execution')
      store().run()
    })
    render(<TraceView />)
    const lista = screen.getByRole('list', { name: 'Traza de la ejecución' })
    const n = activeTrace(store()).filter((p) => p.linea === 9).length
    expect(n).toBe(1 + 6 * 2 + 5 * 5)
    expect(
      within(lista).getByRole('button', { name: /^L9\s*rep exponente/ }),
    ).toHaveTextContent(`${n} pasos`)
  })

  it('sin ejecutar, la traza de la ejecución explica cómo obtenerla', () => {
    setup()
    act(() => store().setTraceKind('execution'))
    render(<TraceView />)
    expect(
      screen.getByText(/La traza de la ejecución aparece al ejecutar/),
    ).toBeInTheDocument()
  })
})
