import Selo from './Selo'
import { NOME_PARTES, TAGLINE } from '../../lib/marca'

const TAMANHOS = {
  sm: { selo: 26, texto: 'text-lg', espaco: 'gap-2' },
  md: { selo: 34, texto: 'text-2xl', espaco: 'gap-2.5' },
  lg: { selo: 60, texto: 'text-4xl', espaco: 'gap-3' },
}

/**
 * Fase 37 — assinatura da marca: selo + nome, com o "&" no âmbar dos dados.
 * Usada nos cabeçalhos (sm) e na tela de entrada (lg).
 */
export default function Marca({ tamanho = 'sm', comTagline = false, pulso = false, className = '' }) {
  const t = TAMANHOS[tamanho] || TAMANHOS.sm
  return (
    <div className={`flex items-center ${t.espaco} ${className}`}>
      <Selo tamanho={t.selo} pulso={pulso} />
      <div className="leading-none">
        <div className={`font-bold tracking-tight text-white ${t.texto}`} style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
          {NOME_PARTES.antes}
          <span className="mx-1" style={{ color: 'var(--dice-400)' }}>{NOME_PARTES.elo}</span>
          {NOME_PARTES.depois}
        </div>
        {comTagline && (
          <div className="mt-2 text-sm" style={{ color: 'var(--ink-dim)' }}>{TAGLINE}</div>
        )}
      </div>
    </div>
  )
}
