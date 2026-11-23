import { compile as compileSource, ejecutar } from '@engine/compile'
import { pasosDeEjecucion } from '@engine/pasosEjecucion'
import type {
  PasoTraza,
  ResultadoCompilacion,
  ResultadoEjecucion,
} from '@engine/types'
import { create } from 'zustand'
import {
  type PersistStorage,
  persist,
  type StorageValue,
} from 'zustand/middleware'
import { EXAMPLE } from '@/examples'
import { cargarIdioma, detectLang, type Lang, MESSAGES } from '@/i18n'
import * as nav from './navigation'

export type Mode = 'run' | 'edit'
export type BottomTab =
  | 'console'
  | 'tokens'
  | 'ast'
  | 'symbols'
  | 'intermediate'
  | 'problems'
  | 'warnings'
  | 'trace'
export type SideTab = 'vars' | 'mem' | 'watch'
export type ThemePref = 'dark' | 'light' | 'system'
export type Speed = 'slow' | 'normal' | 'fast'
export type IrView = 'tac' | 'triplets' | 'quads' | 'blocks'
export type AstMode = 'abstract' | 'derivation'
export type TraceKind = 'semantic' | 'execution'
export const TRACE_KINDS: TraceKind[] = ['semantic', 'execution']
export type TraceDetail = 'full' | 'summary'
export const TRACE_DETAILS: TraceDetail[] = ['full', 'summary']

export const SPEED_MS: Record<Speed, number> = {
  slow: 1400,
  normal: 750,
  fast: 350,
}

export interface AppState {
  file: string
  source: string
  lastGoodSource: string
  mode: Mode
  result: ResultadoCompilacion | null
  compiledSource: string | null
  input: string
  execution: ResultadoEjecucion | null
  executedKey: string | null
  step: number
  playing: boolean
  speed: Speed
  breakpoints: number[]
  watches: string[]
  bottomTab: BottomTab
  sideTab: SideTab
  theme: ThemePref
  lang: Lang
  tourStep: number | null
  helpOpen: boolean
  inspectorOpen: boolean
  focusRequest: { line: number; col: number; nonce: number } | null
  showAttrs: boolean
  showTemps: boolean
  irView: IrView
  astMode: AstMode
  traceKind: TraceKind
  traceDetail: TraceDetail
  astGraph: boolean
  optimized: boolean
  fileNotice: string | null
  highlight: Fragmento | null
  cursor: { linea: number; columna: number } | null

  setSource(source: string): void
  loadFile(file: string, source: string, input?: string): void
  compile(): void
  setInput(input: string): void
  run(): void
  startDebugging(): void
  goTo(step: number): void
  stepInto(): void
  stepOver(): void
  back(): void
  reset(): void
  togglePlay(): void
  tick(): void
  setSpeed(speed: Speed): void
  setBreakpoints(lines: number[]): void
  toggleBreakpoint(line: number): void
  addWatch(expr: string): void
  removeWatch(index: number): void
  setBottomTab(tab: BottomTab): void
  setSideTab(tab: SideTab): void
  setTheme(theme: ThemePref): void
  setLang(lang: Lang): void
  setTour(step: number | null): void
  setHelpOpen(open: boolean): void
  setInspectorOpen(open: boolean): void
  focusLine(line: number, col?: number): void
  restoreLastGood(): void
  setShowAttrs(show: boolean): void
  setShowTemps(show: boolean): void
  setIrView(view: IrView): void
  setAstMode(mode: AstMode): void
  setTraceKind(kind: TraceKind): void
  setTraceDetail(detail: TraceDetail): void
  setAstGraph(show: boolean): void
  setOptimized(optimized: boolean): void
  setFileNotice(notice: string | null): void
  setHighlight(fragmento: Fragmento | null): void
  setCursor(linea: number, columna: number): void
}

export interface Fragmento {
  linea: number
  desde: number
  hasta: number
}

let pending: [string, StorageValue<unknown>] | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let lastWritten: string | null = null

export function flushPersist() {
  clearTimeout(timer)
  if (!pending) return
  const [k, v] = pending
  pending = null
  try {
    const json = JSON.stringify(v)
    if (json === lastWritten) return
    localStorage.setItem(k, json)
    lastWritten = json
  } catch {}
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist()
  })
}

