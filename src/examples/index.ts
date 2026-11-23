import {
  ENTRADAS_EJECUCION,
  ENTRADAS_POTENCIA,
  FUENTE_ERROR_EJECUCION,
  FUENTE_ERROR_LEXICO,
  FUENTE_ERROR_SEMANTICO,
  FUENTE_ERROR_SINTACTICO,
  FUENTE_POTENCIA,
  FUENTE_TIPOS,
} from '@engine/ejemplos'

export type ExampleId =
  | 'potencia'
  | 'tipos'
  | 'lexico'
  | 'sintactico'
  | 'semantico'
  | 'ejecucion'

export interface Example {
  id: ExampleId
  file: string
  source: string
  inputs: readonly string[]
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'potencia',
    file: 'potencia.brv',
    source: FUENTE_POTENCIA,
    inputs: ENTRADAS_POTENCIA,
  },
  { id: 'tipos', file: 'tipos.brv', source: FUENTE_TIPOS, inputs: [''] },
  {
    id: 'lexico',
    file: 'error-lexico.brv',
    source: FUENTE_ERROR_LEXICO,
    inputs: [''],
  },
  {
    id: 'sintactico',
    file: 'error-sintactico.brv',
    source: FUENTE_ERROR_SINTACTICO,
    inputs: [''],
  },
  {
    id: 'semantico',
    file: 'error-semantico.brv',
    source: FUENTE_ERROR_SEMANTICO,
    inputs: [''],
  },
  {
    id: 'ejecucion',
    file: 'division.brv',
    source: FUENTE_ERROR_EJECUCION,
    inputs: ENTRADAS_EJECUCION,
  },
]

export const EXAMPLE = EXAMPLES[0]

export const exampleFor = (source: string) =>
  EXAMPLES.find((e) => e.source === source)

export const inputLabel = (input: string) =>
  input.split('\n').filter(Boolean).join(' · ')
