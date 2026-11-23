import { compile, ejecutar } from '@engine/compile'
import { formatTAC } from '@engine/formato'
import type { ResultadoCompilacion } from '@engine/types'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '@/App'
import { EXAMPLES } from '@/examples'
import { useAppStore } from '@/store/appStore'

const BOLETIN = `// boletin.brv : promedio de tres notas
cn ent NOTAS = 3
cn dec MINIMA = 6.0
va txt nombre
va ent n1, n2, n3
va dec promedio
va bool aprobo
va ent vueltas = 0
va dec bono = 1
lee nombre
lee n1
lee n2
lee n3
promedio = (n1 + n2 + n3) / NOTAS
aprobo = promedio >= MINIMA
di "Alumno: " + nombre
di promedio
si aprobo di nombre + " aprobó" no di nombre + " reprobó"
rep NOTAS vueltas = vueltas + 1
si vueltas == NOTAS di -vueltas * 2
`

const TAC_BOLETIN = [
  'NOTAS = 3',
  'MINIMA = 6.0',
  'vueltas = 0',
  'bono = 1',
  'read nombre',
  'read n1',
  'read n2',
  'read n3',
  't1 = n1 + n2',
  't2 = t1 + n3',
  't3 = t2 / NOTAS',
  'promedio = t3',
  't4 = promedio >= MINIMA',
  'aprobo = t4',
  't5 = "Alumno: " + nombre',
  'write t5',
  'write promedio',
  'if aprobo goto 21',
  't6 = nombre + " reprobó"',
  'write t6',
  'goto 23',
  't7 = nombre + " aprobó"',
  'write t7',
  '_c1 = 0',
  't8 = _c1 >= NOTAS',
  'if t8 goto 31',
  't9 = vueltas + 1',
  'vueltas = t9',
  't10 = _c1 + 1',
  '_c1 = t10',
  'goto 24',
  't11 = vueltas == NOTAS',
  'if t11 goto 34',
  'goto 37',
  't12 = 0 - vueltas',
  't13 = t12 * 2',
  'write t13',
  'halt',
]

const compilado = compile(BOLETIN)
const correr = (entrada: string) => ejecutar(compilado, entrada.split('\n'))

