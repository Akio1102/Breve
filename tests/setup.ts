import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { registrarIdioma } from '@/i18n'
import { en } from '@/i18n/en'
import { es } from '@/i18n/es'
import { precargarPestanas } from '@/layouts/pestanasDiferidas'

registrarIdioma('es', es)
registrarIdioma('en', en)

await precargarPestanas()

afterEach(() => cleanup())

if (typeof window !== 'undefined')
  (
    window as unknown as {
      happyDOM?: { setViewport(v: { width: number; height: number }): void }
    }
  ).happyDOM?.setViewport({ width: 1440, height: 900 })
