import {
  type EditorState,
  RangeSet,
  StateEffect,
  StateField,
} from '@codemirror/state'
import { type EditorView, GutterMarker, gutter } from '@codemirror/view'

const toggleEffect = StateEffect.define<{ pos: number }>()
const setEffect = StateEffect.define<number[]>()

class BreakpointMarker extends GutterMarker {
  toDOM() {
    const el = document.createElement('span')
    el.className = 'cm-bp-marker'
    el.setAttribute('aria-hidden', 'true')
    return el
  }
}
const marker = new BreakpointMarker()

class EmptyMarker extends GutterMarker {}
const empty = new EmptyMarker()

function fromLines(state: EditorState, lines: number[]) {
  const ranges = lines
    .filter((l) => l >= 1 && l <= state.doc.lines)
    .sort((a, b) => a - b)
    .map((l) => marker.range(state.doc.line(l).from))
  return RangeSet.of(ranges, true)
}

export const breakpointField = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update(set, tr) {
    let next = set.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setEffect)) next = fromLines(tr.state, e.value)
      if (e.is(toggleEffect)) {
        const lineStart = tr.state.doc.lineAt(e.value.pos).from
        let has = false
        next.between(lineStart, lineStart, () => {
          has = true
        })
        next = has
          ? next.update({ filter: (from) => from !== lineStart })
          : next.update({ add: [marker.range(lineStart)] })
      }
    }
    return next
  },
})

export function breakpointLines(state: EditorState): number[] {
  const lines = new Set<number>()
  const iter = state.field(breakpointField).iter()
  for (; iter.value; iter.next()) lines.add(state.doc.lineAt(iter.from).number)
  return [...lines].sort((a, b) => a - b)
}

export function setBreakpoints(view: EditorView, lines: number[]) {
  view.dispatch({ effects: setEffect.of(lines) })
}

export function toggleBreakpointAt(view: EditorView, pos: number) {
  view.dispatch({ effects: toggleEffect.of({ pos }) })
}

export const breakpointGutter = [
  breakpointField,
  gutter({
    class: 'cm-breakpoint-gutter',
    lineMarker(view, line) {
      let has = false
      view.state.field(breakpointField).between(line.from, line.from, () => {
        has = true
      })
      return has ? marker : empty
    },
    lineMarkerChange: (u) =>
      u.startState.field(breakpointField) !== u.state.field(breakpointField),
    initialSpacer: () => marker,
    domEventHandlers: {
      mousedown(view, line) {
        toggleBreakpointAt(view, line.from)
        return true
      },
    },
  }),
]