const safeStorage: PersistStorage<unknown> = {
  getItem: (k) => {
    try {
      const json = localStorage.getItem(k)
      lastWritten = json
      return json === null ? null : (JSON.parse(json) as StorageValue<unknown>)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    pending = [k, v]
    clearTimeout(timer)
    timer = setTimeout(flushPersist, 300)
  },
  removeItem: (k) => {
    if (pending?.[0] === k) pending = null
    lastWritten = null
    try {
      localStorage.removeItem(k)
    } catch {}
  },
}

export const STORAGE_KEY = 'compilador-estado'

export function isStale(
  s: Pick<AppState, 'compiledSource' | 'source'>,
): boolean {
  return s.compiledSource !== s.source
}

export const errorCount = (s: AppState) =>
  (s.result?.errores.length ?? 0) + (currentExecution(s)?.error ? 1 : 0)

export const warningCount = (s: AppState) => s.result?.advertencias.length ?? 0

const execKey = (s: Pick<AppState, 'source' | 'input'>) =>
  `${s.source}\u0000${s.input}`

export function isExecuted(
  s: Pick<AppState, 'executedKey' | 'source' | 'input'>,
): boolean {
  return s.executedKey === execKey(s)
}

export const currentExecution = (s: AppState): ResultadoEjecucion | null =>
  isExecuted(s) ? s.execution : null

export const canRun = (s: AppState): boolean => !!s.result?.ok || isStale(s)

const EMPTY_TRACE: PasoTraza[] = []
const pasosCache = new WeakMap<ResultadoEjecucion, PasoTraza[]>()

const ejecucionesOpt = new WeakMap<
  ResultadoEjecucion,
  ResultadoEjecucion | null
>()

export function executionOptOf(
  s: Pick<
    AppState,
    'result' | 'execution' | 'executedKey' | 'source' | 'input'
  >,
): ResultadoEjecucion | null {
  const x = s.execution
  if (!x || !isExecuted(s) || !s.result?.ok) return null
  if (ejecucionesOpt.has(x)) return ejecucionesOpt.get(x) ?? null
  const opt = s.result.optimizado
  const o = opt
    ? ejecutar(
        {
          tablaSimbolos: s.result.tablaSimbolos,
          tresDirecciones: opt.tresDirecciones,
          cuadruplas: opt.cuadruplas,
        },
        s.input.split('\n'),
      )
    : null
  ejecucionesOpt.set(x, o)
  return o
}

export function tracedExecution(
  s: Pick<
    AppState,
    'result' | 'optimized' | 'execution' | 'executedKey' | 'source' | 'input'
  >,
): ResultadoEjecucion | null {
  if (!isExecuted(s)) return null
  if (s.optimized && s.result?.optimizado) {
    const o = executionOptOf(s)
    if (o) return o
  }
  return s.execution
}

export function activeTrace(
  s: Pick<
    AppState,
    | 'traceKind'
    | 'result'
    | 'optimized'
    | 'execution'
    | 'executedKey'
    | 'source'
    | 'input'
  >,
): PasoTraza[] {
  if (s.traceKind === 'semantic') return s.result?.traza ?? EMPTY_TRACE
  const x = tracedExecution(s)
  const r = s.result
  if (!x || !r?.ok) return EMPTY_TRACE
  let pasos = pasosCache.get(x)
  if (!pasos) {
    const codigo = x !== s.execution && r.optimizado ? r.optimizado : r
    pasos = pasosDeEjecucion(
      {
        tresDirecciones: codigo.tresDirecciones,
        tablaSimbolos: r.tablaSimbolos,
      },
      r.ast,
      x,
    )
    pasosCache.set(x, pasos)
  }
  return pasos
}

const nadaOculto: nav.Oculto = () => false
const sinBusquedas: nav.Oculto = (e) => e.accion === 'buscar'

export function pasoOculto(
  s: Pick<AppState, 'traceKind' | 'traceDetail'>,
): nav.Oculto {
  return s.traceKind === 'semantic' && s.traceDetail === 'summary'
    ? sinBusquedas
    : nadaOculto
}

const visiblesHasta = new WeakMap<PasoTraza[], Int32Array>()

function conteoVisibles(trace: PasoTraza[], oculto: nav.Oculto): Int32Array {
  let c = visiblesHasta.get(trace)
  if (!c) {
    c = new Int32Array(trace.length)
    let n = 0
    trace.forEach((p, i) => {
      if (!oculto(p)) n++
      ;(c as Int32Array)[i] = n
    })
    visiblesHasta.set(trace, c)
  }
  return c
}

export function numeroDePaso(s: AppState): number {
  const trace = activeTrace(s)
  const oculto = pasoOculto(s)
  if (oculto === nadaOculto) return s.step + 1
  return Math.max(conteoVisibles(trace, oculto)[s.step] ?? 0, 1)
}

export function totalDePasos(s: AppState): number {
  const trace = activeTrace(s)
  const oculto = pasoOculto(s)
  if (oculto === nadaOculto) return trace.length
  return conteoVisibles(trace, oculto).at(-1) ?? 0
}

export function canDebug(s: AppState): boolean {
  return !isStale(s) && activeTrace(s).length > 0
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const move = (fn: (s: AppState) => number) => {
        if (isStale(get())) get().compile()
        const s = get()
        if (!canDebug(s)) return
        if (s.mode === 'edit') {
          set({ mode: 'run', step: 0, playing: false })
          return
        }
        set({ step: fn(s), playing: false })
      }
      const trace = () => activeTrace(get())
      const bps = () => new Set(get().breakpoints)
      const oculto = () => pasoOculto(get())

      return {
        file: EXAMPLE.file,
        source: EXAMPLE.source,
        lastGoodSource: EXAMPLE.source,
        mode: 'edit',
        result: null,
        compiledSource: null,
        input: EXAMPLE.inputs[0],
        execution: null,
        executedKey: null,
        step: 0,
        playing: false,
        speed: 'normal',
        breakpoints: [],
        watches: [],
        bottomTab: 'console',
        sideTab: 'vars',
        theme: 'system',
        lang: detectLang(),
        tourStep: null,
        helpOpen: false,
        inspectorOpen: false,
        focusRequest: null,
        showAttrs: false,
        showTemps: true,
        irView: 'tac',
        astMode: 'abstract',
        traceKind: 'semantic',
        traceDetail: 'full',
        astGraph: true,
        optimized: false,
        fileNotice: null,
        highlight: null,
        cursor: null,

        setSource(source) {
          if (source === get().source) return
          set({ source, mode: 'edit', playing: false, fileNotice: null })
        },

        loadFile(file, source, input) {
          set({
            fileNotice: null,
            file,
            source,
            ...(input === undefined ? {} : { input }),
            mode: 'edit',
            playing: false,
            breakpoints: [],
            step: 0,
          })
          get().compile()
        },

        compile() {
          const { source } = get()
          const result = compileSource(source)
          const patch: Partial<AppState> = {
            result,
            compiledSource: source,
            mode: 'edit',
            playing: false,
            step: 0,
          }
          if (result?.ok) patch.lastGoodSource = source
          set(patch)
        },

        setInput: (input) => set({ input }),

        run() {
          if (isStale(get())) get().compile()
          const s = get()
          if (!s.result?.ok) {
            set({ bottomTab: 'problems' })
            return
          }
          set({
            execution: ejecutar(s.result, s.input.split('\n')),
            executedKey: execKey(s),
            bottomTab: 'console',
          })
        },

        startDebugging() {
          if (isStale(get())) get().compile()
          if (get().traceKind === 'execution' && !isExecuted(get())) {
            const tab = get().bottomTab
            get().run()
            set({ bottomTab: tab })
          }
          if (canDebug(get())) set({ mode: 'run', step: 0, playing: false })
        },

        goTo(step) {
          if (!canDebug(get())) return
          set({
            mode: 'run',
            playing: false,
            step: Math.max(0, Math.min(step, trace().length - 1)),
          })
        },
        stepInto: () => move((s) => nav.stepInto(trace(), s.step, oculto())),
        stepOver: () =>
          move((s) => nav.stepOver(trace(), s.step, bps(), oculto())),
        back: () => move((s) => nav.back(s.step, trace(), oculto())),
        reset: () => move(() => 0),

        togglePlay() {
          const s = get()
          if (s.playing) {
            set({ playing: false })
            return
          }
          if (isStale(s)) get().compile()
          if (!canDebug(get())) return
          const cur = get()
          const atEnd = cur.step >= trace().length - 1
          set({
            mode: 'run',
            playing: true,
            step: cur.mode === 'edit' || atEnd ? 0 : cur.step,
          })
        },

        tick() {
          const s = get()
          if (!s.playing || s.mode !== 'run') return
          const next = nav.stepInto(trace(), s.step, oculto())
          set({ step: next, playing: !nav.shouldPause(trace(), next, bps()) })
        },

        setSpeed: (speed) => set({ speed }),
        setBreakpoints(lines) {
          const sorted = [...new Set(lines)].sort((a, b) => a - b)
          const cur = get().breakpoints
          if (
            sorted.length !== cur.length ||
            sorted.some((l, i) => l !== cur[i])
          )
            set({ breakpoints: sorted })
        },
        toggleBreakpoint(line) {
          const cur = get().breakpoints
          set({
            breakpoints: cur.includes(line)
              ? cur.filter((l) => l !== line)
              : [...cur, line].sort((a, b) => a - b),
          })
        },
        addWatch(expr) {
          const e = expr.trim()
          if (e && !get().watches.includes(e))
            set({ watches: [...get().watches, e] })
        },
        removeWatch: (index) =>
          set({ watches: get().watches.filter((_, i) => i !== index) }),
        setBottomTab: (bottomTab) => set({ bottomTab }),
        setSideTab: (sideTab) => set({ sideTab }),
        setTheme: (theme) => set({ theme }),
        setLang(lang) {
          if (MESSAGES[lang]) set({ lang })
          else void cargarIdioma(lang).then(() => set({ lang }))
        },
        setTour: (tourStep) =>
          set(tourStep === null ? { tourStep } : { tourStep, playing: false }),
        setHelpOpen: (helpOpen) => set({ helpOpen }),
        setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
        focusLine: (line, col = 1) =>
          set({
            focusRequest: { line, col, nonce: Date.now() + Math.random() },
          }),
        restoreLastGood() {
          const s = get()
          set({
            source: s.lastGoodSource,
            mode: 'edit',
            playing: false,
          })
          get().compile()
        },
        setShowAttrs: (showAttrs) => set({ showAttrs }),
        setShowTemps: (showTemps) => set({ showTemps }),
        setIrView: (irView) => set({ irView }),
        setAstMode: (astMode) => set({ astMode }),
        setTraceKind(traceKind) {
          if (traceKind === get().traceKind) return
          set({ traceKind, step: 0, playing: false })
          if (get().mode === 'run') get().startDebugging()
        },
        setTraceDetail: (traceDetail) => set({ traceDetail }),
        setAstGraph: (astGraph) => set({ astGraph }),
        setOptimized: (optimized) => set({ optimized }),
        setFileNotice: (fileNotice) => set({ fileNotice }),
        setHighlight(highlight) {
          const h = get().highlight
          if (
            h === highlight ||
            (h &&
              highlight &&
              h.linea === highlight.linea &&
              h.desde === highlight.desde &&
              h.hasta === highlight.hasta)
          )
            return
          set({ highlight })
        },
        setCursor(linea, columna) {
          const c = get().cursor
          if (c?.linea !== linea || c.columna !== columna)
            set({ cursor: { linea, columna } })
        },
      }
    },
    {
      name: STORAGE_KEY,
      version: 3,
      migrate: (persisted, version) =>
        (version < 3 ? {} : persisted) as Partial<AppState>,
      storage: safeStorage as PersistStorage<Partial<AppState>>,
      partialize: (s) => ({
        file: s.file,
        source: s.source,
        input: s.input,
        theme: s.theme,
        lang: s.lang,
        watches: s.watches,
        breakpoints: s.breakpoints,
        speed: s.speed,
        showAttrs: s.showAttrs,
        showTemps: s.showTemps,
        irView: s.irView,
        astMode: s.astMode,
        traceKind: s.traceKind,
        traceDetail: s.traceDetail,
        astGraph: s.astGraph,
        optimized: s.optimized,
      }),
    },
  ),
)

export function isRunning(s: AppState): boolean {
  return s.mode === 'run' && canDebug(s)
}

export function currentEvent(s: AppState): PasoTraza | undefined {
  return isRunning(s) ? activeTrace(s)[s.step] : undefined
}

export function useCurrentEvent(): {
  event: PasoTraza | undefined
  prev: PasoTraza | undefined
} {
  const event = useAppStore(currentEvent)
  const prev = useAppStore((s) =>
    isRunning(s) && s.step > 0 ? activeTrace(s)[s.step - 1] : undefined,
  )
  return { event, prev }
}
