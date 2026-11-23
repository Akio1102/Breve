import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { cargarIdioma } from './i18n'
import { useAppStore } from './store/appStore'

const root = document.getElementById('root')
if (!root) throw new Error('Falta el elemento #root')
const dibujar = () =>
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
cargarIdioma(useAppStore.getState().lang).finally(dibujar)
