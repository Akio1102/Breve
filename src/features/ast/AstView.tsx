import { clsx } from 'clsx'
import { ChevronDown, ChevronRight, CircleX, TriangleAlert } from 'lucide-react'
import {
  type KeyboardEvent,
  memo,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ArbolGrafico } from '@/arbol/ArbolGrafico'
import {
  aplanar,
  carpetas,
  conLineasDescartadas,
  construirArbol,
  expandidoPorDefecto,
  type FilaArbol,
  type Marca,
  marcarDiagnosticos,
  type NivelMarca,
  type Nodo,
} from '@/arbol/arbol'
import {
  ancestros,
  nodoDelPaso,
  nodoEnColumna,
  nodoPorId,
} from '@/arbol/layout'
import { useT } from '@/i18n/useT'
import {
  type AstMode,
  currentEvent,
  type Fragmento,
  isStale,
  useAppStore,
} from '@/store/appStore'
import { EMPTY } from '@/store/selectors'
import { EmptyState } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Segmented } from '@/ui/Segmented'
import { useVirtualRows } from '@/ui/useVirtualRows'
import { SpacerBlock } from '@/ui/VirtualSpacer'

const fragmentoDe = (n: Nodo): Fragmento | null =>
  n.desde !== undefined &&
  n.hasta !== undefined &&
  (n.instr >= 0 || n.descartada !== undefined)
    ? { linea: n.linea, desde: n.desde, hasta: n.hasta }
    : null

const MODES: AstMode[] = ['abstract', 'derivation']

const NIVEL = 'w-4'

function Guides({ fila }: { fila: FilaArbol }) {
  if (fila.nivel === 0) return null
  return (
    <span aria-hidden className="flex shrink-0 self-stretch">
      {fila.guias.map((sigue, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: una guía por nivel
          key={i}
          className={clsx(NIVEL, 'relative shrink-0')}
        >
          {sigue && (
            <span className="absolute inset-y-0 left-1.5 border-l border-border" />
          )}
        </span>
      ))}
      <span className={clsx(NIVEL, 'relative shrink-0')}>
        <span
          className={clsx(
            'absolute left-1.5 top-0 border-l border-border',
            fila.ultimo ? 'h-1/2' : 'h-full',
          )}
        />
        <span className="absolute left-1.5 right-0 top-1/2 border-t border-border" />
      </span>
    </span>
  )
}

