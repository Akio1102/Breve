import { FUENTE_TIPOS } from '@engine/ejemplos'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PLEGAR_DESDE } from '@/arbol/arbol'
import { AstView } from '@/features/ast/AstView'
import { useAppStore } from '@/store/appStore'

function setup(source = FUENTE_TIPOS) {
  localStorage.clear()
  useAppStore.setState({ lang: 'es', astMode: 'abstract', showAttrs: false })
  useAppStore.getState().loadFile('a.brv', source)
  const user = userEvent.setup()
  render(<AstView />)
  return user
}

const arbol = () => screen.getByRole('tree', { name: 'Árbol sintáctico' })
const items = () => within(arbol()).getAllByRole('treeitem')
const item = (texto: string) =>
  items().find((i) => i.textContent?.startsWith(texto)) as HTMLElement

describe('pestaña Árbol (A3, A4)', () => {
  beforeEach(() => localStorage.clear())

  it('patrón de árbol: niveles, posición y una sola parada de Tab', () => {
    setup()
    const raiz = items()[0]
    expect(raiz).toHaveAttribute('aria-level', '1')
    expect(raiz).toHaveAttribute('aria-expanded', 'true')
    expect(raiz).toHaveAttribute('tabindex', '0')
    const si = item('si')
    expect(si).toHaveAttribute('aria-level', '2')
    expect(si).toHaveAttribute('aria-posinset', '6')
    expect(si).toHaveAttribute('aria-setsize', '9')
    expect(si).toHaveAttribute('tabindex', '-1')
    expect(si).toHaveTextContent(/L6$/)
    expect(item('18')).toHaveTextContent('18ENTERO')
    expect(item('18')).not.toHaveTextContent(/L\d/)
  })

  it('flechas: bajar, cerrar, subir al padre y abrir', async () => {
    const user = setup('di 1 + 2')
    await user.click(items()[0])
    await user.keyboard('{ArrowDown}')
    expect(item('di')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('di')).toHaveAttribute('aria-expanded', 'false')
    expect(items()).toHaveLength(2)
    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowRight}')
    expect(item('+')).toHaveFocus()
    await user.keyboard('{End}')
    expect(items().at(-1)).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('+')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(items()[0]).toHaveFocus()
  })

  it('el triángulo pliega sin ir al código; plegar y expandir todo', async () => {
    const user = setup()
    const total = items().length
    const si = item('si')
    await user.click(si.querySelector('[data-twisty]') as HTMLElement)
    expect(item('si')).toHaveAttribute('aria-expanded', 'false')
    expect(items()).toHaveLength(total - 9)
    await user.click(screen.getByRole('button', { name: 'Plegar todo' }))
    expect(items()).toHaveLength(1 + 9)
    await user.click(screen.getByRole('button', { name: 'Expandir todo' }))
    expect(items()).toHaveLength(total)
  })

  it(`con más de ${PLEGAR_DESDE} instrucciones empiezan plegadas`, () => {
    setup(
      Array(PLEGAR_DESDE + 1)
        .fill('di 1 + 2')
        .join('\n'),
    )
    expect(items()).toHaveLength(1 + PLEGAR_DESDE + 1)
    expect(items()[1]).toHaveAttribute('aria-expanded', 'false')
  })

  it('derivación: los no terminales de la gramática, y se recuerda la elección', async () => {
    const user = setup('di 7')
    await user.click(screen.getByRole('button', { name: 'Derivación' }))
    expect(useAppStore.getState().astMode).toBe('derivation')
    expect(items().map((i) => i.textContent?.replace(/L\d+$/, ''))).toEqual([
      'programa',
      'instruccion',
      'diDI',
      'expr',
      'aritm',
      'termino',
      'factor',
      '7ENTERO',
      '↵SALTO',
    ])
    expect(
      screen.getByText(/se muestra como una lista de instrucciones/),
    ).toBeInTheDocument()
  })

  it('el papel de cada hijo de si', () => {
    setup()
    expect(item('condición')).toHaveTextContent('condición>=')
    expect(item('si es verdadera')).toHaveTextContent('si es verdaderadi')
    expect(items().some((i) => i.textContent?.startsWith('nodi'))).toBe(true)
  })
})

describe('dibujo y enlace con el editor (A1, A6)', () => {
  beforeEach(() => localStorage.clear())

  it('el dibujo muestra la instrucción del nodo elegido', async () => {
    const user = setup('va ent x = 2 + 3 * 4\nsi x > 10 di "grande"')
    useAppStore.setState({ astGraph: true })
    expect(
      screen.getByRole('region', { name: 'Dibujo del árbol de la línea 1' }),
    ).toBeInTheDocument()
    await user.click(item('si'))
    const dibujo = screen.getByRole('region', {
      name: 'Dibujo del árbol de la línea 2',
    })
    expect(dibujo.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(dibujo.querySelectorAll('svg > g').length).toBeGreaterThan(4)
  })

  it('pasar sobre un nodo resalta su fragmento; salir lo quita', async () => {
    const user = setup('di 2 + 3 * 4')
    await user.hover(item('*'))
    expect(useAppStore.getState().highlight).toEqual({
      linea: 1,
      desde: 8,
      hasta: 13,
    })
    await user.unhover(item('*'))
    expect(useAppStore.getState().highlight).toBeNull()
  })

  it('el cursor del editor elige su nodo, abriendo lo que haga falta', async () => {
    const user = setup('di 2 + 3 * 4')
    await user.click(screen.getByRole('button', { name: 'Plegar todo' }))
    expect(items()).toHaveLength(2)
    act(() => useAppStore.getState().setCursor(1, 12))
    const elegido = items().find(
      (i) => i.getAttribute('aria-selected') === 'true',
    )
    expect(elegido).toHaveTextContent(/^4/)
  })

  it('al recorrer la traza, el dibujo marca el nodo que analiza el paso', () => {
    setup('di 2 + 3 * 4')
    useAppStore.setState({ astGraph: true })
    const traza = useAppStore.getState().result?.traza ?? []
    const op = traza.findIndex((p) => p.detalle.startsWith('3 * 4'))
    act(() => useAppStore.getState().goTo(op))
    const dibujo = screen.getByRole('region', { name: /Dibujo del árbol/ })
    const marcado = dibujo.querySelector('rect.stroke-accent')
    expect(marcado?.parentElement?.textContent).toContain('*')
  })
})

describe('árbol con errores en la pestaña (A5)', () => {
  beforeEach(() => localStorage.clear())

  it('con errores sintácticos: las líneas correctas y una marca por cada descartada', () => {
    setup('va ent a = 1\nva x\ndi a')
    expect(
      screen.getByText(/el árbol tiene solo las líneas correctas/),
    ).toBeInTheDocument()
    const textos = items().map((i) => i.textContent)
    expect(textos.some((x) => x?.startsWith('L2 descartada'))).toBe(true)
    expect(textos.some((x) => x?.startsWith('va ent a ='))).toBe(true)
    expect(textos.some((x) => x?.startsWith('di'))).toBe(true)
  })

  it('con errores semánticos: el nodo en rojo, con el mensaje para lectores de pantalla', () => {
    setup('va ent x = 1 + "a"\ndi x')
    const mas = item('+')
    expect(mas).toHaveTextContent(/error semántico: tipos incompatibles/)
    expect(mas.querySelector('.text-danger')).not.toBeNull()
  })
})
