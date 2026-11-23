import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { EditorPane } from '@/features/editor/EditorPane'
import { OpenFileButton } from '@/features/files/OpenFileButton'
import { leerArchivo, llevaArchivos, MAX_BYTES } from '@/files/openFile'
import { useAppStore } from '@/store/appStore'

const archivo = (nombre: string, texto: string) =>
  new File([texto], nombre, { type: 'text/plain' })

describe('leer un archivo (D10)', () => {
  it('un .brv de texto se lee completo', async () => {
    expect(await leerArchivo(archivo('a.brv', 'di 1'))).toEqual({
      ok: true,
      nombre: 'a.brv',
      texto: 'di 1',
    })
  })

  it('rechaza un archivo demasiado grande sin leerlo', async () => {
    let leido = false
    const r = await leerArchivo({
      name: 'enorme.brv',
      size: MAX_BYTES + 1,
      text: async () => {
        leido = true
        return ''
      },
    })
    expect(r).toEqual({ ok: false, error: 'tooBig', nombre: 'enorme.brv' })
    expect(leido).toBe(false)
  })

  it('rechaza un binario y un archivo que no se puede leer', async () => {
    expect(
      await leerArchivo(archivo('foto.png', 'PNG\u0000\u0001')),
    ).toMatchObject({
      ok: false,
      error: 'notText',
    })
    const r = await leerArchivo({
      name: 'x.brv',
      size: 1,
      text: () => Promise.reject(new Error('sin permiso')),
    })
    expect(r).toMatchObject({ ok: false, error: 'readFailed' })
  })

  it('distingue un arrastre de archivos de uno de texto', () => {
    expect(llevaArchivos({ types: ['Files'] } as unknown as DataTransfer)).toBe(
      true,
    )
    expect(
      llevaArchivos({ types: ['text/plain'] } as unknown as DataTransfer),
    ).toBe(false)
    expect(llevaArchivos(null)).toBe(false)
  })
})

describe('abrir desde la página', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ lang: 'es', fileNotice: null })
    useAppStore.getState().loadFile('potencia.brv', 'di 0')
  })

  it('el botón Abrir carga el archivo elegido y lo compila', async () => {
    const { container } = render(<OpenFileButton />)
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    expect(input.accept).toBe('.brv,.txt,text/plain')
    await userEvent.upload(input, archivo('mio.brv', 'di 2 + 3 * 4'))
    await waitFor(() => expect(useAppStore.getState().file).toBe('mio.brv'))
    const s = useAppStore.getState()
    expect(s.source).toBe('di 2 + 3 * 4')
    expect(s.compiledSource).toBe('di 2 + 3 * 4')
    expect(s.result?.ok).toBe(true)
  })

  it('arrastrar un archivo al editor lo abre; un error se muestra en el editor', async () => {
    render(<EditorPane />)
    const editor = screen.getByRole('region', { name: 'Editor' })
    const dataTransfer = (f: File) => ({
      types: ['Files'],
      files: [f],
      dropEffect: '',
    })

    fireEvent.dragOver(editor, { dataTransfer: dataTransfer(archivo('x', '')) })
    expect(
      screen.getByText('Suelta el archivo para abrirlo'),
    ).toBeInTheDocument()

    fireEvent.drop(editor, {
      dataTransfer: dataTransfer(archivo('arrastrado.brv', 'di 7')),
    })
    await waitFor(() =>
      expect(useAppStore.getState().file).toBe('arrastrado.brv'),
    )
    expect(screen.queryByText('Suelta el archivo para abrirlo')).toBeNull()

    fireEvent.drop(editor, {
      dataTransfer: dataTransfer(archivo('foto.png', '\u0000')),
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se abrió «foto.png»: no es un archivo de texto.',
    )
    expect(useAppStore.getState().file).toBe('arrastrado.brv')
    useAppStore.getState().setSource('di 8')
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('un arrastre de texto (no de archivos) no se intercepta', () => {
    render(<EditorPane />)
    const editor = screen.getByRole('region', { name: 'Editor' })
    fireEvent.dragOver(editor, {
      dataTransfer: { types: ['text/plain'], files: [] },
    })
    expect(screen.queryByText('Suelta el archivo para abrirlo')).toBeNull()
  })
})
