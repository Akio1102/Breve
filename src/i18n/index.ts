import type { Messages } from './es'

export type { Messages }
export type Lang = 'es' | 'en'

export const MESSAGES: Record<Lang, Messages> = {} as Record<Lang, Messages>

const cargas: Partial<Record<Lang, Promise<Messages>>> = {}

export function registrarIdioma(lang: Lang, mensajes: Messages) {
  MESSAGES[lang] = mensajes
}

export function cargarIdioma(lang: Lang): Promise<Messages> {
  if (MESSAGES[lang]) return Promise.resolve(MESSAGES[lang])
  cargas[lang] ??= (
    lang === 'en'
      ? import('./en').then((m) => m.en)
      : import('./es').then((m) => m.es)
  ).then((m) => {
    registrarIdioma(lang, m)
    return m
  })
  return cargas[lang]
}

export function mensajes(lang: Lang): Messages {
  return MESSAGES[lang] ?? MESSAGES.es ?? MESSAGES.en
}

export function detectLang(): Lang {
  const prefs =
    typeof navigator === 'undefined'
      ? []
      : (navigator.languages ?? [navigator.language])
  for (const p of prefs) {
    const code = p?.slice(0, 2).toLowerCase()
    if (code === 'es' || code === 'en') return code
  }
  return 'es'
}