const TreeRow = memo(function TreeRow({
  fila,
  index,
  focused,
  current,
  showAttrs,
  onToggle,
  onActivate,
  onFocusRow,
  onKeyDown,
  onHover,
  marca,
  marcaDentro,
  ref,
}: {
  ref?: Ref<HTMLDivElement>
  onHover(n: Nodo | null): void
  marca?: Marca
  marcaDentro?: NivelMarca
  fila: FilaArbol
  index: number
  focused: boolean
  current: boolean
  showAttrs: boolean
  onToggle(index: number): void
  onActivate(index: number): void
  onFocusRow(index: number): void
  onKeyDown(e: KeyboardEvent<HTMLDivElement>, index: number): void
}) {
  const t = useT()
  const { nodo } = fila
  const principal = nodo.texto || nodo.clase
  return (
    <div
      ref={ref}
      role="treeitem"
      aria-level={fila.nivel + 1}
      aria-setsize={fila.hermanos}
      aria-posinset={fila.posicion}
      aria-expanded={fila.expandido ?? undefined}
      aria-selected={focused}
      aria-current={current ? 'step' : undefined}
      tabIndex={focused ? 0 : -1}
      data-index={index}
      onFocus={() => onFocusRow(index)}
      onMouseEnter={() => onHover(nodo)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => onKeyDown(e, index)}
      onClick={(e) =>
        (e.target as HTMLElement).closest('[data-twisty]')
          ? onToggle(index)
          : onActivate(index)
      }
      className={clsx(
        'flex min-h-6 cursor-pointer items-center gap-x-1.5 rounded pr-2 font-mono text-xs outline-offset-[-2px] hover:bg-surface-2',
        focused && 'bg-surface-2',
        current && 'ring-1 ring-inset ring-accent/50',
      )}
    >
      <Guides fila={fila} />
      {fila.expandido === null ? (
        <span aria-hidden className="w-3.5 shrink-0" />
      ) : (
        <span
          aria-hidden
          data-twisty
          className="shrink-0 rounded text-muted hover:text-text"
        >
          {fila.expandido ? (
            <ChevronDown size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
        </span>
      )}
      {nodo.descartada !== undefined ? (
        <span className="flex min-w-0 items-baseline gap-1.5 text-danger">
          <CircleX size={13} aria-hidden className="shrink-0 self-center" />
          <span className="font-semibold whitespace-nowrap">
            {t.ast.discarded(nodo.linea)}
          </span>
          <span className="truncate font-sans text-[11px] text-muted">
            {nodo.descartada}
          </span>
        </span>
      ) : (
        <>
          {nodo.rol && (
            <span className="text-[11px] text-muted italic">
              {t.ast.roles[nodo.rol]}
            </span>
          )}
          <span
            className={clsx(
              'whitespace-pre',
              marca?.nivel === 'error'
                ? 'text-danger'
                : marca?.nivel === 'advertencia'
                  ? 'text-warn'
                  : nodo.terminal || nodo.texto
                    ? 'text-text'
                    : 'text-fn',
              !nodo.texto && 'italic',
              nodo.esInstruccion && 'font-semibold',
            )}
          >
            {principal}
          </span>
          {marca && (
            <span
              title={marca.mensajes.join('\n')}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1 text-[11px]',
                marca.nivel === 'error' ? 'text-danger' : 'text-warn',
              )}
            >
              {marca.nivel === 'error' ? (
                <CircleX size={12} aria-hidden />
              ) : (
                <TriangleAlert size={12} aria-hidden />
              )}
              <span className="sr-only">
                {marca.nivel === 'error' ? t.ast.hasError : t.ast.hasWarning}:{' '}
                {marca.mensajes.join('; ')}
              </span>
            </span>
          )}
          {!marca && marcaDentro && fila.expandido === false && (
            <span
              title={
                marcaDentro === 'error'
                  ? t.ast.errorInside
                  : t.ast.warningInside
              }
              className={clsx(
                'size-1.5 shrink-0 rounded-full',
                marcaDentro === 'error' ? 'bg-danger' : 'bg-warn',
              )}
            />
          )}
          {nodo.texto && nodo.clase && (
            <span
              title={nodo.terminal ? t.ast.terminal : t.ast.nonTerminal}
              className={clsx(
                'text-[10px] text-muted',
                nodo.terminal ? 'rounded border border-border px-1' : 'italic',
              )}
            >
              {nodo.clase}
            </span>
          )}
          {showAttrs &&
            nodo.attrs.map((a) => (
              <span
                key={a.name}
                title={a.kind === 'inh' ? t.ast.inherited : t.ast.synthesized}
                className={clsx(
                  'rounded px-1 text-[11px]',
                  a.kind === 'inh' ? 'bg-h3/15 text-h3' : 'bg-val/15 text-val',
                )}
              >
                {a.kind === 'inh' ? '↓' : '↑'} {a.name}={a.value}
              </span>
            ))}
        </>
      )}
      {nodo.esInstruccion && (
        <span className="ml-auto pl-2 text-[11px] text-muted">
          L{nodo.linea}
        </span>
      )}
    </div>
  )
})

