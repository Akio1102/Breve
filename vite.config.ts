/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  server: { host: true, port: 5173, strictPort: true },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    fsModuleCache: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx'],
      thresholds: {
        statements: 85,
        lines: 85,
        'src/engine/**': {
          statements: 95,
          lines: 95,
        },
      },
    },
  },
})
