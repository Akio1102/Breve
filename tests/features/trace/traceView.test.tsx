import { FUENTE_ERROR_SEMANTICO, FUENTE_TIPOS } from '@engine/ejemplos'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { agruparTraza } from '@/features/trace/acciones'
import { TraceView } from '@/features/trace/TraceView'
import { useAppStore } from '@/store/appStore'

function setup(source = FUENTE_TIPOS) {
  localStorage.clear()
  useAppStore.setState({ lang: 'es' })
  useAppStore.getState().loadFile('a.brv', source)
  const user = userEvent.setup()
  render(<TraceView />)
  return user
}
const lista = () => screen.getByRole('list', { name: 'Traza semántica' })
const grupos = () =>
  within(lista()).queryAllByRole('button', { expanded: true }).length +
  within(lista()).queryAllByRole('button', { expanded: false }).length

describe('traza agrupada por instrucción (T4)', () => {
  beforeEach(() => localStorage.clear())

  it('agrupa los pasos consecutivos de cada instrucción; inicio y fin aparte', () => {
    const traza = useAppStore.getState().result?.traza ?? []
    setup()
    const g = agruparTraza(useAppStore.getState().result?.traza ?? traza)
    expect(g[0]).toMatchObject({ especial: 'inicio', desde: 0, hasta: 0 })
    expect(g.at(-1)?.especial).toBe('fin')
    expect(g).toHaveLength(11)
    for (const x of g.slice(1, -1))
      expect(x.hasta).toBeGreaterThanOrEqual(x.desde)
  })

  it('cada grupo empieza con el código de su línea y se pliega', async () => {
    const user = setup()
    const si = within(lista()).getByRole('button', {
      name: /^L6\s*si edad >= 18 di nombre \+ " es adulta" no di "Menor"/,
    })
    expect(si).toHaveAttribute('aria-expanded', 'true')
    const pasos = within(lista()).getAllByRole('listitem').length
    await user.click(si)
    expect(si).toHaveAttribute('aria-expanded', 'false')
    expect(within(lista()).getAllByRole('listitem').length).toBeLessThan(pasos)
    await user.click(screen.getByRole('button', { name: 'Plegar todo' }))
    expect(within(lista()).getAllByRole('listitem')).toHaveLength(grupos())
  })

  it('el filtro deja ver una sola acción, con su cuenta', async () => {
    const user = setup(FUENTE_ERROR_SEMANTICO)
    const errores = screen.getByRole('button', {
      name: /^Error semántico \d+$/,
    })
    await user.click(errores)
    expect(errores).toHaveAttribute('aria-pressed', 'true')
    const n = Number(errores.textContent?.match(/\d+$/)?.[0])
    const pasos = within(lista())
      .getAllByRole('button')
      .filter((b) => !b.hasAttribute('aria-expanded'))
    expect(pasos).toHaveLength(n)
    for (const p of pasos) expect(p).toHaveAttribute('title', 'Error semántico')
    await user.click(screen.getByRole('button', { name: /^Todas \d+$/ }))
    expect(
      within(lista())
        .getAllByRole('button')
        .filter((b) => !b.hasAttribute('aria-expanded')).length,
    ).toBeGreaterThan(n)
  })

  it('al recorrer la traza, el grupo plegado del paso actual se abre', async () => {
    const user = setup()
    await user.click(screen.getByRole('button', { name: 'Plegar todo' }))
    useAppStore.getState().goTo(3)
    expect(
      await within(lista()).findByRole('button', { current: 'step' }),
    ).toHaveTextContent(/^4/)
  })
})
