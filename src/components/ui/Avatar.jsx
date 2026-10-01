import { iniciais } from '../../hooks/usePerfil'

const TAM = { xs: 'w-6 h-6 text-[0.625rem]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }

/**
 * Fase 52 — rosto de uma pessoa: a foto, ou as iniciais num círculo na cor do
 * tema. O nome vai no `alt`/`aria-label` só quando o avatar está sozinho
 * (`decorativo` quando o nome já aparece ao lado).
 */
export default function Avatar({ url, nome, tamanho = 'sm', decorativo = true, className = '' }) {
  const t = TAM[tamanho] || TAM.sm
  if (url) {
    return <img src={url} alt={decorativo ? '' : nome || ''} className={`${t} rounded-full object-cover ring-1 ring-border shrink-0 ${className}`} />
  }
  return (
    <span
      className={`${t} rounded-full shrink-0 inline-flex items-center justify-center font-bold text-accent-300 bg-accent-800/40 ring-1 ring-accent-700/60 ${className}`}
      aria-hidden={decorativo || undefined} aria-label={decorativo ? undefined : nome}
    >{iniciais(nome)}</span>
  )
}
