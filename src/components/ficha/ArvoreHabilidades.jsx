import { useMemo, useState } from 'react'
import { ligacoesArvore, montarArvore, posicoesArvore, resumoArvore } from '../../lib/arvoreHabilidades'

const COR = {
  conhecida: { fill: 'var(--ok)', texto: '#04120b', borda: 'var(--ok)' },
  disponivel: { fill: 'var(--raised)', texto: 'var(--ink)', borda: 'var(--accent-500)' },
  bloqueada: { fill: 'var(--void)', texto: 'var(--ink-dim)', borda: 'var(--border)' },
}
const LARGURA = 1000   // coordenadas internas do SVG (escala pela largura real)
const NO_L = 150
const NO_A = 46

/**
 * Fase 33.3 — árvore de habilidades. Cada habilidade pode exigir outra; as
 * ligações mostram o caminho. Verde = já tem, contorno roxo = pode pegar agora
 * (um clique adiciona), apagada = falta o pré-requisito ou o nível.
 */
export default function ArvoreHabilidades({ habilidades = [], habilidadesFicha = [], contexto = {}, isDono, onAdicionar }) {
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const conhecidasIds = useMemo(() => habilidadesFicha.map(hf => hf.habilidade_id), [habilidadesFicha])
  const arvore = useMemo(() => montarArvore(habilidades, { conhecidasIds, contexto }), [habilidades, conhecidasIds, contexto])
  const pos = useMemo(() => posicoesArvore(arvore), [arvore])
  const ligacoes = useMemo(() => ligacoesArvore(arvore), [arvore])
  const resumo = resumoArvore(arvore)

  if (habilidades.length === 0) {
    return <p className="text-ink-dim text-sm p-4">Nenhuma habilidade no sistema. O mestre cria em Sistema → Raças/Classes → Habilidades.</p>
  }

  const altura = Math.max(220, arvore.camadas.length * 120)
  const ponto = id => {
    const p = pos.get(id)
    return { x: (p?.x ?? 0.5) * LARGURA, y: (p?.y ?? 0.5) * altura }
  }

  async function pegar(no) {
    if (!isDono || no.estado !== 'disponivel' || !onAdicionar) return
    setOcupado(no.id); setErro('')
    try { await onAdicionar(no.id) } catch (e) { setErro(e.message || 'Não foi possível adicionar.') } finally { setOcupado('') }
  }

  const detalhe = selecionado ? arvore.nos.get(selecionado) : null

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="text-ok">● {resumo.conhecida} já tem</span>
        <span className="text-accent-300">○ {resumo.disponivel} disponíve{resumo.disponivel === 1 ? 'l' : 'is'}</span>
        <span className="text-ink-dim">○ {resumo.bloqueada} bloqueada{resumo.bloqueada === 1 ? '' : 's'}</span>
        {isDono && <span className="text-ink-dim ml-auto">Clique numa disponível para aprender.</span>}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${LARGURA} ${altura}`} className="w-full min-w-[34rem]" style={{ height: altura * 0.55 }} role="img" aria-label="Árvore de habilidades">
          {ligacoes.map(({ de, para }) => {
            const a = ponto(de)
            const b = ponto(para)
            const conhecida = arvore.nos.get(para)?.estado === 'conhecida'
            return (
              <path
                key={`${de}-${para}`}
                d={`M ${a.x} ${a.y + NO_A / 2} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y - NO_A / 2}`}
                fill="none" stroke={conhecida ? 'var(--ok)' : 'var(--border)'} strokeWidth="2"
              />
            )
          })}
          {[...arvore.nos.values()].map(no => {
            const { x, y } = ponto(no.id)
            const cor = COR[no.estado]
            const clicavel = isDono && no.estado === 'disponivel'
            return (
              <g
                key={no.id}
                onClick={() => { setSelecionado(no.id); pegar(no) }}
                style={{ cursor: clicavel ? 'pointer' : 'default' }}
                aria-label={`${no.hab.nome} — ${no.estado}${no.motivo ? `: ${no.motivo}` : ''}`}
              >
                <rect
                  x={x - NO_L / 2} y={y - NO_A / 2} width={NO_L} height={NO_A} rx="12"
                  fill={cor.fill} stroke={selecionado === no.id ? 'var(--dice-400)' : cor.borda}
                  strokeWidth={selecionado === no.id ? 3 : 2}
                  opacity={ocupado === no.id ? 0.5 : 1}
                />
                <text x={x} y={y + 5} textAnchor="middle" fontSize="16" fill={cor.texto}>
                  {no.hab.nome.length > 17 ? `${no.hab.nome.slice(0, 16)}…` : no.hab.nome}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {detalhe && (
        <div className="rounded-xl border border-border bg-void p-3 space-y-1">
          <p className="text-ink text-sm font-semibold">{detalhe.hab.nome}</p>
          {detalhe.hab.descricao && <p className="text-ink-dim text-xs">{detalhe.hab.descricao}</p>}
          <p className="text-xs">
            {detalhe.estado === 'conhecida' && <span className="text-ok">Você já tem esta habilidade.</span>}
            {detalhe.estado === 'disponivel' && <span className="text-accent-300">Disponível{isDono ? ' — clique no bloco para aprender.' : '.'}</span>}
            {detalhe.estado === 'bloqueada' && <span className="text-ink-dim">{detalhe.motivo}</span>}
          </p>
        </div>
      )}

      {arvore.avisos.length > 0 && (
        <ul className="text-amber-400/90 text-xs space-y-0.5">{arvore.avisos.map(a => <li key={a}>⚠ {a}</li>)}</ul>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