export function AstView({ className }: { className?: string }) {
  const result = useAppStore((s) => s.result)
  const ast = result?.ast ?? null
  const mode = useAppStore((s) => s.astMode)
  const setMode = useAppStore((s) => s.setAstMode)
  const instr = useAppStore((s) => currentEvent(s)?.instr)
  const focusLine = useAppStore((s) => s.focusLine)
  const showAttrs = useAppStore((s) => s.showAttrs)
  const setShowAttrs = useAppStore((s) => s.setShowAttrs)
  const showGraph = useAppStore((s) => s.astGraph)
  const [ajustar, setAjustar] = useState(false)
  const setShowGraph = useAppStore((s) => s.setAstGraph)
  const setHighlight = useAppStore((s) => s.setHighlight)
  const cursor = useAppStore((s) => (isStale(s) ? null : s.cursor))
  const paso = useAppStore(currentEvent)
  const t = useT()

  const descartadas =
    result?.faseFallida === 'sintactico' ? result.errores : EMPTY
  const raiz = useMemo(
    () =>
      ast && (ast.instrucciones.length > 0 || descartadas.length > 0)
        ? conLineasDescartadas(construirArbol(ast, mode), descartadas)
        : null,
    [ast, mode, descartadas],
  )
  const marcas = useMemo(() => {
    if (!raiz || !result || descartadas.length > 0)
      return new Map<string, Marca>()
    return marcarDiagnosticos(
      raiz,
      result.errores.filter((e) => e.fase === 'semantico'),
      result.advertencias,
    )
  }, [raiz, result, descartadas])
  const marcasDentro = useMemo(() => {
    const m = new Map<string, NivelMarca>()
    for (const [id, { nivel }] of marcas)
      for (const a of ancestros(id)) if (m.get(a) !== 'error') m.set(a, nivel)
    return m
  }, [marcas])
  const nivelesGrafico = useMemo(
    () => new Map([...marcas].map(([id, mk]) => [id, mk.nivel])),
    [marcas],
  )
  const instrucciones = ast?.instrucciones.length ?? 0
  const [abiertos, setAbiertos] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(),
  )
  const abierto = useCallback(
    (n: Nodo) => abiertos.get(n.id) ?? expandidoPorDefecto(n, instrucciones),
    [abiertos, instrucciones],
  )
  const filas = useMemo(
    () => (raiz ? aplanar(raiz, abierto) : []),
    [raiz, abierto],
  )

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focused = Math.max(
    0,
    filas.findIndex((f) => f.nodo.id === focusedId),
  )
  const list = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(false)
  const filasRef = useRef(filas)
  filasRef.current = filas

  const virtual = useVirtualRows({
    count: filas.length,
    scrollRef: list,
    estimate: 24,
  })
  const { mostrar } = virtual

  const dibujada = virtual.indices.includes(focused)
  // biome-ignore lint/correctness/useExhaustiveDependencies: también cuando cambian las filas
  useEffect(() => {
    if (!pendingFocus.current) return
    const el = list.current?.querySelector<HTMLElement>(
      `[data-index="${focused}"]`,
    )
    if (!el) {
      mostrar(focused)
      return
    }
    pendingFocus.current = false
    el.focus()
  }, [focused, dibujada, filas, mostrar])

  const moveTo = useCallback((i: number) => {
    const f = filasRef.current[i]
    if (!f) return
    pendingFocus.current = true
    setFocusedId(f.nodo.id)
  }, [])

  const setOpen = useCallback((ids: string[], open: boolean) => {
    setAbiertos((m) => {
      const next = new Map(m)
      for (const id of ids) next.set(id, open)
      return next
    })
  }, [])

  const onToggle = useCallback(
    (i: number) => {
      const f = filasRef.current[i]
      if (f?.expandido !== null && f) setOpen([f.nodo.id], !f.expandido)
    },
    [setOpen],
  )

  const onActivate = useCallback(
    (i: number) => {
      const f = filasRef.current[i]
      if (!f) return
      setFocusedId(f.nodo.id)
      if (f.nodo.instr >= 0 || f.nodo.descartada !== undefined)
        focusLine(f.nodo.linea, f.nodo.desde ?? f.nodo.columna)
    },
    [focusLine],
  )

  const onFocusRow = useCallback(
    (i: number) => {
      const f = filasRef.current[i]
      if (!f) return
      setFocusedId(f.nodo.id)
      setHighlight(fragmentoDe(f.nodo))
    },
    [setHighlight],
  )

  const onHover = useCallback(
    (n: Nodo | null) => setHighlight(n && fragmentoDe(n)),
    [setHighlight],
  )
  useEffect(() => () => setHighlight(null), [setHighlight])

  const pendingScroll = useRef(false)
  const elegir = useCallback(
    (id: string) => {
      setOpen(ancestros(id), true)
      setFocusedId(id)
      pendingScroll.current = true
    },
    [setOpen],
  )
  useEffect(() => {
    if (!pendingScroll.current) return
    pendingScroll.current = false
    mostrar(focused)
  }, [focused, mostrar])

  const focusedIdRef = useRef(focusedId)
  focusedIdRef.current = focusedId
  useEffect(() => {
    if (!raiz || !cursor) return
    const elegido = focusedIdRef.current
      ? nodoPorId(raiz, focusedIdRef.current)
      : null
    const dentro =
      elegido?.linea === cursor.linea &&
      elegido.desde !== undefined &&
      elegido.hasta !== undefined &&
      cursor.columna >= elegido.desde &&
      cursor.columna <= elegido.hasta
    if (dentro) return
    const n = nodoEnColumna(raiz, cursor.linea, cursor.columna)
    if (n) elegir(n.id)
  }, [cursor, raiz, elegir])

  const nodoPaso = useMemo(
    () => (raiz && paso ? nodoDelPaso(raiz, paso) : null),
    [raiz, paso],
  )
  const instrPaso = paso?.instr
  useEffect(() => {
    if (!raiz || instrPaso === undefined) return
    const nodo = raiz.hijos.find(
      (h) => h.esInstruccion && h.instr === instrPaso,
    )
    if (nodo && focusedIdRef.current?.split('.')[1] !== nodo.id.split('.')[1])
      setFocusedId(nodo.id)
  }, [instrPaso, raiz])

  const instruccionGrafico = useMemo(() => {
    if (!raiz) return null
    const id = focusedId ? (ancestros(focusedId)[1] ?? focusedId) : null
    const nodo = id && id !== raiz.id ? nodoPorId(raiz, id) : null
    if (nodo?.esInstruccion) return nodo
    const i = nodo ? raiz.hijos.indexOf(nodo) : -1
    return (
      raiz.hijos.slice(0, Math.max(i, 0)).findLast((h) => h.esInstruccion) ??
      raiz.hijos.find((h) => h.esInstruccion) ??
      null
    )
  }, [raiz, focusedId])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, i: number) => {
      const rows = filasRef.current
      const f = rows[i]
      if (!f) return
      let handled = true
      switch (e.key) {
        case 'ArrowDown':
          moveTo(Math.min(i + 1, rows.length - 1))
          break
        case 'ArrowUp':
          moveTo(Math.max(i - 1, 0))
          break
        case 'Home':
          moveTo(0)
          break
        case 'End':
          moveTo(rows.length - 1)
          break
        case 'ArrowRight':
          if (f.expandido === false) setOpen([f.nodo.id], true)
          else if (f.expandido) moveTo(i + 1)
          break
        case 'ArrowLeft':
          if (f.expandido) setOpen([f.nodo.id], false)
          else if (f.padre >= 0) moveTo(f.padre)
          break
        case '*': {
          const hermanos = rows.filter(
            (x) => x.padre === f.padre && x.expandido === false,
          )
          setOpen(
            hermanos.map((x) => x.nodo.id),
            true,
          )
          break
        }
        case 'Enter':
        case ' ':
          onActivate(i)
          break
        default:
          handled = false
      }
      if (handled) {
        e.preventDefault()
        e.stopPropagation()
      }
    },
    [moveTo, setOpen, onActivate],
  )

  if (!raiz) return <EmptyState>{t.ast.empty}</EmptyState>

  const todas = () => carpetas(raiz)
  return (
    <div className={clsx('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-3 py-1.5 text-[11px] text-muted">
        <Segmented
          legend={t.ast.modeLabel}
          value={mode}
          onChange={setMode}
          items={MODES.map((m) => ({
            id: m,
            label: t.ast.modes[m],
            title: t.ast.modeHint[m],
          }))}
        />
        <label className="flex items-center gap-1.5 text-xs text-text">
          <input
            type="checkbox"
            checked={showAttrs}
            onChange={(e) => setShowAttrs(e.target.checked)}
          />
          {t.ast.showAttrs}
        </label>
        <label className="flex items-center gap-1.5 text-xs text-text max-md:hidden">
          <input
            type="checkbox"
            checked={showGraph}
            onChange={(e) => setShowGraph(e.target.checked)}
          />
          {t.ast.showGraph}
        </label>
        <span className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(todas(), true)}
          >
            {t.ast.expandAll}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setOpen(
                todas().filter((id) => id !== raiz.id),
                false,
              )
            }
          >
            {t.ast.collapseAll}
          </Button>
        </span>
        <span className="flex flex-wrap gap-x-3">
          <span>
            <span className="text-fn italic">expr</span> {t.ast.nonTerminal}
          </span>
          <span>
            x{' '}
            <span className="rounded border border-border px-1 font-mono text-[10px]">
              ID
            </span>{' '}
            {t.ast.terminal}
          </span>
          {showAttrs && (
            <>
              <span className="text-h3">↓ {t.ast.inherited}</span>
              <span className="text-val">↑ {t.ast.synthesized}</span>
            </>
          )}
        </span>
      </div>
      {descartadas.length > 0 && (
        <p className="shrink-0 px-3 pt-1.5 text-[11px] text-danger">
          {t.ast.partialHint(descartadas.length)}
        </p>
      )}
      {mode === 'derivation' && (
        <p className="shrink-0 px-3 pt-1.5 text-[11px] text-muted">
          {t.ast.derivationHint}
        </p>
      )}
      <div className="flex min-h-0 flex-1">
        <div
          ref={list}
          role="tree"
          aria-label={t.ast.label}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setHighlight(null)
          }}
          className={clsx(
            'min-h-0 flex-1 overflow-auto p-2',
            showGraph && 'md:max-w-[45%]',
          )}
        >
          <SpacerBlock height={virtual.antes} />
          {virtual.indices
            .map((i) => [filas[i], i] as const)
            .map(([f, i]) => (
              <TreeRow
                key={f.nodo.id}
                ref={virtual.medir}
                fila={f}
                index={i}
                focused={i === focused}
                current={
                  instr !== undefined &&
                  f.nodo.esInstruccion &&
                  f.nodo.instr === instr
                }
                showAttrs={showAttrs}
                onToggle={onToggle}
                onActivate={onActivate}
                onFocusRow={onFocusRow}
                onKeyDown={onKeyDown}
                onHover={onHover}
                marca={marcas.get(f.nodo.id)}
                marcaDentro={marcasDentro.get(f.nodo.id)}
              />
            ))}
          <SpacerBlock height={virtual.despues} />
        </div>
        {showGraph && instruccionGrafico && (
          <section
            aria-label={t.ast.graphLabel(instruccionGrafico.linea)}
            className="flex min-h-0 flex-1 flex-col border-l border-border max-md:hidden"
          >
            <div className="flex shrink-0 items-start gap-2 px-3 pt-1.5 text-[11px] text-muted">
              <p className="flex-1">
                {t.ast.graphHint(instruccionGrafico.linea)}
              </p>
              <label className="flex shrink-0 items-center gap-1 text-text">
                <input
                  type="checkbox"
                  checked={ajustar}
                  onChange={(e) => setAjustar(e.target.checked)}
                />
                {t.ast.fit}
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-2">
              <ArbolGrafico
                ajustar={ajustar}
                raiz={instruccionGrafico}
                conAttrs={showAttrs}
                seleccionado={focusedId}
                actual={nodoPaso?.id}
                marcas={nivelesGrafico}
                onSelect={(n) => {
                  elegir(n.id)
                  setHighlight(fragmentoDe(n))
                }}
                onHover={onHover}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
