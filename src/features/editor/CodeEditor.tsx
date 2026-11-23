import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from '@codemirror/commands'
import { bracketMatching } from '@codemirror/language'
import {
  type Diagnostic as CmDiagnostic,
  setDiagnostics,
} from '@codemirror/lint'
import { Compartment, EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import type { Diagnostico } from '@engine/types'
import { useEffect, useRef } from 'react'
import { mensajes } from '@/i18n'
import { currentEvent, useAppStore } from '@/store/appStore'
import {
  breakpointGutter,
  breakpointLines,
  setBreakpoints,
  toggleBreakpointAt,
} from './breakpoints'
import { breve } from './breveLanguage'
import { breveCompletion } from './completion'
import { execLineField, posicionDeColumna, setExecLine } from './execLine'
import { breveHighlight, editorTheme } from './theme'
import {
  columnaDePosicion,
  setTreeFragment,
  treeFragmentField,
} from './treeFragment'

function toCm(
  state: EditorState,
  d: Diagnostico,
  severity: 'error' | 'warning',
): CmDiagnostic {
  const doc = state.doc
  const line = doc.line(Math.min(Math.max(d.linea, 1), doc.lines))
  let from = posicionDeColumna(line, Math.max(d.columna, 1))
  if (from === line.to && line.length > 0) from = line.to - 1
  let to = posicionDeColumna(
    line,
    Math.max(d.columna, 1) + Math.max(d.largo ?? 1, 1),
  )
  if (to <= from) to = Math.min(from + 1, doc.length)
  return { from, to, severity, message: d.mensaje, source: d.fase }
}

const a11y = new Compartment()
const contentAttrs = (label: string) =>
  EditorView.contentAttributes.of({
    tabindex: '0',
    'aria-label': label,
  })

function createState(doc: string, label: string) {
  return EditorState.create({
    doc,
    extensions: [
      breakpointGutter,
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection({ drawRangeCursor: false }),
      bracketMatching(),
      highlightActiveLine(),
      breve(),
      breveCompletion(),
      breveHighlight,
      editorTheme,
      execLineField,
      treeFragmentField,
      keymap.of([
        {
          key: 'Mod-Enter',
          preventDefault: true,
          run: () => {
            useAppStore.getState().compile()
            return true
          },
        },
        {
          key: 'Mod-Shift-Enter',
          preventDefault: true,
          run: () => {
            useAppStore.getState().run()
            return true
          },
        },
        {
          key: 'F9',
          preventDefault: true,
          run: (v) => {
            toggleBreakpointAt(v, v.state.selection.main.head)
            return true
          },
        },
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      a11y.of(contentAttrs(label)),
      EditorView.updateListener.of((u) => {
        const s = useAppStore.getState()
        if (u.docChanged) s.setSource(u.state.doc.toString())
        if (u.selectionSet || u.docChanged) {
          const head = u.state.selection.main.head
          const line = u.state.doc.lineAt(head)
          s.setCursor(line.number, columnaDePosicion(line, head))
        }
        const lines = breakpointLines(u.state)
        if (lines.join() !== s.breakpoints.join()) s.setBreakpoints(lines)
      }),
    ],
  })
}

let lastState: EditorState | null = null

export default function CodeEditor({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!host.current) return
    const store = useAppStore.getState()
    const label = mensajes(store.lang).editor.codeLabel
    const view = new EditorView({
      parent: host.current,
      state:
        lastState?.doc.toString() === store.source
          ? lastState
          : createState(store.source, label),
    })
    setBreakpoints(view, store.breakpoints)
    viewRef.current = view
    return () => {
      lastState = view.state
      view.destroy()
      viewRef.current = null
    }
  }, [])

  const source = useAppStore((s) => s.source)
  const breakpoints = useAppStore((s) => s.breakpoints)
  const result = useAppStore((s) => s.result)
  const compiledSource = useAppStore((s) => s.compiledSource)
  const focusRequest = useAppStore((s) => s.focusRequest)
  const event = useAppStore(currentEvent)
  const lang = useAppStore((s) => s.lang)
  const highlight = useAppStore((s) => s.highlight)

  useEffect(() => {
    viewRef.current?.dispatch({ effects: setTreeFragment.of(highlight) })
  }, [highlight])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: a11y.reconfigure(contentAttrs(mensajes(lang).editor.codeLabel)),
    })
  }, [lang])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== source)
      view.dispatch({
        changes: { from: 0, to: current.length, insert: source },
      })
  }, [source])

  useEffect(() => {
    const view = viewRef.current
    if (view && breakpointLines(view.state).join() !== breakpoints.join())
      setBreakpoints(view, breakpoints)
  }, [breakpoints])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const fresh = result && compiledSource === view.state.doc.toString()
    const diags = fresh
      ? [
          ...result.errores.map((d) => toCm(view.state, d, 'error')),
          ...result.advertencias.map((d) => toCm(view.state, d, 'warning')),
        ]
      : []
    view.dispatch(setDiagnostics(view.state, diags))
  }, [result, compiledSource])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (!event) {
      view.dispatch({ effects: setExecLine.of(null) })
      return
    }
    const showValue =
      event.accion !== 'inicio' &&
      event.accion !== 'fin' &&
      event.resultado !== ''
    const line = Math.min(Math.max(event.linea, 1), view.state.doc.lines)
    view.dispatch({
      effects: [
        setExecLine.of({
          line,
          expr: event.detalle,
          res: showValue ? event.resultado : '',
          error: event.accion === 'error' || event.accion === 'errorEjecucion',
          columna: event.columna,
          largo: event.largo,
        }),
        EditorView.scrollIntoView(view.state.doc.line(line).from, {
          y: 'nearest',
          yMargin: 48,
        }),
      ],
    })
  }, [event])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !focusRequest) return
    const doc = view.state.doc
    const line = doc.line(Math.min(Math.max(focusRequest.line, 1), doc.lines))
    const pos = Math.min(line.from + focusRequest.col - 1, line.to)
    view.dispatch({
      selection: { anchor: pos },
      effects: EditorView.scrollIntoView(pos, { y: 'center' }),
    })
    view.focus()
  }, [focusRequest])

  return <div ref={host} className={className} data-testid="code-editor" />
}
