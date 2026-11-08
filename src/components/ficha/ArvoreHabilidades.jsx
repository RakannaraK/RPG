import { useMemo, useState } from 'react'
import { dependentesConhecidos, ligacoesArvore, montarArvore, posicoesArvore, resumoArvore } from '../../lib/arvoreHabilidades'
import Botao from '../ui/Botao'

const LARGURA = 1000   // coordenadas internas do SVG (escala pela largura real)
const RAIO = 26
const PASSO = 140      // altura de cada camada
const hexagono = (x, y, r) =>
  Array.from({ length: 6 }, (_, i) => `${x + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)},${y + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)}`).join(' ')

/** Estrelas de posição fixa (mesma semente = mesmo céu a cada renderização). */
function estrelas(altura, n = 60) {
  let s = 54
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  return Array.from({ length: n }, (_, i) => ({ i, x: rnd() * LARGURA, y: rnd() * altura, r: 0.8 + rnd() * 1.4, o: 0.2 + rnd() * 0.5, d: rnd() * 3 }))
}

/** Quebra o nome em até 2 linhas de ~14 letras (o resto vira reticências). */
function linhasDoNome(nome = '') {
  const l = ['']
  for (const p of nome.split(' ')) {
    const u = l.length - 1
    if (!l[u] || u === 1 || `${l[u]} ${p}`.length <= 14) l[u] = l[u] ? `${l[u]} ${p}` : p
    else l.push(p)
  }
  return l.map(t => (t.length > 15 ? `${t.slice(0, 14)}…` : t))
}

/**
 * Fase 33.3 / 54 — árvore de habilidades em constelação. Cada habilidade pode
 * exigir outras e custar pontos. Brilha = já tem, anel pulsando = pode pegar
 * agora (um clique aprende), apagada = falta pré-requisito, nível ou pontos.
 */
