import { ENTRADAS_POTENCIA, FUENTE_POTENCIA } from '@engine/ejemplos'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { IntermediateView } from '@/features/intermediate/IntermediateView'
import { executionOptOf, useAppStore } from '@/store/appStore'

function setup(source = FUENTE_POTENCIA) {
  localStorage.clear()
  useAppStore.setState({
    lang: 'es',
    irView: 'tac',
    optimized: false,
    input: ENTRADAS_POTENCIA[0],
    execution: null,
    executedKey: null,
  })
  useAppStore.getState().loadFile('potencia.brv', source)
  const user = userEvent.setup()
  render(<IntermediateView />)
  return user
}

const casilla = () => screen.getByRole('checkbox', { name: 'Optimizado' })
const filas = (nombre: string) =>
  within(screen.getByRole('table', { name: nombre })).getAllByRole('row')

describe('código intermedio optimizado', () => {
  beforeEach(() => localStorage.clear())

  it('sin marcar muestra el código del documento', () => {
    setup()
    expect(casilla()).not.toBeChecked()
    expect(filas('Tres direcciones')).toHaveLength(23)
    expect(screen.getByText('22 instrucciones (0 a 21)')).toBeInTheDocument()
  })

  it('marcado muestra el código optimizado, la comparación y las pasadas', async () => {
    const user = setup()
    await user.click(casilla())
    expect(useAppStore.getState().optimized).toBe(true)
    expect(filas('Tres direcciones')).toHaveLength(19)
    expect(screen.getByText('22 → 18 instrucciones')).toBeInTheDocument()
    const pasadas = screen.getByRole('region', {
      name: 'Pasadas del optimizador',
    })
    expect(pasadas).toHaveTextContent('O4 copias: 2 cambios')
    expect(pasadas).toHaveTextContent('G1 saltos con comparación: 2 cambios')
    expect(pasadas).toHaveTextContent('G2 ciclos invertidos: 1 cambio')
    expect(pasadas).toHaveTextContent(/rondas?\.$/)
  })

  it('después de ejecutar compara las instrucciones ejecutadas', async () => {
    const user = setup()
    useAppStore.getState().run()
    await user.click(casilla())
    expect(
      screen.getByText(/22 → 18 instrucciones · ejecutadas: 51 → 29/),
    ).toBeInTheDocument()
    expect(executionOptOf(useAppStore.getState())?.salida).toEqual(
      useAppStore.getState().execution?.salida,
    )
  })

  it('las tripletas y cuádruplas también cambian con la casilla', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: 'Cuádruplas' }))
    expect(filas('Cuádruplas')).toHaveLength(23)
    await user.click(casilla())
    expect(filas('Cuádruplas')).toHaveLength(19)
    await user.click(screen.getByRole('tab', { name: 'Tripletas' }))
    expect(filas('Tripletas')).toHaveLength(24)
    expect(
      screen.getByText(/23 tripletas con su propia numeración/),
    ).toBeVisible()
  })

  it('tripletas optimizadas: la operación y la asignación a la variable (Q1)', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: 'Tripletas' }))
    await user.click(casilla())
    const f = filas('Tripletas')
    expect(f[10]).toHaveTextContent(/^▸?\(9\)\s*\*\s*potencia\s*base$/)
    expect(f[11]).toHaveTextContent(/^\(10\)\s*=\s*potencia\s*\(9\)$/)
    expect(f[17]).toHaveTextContent(/^\(16\)\s*write\s*potencia/)
    expect(f[15]).toHaveTextContent(/if\s*\(13\)\s*\(9\)/)
    expect(within(f[10]).getByTitle('destino de un salto')).toBeInTheDocument()
  })

  it('no compara las ejecutadas si una ejecución llegó al límite (Q2)', async () => {
    const user = setup('rep 18000 di 1')
    useAppStore.getState().run()
    await user.click(casilla())
    const { execution } = useAppStore.getState()
    const executionOpt = executionOptOf(useAppStore.getState())
    expect(execution?.limiteAlcanzado).toBe(true)
    expect(executionOpt?.limiteAlcanzado).toBe(false)
    expect(screen.queryByText(/ejecutadas:/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/llegó al límite de 100 000 instrucciones/),
    ).toBeInTheDocument()
  })

  it('la vista de bloques básicos muestra el grafo de flujo', async () => {
    const user = setup()
    await user.click(screen.getByRole('tab', { name: 'Bloques básicos' }))
    const grafo = screen.getByRole('region', {
      name: 'Grafo de flujo de los bloques básicos',
    })
    expect(grafo).toHaveTextContent('7 bloques.')
    const b1 = within(grafo).getByRole('listitem', {
      name: 'B1: instrucciones 7 a 8',
    })
    expect(b1).toHaveTextContent('llega desde: B0, B2')
    expect(b1).toHaveTextContent('sigue con: B2, B3')
    expect(within(b1).getAllByRole('row')).toHaveLength(2)
    expect(
      within(grafo).getByRole('listitem', { name: 'B6: instrucción 21' }),
    ).toHaveTextContent('sigue con: fin del programa')
    expect(
      within(grafo).getByRole('listitem', { name: 'B0: instrucciones 0 a 6' }),
    ).toHaveTextContent('llega desde: inicio del programa')
  })

  it('un programa con errores no tiene casilla activa ni código', () => {
    setup('di x')
    expect(
      screen.getByText(/El código intermedio se genera cuando/),
    ).toBeInTheDocument()
  })
})
