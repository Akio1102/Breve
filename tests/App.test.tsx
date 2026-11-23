import { FUENTE_TIPOS } from '@engine/ejemplos'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { resolveTheme } from '@/features/theme/useTheme'
import { useAppStore } from '@/store/appStore'

const SRC = FUENTE_TIPOS
const TOTAL = 32

async function setup(source = SRC, file = 'tipos.brv') {
  localStorage.clear()
  useAppStore.setState({
    watches: [],
    breakpoints: [],
    theme: 'dark',
    lang: 'es',
    tourStep: null,
    sideTab: 'vars',
    bottomTab: 'console',
    showAttrs: false,
    showTemps: true,
    irView: 'tac',
    input: '',
    execution: null,
    executedKey: null,
    lastGoodSource: SRC,
  })
  useAppStore.getState().loadFile(file, source)
  const user = userEvent.setup()
  render(<App />)
  return user
}

async function walk() {
  const user = await setup()
  await user.click(screen.getByRole('button', { name: 'Recorrer traza' }))
  return user
}

const entradaBox = () =>
  screen.getByRole('textbox', { name: 'Entrada (un valor por línea)' })
const stepCard = () => screen.getByRole('region', { name: 'Paso actual' })
const phases = () =>
  screen.getByRole('navigation', { name: 'Fases de compilación' })
