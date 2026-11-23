import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import type { Fragmento } from '@/store/appStore'
import { posicionDeColumna } from './execLine'

export const setTreeFragment = StateEffect.define<Fragmento | null>()

export const treeFragmentField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects)
      if (e.is(setTreeFragment)) {
        const f = e.value
        if (!f || f.linea < 1 || f.linea > tr.state.doc.lines)
          return Decoration.none
        const line = tr.state.doc.line(f.linea)
        const from = posicionDeColumna(line, f.desde)
        const to = posicionDeColumna(line, f.hasta)
        return to > from
          ? Decoration.set([
              Decoration.mark({ class: 'cm-tree-fragment' }).range(from, to),
            ])
          : Decoration.none
      }
    return tr.docChanged ? Decoration.none : deco.map(tr.changes)
  },
  provide: (f) => EditorView.decorations.from(f),
})

export function columnaDePosicion(
  linea: { from: number; text: string },
  pos: number,
): number {
  return [...linea.text.slice(0, pos - linea.from)].length + 1
}
