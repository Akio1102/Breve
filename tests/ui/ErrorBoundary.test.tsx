import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { EXAMPLE } from '@/examples'
import { useAppStore } from '@/store/appStore'
import { ErrorBoundary } from '@/ui/ErrorBoundary'

const fallar = { activo: true }
// biome-ignore lint/style/useComponentExportOnlyModules: componente solo para esta prueba
function Fragil() {
  if (fallar.activo) throw new Error('falló el dibujo')
  return <p>todo bien</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    localStorage.clear()
    fallar.activo = true
    useAppStore.setState({ lang: 'es' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('muestra el error en lugar de dejar la página en blanco', () => {
    render(
      <ErrorBoundary>
        <Fragil />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La página encontró un error',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('falló el dibujo')
  })

  it('recuperar la última versión sin errores vuelve a dibujar la página', async () => {
    useAppStore.setState({ source: 'di x', lastGoodSource: 'di 1' })
    render(
      <ErrorBoundary>
        <Fragil />
      </ErrorBoundary>,
    )
    fallar.activo = false
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Volver a la última versión sin errores',
      }),
    )
    expect(screen.getByText('todo bien')).toBeInTheDocument()
    expect(useAppStore.getState().source).toBe('di 1')
  })

  it('cargar el ejemplo también recupera la página', async () => {
    useAppStore.setState({ source: 'di x' })
    render(
      <ErrorBoundary>
        <Fragil />
      </ErrorBoundary>,
    )
    fallar.activo = false
    await userEvent.click(
      screen.getByRole('button', { name: 'Cargar el ejemplo potencia.brv' }),
    )
    expect(screen.getByText('todo bien')).toBeInTheDocument()
    expect(useAppStore.getState().source).toBe(EXAMPLE.source)
  })

  it('con el texto en inglés', () => {
    useAppStore.setState({ lang: 'en' })
    render(
      <ErrorBoundary>
        <Fragil />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The page ran into an error',
    )
  })

  it('un código guardado muy anidado ya no rompe la página al abrirla (C1)', () => {
    useAppStore.setState({
      source: `di ${'('.repeat(6000)}1${')'.repeat(6000)}`,
      compiledSource: null,
    })
    render(<App />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(useAppStore.getState().result?.errores[0].mensaje).toMatch(
      /^expresión demasiado anidada/,
    )
  })
})
