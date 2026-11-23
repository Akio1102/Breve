import { FUENTE_POTENCIA } from '@engine/ejemplos'
import { render, screen } from '@testing-library/react'
import { Suspense } from 'react'
import { describe, expect, it } from 'vitest'
import { executionOptOf, useAppStore } from '@/store/appStore'
import { cargaDiferida } from '@/ui/cargaDiferida'

describe('cargaDiferida', () => {
  it('la primera vez espera el módulo; después se dibuja al momento', async () => {
    let cargas = 0
    const Hola = cargaDiferida(async () => {
      cargas++
      return ({ nombre }: { nombre: string }) => <p>Hola {nombre}</p>
    })
    const { unmount } = render(
      <Suspense fallback={<p>cargando</p>}>
        <Hola nombre="Ana" />
      </Suspense>,
    )
    expect(screen.getByText('cargando')).toBeInTheDocument()
    expect(await screen.findByText('Hola Ana')).toBeInTheDocument()
    unmount()
    render(
      <Suspense fallback={<p>cargando</p>}>
        <Hola nombre="Luis" />
      </Suspense>,
    )
    expect(screen.getByText('Hola Luis')).toBeInTheDocument()
    await Hola.precargar()
    expect(cargas).toBe(1)
  })
})

describe('ejecutar sin el optimizador', () => {
  it('la ejecución optimizada se calcula al pedirla, con la misma entrada, y se guarda', () => {
    useAppStore.setState({ optimized: false, input: 'Ana\n2\n5' })
    useAppStore.getState().loadFile('potencia.brv', FUENTE_POTENCIA)
    useAppStore.getState().run()
    const s = useAppStore.getState()
    expect(s.execution?.salida).toContain('32')
    const x = executionOptOf(s)
    expect(x?.salida).toEqual(s.execution?.salida)
    expect(x?.instrucciones).toBeLessThan(s.execution?.instrucciones ?? 0)
    expect(executionOptOf(useAppStore.getState())).toBe(x)
  })
})
