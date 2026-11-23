import type { PasoTraza } from '@engine/types'
import { useMemo } from 'react'
import { ArbolGrafico } from '@/arbol/ArbolGrafico'
import { arbolAbstracto } from '@/arbol/arbol'
import { nodoDelPaso } from '@/arbol/layout'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'

export function ArbolDelPaso({ event }: { event: PasoTraza }) {
  const ast = useAppStore((s) => s.result?.ast ?? null)
  const t = useT()
  const raiz = useMemo(() => (ast ? arbolAbstracto(ast) : null), [ast])
  const instruccion = raiz?.hijos.find(
    (h) => h.esInstruccion && h.instr === event.instr,
  )
  const nodo = instruccion ? nodoDelPaso(instruccion, event) : null
  if (!instruccion || !nodo || instruccion.hijos.length === 0) return null
  return (
    <figure
      aria-label={t.stepCard.treeLabel}
      className="flex h-28 justify-center overflow-hidden rounded border border-border/60 bg-editor p-1"
    >
      <ArbolGrafico
        raiz={instruccion}
        conAttrs={false}
        actual={nodo.id}
        ajustar
      />
    </figure>
  )
}
