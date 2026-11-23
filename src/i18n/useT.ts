import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { type Messages, mensajes } from '.'

export function useT(): Messages {
  return mensajes(useAppStore((s) => s.lang))
}

export function useDocumentLang() {
  const lang = useAppStore((s) => s.lang)
  useEffect(() => {
    const t = mensajes(lang)
    document.documentElement.lang = lang
    document.title = t.app.name
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.app.description)
  }, [lang])
}
