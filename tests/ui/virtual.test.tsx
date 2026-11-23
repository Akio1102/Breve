import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AstView } from '@/features/ast/AstView'
import { IntermediateView } from '@/features/intermediate/IntermediateView'
import { SymbolsView } from '@/features/symbols/SymbolsView'
import { TokensView } from '@/features/tokens/TokensView'
import { TraceView } from '@/features/trace/TraceView'
import { useAppStore } from '@/store/appStore'
import { VIRTUALIZAR_DESDE } from '@/ui/useVirtualRows'
import { programaGrande } from '../helpers/programaGrande'

function setup(source: string) {
  localStorage.clear()
  useAppStore.setState({
    lang: 'es',
    irView: 'tac',
    optimized: false,
    showTemps: true,
    astMode: 'abstract',
  })
  useAppStore.getState().loadFile('grande.brv', source)
  return useAppStore.getState().result
}

function simularTamanos() {
  const alto = (el: HTMLElement) => (el.hasAttribute('data-index') ? 25 : 600)
  for (const prop of ['clientHeight', 'offsetHeight'] as const)
    vi.spyOn(HTMLElement.prototype, prop, 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return alto(this)
    })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1e6)
}

describe('tablas y listas largas: solo las filas visibles (U1)', () => {
  beforeEach(() => {
    localStorage.clear()
    simularTamanos()
  })
  afterEach(() => vi.restoreAllMocks())
  const grande = programaGrande(100)

  it('tokens: unas decenas de filas dibujadas de miles, con aria-rowcount', () => {
    const r = setup(grande)
    const n = r?.tokens.length ?? 0
    expect(n).toBeGreaterThan(VIRTUALIZAR_DESDE)
    render(<TokensView />)
    const tabla = screen.getByRole('table', { name: 'Tabla de tokens' })
    expect(tabla).toHaveAttribute('aria-rowcount', String(n + 1))
    const filas = within(tabla).getAllByRole('row')
    expect(filas.length).toBeLessThan(80)
    expect(filas[1]).toHaveAttribute('aria-rowindex', '2')
  })

  it('tabla de símbolos, código intermedio y traza también', () => {
    const r = setup(grande)
    const { unmount } = render(<SymbolsView />)
    expect(
      within(
        screen.getByRole('table', { name: 'Tabla de símbolos' }),
      ).getAllByRole('row').length,
    ).toBeLessThan(80)
    unmount()
    const ir = render(<IntermediateView />)
    expect(r?.tresDirecciones.length).toBeGreaterThan(VIRTUALIZAR_DESDE)
    expect(
      within(
        screen.getByRole('table', { name: 'Tres direcciones' }),
      ).getAllByRole('row').length,
    ).toBeLessThan(80)
    ir.unmount()
    render(<TraceView />)
    expect(r?.traza.length).toBeGreaterThan(VIRTUALIZAR_DESDE)
    expect(
      within(
        screen.getByRole('list', { name: 'Traza semántica' }),
      ).getAllByRole('listitem').length,
    ).toBeLessThan(80)
  })

  it('árbol: al expandir todo se dibujan solo las filas visibles', async () => {
    setup(grande)
    const user = userEvent.setup()
    render(<AstView />)
    await user.click(screen.getByRole('button', { name: 'Expandir todo' }))
    const arbol = screen.getByRole('tree', { name: 'Árbol sintáctico' })
    expect(within(arbol).getAllByRole('treeitem').length).toBeLessThan(80)
    await user.click(within(arbol).getAllByRole('treeitem')[0])
    await user.keyboard('{End}')
    arbol.dispatchEvent(new Event('scroll'))
    await waitFor(() =>
      expect(document.activeElement?.textContent).toMatch(/ENTERO|ID/),
    )
    expect(document.activeElement).toHaveTextContent('b99ID')
  })

  it('un programa corto dibuja todas sus filas (sin virtualizar)', () => {
    const r = setup('va ent x = 1\ndi x')
    render(<TokensView />)
    expect(
      within(
        screen.getByRole('table', { name: 'Tabla de tokens' }),
      ).getAllByRole('row'),
    ).toHaveLength((r?.tokens.length ?? 0) + 1)
  })
})
