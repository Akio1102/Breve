import { StateEffect, StateField } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from '@codemirror/view'

export interface ExecInfo {
  line: number
  expr: string
  res: string
  error: boolean
  columna?: number
  largo?: number
}

export function posicionDeColumna(
  linea: { from: number; to: number; text: string },
  columna: number,
): number {
  let offset = 0
  let col = 1
  for (const ch of linea.text) {
    if (col >= columna) break
    offset += ch.length
    col++
  }
  return Math.min(linea.from + offset, linea.to)
}

export const setExecLine = StateEffect.define<ExecInfo | null>()

class ResultWidget extends WidgetType {
  readonly expr: string
  readonly res: string
  constructor(expr: string, res: string) {
    super()
    this.expr = expr
    this.res = res
  }
  eq(other: ResultWidget) {
    return other.expr === this.expr && other.res === this.res
  }
  toDOM() {
    const el = document.createElement('span')
    el.className = 'cm-exec-widget'
    el.setAttribute('aria-hidden', 'true')
    const short =
      this.expr.length > 40 ? `${this.expr.slice(0, 39)}…` : this.expr
    el.append(`${short} → `)
    const b = document.createElement('b')
    b.textContent = this.res
    el.append(b)
    return el
  }
  ignoreEvent() {
    return true
  }
}

function build(
  view: EditorView['state'],
  info: ExecInfo | null,
): DecorationSet {
  if (!info || info.line < 1 || info.line > view.doc.lines)
    return Decoration.none
  const line = view.doc.line(info.line)
  const decos = [
    Decoration.line({
      class: info.error ? 'cm-exec-line cm-exec-error' : 'cm-exec-line',
    }).range(line.from),
  ]
  if (info.columna !== undefined && info.largo) {
    const from = posicionDeColumna(line, info.columna)
    const to = posicionDeColumna(line, info.columna + info.largo)
    if (to > from)
      decos.push(Decoration.mark({ class: 'cm-exec-fragment' }).range(from, to))
  }
  if (info.res)
    decos.push(
      Decoration.widget({
        widget: new ResultWidget(info.expr, info.res),
        side: 1,
      }).range(line.to),
    )
  return Decoration.set(decos, true)
}

export const execLineField = StateField.define<{
  info: ExecInfo | null
  deco: DecorationSet
}>({
  create: () => ({ info: null, deco: Decoration.none }),
  update(value, tr) {
    let info = value.info
    let changed = false
    for (const e of tr.effects) {
      if (e.is(setExecLine)) {
        info = e.value
        changed = true
      }
    }
    if (tr.docChanged && !changed) return { info: null, deco: Decoration.none }
    return changed ? { info, deco: build(tr.state, info) } : value
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
})
