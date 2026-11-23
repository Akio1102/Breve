export type FaseCompilacion =
  | 'lexico'
  | 'sintactico'
  | 'semantico'
  | 'intermedio'

export type Fase = FaseCompilacion | 'ejecucion'

export const FASES: readonly Fase[] = [
  'lexico',
  'sintactico',
  'semantico',
  'intermedio',
  'ejecucion',
]

export type TipoDato = 'ent' | 'dec' | 'txt' | 'bool'
export type Valor = number | string | boolean

export type TipoToken =
  | 'VA'
  | 'CN'
  | 'LEE'
  | 'DI'
  | 'SI'
  | 'NO'
  | 'REP'
  | 'T_ENT'
  | 'T_DEC'
  | 'T_TXT'
  | 'T_BOOL'
  | 'VERDADERO'
  | 'FALSO'
  | 'ID'
  | 'ENTERO'
  | 'DECIMAL'
  | 'CADENA'
  | 'IGUAL'
  | 'COMA'
  | 'MAS'
  | 'MENOS'
  | 'POR'
  | 'ENTRE'
  | 'PAR_ABRE'
  | 'PAR_CIERRA'
  | 'COMP'
  | 'SALTO'

export interface Token {
  tipo: TipoToken
  lexema: string
  valor?: Valor
  linea: number
  columna: number
}

export interface Pos {
  linea: number
  columna: number
}

export interface Anotacion {
  tipo: TipoDato
  valor?: Valor
}

export type OpBinario =
  | '+'
  | '-'
  | '*'
  | '/'
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | '!='

export interface Extension {
  desde?: number
  hasta?: number
  parentesis?: number
}

export type Expr = Pos &
  Extension & { anot?: Anotacion } & (
    | { tipo: 'Lit'; tipoDato: TipoDato; valor: Valor; lexema: string }
    | { tipo: 'Id'; nombre: string }
    | { tipo: 'Unaria'; op: '-'; expr: Expr }
    | { tipo: 'Binaria'; op: OpBinario; izq: Expr; der: Expr }
  )

export interface DeclVar extends Pos {
  nombre: string
  valor?: Expr
}

export type Instr = Pos &
  (
    | { tipo: 'Va'; tipoDato: TipoDato; vars: DeclVar[] }
    | {
        tipo: 'Cn'
        tipoDato: TipoDato
        nombre: string
        posNombre: Pos
        valor: Expr
      }
    | { tipo: 'Lee'; nombre: string; posNombre: Pos }
    | { tipo: 'Asig'; nombre: string; valor: Expr }
    | { tipo: 'Di'; valor: Expr }
    | { tipo: 'Si'; cond: Expr; entonces: Instr; sino?: Instr }
    | { tipo: 'Rep'; veces: Expr; cuerpo: Instr }
  )

export interface Programa {
  instrucciones: Instr[]
}

export interface Simbolo {
  numero: number
  nombre: string
  categoria: 'variable' | 'constante' | 'temporal'
  tipo: TipoDato
  tamano: number
  valor: Valor
  direccion: number
  lineaDeclaracion: number
  lineasReferencia: number[]
  usado: boolean
  inicializado: boolean
}

export interface Diagnostico {
  fase: Fase
  linea: number
  columna: number
  mensaje: string
  largo?: number
}

export type AccionTraza =
  | 'inicio'
  | 'insertar'
  | 'buscar'
  | 'operacion'
  | 'asignar'
  | 'leer'
  | 'mostrar'
  | 'condicion'
  | 'repetir'
  | 'advertencia'
  | 'error'
  | 'fin'
  | 'arranque'
  | 'copiar'
  | 'calcular'
  | 'leerEntrada'
  | 'escribir'
  | 'saltar'
  | 'terminar'
  | 'errorEjecucion'

export type PapelPaso =
  | { tipo: 'repInicio'; contador: string }
  | { tipo: 'repCondicion'; contador: string }
  | { tipo: 'repIncremento'; contador: string }
  | { tipo: 'repSalida'; sale: boolean; destino: number }
  | { tipo: 'repSigue'; sigue: boolean; destino: number }
  | { tipo: 'repVuelve'; destino: number }
  | {
      tipo: 'siCondicion'
      condicion: string
      verdadera: boolean
      salta: boolean
      destino: number
    }
  | { tipo: 'siFin'; destino: number }

export interface PasoTraza {
  linea: number
  instr: number
  accion: AccionTraza
  detalle: string
  resultado: string
  columna?: number
  largo?: number
  cambios: Simbolo[]
  cuadrupla?: number
  siguiente?: number
  salida?: number
  vuelta?: number
  vueltas?: number
  papel?: PapelPaso
  readonly simbolos: Simbolo[]
}

export type InstruccionTAC = {
  linea?: number
  columna?: number
  largo?: number
} & (
  | { op: 'asig'; destino: string; origen: string }
  | { op: 'bin'; destino: string; izq: string; operador: string; der: string }
  | { op: 'read'; destino: string }
  | { op: 'write'; origen: string }
  | { op: 'if'; condicion: string; salto: number }
  | { op: 'ifFalse'; condicion: string; salto: number }
  | {
      op: 'ifCmp'
      izq: string
      operador: OpComparacionTAC
      der: string
      salto: number
    }
  | { op: 'goto'; salto: number }
  | { op: 'halt' }
)

export type OpComparacionTAC = '>' | '<' | '>=' | '<=' | '==' | '!='

export interface Tripleta {
  op: string
  arg1: string
  arg2: string
}

export interface Cuadrupla {
  op: string
  arg1: string
  arg2: string
  resultado: string
}

export type IdPasada =
  | 'O2'
  | 'O3'
  | 'O4'
  | 'O5'
  | 'O6'
  | 'O7'
  | 'O8'
  | 'G1'
  | 'G2'
  | 'G3'
  | 'G4'

export interface CodigoOptimizado {
  tresDirecciones: InstruccionTAC[]
  tripletas: Tripleta[]
  origenTripletas: number[]
  cuadruplas: Cuadrupla[]
  cambios: Record<IdPasada, number>
  rondas: number
}

export interface ResultadoCompilacion {
  ok: boolean
  faseFallida: FaseCompilacion | null
  tokens: Token[]
  ast: Programa | null
  tablaSimbolos: Simbolo[]
  tresDirecciones: InstruccionTAC[]
  tripletas: Tripleta[]
  cuadruplas: Cuadrupla[]
  optimizado: CodigoOptimizado | null
  errores: Diagnostico[]
  advertencias: Diagnostico[]
  traza: PasoTraza[]
}

export interface TrazaEjecucion {
  pc: number[]
  escrituras: { paso: number[]; nombre: string[]; valor: Valor[] }
  salida: number[]
}

export interface ResultadoEjecucion {
  ok: boolean
  salida: string[]
  memoria: Record<string, Valor>
  instrucciones: number
  limiteAlcanzado: boolean
  error: (Diagnostico & { cuadrupla: number }) | null
  traza: TrazaEjecucion
}
