import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion,
} from '@codemirror/autocomplete'
import type { EditorState } from '@codemirror/state'
import { type Messages, mensajes } from '@/i18n'
import { useAppStore } from '@/store/appStore'

type Textos = Messages['editor']['completion']

const INSTRUCCIONES = ['va', 'cn', 'lee', 'di', 'si', 'rep'] as const
const TIPOS = ['ent', 'dec', 'txt', 'bool'] as const

export interface Declarado {
  nombre: string
  tipo: string
  constante: boolean
}

export function declarados(doc: string): Declarado[] {
  const vistos = new Map<string, Declarado>()
  for (const linea of doc.split(/\r\n|\r|\n/)) {
    const sinTexto = linea.replace(/\/\/.*$/, '').replace(/"[^"]*"?/g, '""')
    const m = /^\s*(va|cn)\s+(ent|dec|txt|bool)\s+(.*)$/.exec(sinTexto)
    if (!m) continue
    const [, palabra, tipo, resto] = m
    const partes = palabra === 'cn' ? [resto] : resto.split(',')
    for (const p of partes) {
      const id = /^\s*([a-zA-Z][a-zA-Z0-9_]*)/.exec(p)?.[1]
      if (id && !vistos.has(id))
        vistos.set(id, { nombre: id, tipo, constante: palabra === 'cn' })
    }
  }
  return [...vistos.values()]
}

function opciones(state: EditorState, antes: string, t: Textos): Completion[] {
  if (/^\s*(va|cn)\s+\w*$/.test(antes))
    return TIPOS.map((label) => ({ label, type: 'type', detail: t.type }))
  if (/^\s*(va|cn)\s+\w+\s+\w*$/.test(antes)) return []

  const vars: Completion[] = declarados(state.doc.toString()).map((d) => ({
    label: d.nombre,
    type: d.constante ? 'constant' : 'variable',
    detail: `${d.tipo} · ${d.constante ? t.constant : t.variable}`,
    boost: 1,
  }))
  const valores: Completion[] = ['verdadero', 'falso'].map((label) => ({
    label,
    type: 'keyword',
    detail: 'bool',
  }))
  const alInicio = /^\s*\w*$/.test(antes)
  if (!alInicio) {
    const no: Completion[] = /^\s*si\s/.test(antes)
      ? [{ label: 'no', type: 'keyword', info: t.keywords.no }]
      : []
    const cuerpo: Completion[] = /^\s*(si|rep)\s/.test(antes)
      ? [{ label: 'di', type: 'keyword', info: t.keywords.di }]
      : []
    return [...vars, ...valores, ...no, ...cuerpo]
  }
  const palabras: Completion[] = INSTRUCCIONES.map((label) => ({
    label,
    type: 'keyword',
    detail: t.keyword,
    info: t.keywords[label],
  }))
  const plantillas = [
    // biome-ignore lint/suspicious/noTemplateCurlyInString: es la sintaxis de las plantillas de CodeMirror
    snippetCompletion('si ${condición} di ${valor} no di ${otro}', {
      label: 'si … no',
      type: 'text',
      detail: t.snippet,
      info: t.siNo,
    }),
  ]
  return [...palabras, ...plantillas, ...vars.map((v) => ({ ...v, boost: -1 }))]
}

export function completarBreve(
  ctx: CompletionContext,
): CompletionResult | null {
  const palabra = ctx.matchBefore(/[a-zA-Z][a-zA-Z0-9_]*/)
  const linea = ctx.state.doc.lineAt(ctx.pos)
  const antes = ctx.state.sliceDoc(linea.from, ctx.pos)
  if (/\/\//.test(antes) || (antes.match(/"/g)?.length ?? 0) % 2 === 1)
    return null
  if (!palabra && !ctx.explicit) return null
  const t = mensajes(useAppStore.getState().lang).editor.completion
  const options = opciones(ctx.state, antes, t)
  if (options.length === 0) return null
  return {
    from: palabra?.from ?? ctx.pos,
    options,
    validFor: /^[a-zA-Z0-9_]*$/,
  }
}

export const breveCompletion = () =>
  autocompletion({ override: [completarBreve], icons: false })
