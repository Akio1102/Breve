import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { completarBreve, declarados } from '@/features/editor/completion'
import { useAppStore } from '@/store/appStore'

function sugerencias(texto: string, explicit = false) {
  const pos = texto.indexOf('|')
  const state = EditorState.create({ doc: texto.replace('|', '') })
  const r = completarBreve(new CompletionContext(state, pos, explicit))
  return r?.options.map((o) => o.label) ?? null
}

describe('autocompletado', () => {
  useAppStore.setState({ lang: 'es' })

  it('lee las variables y constantes declaradas', () => {
    expect(
      declarados(
        'va ent a = 1, b\ncn dec PI = 3.14\nva txt s = "x, y" // , z\nva ent a',
      ),
    ).toEqual([
      { nombre: 'a', tipo: 'ent', constante: false },
      { nombre: 'b', tipo: 'ent', constante: false },
      { nombre: 'PI', tipo: 'dec', constante: true },
      { nombre: 's', tipo: 'txt', constante: false },
    ])
  })

  it('al empezar la línea, las instrucciones', () => {
    const s = sugerencias('va ent total\nr|')
    expect(s).toContain('rep')
    expect(s).toContain('total')
  })

  it('después de va, solo los tipos', () => {
    expect(sugerencias('va e|')).toEqual(['ent', 'dec', 'txt', 'bool'])
    expect(sugerencias('va ent t|')).toBeNull()
  })

  it('en una expresión, variables y valores; no en cadenas ni comentarios', () => {
    const s = sugerencias('va ent total\ndi t|')
    expect(s).toContain('total')
    expect(s).toContain('verdadero')
    expect(s).not.toContain('va')
    expect(sugerencias('va ent total\ndi "t|')).toBeNull()
    expect(sugerencias('va ent total\n// t|')).toBeNull()
  })

  it('sin palabra escrita, solo con Ctrl+Espacio', () => {
    expect(sugerencias('|')).toBeNull()
    expect(sugerencias('|', true)).toContain('va')
  })
})