const selectExample = (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => user.selectOptions(screen.getByLabelText('Ejemplos'), name)

describe('App', () => {
  beforeEach(() => {
    document.documentElement.className = ''
  })

  it('compila el ejemplo: cuatro fases correctas y la ejecución pendiente', async () => {
    const user = await setup()
    expect(within(phases()).getByText(/Léxico/)).toHaveTextContent('correcta')
    expect(within(phases()).getByText(/Semántico/)).toHaveTextContent(
      'correcta',
    )
    expect(within(phases()).getByText(/Intermedio/)).toHaveTextContent(
      'correcta',
    )
    expect(within(phases()).getByText(/Ejecución/)).toHaveTextContent(
      'pendiente',
    )
    expect(within(stepCard()).getByText(/Recorrer traza/)).toBeInTheDocument()
    expect(screen.getByText(/pulsa «Ejecutar»/)).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Ejecutar',
      }),
    )
    expect(
      screen.getByRole('log', { name: 'Salida del programa' }),
    ).toHaveTextContent('Ana es adulta 1.9 0')
    expect(within(phases()).getByText(/Ejecución/)).toHaveTextContent(
      'correcta',
    )
  })

  it('siguiente paso, atrás y la línea de tiempo mueven el paso', async () => {
    const user = await walk()
    expect(
      within(stepCard()).getByText('Inicio del análisis'),
    ).toBeInTheDocument()
    expect(screen.getByText(`Paso 1/${TOTAL}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente paso' }))
    expect(
      within(stepCard()).getByText('Insertar en la tabla'),
    ).toBeInTheDocument()
    expect(
      within(stepCard()).getByText('insertar(edad, ent, variable)'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Atrás' }))
    expect(screen.getByText(`Paso 1/${TOTAL}`)).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Paso 19, línea 6/ }))
    expect(within(stepCard()).getByText('Mostrar (di)')).toBeInTheDocument()
    within(screen.getByRole('listbox', { name: 'Línea de tiempo' }))
      .getByRole('option', { selected: true })
      .focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText(`Paso 18/${TOTAL}`)).toBeInTheDocument()
  })

  it('atajos F11, F10 y F8', async () => {
    const user = await walk()
    await user.keyboard('{F11}')
    expect(screen.getByText(`Paso 2/${TOTAL}`)).toBeInTheDocument()
    await user.keyboard('{F10}')
    expect(screen.getByText(`Paso 4/${TOTAL}`)).toBeInTheDocument()
    await user.keyboard('{F8}')
    expect(screen.getByText(`Paso 3/${TOTAL}`)).toBeInTheDocument()
  })

  it('variables: la tabla del paso marca lo nuevo y lo modificado', async () => {
    const user = await walk()
    await user.keyboard('{F11}')
    const variables = () => screen.getByRole('tabpanel', { name: 'Variables' })
    expect(within(variables()).getByText('nueva')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: /Lo que cambió/ })).getByText(
        'nueva',
      ),
    ).toBeInTheDocument()
    await user.keyboard('{F11}')
    expect(within(variables()).getByText('modificada')).toBeInTheDocument()
    expect(screen.getByText('20', { selector: 'code' })).toBeInTheDocument()
  })

  it('potencia.brv: la entrada alimenta cada lee y la salida es la esperada', async () => {
    const user = await setup()
    await selectExample(user, 'potencia.brv (válido)')
    const entrada = entradaBox()
    expect(entrada).toHaveValue('Ana\n2\n5')
    await user.click(entradaBox())
    await user.keyboard('{Control>}{Shift>}{Enter}{/Shift}{/Control}')
    const log = () => screen.getByRole('log', { name: 'Salida del programa' })
    expect(log()).toHaveTextContent('Hola Ana Resultado: 32 Resultado pequeño')
    expect(screen.getByText(/51 instrucciones ejecutadas/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ana · 3 · 5' }))
    expect(within(phases()).getByText(/Ejecución/)).toHaveTextContent(
      'pendiente',
    )
    await user.click(screen.getByRole('button', { name: 'Ana · 3 · 5' }))
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Ejecutar',
      }),
    )
    expect(log()).toHaveTextContent('243 Resultado grande')
  })

  it('errores de ejecución: se muestran sin congelar la página', async () => {
    const user = await setup()
    await selectExample(user, 'Con error de ejecución')
    expect(entradaBox()).toHaveValue('10\n0')
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Ejecutar',
      }),
    )
    expect(
      screen.getByText(/ERROR de ejecución: división entre cero en línea 5/),
    ).toBeInTheDocument()
    expect(within(phases()).getByText(/Ejecución/)).toHaveTextContent(
      'con errores',
    )
    await user.click(screen.getByRole('tab', { name: /Errores/ }))
    expect(screen.getByText('Errores de ejecución (1)')).toBeInTheDocument()
  })

  it('cualquier entrada se ejecuta de verdad', async () => {
    const user = await setup()
    await selectExample(user, 'potencia.brv (válido)')
    const entrada = entradaBox()
    await user.clear(entrada)
    await user.type(entrada, 'Luis{Enter}7{Enter}2')
    await user.keyboard('{Control>}{Enter}{/Control}')
    const log = screen.getByRole('log', { name: 'Salida del programa' })
    expect(log).toHaveTextContent('Hola Luis')
    expect(log).toHaveTextContent('49')
  })

  it('código intermedio: tres direcciones, tripletas y cuádruplas', async () => {
    const user = await setup()
    await selectExample(user, 'potencia.brv (válido)')
    await user.click(
      within(phases()).getByRole('button', { name: /Intermedio/ }),
    )
    expect(screen.getByText('22 instrucciones (0 a 21)')).toBeInTheDocument()
    const tac = screen.getByRole('table', { name: 'Tres direcciones' })
    expect(within(tac).getAllByRole('row')).toHaveLength(23)
    expect(within(tac).getAllByRole('row')[9]).toHaveTextContent(
      '8if t2 goto 14',
    )
    await user.click(screen.getByRole('tab', { name: 'Tripletas' }))
    const tri = screen.getByRole('table', { name: 'Tripletas' })
    expect(within(tri).getAllByText('(21)')).toHaveLength(2)
    await user.click(screen.getByRole('tab', { name: 'Cuádruplas' }))
    const quads = screen.getByRole('table', { name: 'Cuádruplas' })
    const row9 = within(quads).getAllByRole('row')[10]
    expect(row9).toHaveTextContent(/9\s*\*\s*potencia\s*base\s*t3/)
    expect(useAppStore.getState().irView).toBe('quads')
  })

  it('memoria: direcciones y bytes de cada símbolo', async () => {
    const user = await walk()
    await user.click(screen.getByRole('option', { name: /Paso 13,/ }))
    await user.click(screen.getByRole('tab', { name: 'Memoria' }))
    const memoria = screen.getByRole('tabpanel', { name: 'Memoria' })
    expect(within(memoria).getByText('4–11')).toBeInTheDocument()
    expect(within(memoria).getByText('32 bytes ocupados')).toBeInTheDocument()
  })

  it('vigiladas: valor, cambio y error sin romper nada', async () => {
    const user = await walk()
    await user.click(screen.getByRole('tab', { name: 'Vigiladas' }))
    const input = screen.getByLabelText('Nuevo identificador vigilado')
    await user.type(input, 'edad{Enter}')
    await user.type(input, '1 +{Enter}')
    await user.click(screen.getByRole('option', { name: /Paso 3,/ }))
    const watch = screen
      .getByText('edad', { selector: 'code' })
      .closest('li') as HTMLElement
    expect(within(watch).getByText('20', { selector: 'p' })).toBeInTheDocument()
    expect(within(watch).getByText('cambió')).toBeInTheDocument()
    expect(
      screen.getByText('Solo se pueden vigilar identificadores.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar 1 +' }))
    expect(useAppStore.getState().watches).toEqual(['edad'])
  })

  it('pestañas del panel inferior con flechas', async () => {
    const user = await setup()
    screen.getByRole('tab', { name: 'Resultado' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Tokens' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const tokens = screen.getByRole('table', { name: 'Tabla de tokens' })
    expect(within(tokens).getAllByText('T_ENT').length).toBeGreaterThan(0)
    expect(
      within(tokens).getByText('0.19', { selector: 'button' }),
    ).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(
      screen.getByRole('tree', { name: 'Árbol sintáctico' }),
    ).toBeInTheDocument()
  })

  it('árbol: muestra los atributos heredados y sintetizados', async () => {
    const user = await setup()
    await user.click(screen.getByRole('tab', { name: 'Árbol' }))
    expect(screen.queryByText('↓ dtype=ent')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('Mostrar atributos'))
    expect(screen.getAllByText('↓ dtype=ent').length).toBeGreaterThan(0)
    expect(screen.getAllByText('↑ tipo=dec').length).toBeGreaterThan(0)
    expect(screen.getAllByText('↑ valor=0.19').length).toBeGreaterThan(0)
  })

  it('tabla de símbolos con tipo, tamaño, dirección, valor y referencias', async () => {
    const user = await setup()
    await user.click(
      within(phases()).getByRole('button', { name: /Semántico/ }),
    )
    const table = () => screen.getByRole('table', { name: 'Tabla de símbolos' })
    const row = (name: string) =>
      within(table()).getByText(name).closest('tr') as HTMLElement
    expect(
      screen.getByText('Valores iniciales (tras compilar)'),
    ).toBeInTheDocument()
    expect(within(row('edad')).getByText('20')).toBeInTheDocument()
    expect(within(row('edad')).getByText('6, 7')).toBeInTheDocument()
    expect(within(row('_c1')).getByText('temporal')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Mostrar temporales (7)'))
    expect(within(table()).queryByText('_c1')).not.toBeInTheDocument()
    await user.click(
      within(screen.getByRole('banner')).getByRole('button', {
        name: 'Ejecutar',
      }),
    )
    await user.click(
      within(phases()).getByRole('button', { name: /Semántico/ }),
    )
    expect(
      screen.getByText('Valores finales (tras ejecutar)'),
    ).toBeInTheDocument()
    expect(within(row('edad')).getByText('23')).toBeInTheDocument()
    const table2 = table()
    const iva = within(table2).getByText('iva').closest('tr') as HTMLElement
    expect(within(iva).getByText('constante')).toBeInTheDocument()
    expect(within(iva).getByText('8')).toBeInTheDocument()
  })

  it('advertencias en su propia pestaña', async () => {
    const user = await setup()
    await user.click(screen.getByRole('tab', { name: /Advertencias/ }))
    expect(screen.getByText(/'y' fue declarada/)).toBeInTheDocument()
    expect(screen.getByText(/valor por defecto/)).toBeInTheDocument()
  })

  it('errores léxicos: agrupados por fase y sin traza', async () => {
    const user = await setup()
    await selectExample(user, 'Con errores léxicos')
    expect(within(phases()).getByText(/Léxico/)).toHaveTextContent(
      'con errores',
    )
    expect(within(phases()).getByText(/Sintáctico/)).toHaveTextContent(
      'pendiente',
    )
    await user.click(screen.getByRole('tab', { name: /Errores/ }))
    expect(screen.getByText('Errores léxicos (3)')).toBeInTheDocument()
    expect(screen.getByText(/carácter no válido '@'/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Recorrer traza' }),
    ).toBeDisabled()
    await user.click(
      screen.getByRole('button', { name: /última versión sin errores/ }),
    )
    expect(useAppStore.getState().source).toBe(SRC)
  })

  it('errores semánticos: se puede recorrer la traza hasta el error', async () => {
    const user = await setup()
    await selectExample(user, 'Con errores semánticos (tipos)')
    await user.click(screen.getByRole('tab', { name: /Errores/ }))
    expect(screen.getByText('Errores semánticos (5)')).toBeInTheDocument()
    expect(
      within(stepCard()).getByText(/errores semánticos/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Recorrer traza' }))
    await user.click(screen.getByRole('option', { name: /Paso 3,/ }))
    expect(within(stepCard()).getByText('Error semántico')).toBeInTheDocument()
  })

  it('editar marca cambios sin compilar; código propio compila y se ejecuta', async () => {
    const user = await setup()
    act(() => useAppStore.getState().setSource('di 2 + 3 * 4\n'))
    expect(
      within(phases()).getByText('cambios sin compilar'),
    ).toBeInTheDocument()
    expect(within(stepCard()).getByText(/Compilar/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Compilar' }))
    expect(
      within(stepCard()).getByText(/El programa compiló/),
    ).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Ejecutar' })[0])
    expect(
      screen.getByRole('log', { name: 'Salida del programa' }),
    ).toHaveTextContent('14')
    expect(within(phases()).getByText(/Ejecución/)).not.toHaveTextContent(
      'pendiente',
    )
  })

  it('código propio sin errores: árbol y código intermedio reales', async () => {
    const user = await setup()
    act(() => useAppStore.getState().setSource('di 2 + 3 * 4\n'))
    await user.click(screen.getByRole('button', { name: 'Compilar' }))
    await user.click(screen.getByRole('tab', { name: /Árbol/ }))
    const tree = screen.getByRole('tree', { name: 'Árbol sintáctico' })
    expect(within(tree).getAllByText('*').length).toBeGreaterThan(0)
    expect(within(tree).getAllByText('4').length).toBeGreaterThan(0)
    expect(within(phases()).getByText(/Sintáctico/)).not.toHaveTextContent(
      'con errores',
    )
    expect(useAppStore.getState().result?.ok).toBe(true)
    await user.click(
      within(phases()).getByRole('button', { name: /Intermedio/ }),
    )
    const tac = screen.getByRole('table', { name: 'Tres direcciones' })
    expect(within(tac).getAllByRole('row')[1]).toHaveTextContent('t1 = 3 * 4')
  })

  it('código desconocido con errores sintácticos: los detecta el parser real', async () => {
    const user = await setup()
    act(() => useAppStore.getState().setSource('va x\ndi (1\n'))
    await user.click(screen.getByRole('button', { name: 'Compilar' }))
    const { result } = useAppStore.getState()
    expect(result?.faseFallida).toBe('sintactico')
    expect(result?.errores.map((e) => e.linea)).toEqual([1, 2])
  })

  it('código desconocido con errores léxicos: los detecta el lexer real', async () => {
    const user = await setup()
    act(() => useAppStore.getState().setSource('di 1 @\n'))
    await user.click(screen.getByRole('button', { name: 'Compilar' }))
    const { result } = useAppStore.getState()
    expect(result?.faseFallida).toBe('lexico')
    expect(result?.errores[0]).toMatchObject({ linea: 1, columna: 6 })
    expect(
      within(stepCard()).getByText(/Corrige los errores léxicos/),
    ).toBeInTheDocument()
  })

  it('Ctrl+Enter compila', async () => {
    const user = await setup()
    act(() => useAppStore.getState().setSource(SRC.replace('20', '21')))
    expect(useAppStore.getState().compiledSource).toBe(SRC)
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(useAppStore.getState().compiledSource).toBe(SRC.replace('20', '21'))
  })

  it('cambia el tema y vuelve a seguir al del sistema', async () => {
    const user = await setup()
    const system = resolveTheme('system')
    expect(document.documentElement).toHaveClass('dark')
    await user.click(
      screen.getByRole('button', { name: /Cambiar a tema claro/ }),
    )
    expect(document.documentElement).toHaveClass('light')
    expect(useAppStore.getState().theme).toBe(
      system === 'light' ? 'system' : 'light',
    )
    await user.click(
      screen.getByRole('button', { name: /Cambiar a tema oscuro/ }),
    )
    expect(document.documentElement).toHaveClass('dark')
    expect(useAppStore.getState().theme).toBe(
      system === 'dark' ? 'system' : 'dark',
    )
  })

  it('cambia el idioma de la interfaz', async () => {
    const user = await walk()
    await user.click(screen.getByRole('button', { name: /Idioma: español/ }))
    expect(useAppStore.getState().lang).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Breve Compiler')
    const cardEn = () => screen.getByRole('region', { name: 'Current step' })
    expect(within(cardEn()).getByText('Analysis starts')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next step' }))
    expect(within(cardEn()).getByText('Insert into table')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Language: English/ }))
    expect(
      within(stepCard()).getByText('Insertar en la tabla'),
    ).toBeInTheDocument()
  })

  it('el selector carga cada ejemplo', async () => {
    const user = await setup('di 1\n', 'otro.brv')
    expect(screen.getByLabelText('Ejemplos')).toHaveValue('')
    await selectExample(user, 'Con errores sintácticos')
    expect(useAppStore.getState().file).toBe('error-sintactico.brv')
    expect(useAppStore.getState().result?.faseFallida).toBe('sintactico')
    expect(screen.getByLabelText('Ejemplos')).toHaveValue('sintactico')
  })

  it('exportar: elegir un formato descarga el archivo', async () => {
    const user = await setup()
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x')
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const trigger = screen.getByRole('button', { name: /Exportar/ })
    await user.click(trigger)
    expect(
      screen.getByRole('menuitem', { name: /Código fuente/ }),
    ).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(
      screen.getByRole('menuitem', {
        name: /^Tabla de símbolos$/,
      }),
    ).toHaveFocus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(
      screen.getByRole('menuitem', { name: /Resultado completo \(JSON\)/ }),
    ).toHaveFocus()
    const csv = screen.getByRole('menuitem', {
      name: /Traza semántica/,
    })
    await user.click(csv)
    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    expect(click.mock.instances[0]).toHaveAttribute(
      'download',
      'tipos-traza.csv',
    )
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    create.mockRestore()
    click.mockRestore()
  })

  it('las fases abren el panel que las muestra', async () => {
    const user = await setup()
    await user.click(within(phases()).getByRole('button', { name: /Léxico/ }))
    expect(screen.getByRole('tab', { name: 'Tokens' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await user.click(
      within(phases()).getByRole('button', { name: /Sintáctico/ }),
    )
    expect(
      screen.getByRole('tree', { name: 'Árbol sintáctico' }),
    ).toBeInTheDocument()
    await user.click(
      within(phases()).getByRole('button', { name: /Ejecución/ }),
    )
    expect(screen.getByRole('tab', { name: 'Resultado' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('la traza completa permite saltar a un paso', async () => {
    const user = await setup()
    await user.click(screen.getByRole('tab', { name: 'Traza' }))
    const traza = screen.getByRole('list', { name: 'Traza semántica' })
    await user.click(within(traza).getByText('insertar(iva, dec, constante)'))
    expect(useAppStore.getState().mode).toBe('run')
    expect(screen.getByText(`Paso 4/${TOTAL}`)).toBeInTheDocument()
  })

  it('clic en el nombre de una variable la vigila', async () => {
    const user = await walk()
    await user.keyboard('{F11}')
    const name = screen.getByRole('button', { name: 'Vigilar edad' })
    await user.click(name)
    expect(useAppStore.getState().watches).toEqual(['edad'])
    expect(name).toBeDisabled()
  })

  it('«?» abre la lista de atajos y se cierra', async () => {
    const user = await setup()
    await user.keyboard('?')
    expect(useAppStore.getState().helpOpen).toBe(true)
    const dialog = await screen.findByRole('dialog', {
      name: 'Atajos de teclado',
      hidden: true,
    })
    expect(within(dialog).getByText('Ctrl+Enter')).toBeInTheDocument()
    await user.click(
      within(dialog).getByRole('button', { name: 'Cerrar', hidden: true }),
    )
    await waitFor(() => expect(useAppStore.getState().helpOpen).toBe(false))
  })

  it('la primera visita no abre el tour: solo se abre con su botón', async () => {
    localStorage.clear()
    useAppStore.setState({ tourStep: null })
    render(<App />)
    await new Promise((r) => setTimeout(r, 50))
    expect(useAppStore.getState().tourStep).toBeNull()
    expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  })

  it('tour: recorre los pasos y se cierra con Esc', async () => {
    const user = await setup()
    const spy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        x: 0,
        y: 0,
        top: 10,
        left: 10,
        right: 110,
        bottom: 110,
        width: 100,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect)
    await user.click(screen.getByRole('button', { name: 'Tour guiado' }))
    expect(
      await screen.findByRole('dialog', { name: 'Escribe tu programa' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(
      await screen.findByRole('dialog', { name: 'Entrada y ejecución' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 de 9')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(useAppStore.getState().tourStep).toBeNull())
    spy.mockRestore()
  })
})
