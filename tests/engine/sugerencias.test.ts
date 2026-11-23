import { compile } from '@engine/compile'
import {
  distancia,
  identificadorParecido,
  masParecida,
  tipoParecido,
} from '@engine/sugerencias'
import { describe, expect, it } from 'vitest'

const mensajes = (src: string) => compile(src).errores.map((e) => e.mensaje)
const advertencias = (src: string) =>
  compile(src).advertencias.map((e) => e.mensaje)

describe('distancia de edición', () => {
  it('cuenta inserciones, borrados, cambios y transposiciones', () => {
    expect(distancia('lee', 'lee')).toBe(0)
    expect(distancia('le', 'lee')).toBe(1)
    expect(distancia('lle', 'lee')).toBe(1)
    expect(distancia('rpe', 'rep')).toBe(1)
    expect(distancia('', 'abc')).toBe(3)
    expect(distancia('total', 'totla')).toBe(1)
  })

  it('no sugiere con palabras cortas ni con empates', () => {
    expect(masParecida('x', ['di', 'si'])).toBeNull()
    expect(masParecida('ab', ['aa', 'bb'])).toBeNull()
    expect(masParecida('cont', ['conta', 'conto'])).toBeNull()
    expect(masParecida('contdor', ['contador', 'suma'])).toBe('contador')
  })

  it('reconoce tipos de otros lenguajes y mayúsculas', () => {
    expect(tipoParecido('int')).toBe('ent')
    expect(tipoParecido('String')).toBe('txt')
    expect(tipoParecido('Ent')).toBe('ent')
    expect(tipoParecido('zzz')).toBeNull()
    expect(identificadorParecido('Verdadero', [])).toBe('verdadero')
  })
})

describe('mensajes con sugerencia', () => {
  it('palabra reservada en mayúsculas o mal escrita', () => {
    expect(mensajes('VA ent x')).toEqual([
      "'VA' no es una instrucción; ¿quisiste decir 'va'? (las palabras reservadas van en minúsculas)",
    ])
    expect(mensajes('va ent x\nlle x')[0]).toMatch(/¿quisiste decir 'lee'\?/)
    expect(mensajes('va ent x = 2\nsi x > 1 DI x')[0]).toMatch(
      /¿quisiste decir 'di'\?/,
    )
  })

  it('tipo de otro lenguaje', () => {
    expect(mensajes('va int x')).toEqual([
      "se esperaba un tipo de dato (ent, dec, txt, bool) después de 'va' y se encontró 'int'; ¿quisiste decir 'ent'?",
    ])
  })

  it('identificador parecido a uno declarado', () => {
    expect(mensajes('va ent contador = 1\ndi contdor')).toEqual([
      "identificador no declarado 'contdor'; ¿quisiste decir 'contador'?",
    ])
    expect(mensajes('di Verdadero')).toEqual([
      "identificador no declarado 'Verdadero'; ¿quisiste decir 'verdadero'?",
    ])
    expect(mensajes('va ent x = 1\ndi y')).toEqual([
      "identificador no declarado 'y'",
    ])
  })

  it('un error de declaración no repite «nunca se usa»', () => {
    expect(advertencias('va ent x = x + 1')).toEqual([])
    expect(advertencias('va ent x\nva ent x')).toEqual([])
    expect(advertencias('va ent y')).toHaveLength(1)
  })
})
