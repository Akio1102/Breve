import { FUENTE_TIPOS } from '@engine/ejemplos'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Timeline } from '@/features/timeline/Timeline'
import { useAppStore } from '@/store/appStore'

const LARGO = Array.from(
  { length: 30 },
  (_, i) => `va ent v${i} = ${i}\ndi v${i}`,
).join('\n')

function recorrer(source: string) {
  localStorage.clear()
  useAppStore.setState({ lang: 'es', breakpoints: [] })
  useAppStore.getState().loadFile('a.brv', source)
  useAppStore.getState().startDebugging()
  return render(<Timeline />)
}

describe('línea de tiempo', () => {
  beforeEach(() => localStorage.clear())

  it('con muchos pasos, avanzar no vuelve a dibujar las barras (U2)', () => {
    const { container } = recorrer(LARGO)
    const total = useAppStore.getState().result?.traza.length ?? 0
    expect(total).toBeGreaterThan(60)
    const capa = container.querySelector('[data-capa="pasos"]') as Element
    expect(capa.querySelectorAll('rect').length).toBeGreaterThanOrEqual(total)

    const cambios: MutationRecord[] = []
    const obs = new MutationObserver((m) => cambios.push(...m))
    obs.observe(capa, { subtree: true, attributes: true, childList: true })
    act(() => useAppStore.getState().goTo(40))
    act(() => useAppStore.getState().goTo(10))
    obs.disconnect()
    expect(cambios).toHaveLength(0)

    const marcador = container.querySelector('svg > rect.fill-text')
    expect(marcador?.getAttribute('x')).toBe('10')
  })

  it('las barras tienen el color de su acción y hay franjas por instrucción', () => {
    const { container } = recorrer(LARGO)
    const capa = container.querySelector('[data-capa="pasos"]') as Element
    expect(capa.querySelector('.fill-ok')).not.toBeNull()
    expect(capa.querySelector('.fill-str')).not.toBeNull()
    expect(capa.querySelectorAll('rect.fill-surface-2').length).toBeGreaterThan(
      1,
    )
  })

  it('la leyenda explica los colores de las acciones que aparecen', async () => {
    recorrer(FUENTE_TIPOS)
    const user = userEvent.setup()
    await user.click(
      screen.getByLabelText('Qué significa cada color', {
        selector: 'summary',
      }),
    )
    const leyenda = screen.getByRole('list', {
      name: 'Qué significa cada color',
    })
    const items = within(leyenda)
      .getAllByRole('listitem')
      .map((li) => li.textContent)
    expect(items).toContain('Insertar en la tabla')
    expect(items).toContain('Repetición (rep)')
    expect(items).toContain('Advertencia')
    expect(items).not.toContain('Error semántico')
    expect(items.at(-1)).toBe('otras acciones (inicio, fin, leer)')
  })

  it('con pocos pasos también tiene leyenda, fuera de la lista de pasos', () => {
    recorrer(FUENTE_TIPOS)
    const pasos = screen.getByRole('listbox', { name: 'Línea de tiempo' })
    expect(within(pasos).queryByText('Qué significa cada color')).toBeNull()
    expect(
      screen.getByLabelText('Qué significa cada color', {
        selector: 'summary',
      }),
    ).toBeInTheDocument()
  })
})

describe('línea de tiempo: tarjeta y zoom (T5)', () => {
  beforeEach(() => localStorage.clear())
  useAppStore.setState({ traceKind: 'semantic' })

  it('pocos pasos: la tarjeta del paso aparece al pasar el cursor o con el foco', async () => {
    useAppStore.setState({ traceKind: 'semantic' })
    recorrer(FUENTE_TIPOS)
    const user = userEvent.setup()
    const paso3 = screen.getByRole('option', { name: /^Paso 3,/ })
    await user.hover(paso3)
    const tarjeta = screen.getByRole('tooltip')
    expect(tarjeta).toHaveTextContent(/Asignación.*3 · L1/)
    expect(tarjeta).toHaveTextContent('edad = 20 : ent')
    await user.unhover(paso3)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    act(() => paso3.focus())
    expect(screen.getByRole('tooltip')).toHaveTextContent(/3 · L1/)
  })

  it('muchos pasos: el deslizador con foco muestra el paso actual; el zoom acerca', async () => {
    useAppStore.setState({ traceKind: 'semantic' })
    const { container } = recorrer(LARGO)
    const total = useAppStore.getState().result?.traza.length ?? 0
    const user = userEvent.setup()
    act(() => screen.getByRole('slider').focus())
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      /^Inicio del análisis/,
    )
    const acercar = screen.getByRole('button', { name: /^Acercar/ })
    expect(total).toBeLessThan(240)
    await user.click(acercar)
    expect(
      screen.getByText(new RegExp(`^pasos 1–60 de ${total}$`)),
    ).toBeVisible()
    expect(acercar).toBeDisabled()
    const capa = container.querySelector('[data-capa="pasos"]') as Element
    expect(capa.querySelectorAll('rect[width="1"]').length).toBe(60)
    await user.click(screen.getByRole('button', { name: 'Alejar' }))
    expect(screen.queryByText(/^pasos \d/)).not.toBeInTheDocument()
  })
})
