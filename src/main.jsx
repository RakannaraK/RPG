import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { iniciarIdioma, idiomaAtual } from './i18n'

// O dicionário precisa estar pronto antes de qualquer módulo do app ser avaliado.
try { await iniciarIdioma() } catch { /* abre em português */ }

// Aba aberta durante uma publicação ou rede caída: sem o app não há t(), então o texto é fixo aqui.
const FALHA = {
  pt: ['Não foi possível carregar o site.', 'Recarregar'],
  en: ['Could not load the site.', 'Reload'],
  es: ['No se pudo cargar el sitio.', 'Recargar'],
}

try {
  const { default: App } = await import('./App.jsx')
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch {
  const [frase, botao] = FALHA[idiomaAtual()] || FALHA.pt
  const raiz = document.getElementById('root')
  const p = document.createElement('p')
  p.textContent = frase
  const b = document.createElement('button')
  b.textContent = botao
  b.onclick = () => window.location.reload()
  raiz.style.cssText = 'padding:2rem;text-align:center;font-family:sans-serif'
  b.style.cssText = 'margin-top:1rem;padding:.5rem 1rem;cursor:pointer'
  raiz.append(p, b)
}
