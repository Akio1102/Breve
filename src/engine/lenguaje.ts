import type { TipoToken } from './types'

export const RESERVADAS: ReadonlyMap<string, TipoToken> = new Map([
  ['va', 'VA'],
  ['cn', 'CN'],
  ['lee', 'LEE'],
  ['di', 'DI'],
  ['si', 'SI'],
  ['no', 'NO'],
  ['rep', 'REP'],
  ['ent', 'T_ENT'],
  ['dec', 'T_DEC'],
  ['txt', 'T_TXT'],
  ['bool', 'T_BOOL'],
  ['verdadero', 'VERDADERO'],
  ['falso', 'FALSO'],
])