describe('integración: boletin.brv por las cinco fases', () => {
  it('1. léxico: tokens sin errores, reservadas, ID y números', () => {
    const { tokens } = compilado
    expect(compilado.errores).toEqual([])
    expect(tokens[0].tipo).toBe('SALTO')
    const de = (lexema: string) => tokens.find((t) => t.lexema === lexema)
    expect(de('cn')).toMatchObject({ tipo: 'CN', linea: 2, columna: 1 })
    expect(de('MINIMA')).toMatchObject({ tipo: 'ID', linea: 3, columna: 8 })
    expect(de('6.0')).toMatchObject({ tipo: 'DECIMAL', valor: 6 })
    expect(de('aprobo')?.tipo).toBe('ID')
    expect(de('>=')?.tipo).toBe('COMP')
    expect(de('" aprobó"')).toMatchObject({ tipo: 'CADENA', valor: ' aprobó' })
    expect(tokens.filter((t) => t.tipo === 'SALTO')).toHaveLength(20)
  })

  it('2. sintáctico: 19 instrucciones y la precedencia correcta', () => {
    const instrs = compilado.ast?.instrucciones ?? []
    expect(instrs).toHaveLength(19)
    expect(instrs.map((i) => i.tipo)).toEqual([
      'Cn',
      'Cn',
      'Va',
      'Va',
      'Va',
      'Va',
      'Va',
      'Va',
      'Lee',
      'Lee',
      'Lee',
      'Lee',
      'Asig',
      'Asig',
      'Di',
      'Di',
      'Si',
      'Rep',
      'Si',
    ])
    const asig = instrs[12]
    if (asig.tipo !== 'Asig' || asig.valor.tipo !== 'Binaria')
      throw new Error('se esperaba una asignación con una operación')
    expect(asig.valor.op).toBe('/')
    expect(asig.valor.izq).toMatchObject({
      op: '+',
      izq: { op: '+', izq: { nombre: 'n1' }, der: { nombre: 'n2' } },
      der: { nombre: 'n3' },
    })
  })

  it('3. semántico: tipos, tabla de símbolos y dos advertencias', () => {
    expect(compilado.faseFallida).toBeNull()
    const asig = compilado.ast?.instrucciones[12]
    if (asig?.tipo !== 'Asig') throw new Error('se esperaba una asignación')
    expect(asig.valor.anot).toEqual({ tipo: 'dec' })

    const fila = (n: string) =>
      compilado.tablaSimbolos.find((s) => s.nombre === n)
    const variables = compilado.tablaSimbolos
      .filter((s) => s.categoria !== 'temporal')
      .map((s) => `${s.nombre} ${s.categoria} ${s.tipo} @${s.direccion}`)
    expect(variables).toEqual([
      'NOTAS constante ent @0',
      'MINIMA constante dec @4',
      'nombre variable txt @12',
      'n1 variable ent @16',
      'n2 variable ent @20',
      'n3 variable ent @24',
      'promedio variable dec @28',
      'aprobo variable bool @36',
      'vueltas variable ent @37',
      'bono variable dec @41',
    ])
    expect(fila('MINIMA')).toMatchObject({ valor: 6, inicializado: true })
    expect(fila('NOTAS')?.lineasReferencia).toEqual([14, 19, 20])
    expect(fila('vueltas')).toMatchObject({ usado: true, valor: 0 })

    expect(compilado.advertencias.map((a) => [a.linea, a.columna])).toEqual([
      [9, 8],
      [9, 15],
    ])
    expect(compilado.advertencias.map((a) => a.mensaje)).toEqual([
      "'bono' fue declarada en la línea 9 y nunca se usa",
      "conversión implícita de ent a dec al asignar a 'bono'",
    ])

    expect(compilado.traza[0].accion).toBe('inicio')
    expect(compilado.traza.at(-1)).toMatchObject({
      accion: 'fin',
      resultado: '0 errores, 2 advertencias',
    })
    expect(
      compilado.traza.some((p) =>
        p.detalle.endsWith(': txt + txt (concatenación)'),
      ),
    ).toBe(true)
  })

  it('4. intermedio: tres direcciones, tripletas y cuádruplas', () => {
    expect(compilado.tresDirecciones.map(formatTAC)).toEqual(TAC_BOLETIN)
    expect(compilado.tripletas).toHaveLength(38)
    expect(compilado.cuadruplas).toHaveLength(38)
    expect(compilado.tripletas[10]).toEqual({
      op: '/',
      arg1: '(9)',
      arg2: 'NOTAS',
    })
    expect(compilado.tripletas[25]).toEqual({
      op: 'if',
      arg1: '(24)',
      arg2: '(31)',
    })
    expect(compilado.cuadruplas[35]).toEqual({
      op: '*',
      arg1: 't12',
      arg2: '2',
      resultado: 't13',
    })
    const temporales = compilado.tablaSimbolos
      .filter((s) => s.categoria === 'temporal')
      .map((s) => s.nombre)
    expect(temporales).toEqual([
      't1',
      't2',
      't3',
      't4',
      't5',
      't6',
      't7',
      '_c1',
      't8',
      't9',
      't10',
      't11',
      't12',
      't13',
    ])
    expect(compilado.ok).toBe(true)
  })

  it('5. ejecución: Ana aprueba', () => {
    const r = correr('Ana\n7\n8\n6')
    expect(r.error).toBeNull()
    expect(r.salida).toEqual(['Alumno: Ana', '7.0', 'Ana aprobó', '-6'])
    expect(r.memoria).toMatchObject({
      promedio: 7,
      aprobo: true,
      vueltas: 3,
      _c1: 3,
      bono: 1,
    })
    expect(r.instrucciones).toBe(50)
  })

  it('5. ejecución: Luis reprueba', () => {
    expect(correr('Luis\n5\n4\n6').salida).toEqual([
      'Alumno: Luis',
      '5.0',
      'Luis reprobó',
      '-6',
    ])
  })

  it('5. ejecución: una nota que no es entera se informa en su lee', () => {
    const r = correr('Eva\n7\nx\n6')
    expect(r.ok).toBe(false)
    expect(r.error).toMatchObject({
      cuadrupla: 6,
      linea: 12,
      columna: 5,
      largo: 2,
    })
    expect(r.error?.mensaje).toMatch(
      /^entrada inválida 'x': 'n2' es de tipo ent/,
    )
  })
})

describe('integración: cada fase detiene la compilación en su error', () => {
  const casos: [string, string, ResultadoCompilacion['faseFallida']][] = [
    [
      'léxico',
      BOLETIN.replace('cn ent NOTAS = 3', 'cn ent NOTAS = 3 @'),
      'lexico',
    ],
    ['sintáctico', BOLETIN.replace('lee n1', 'lee'), 'sintactico'],
    [
      'semántico',
      BOLETIN.replace('di promedio', 'di promedio + nombre'),
      'semantico',
    ],
  ]

  it.each(casos)('error %s', (_, fuente, fase) => {
    const r = compile(fuente)
    expect(r.ok).toBe(false)
    expect(r.faseFallida).toBe(fase)
    expect(r.errores).toHaveLength(1)
    expect(r.errores[0].fase).toBe(fase)
    expect(r.cuadruplas).toEqual([])
    if (fase === 'lexico') expect(r.ast).toBeNull()
    if (fase === 'sintactico') expect(r.ast).not.toBeNull()
    expect(r.tokens.length).toBeGreaterThan(0)
  })
})

