import { useCallback } from 'react'
import { useT } from '@/i18n/useT'
import { useAppStore } from '@/store/appStore'
import { type ArchivoLeible, leerArchivo, MAX_BYTES } from './openFile'

export function useOpenFile() {
  const loadFile = useAppStore((s) => s.loadFile)
  const setFileNotice = useAppStore((s) => s.setFileNotice)
  const t = useT()
  return useCallback(
    async (archivo: ArchivoLeible) => {
      const r = await leerArchivo(archivo)
      if (r.ok) {
        loadFile(r.nombre, r.texto)
        return
      }
      const e = t.files.errors
      setFileNotice(
        r.error === 'tooBig'
          ? e.tooBig(r.nombre, Math.round(MAX_BYTES / 1024))
          : r.error === 'notText'
            ? e.notText(r.nombre)
            : e.readFailed(r.nombre),
      )
    },
    [loadFile, setFileNotice, t],
  )
}