export default function ArvoreHabilidades({ habilidades = [], habilidadesFicha = [], contexto = {}, isDono, onAdicionar, onRemover, pontos = null }) {
  const [ocupado, setOcupado] = useState('')
  const [erro, setErro] = useState('')
  const [selecionado, setSelecionado] = useState(null)

  const conhecidasIds = useMemo(() => habilidadesFicha.map(hf => hf.habilidade_id), [habilidadesFicha])
  const saldoPontos = pontos?.saldo ?? null
  const arvore = useMemo(() => montarArvore(habilidades, { conhecidasIds, contexto, saldoPontos }), [habilidades, conhecidasIds, contexto, saldoPontos])
  const pos = useMemo(() => posicoesArvore(arvore), [arvore])
  const ligacoes = useMemo(() => ligacoesArvore(arvore), [arvore])
  const resumo = resumoArvore(arvore)
  const altura = Math.max(260, arvore.camadas.length * PASSO + 40)
  const ceu = useMemo(() => estrelas(altura), [altura])

  if (habilidades.length === 0) {
    return <p className="text-ink-dim text-sm p-4">Nenhuma habilidade no sistema. O mestre cria em Sistema → Raças/Classes → Habilidades.</p>
  }

  const ponto = id => {
    const p = pos.get(id)
    return { x: (p?.x ?? 0.5) * LARGURA, y: (p?.y ?? 0.5) * altura }
  }

  async function rodar(id, fn) {
    setOcupado(id); setErro('')
    try { await fn() } catch (e) { setErro(e.message || 'Não foi possível salvar.') } finally { setOcupado('') }
  }
  const pegar = no => isDono && no.estado === 'disponivel' && onAdicionar && rodar(no.id, () => onAdicionar(no.id))

  const detalhe = selecionado ? arvore.nos.get(selecionado) : null
  // esquecer: só o que foi aprendido à mão e que nenhuma habilidade conhecida exige (devolve os pontos)
  const linhaFicha = detalhe && habilidadesFicha.find(hf => hf.habilidade_id === detalhe.id)
  const aprendidaAMao = detalhe?.estado === 'conhecida' && linhaFicha && (!linhaFicha.origem || linhaFicha.origem === 'manual')
  const temDependente = aprendidaAMao && dependentesConhecidos(detalhe.id, arvore).length > 0
  const podeEsquecer = !!(isDono && onRemover && aprendidaAMao && !temDependente)

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {pontos?.total != null && (
          <span className="mr-2">
            <span className="text-ink-dim">{pontos.rotulo}</span>{' '}
            <span className="text-ink text-2xl font-bold tabular-nums">{pontos.saldo}</span>
            <span className="text-ink-dim text-sm"> de {pontos.total}</span>
          </span>
        )}
        <span className="text-ok">● {resumo.conhecida} já tem</span>
        <span className="text-accent-300">○ {resumo.disponivel} disponíve{resumo.disponivel === 1 ? 'l' : 'is'}</span>
        <span className="text-ink-dim">○ {resumo.bloqueada} bloqueada{resumo.bloqueada === 1 ? '' : 's'}</span>
        {isDono && <span className="text-ink-dim ml-auto">Clique numa disponível para aprender.</span>}
      </div>
      {pontos?.erro && <p className="text-warn text-xs">⚠ A fórmula de pontos da árvore tem erro ({pontos.erro}); a árvore está sem orçamento.</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-bg">
        {/* altura segue a largura (sem altura fixa: senão o SVG encolhe e sobram faixas nas laterais);
            +30 embaixo para o nome da última camada */}
        <svg viewBox={`0 0 ${LARGURA} ${altura + 30}`} className="block w-full min-w-[40rem]" role="group" aria-label="Árvore de habilidades">
          <defs>
            <radialGradient id="arv-fundo" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="var(--accent-800)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--accent-800)" stopOpacity="0" />
            </radialGradient>
            <filter id="arv-brilho" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <rect width={LARGURA} height={altura + 30} fill="url(#arv-fundo)" />
          {ceu.map(e => (
            <circle key={e.i} cx={e.x} cy={e.y} r={e.r} fill="var(--ink)" opacity={e.o} className="arv-estrela" style={{ animationDelay: `${e.d}s` }} />
          ))}

          {ligacoes.map(({ de, para }) => {
            const a = ponto(de), b = ponto(para)
            const ed = arvore.nos.get(de)?.estado, ep = arvore.nos.get(para)?.estado
            const ativa = ed === 'conhecida' && ep === 'conhecida'
            const aberta = ed === 'conhecida' && ep === 'disponivel'
            // sai de baixo do NOME do pai e chega no topo do hexágono do filho
            const y1 = a.y + RAIO + 24 + (linhasDoNome(arvore.nos.get(de)?.hab.nome || '').length - 1) * 23 + 10
            const y2 = b.y - RAIO
            const meio = (y1 + y2) / 2
            return (
              <path
                key={`${de}-${para}`}
                d={`M ${a.x} ${y1} C ${a.x} ${meio}, ${b.x} ${meio}, ${b.x} ${y2}`}
                fill="none" strokeWidth={ativa ? 3 : 2}
                stroke={ativa || aberta ? 'var(--accent-400)' : 'var(--border)'}
                strokeDasharray={aberta ? '7 6' : undefined}
                filter={ativa ? 'url(#arv-brilho)' : undefined}
              />
            )
          })}

          {[...arvore.nos.values()].map(no => {
            const { x, y } = ponto(no.id)
            const clicavel = isDono && no.estado === 'disponivel'
            const sel = selecionado === no.id
            const conhecida = no.estado === 'conhecida'
            const disponivel = no.estado === 'disponivel'
            return (
              <g
                key={no.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelecionado(no.id); pegar(no) }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelecionado(no.id); pegar(no) } }}
                onFocus={() => setSelecionado(no.id)}
                // o contorno branco do nó selecionado faz o papel do foco (o do navegador vira um quadrado)
                style={{ cursor: clicavel ? 'pointer' : 'default', outline: 'none' }}
                opacity={ocupado === no.id ? 0.5 : no.estado === 'bloqueada' ? 0.55 : 1}
                aria-label={`${no.hab.nome} — ${{ conhecida: 'você já tem', disponivel: 'disponível', bloqueada: 'bloqueada' }[no.estado]}${no.motivo ? `: ${no.motivo}` : ''}`}
              >
                {disponivel && <polygon points={hexagono(x, y, RAIO)} fill="none" stroke="var(--accent-400)" strokeWidth="2" className="arv-pulso" />}
                <polygon
                  points={hexagono(x, y, RAIO)}
                  fill={conhecida ? 'var(--accent-500)' : disponivel ? 'var(--accent-800)' : 'var(--void)'}
                  fillOpacity={disponivel ? 0.5 : 1}
                  stroke={sel ? 'var(--ink)' : conhecida ? 'var(--accent-300)' : disponivel ? 'var(--accent-400)' : 'var(--border)'}
                  strokeWidth={sel ? 4 : 2.5}
                  filter={conhecida ? 'url(#arv-brilho)' : undefined}
                />
                {/* contorno da cor do fundo: ligação que cruza o nome não apaga a leitura */}
                <text textAnchor="middle" fontSize="20" fill="var(--ink)" stroke="var(--bg)" strokeWidth="5" strokeLinejoin="round" paintOrder="stroke">
                  {linhasDoNome(no.hab.nome).map((l, i) => <tspan key={i} x={x} y={y + RAIO + 24 + i * 23}>{l}</tspan>)}
                </text>
                {no.custo > 0 && (
                  <g>
                    <circle cx={x + 22} cy={y - 22} r="14" fill="var(--accent-600)" stroke="var(--bg)" strokeWidth="2" />
                    <text x={x + 22} y={y - 15.5} textAnchor="middle" fontSize="19" fontWeight="700" fill="var(--sobre-acento)">{no.custo}</text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {detalhe && (
        <div className="rounded-xl border border-border bg-void p-3 space-y-1">
          <p className="text-ink text-sm font-semibold">
            {detalhe.hab.nome}
            {detalhe.custo > 0 && <span className="text-ink-dim font-normal"> · custa {detalhe.custo} ponto{detalhe.custo === 1 ? '' : 's'}</span>}
          </p>
          {detalhe.hab.descricao && <p className="text-ink-dim text-xs">{detalhe.hab.descricao}</p>}
          <p className="text-xs">
            {detalhe.estado === 'conhecida' && <span className="text-ok">Você já tem esta habilidade.</span>}
            {detalhe.estado === 'disponivel' && <span className="text-accent-300">Disponível{isDono ? ' — clique no nó para aprender.' : '.'}</span>}
            {detalhe.estado === 'bloqueada' && <span className="text-ink-dim">{detalhe.motivo}</span>}
          </p>
          {podeEsquecer && (
            <Botao variante="contorno" tamanho="sm" disabled={ocupado === detalhe.id}
              onClick={() => rodar(detalhe.id, async () => { await onRemover(linhaFicha.id); setSelecionado(null) })}>
              Esquecer{detalhe.custo > 0 ? ` (devolve ${detalhe.custo} ponto${detalhe.custo === 1 ? '' : 's'})` : ''}
            </Botao>
          )}
          {temDependente && <p className="text-ink-dim text-xs">Não dá para esquecer: outra habilidade que você tem depende desta.</p>}
        </div>
      )}

      {arvore.avisos.length > 0 && (
        <ul className="text-warn text-xs space-y-0.5">{arvore.avisos.map(a => <li key={a}>⚠ {a}</li>)}</ul>
      )}
      {erro && <p className="text-harm text-xs">{erro}</p>}
    </div>
  )
}
