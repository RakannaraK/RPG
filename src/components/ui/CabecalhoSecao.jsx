/**
 * Fase 52 — título de seção dentro de uma página/aba: nome, uma linha de
 * contexto e as ações à direita. Mesmo tamanho e respiro em toda aba.
 */
export default function CabecalhoSecao({ titulo, descricao, acoes, nivel = 2, className = '' }) {
  const H = `h${nivel}`
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <H className={`font-sora text-ink font-semibold tracking-tight ${nivel === 2 ? 'text-xl' : 'text-base'}`}>{titulo}</H>
        {descricao && <p className="text-ink-dim text-sm mt-0.5">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  )
}
