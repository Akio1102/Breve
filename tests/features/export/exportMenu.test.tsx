import { FUENTE_POTENCIA } from '@engine/ejemplos'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExportMenu } from '@/features/export/ExportMenu'
import { useAppStore } from '@/store/appStore'

function abrir(source: string) {
  localStorage.clear()
  useAppStore.setState({
    lang: 'es',
    optimized: false,
    input: 'Ana\n2\n5',
    execution: null,
    executedKey: null,
  })
  useAppStore.getState().loadFile('p.brv', source)
  const user = userEvent.setup()
  render(<ExportMenu />)
  return user
}

const opcion = (nombre: RegExp) =>
  screen.getByRole('menuitem', { name: nombre })

describe('menú Exportar (D11)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('cada opción deshabilitada dice por qué', async () => {
    const user = abrir(FUENTE_POTENCIA)
    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    const salida = opcion(/Salida del programa/)
    expect(salida).toHaveAttribute('aria-disabled', 'true')
    expect(salida).toHaveTextContent('Ejecuta el programa para tener su salida')
    expect(opcion(/^Código fuente/)).toHaveAttribute('aria-disabled', 'false')
  })

  it('con errores sintácticos, explica que falta llegar al semántico', async () => {
    const user = abrir('di )')
    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(opcion(/Tabla de símbolos.*csv/)).toHaveTextContent(
      'Corrige los errores léxicos y sintácticos',
    )
    const copiar = screen.getByRole('group', { name: /Copiar en Markdown/ })
    expect(
      within(copiar).getByRole('menuitem', { name: /Código intermedio/ }),
    ).toHaveTextContent('Corrige los errores para tener código intermedio')
  })

  it('con cambios sin compilar, pide compilar primero', async () => {
    const user = abrir(FUENTE_POTENCIA)
    useAppStore.getState().setSource(`${FUENTE_POTENCIA}\ndi 1`)
    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    expect(opcion(/Tabla de símbolos.*csv/)).toHaveTextContent(
      'Hay cambios sin compilar: compila primero',
    )
  })

  it('copia el código intermedio en Markdown y lo confirma', async () => {
    const user = abrir(FUENTE_POTENCIA)
    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    const copiar = screen.getByRole('group', { name: /Copiar en Markdown/ })
    await user.click(
      within(copiar).getByRole('menuitem', { name: /Código intermedio/ }),
    )
    await screen.findByText('Copiado al portapapeles')
    const md = await navigator.clipboard.readText()
    expect(md.split('\n')[0]).toBe(
      '| N° | Tres direcciones | Tripleta | Cuádrupla |',
    )
    expect(md).toContain(
      '| 8 | if t2 goto 14 | (if, (7), (14)) | (if, t2, –, 14) |',
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Copiado al portapapeles',
    )
  })

  it('si el navegador no deja copiar, lo dice', async () => {
    const user = abrir(FUENTE_POTENCIA)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denegado'),
    )
    await user.click(screen.getByRole('button', { name: /Exportar/ }))
    const copiar = screen.getByRole('group', { name: /Copiar en Markdown/ })
    await user.click(
      within(copiar).getByRole('menuitem', { name: /Tabla de símbolos/ }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No se pudo copiar: el navegador no lo permitió',
    )
  })
})