describe('integración: propiedades de todo programa compilado', () => {
  const propios = [
    BOLETIN,
    'di 2 + 3 * 4',
    'va ent i\nrep 3 i = i + 1\nrep i di i\nsi i > 2 di "fin"',
    'va txt t1 = "x"\ndi t1 + t1',
  ]
  const programas = [...EXAMPLES.map((e) => e.source), ...propios]

  it.each(programas.map((p, i) => [i, p]))('programa %i', (_, fuente) => {
    const r = compile(fuente as string)
    if (!r.ok) return
    const n = r.tresDirecciones.length
    expect(r.tripletas).toHaveLength(n)
    expect(r.cuadruplas).toHaveLength(n)
    expect(r.cuadruplas.at(-1)?.op).toBe('halt')
    for (const c of r.cuadruplas)
      if (c.op === 'if' || c.op === 'goto') {
        const destino = Number(c.resultado)
        expect(destino).toBeGreaterThanOrEqual(0)
        expect(destino).toBeLessThan(n)
      }
    const nombres = new Set(r.tablaSimbolos.map((s) => s.nombre))
    const esNombre = (a: string) =>
      /^[a-zA-Z_]/.test(a) && !['verdadero', 'falso'].includes(a)
    for (const c of r.cuadruplas)
      for (const a of [c.arg1, c.arg2, c.resultado])
        if (a && esNombre(a) && !['halt'].includes(a))
          expect(nombres.has(a), `${a} en la tabla`).toBe(true)
    const tabla = [...r.tablaSimbolos].sort((a, b) => a.direccion - b.direccion)
    for (let i = 1; i < tabla.length; i++)
      expect(tabla[i].direccion).toBe(
        tabla[i - 1].direccion + tabla[i - 1].tamano,
      )
    const ejemplo = EXAMPLES.find((e) => e.source === fuente)
    const entrada = (ejemplo?.inputs[0] ?? 'Ana\n7\n8\n6').split('\n')
    const ejec = ejecutar(r, entrada)
    expect(ejec.instrucciones).toBeGreaterThan(0)
    expect(ejec.instrucciones).toBeLessThanOrEqual(100_000)
  })
})

describe('integración: la página de punta a punta', () => {
  it('escribir, compilar, revisar cada fase, ejecutar y corregir la entrada', {
    timeout: 30_000,
  }, async () => {
    localStorage.clear()
    useAppStore.setState({
      lang: 'es',
      theme: 'dark',
      tourStep: null,
      bottomTab: 'console',
      showTemps: true,
      irView: 'tac',
      input: '',
      execution: null,
      executedKey: null,
    })
    useAppStore.getState().loadFile('boletin.brv', BOLETIN)
    const user = userEvent.setup()
    render(<App />)
    const fases = () =>
      screen.getByRole('navigation', { name: 'Fases de compilación' })
    const abrirFase = (nombre: RegExp) =>
      user.click(within(fases()).getByRole('button', { name: nombre }))

    for (const f of [/Léxico/, /Sintáctico/, /Semántico/, /Intermedio/])
      expect(within(fases()).getByText(f)).toHaveTextContent('correcta')
    expect(within(fases()).getByText(/Ejecución/)).toHaveTextContent(
      'pendiente',
    )

    await abrirFase(/Léxico/)
    const tokens = screen.getByRole('table', { name: 'Tabla de tokens' })
    expect(within(tokens).getAllByText('MINIMA').length).toBeGreaterThan(0)

    await abrirFase(/Sintáctico/)
    const arbol = screen.getByRole('tree', { name: 'Árbol sintáctico' })
    expect(within(arbol).getAllByText('NOTAS').length).toBeGreaterThan(0)

    await abrirFase(/Semántico/)
    expect(
      within(
        screen.getByRole('table', { name: /Tabla de símbolos/ }),
      ).getAllByText('promedio').length,
    ).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: /Advertencias/ }))
    expect(screen.getByText(/'bono' fue declarada/)).toBeInTheDocument()

    await abrirFase(/Intermedio/)
    expect(screen.getByText('38 instrucciones (0 a 37)')).toBeInTheDocument()
    const tac = screen.getByRole('table', { name: 'Tres direcciones' })
    expect(within(tac).getAllByRole('row')[11]).toHaveTextContent(
      't3 = t2 / NOTAS',
    )

    const entrada = screen.getByRole('textbox', {
      name: 'Entrada (un valor por línea)',
    })
    await user.type(entrada, 'Ana{Enter}7{Enter}8{Enter}6')
    await user.keyboard('{Control>}{Enter}{/Control}')
    const log = screen.getByRole('log', { name: 'Salida del programa' })
    for (const linea of ['Alumno: Ana', '7.0', 'Ana aprobó', '-6'])
      expect(log).toHaveTextContent(linea)
    expect(screen.getByText(/50 instrucciones ejecutadas/)).toBeInTheDocument()
    expect(within(fases()).getByText(/Ejecución/)).toHaveTextContent('correcta')

    await user.clear(entrada)
    await user.type(entrada, 'Eva{Enter}7{Enter}x{Enter}6')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(within(fases()).getByText(/Ejecución/)).toHaveTextContent(
      'con errores',
    )
    expect(screen.getByText(/entrada inválida 'x'/)).toBeInTheDocument()

    act(() =>
      useAppStore
        .getState()
        .setSource(BOLETIN.replace('di promedio', 'di promedio + nombre')),
    )
    await user.click(screen.getByRole('button', { name: 'Compilar' }))
    expect(within(fases()).getByText(/Semántico/)).toHaveTextContent(
      'con errores',
    )
    expect(within(fases()).getByText(/Intermedio/)).toHaveTextContent(
      'pendiente',
    )
  })
})
