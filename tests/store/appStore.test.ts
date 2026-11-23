import {
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  canDebug,
  currentExecution,
  flushPersist,
  isExecuted,
  isStale,
  STORAGE_KEY,
  useAppStore,
} from '@/store/appStore'

const store = () => useAppStore.getState()
const total = () => store().result?.traza.length ?? 0

describe('appStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      playing: false,
      breakpoints: [],
      watches: [],
      mode: 'edit',
      step: 0,
    })
    store().loadFile('tipos.brv', FUENTE_TIPOS)
  })

  it('cargar un archivo lo compila; se recorre a mano', () => {
    expect(isStale(store())).toBe(false)
    expect(store().result?.ok).toBe(true)
    expect(store().mode).toBe('edit')
    expect(canDebug(store())).toBe(true)
    store().startDebugging()
    expect(store().mode).toBe('run')
  })

  it('editar deja el resultado viejo; avanzar compila primero', () => {
    store().setSource('di 1\n')
    expect(isStale(store())).toBe(true)
    expect(canDebug(store())).toBe(false)
    store().stepInto()
    expect(isStale(store())).toBe(false)
    expect(store().result?.ok).toBe(true)
    expect(store().mode).toBe('run')
    expect(store().step).toBe(0)
  })

  it('movimientos, reinicio y goTo', () => {
    store().stepInto()
    expect(store().mode).toBe('run')
    store().stepInto()
    store().stepInto()
    expect(store().step).toBe(2)
    store().back()
    expect(store().step).toBe(1)
    store().stepOver()
    expect(store().result?.traza[store().step].linea).toBe(2)
    store().goTo(999)
    expect(store().step).toBe(total() - 1)
    store().reset()
    expect(store().step).toBe(0)
  })

  it('la reproducción se detiene en un punto de interrupción y al final', () => {
    store().toggleBreakpoint(4)
    store().togglePlay()
    expect(store().playing).toBe(true)
    for (let i = 0; i < 50 && store().playing; i++) store().tick()
    expect(store().playing).toBe(false)
    expect(store().result?.traza[store().step].linea).toBe(4)
    store().toggleBreakpoint(4)
    store().togglePlay()
    for (let i = 0; i < 100 && store().playing; i++) store().tick()
    expect(store().step).toBe(total() - 1)
  })

  it('con errores sintácticos no hay traza; se puede volver a la versión buena', () => {
    store().setSource(FUENTE_ERROR_SINTACTICO)
    store().compile()
    expect(store().result?.faseFallida).toBe('sintactico')
    expect(canDebug(store())).toBe(false)
    expect(store().lastGoodSource).toBe(FUENTE_TIPOS)
    store().restoreLastGood()
    expect(store().source).toBe(FUENTE_TIPOS)
    expect(store().result?.ok).toBe(true)
  })

  it('ejecutar: usa la entrada y queda obsoleto al cambiarla', () => {
    store().loadFile('potencia.brv', FUENTE_POTENCIA, 'Ana\n2\n5')
    expect(isExecuted(store())).toBe(false)
    store().run()
    expect(isExecuted(store())).toBe(true)
    expect(store().bottomTab).toBe('console')
    expect(currentExecution(store())?.salida[2]).toBe('32')
    store().setInput('Ana\n3\n5')
    expect(isExecuted(store())).toBe(false)
    expect(currentExecution(store())).toBeNull()
    store().run()
    expect(currentExecution(store())?.salida[2]).toBe('243')
  })

  it('ejecutar con errores de compilación lleva a la pestaña Errores', () => {
    store().setSource(FUENTE_ERROR_SINTACTICO)
    store().run()
    expect(store().result?.ok).toBe(false)
    expect(isExecuted(store())).toBe(false)
    expect(store().bottomTab).toBe('problems')
  })

  it('vigiladas sin duplicados ni vacías', () => {
    store().addWatch(' x ')
    store().addWatch('x')
    store().addWatch('  ')
    expect(store().watches).toEqual(['x'])
    store().removeWatch(0)
    expect(store().watches).toEqual([])
  })

  it('persiste solo las preferencias', () => {
    store().setTheme('light')
    store().addWatch('x')
    flushPersist()
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.version).toBe(3)
    expect(Object.keys(saved.state).sort()).toEqual([
      'astGraph',
      'astMode',
      'breakpoints',
      'file',
      'input',
      'irView',
      'lang',
      'optimized',
      'showAttrs',
      'showTemps',
      'source',
      'speed',
      'theme',
      'traceDetail',
      'traceKind',
      'watches',
    ])
    expect(saved.state.theme).toBe('light')
  })

  it('descarta el estado guardado de una versión anterior', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: { source: 'print(1)', file: 'a.py', theme: 'light' },
      }),
    )
    await useAppStore.persist.rehydrate()
    expect(store().source).not.toBe('print(1)')
    expect(store().file).not.toBe('a.py')
  })
})
