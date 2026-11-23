import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { IconButton } from '@/ui/Button'

export function LangToggle() {
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const t = useT()
  return (
    <IconButton
      tooltipAlign="end"
      label={`${t.prefs.language} (${t.prefs.change})`}
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
    >
      <span aria-hidden className="font-mono text-xs font-semibold">
        {lang.toUpperCase()}
      </span>
    </IconButton>
  )
}
