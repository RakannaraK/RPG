import { useState } from 'react'
import AcoesCombate from './AcoesCombate'
import DefesaAtivaPrompt from './DefesaAtivaPrompt'
import { MiniTrilha } from './PainelFichas'
import { ordenarPorIniciativa } from '../../lib/iniciativa'
import { estadoDaHabilidade } from '../../lib/combateAvancado'
import { podeEditarFicha } from '../../lib/permissoesFicha'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

/**
 * Fase 14 — painel de combate dentro da SessaoPage.
 *  14.1 — iniciar/encerrar encontro + adicionar combatentes (feito aqui)
 *  14.2+ — iniciativa, turnos, condições, HP (próximas sub-fases)
 */

const TIPO_ESTILO = {
  jogador: { badge: 'bg-blue-900/60 border-blue-600/60 text-blue-200', label: 'Jogador' },
  aliado:  { badge: 'bg-emerald-900/60 border-emerald-600/60 text-emerald-200', label: 'Aliado' },
  npc:     { badge: 'bg-slate-700 border-slate-500 text-slate-200', label: 'NPC' },
  inimigo: { badge: 'bg-red-900/60 border-red-600/60 text-red-200', label: 'Inimigo' },
}

// HP exibido: jogador vem da ficha (card); inimigo/NPC vem do combatente
function hpDoCombatente(c, cardsPorFicha) {
  if (c.ficha_id) {
    const card = cardsPorFicha[c.ficha_id]
    if (card) return { atual: card.hpAtual, max: card.hpMax || card.hpMaxBase || 0 }
    return { atual: null, max: null }
  }
  return { atual: c.hp_atual, max: c.hp_maximo }
}

// Rodadas restantes de uma condição (null = permanente)
function rodadasRestantes(cond, rodadaAtual) {
  if (cond.duracao_rodadas == null) return null
  return cond.duracao_rodadas - ((rodadaAtual ?? 1) - (cond.rodada_inicio ?? (rodadaAtual ?? 1)))
}

// CA base (jogador via card; inimigo via combatente) + soma dos mods de condição
// tipo 'combate' ativos (ex: Envenenado -2 CA). Fase 14.4.
function caInfo(c, cardsPorFicha, campoCaId, condsDoComb) {
  let base = null
  if (c.ficha_id) {
    const card = cardsPorFicha[c.ficha_id]
    if (card && campoCaId != null) {
      const v = Number(card.combate?.[campoCaId])
      base = Number.isNaN(v) ? null : v
    }
  } else if (c.ca != null) {
    base = Number(c.ca)
  }
  let delta = 0
  for (const cond of condsDoComb) {
    const m = cond.modificador_config
    if (m && m.tipo === 'combate' && m.valor != null) delta += Number(m.valor) || 0
  }
  if (base == null && delta === 0) return null
  return { base: base ?? 0, efetiva: (base ?? 0) + delta, delta }
}

function CondicaoForm({ onAplicar, onFechar }) {
  const [nome, setNome] = useState('')
  const [dur, setDur] = useState('')
  const [caMod, setCaMod] = useState('')
  const [porRodada, setPorRodada] = useState('') // F32.3 — dano/cura por rodada (valor ou notação)
  const [tipoRodada, setTipoRodada] = useState('dano')
  const [busy, setBusy] = useState(false)
  const inputCls = 'px-2 py-1 rounded-lg bg-void border border-border text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  async function submit() {
    if (!nome.trim()) return
    setBusy(true)
    try {
      const modificadorConfig = caMod !== '' && Number(caMod) !== 0
        ? { tipo: 'combate', alvo: 'ca', valor: Number(caMod) }
        : null
      // F32.3 — "1d4" rola a cada rodada; "3" é fixo
      const bruto = porRodada.trim()
      const efeitoTurno = bruto
        ? { tipo: tipoRodada, ...(/^\d+$/.test(bruto) ? { valor: Number(bruto) } : { notacao: bruto }) }
        : null
      await onAplicar({ nome, duracaoRodadas: dur, modificadorConfig, efeitoTurno })
      onFechar()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-6">
      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Condição (ex: Envenenado)" className={`${inputCls} flex-1 min-w-[8rem]`} />
      <label className="text-purple-400 text-xs flex items-center gap-1">
        Rodadas
        <input value={dur} onChange={e => setDur(e.target.value)} type="number" min="1" placeholder="∞" className={`${inputCls} w-14`} title="Vazio = permanente" />
      </label>
      <label className="text-purple-400 text-xs flex items-center gap-1">
        CA
        <input value={caMod} onChange={e => setCaMod(e.target.value)} type="number" placeholder="0" className={`${inputCls} w-14`} title="Efeito na CA (ex: -2)" />
      </label>
      <label className="text-purple-400 text-xs flex items-center gap-1">
        Por rodada
        <select value={tipoRodada} onChange={e => setTipoRodada(e.target.value)} className={`${inputCls} w-20`} title="Dano ou cura no começo do turno de quem carrega a condição">
          <option value="dano">dano</option>
          <option value="cura">cura</option>
        </select>
        <input value={porRodada} onChange={e => setPorRodada(e.target.value)} placeholder="1d4 ou 3" className={`${inputCls} w-20`} title="Vazio = sem efeito por rodada" />
      </label>
      <Botao variante="primario" tamanho="sm" onClick={submit} disabled={busy || !nome.trim()}>Aplicar</Botao>
      <button onClick={onFechar} className="px-2 py-1 text-purple-400 hover:text-white text-xs transition-colors">Cancelar</button>
    </div>
  )
}

/** F32.5 — ativáveis da ficha que estão prontas (fora de recarga, carga cheia). */
function habilidadesProntasDoCard(card) {
  return (card?.habilidadesFicha || []).filter(hf =>
    hf.habilidade?.tipo === 'ativavel' && estadoDaHabilidade(hf, hf.habilidade).pronta
  )
}

/**
 * F32.4 — banco de reservas: quem está fora da ordem de turnos. O mestre troca
 * (o suplente herda o lugar na iniciativa) ou traz de volta sem trocar.
 */
function PainelReserva({ reserva, emJogo, isMestre, onTrocar, onDefinirReserva }) {
  const [escolha, setEscolha] = useState({})
  const [erro, setErro] = useState('')
  if (reserva.length === 0) return null
  return (
    <div className="rounded-xl border border-purple-900/70 bg-slate-900/50 p-2.5 space-y-1.5">
      <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">Reserva ({reserva.length})</p>
      {reserva.map(c => (
        <div key={c.id} className="flex flex-wrap items-center gap-2">
          <span className="text-purple-200 text-sm flex-1 min-w-[6rem] truncate">
            {c.nome}
            {c.hp_maximo != null && <span className="text-accent-300 text-xs"> · {c.hp_atual ?? '?'}/{c.hp_maximo}</span>}
          </span>
          {isMestre && (
            <>
              <select
                value={escolha[c.id] || ''}
                onChange={e => setEscolha(prev => ({ ...prev, [c.id]: e.target.value }))}
                className="px-2 py-1 rounded-lg bg-void border border-border text-white text-xs"
                aria-label={`Trocar ${c.nome} por`}
              >
                <option value="">entra no lugar de…</option>
                {emJogo.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
              </select>
              <button
                type="button"
                onClick={async () => {
                  setErro('')
                  try { await onTrocar(escolha[c.id], c.id) } catch (e) { setErro(e.message) }
                }}
                disabled={!escolha[c.id]}
                className="px-2 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-sobre-acento text-xs rounded-lg transition-colors"
              >⇄ Trocar</button>
              <button
                type="button" onClick={() => onDefinirReserva(c.id, false)}
                className="px-2 py-1 text-purple-300 hover:text-white text-xs"
                title="Entrar sem trocar (vai para o fim da ordem até rolar iniciativa)"
              >Entrar</button>
            </>
          )}
        </div>
      ))}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

// F22.6 — o mestre pede a defesa: informa o acerto do atacante e o dano (o dano
// vem pré-preenchido de um dano de poder pendente, se houver).
function PedirDefesaForm({ combatente, sugestaoDano, onPedir, onFechar }) {
  const [ataque, setAtaque] = useState('')
  const [dano, setDano] = useState(sugestaoDano ? String(sugestaoDano.valor) : '')
  const [busy, setBusy] = useState(false)
  const inp = 'w-16 px-1.5 py-0.5 bg-void border border-border text-white text-center rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500'
  async function submit() {
    if (dano === '') return
    setBusy(true)
    try { await onPedir(combatente, { ataque: Number(ataque) || 0, dano: Number(dano) || 0 }); onFechar() }
    finally { setBusy(false) }
  }
  return (
    <div className="mt-1.5 ml-6 flex items-center gap-1.5 flex-wrap">
      <label className="text-sky-300 text-xs flex items-center gap-1">acerto
        <input type="number" value={ataque} onChange={e => setAtaque(e.target.value)} placeholder="71" className={inp} /></label>
      <label className="text-sky-300 text-xs flex items-center gap-1">dano
        <input type="number" value={dano} onChange={e => setDano(e.target.value)} placeholder="20" className={inp} /></label>
      <button onClick={submit} disabled={busy || dano === ''} className="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">Pedir</button>
      <button onClick={onFechar} className="px-1.5 py-0.5 text-purple-400 hover:text-white text-xs transition-colors">Cancelar</button>
    </div>
  )
}

// F22.6 — status + resolução da defesa pendente (só mestre). Sem resposta =
// fallback "dano cheio"; nunca trava o turno.
function ResolverDefesaControl({ combatente, onResolver, onCancelar }) {
  const [busy, setBusy] = useState(false)
  const dp = combatente.defesa_pendente || {}
  const r = dp.resposta
  const label = r
    ? (r.opcao_id === 'nao_reagir' ? 'não reagiu' : `${r.opcao_nome}${r.defesa_total != null ? ` (${r.defesa_total} vs ${dp.ataque})` : ''}`)
    : `aguardando ${combatente.nome}…`
  async function resolver() { setBusy(true); try { await onResolver(combatente) } finally { setBusy(false) } }
  return (
    <div className="mt-1.5 ml-6 flex items-center gap-2 flex-wrap rounded-lg border border-sky-700/50 bg-sky-950/30 px-2 py-1.5">
      <span className="text-sky-300 text-xs">🛡 defesa: <span className="text-sky-100 font-medium">{label}</span></span>
      <button onClick={resolver} disabled={busy}
        className={`ml-auto px-2 py-0.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${r ? 'bg-sky-700 hover:bg-sky-600 text-white' : 'bg-red-800 hover:bg-red-700 text-white'}`}>
        {r ? '✓ Resolver' : 'Resolver (dano cheio)'}
      </button>
      <button onClick={() => onCancelar(combatente)} disabled={busy} className="text-purple-400 hover:text-white text-xs transition-colors" title="Cancelar pedido">✕</button>
    </div>
  )
}

function CombatenteRow({
  c, cardsPorFicha, campoCaId, condsDoComb = [], rodadaAtual,
  isMestre, podeAgir, ativo, podeSubir, podeDescer, onMover,
  onRemover, onRolarIniciativa, onSetIniciativa, onAplicarCondicao, onRemoverCondicao, onAplicarHp,
  sugestaoDano = null, onAplicarSugestao, // F14.6
  // F22.6 — defesa ativa
  defesaAtiva = null, atributosSistema = [], souDefensor = false,
  mesaId, sessaoId, onPedirDefesa, onResponderDefesa, onResolverDefesa, onCancelarDefesa,
  onDefinirReserva = null, // F32.4
  onUsarHabilidadeReacao = null, // F32.5
  // 24.2 — dano/cura por MARCAS quando a ficha tem trilha que substitui a vida
  onMarcarTrilha, onCurarTrilha,
}) {
  const estilo = TIPO_ESTILO[c.tipo] || TIPO_ESTILO.inimigo
  const hp = hpDoCombatente(c, cardsPorFicha)
  const ca = caInfo(c, cardsPorFicha, campoCaId, condsDoComb)
  const [rolando, setRolando] = useState(false)
  const [addCond, setAddCond] = useState(false)
  const [dc, setDc] = useState('')
  const [pedindoDef, setPedindoDef] = useState(false)

  // F22.6 — defesa ativa: pedido pendente neste combatente e papéis na cena
  const dp = c.defesa_pendente || null
  const defAtiva = defesaAtiva?.ativo && (defesaAtiva.opcoes?.length > 0)
  // F38.1 — alvo de toque mínimo de 24 px (WCAG 2.2 AA 2.5.8). O ícone continua
  // pequeno; o que cresce é a área clicável — no celular esses botões tinham
  // 9x10 px e eram impossíveis de acertar no meio do combate.
  const ICONE = 'inline-flex items-center justify-center min-w-[24px] min-h-[24px] rounded-lg transition-colors'

  const podePedirDefesa = defAtiva && isMestre && !dp && hp.atual != null
  const mostrarPromptDefensor = dp && !dp.resposta && souDefensor

  async function rolar() {
    setRolando(true)
    try { await onRolarIniciativa(c) } finally { setRolando(false) }
  }

  function aplicarHp(sinal) {
    const n = Number(dc)
    if (!n) return
    onAplicarHp(c, sinal * Math.abs(n))
    setDc('')
  }

  // 24.2 — trilha que substitui a vida (jogador): mostra caixinhas e traduz
  // dano/cura para marcas; "abatido" = trilha cheia do tipo mais severo
  const trilhaVida = c.ficha_id ? cardsPorFicha[c.ficha_id]?.trilhaVida : null
  const abatido = trilhaVida
    ? trilhaVida.cheiaDoMaior
    : hp.atual != null && hp.atual <= 0

  return (
    <div className={`rounded-xl px-3 py-2 border transition-all duration-300 ${
      abatido ? 'bg-slate-900/60 border-slate-700 opacity-70'
      : ativo ? 'bg-amber-950/40 border-amber-500/70 ring-1 ring-amber-500/40'
      : 'bg-slate-800/70 border-purple-900/50'
    }`}>
      {/* F38.1 — no celular a linha quebra em duas faixas: identidade em cima,
          estado e controles embaixo. Antes tudo ficava numa linha só, o nome do
          combatente era esmagado até desaparecer e o ✕ saía fora do card. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:flex-nowrap">
        <span className={`shrink-0 w-3 text-amber-400 ${ativo ? 'opacity-100' : 'opacity-0'}`} title="Agindo agora">▶</span>
        {/* Iniciativa */}
        <div className="flex items-center gap-1 shrink-0 w-[4.5rem]">
          {podeAgir ? (
            <>
              <input
                type="number"
                value={c.iniciativa ?? ''}
                onChange={e => onSetIniciativa(c.id, e.target.value)}
                placeholder="—"
                className="w-9 px-1 py-1 bg-void border border-border text-white text-center rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                title="Iniciativa"
              />
              <button onClick={rolar} disabled={rolando} className={`${ICONE} text-amber-500 hover:text-amber-300 hover:bg-amber-950/40 disabled:opacity-40 text-base leading-none`} title="Rolar iniciativa">🎲</button>
            </>
          ) : (
            <span className="w-9 text-center text-white text-sm font-bold" title="Iniciativa">{c.iniciativa ?? '—'}</span>
          )}
        </div>

        <span className={`text-xs px-1.5 py-0.5 rounded-lg border shrink-0 ${estilo.badge}`}>{estilo.label}</span>
        <span className="text-white text-sm font-medium flex-1 min-w-0 truncate">
          {c.nome}
          {abatido && (
            <span className="ml-1.5 text-xs px-1 py-0.5 rounded-lg bg-red-950 border border-red-800 text-red-300 align-middle">
              {trilhaVida?.rotuloCheia || 'Abatido'}
            </span>
          )}
        </span>

        {/* segunda faixa no celular; na mesma linha a partir de sm */}
        <div className="flex items-center gap-2 sm:gap-3 basis-full sm:basis-auto justify-end sm:justify-start">
        {trilhaVida ? (
          <span className={`text-xs font-mono shrink-0 ${abatido ? 'text-red-400' : 'text-purple-300'}`}
            title={`${trilhaVida.nome}: ${trilhaVida.cont.marcadas}/${trilhaVida.cont.total} marcadas`}>
            {trilhaVida.cont.marcadas}/{trilhaVida.cont.total} ▢
          </span>
        ) : hp.atual != null && (
          <span className={`text-xs font-mono shrink-0 ${abatido ? 'text-red-400' : 'text-purple-300'}`}>
            {hp.atual}{hp.max != null ? `/${hp.max}` : ''} HP
          </span>
        )}
        {ca && (
          <span className={`text-xs shrink-0 ${ca.delta < 0 ? 'text-red-300' : ca.delta > 0 ? 'text-green-300' : 'text-purple-400'}`} title="Classe de Armadura">
            CA {ca.efetiva}
          </span>
        )}
        {podeAgir && (
          <button onClick={() => setAddCond(v => !v)} className={`${ICONE} text-fuchsia-400 hover:text-fuchsia-200 hover:bg-fuchsia-950/40 shrink-0 text-xs border border-fuchsia-800/60 px-1.5`} title="Aplicar condição">cond</button>
        )}
        {/* divisória: separa o estado do combatente das ações do mestre */}
        {isMestre && <span className="w-px h-5 bg-border shrink-0" aria-hidden="true" />}
        {/* setas lado a lado, não empilhadas: empilhada, cada uma tinha 10 px de altura */}
        {isMestre && (
          <div className="flex items-center leading-none shrink-0">
            <button onClick={() => onMover(c.id, -1)} disabled={!podeSubir} className={`${ICONE} text-purple-400 hover:text-white hover:bg-purple-900/50 disabled:opacity-20 text-xs`} title="Subir (desempate)">▲</button>
            <button onClick={() => onMover(c.id, +1)} disabled={!podeDescer} className={`${ICONE} text-purple-400 hover:text-white hover:bg-purple-900/50 disabled:opacity-20 text-xs`} title="Descer (desempate)">▼</button>
          </div>
        )}
        {isMestre && onDefinirReserva && (
          <button
            onClick={() => onDefinirReserva(c.id, true)}
            className={`${ICONE} text-purple-400 hover:text-white hover:bg-purple-900/50 shrink-0 text-sm`}
            title="Mandar para a reserva (sai da ordem de turnos, sem perder nada)"
          >⇣</button>
        )}
        {isMestre && (
          <button onClick={() => onRemover(c.id)} className={`${ICONE} text-red-700 hover:text-red-400 hover:bg-red-950/40 shrink-0 text-sm`} title="Remover do combate">✕</button>
        )}
        </div>
      </div>

      {/* 24.2 — alvo com trilha-vida: dano/cura viram marcar/curar caixinhas */}
      {trilhaVida && (
        <div className="mt-1.5 pl-6 space-y-1.5">
          <MiniTrilha trilha={trilhaVida} />
          {podeAgir && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="number" min="1" value={dc} onChange={e => setDc(e.target.value)} placeholder="1"
                className="w-12 px-1.5 py-0.5 bg-void border border-border text-white text-center rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                title="Quantas caixinhas"
              />
              {(trilhaVida.config.tipos_marca || []).map(tm => (
                <button key={tm.id}
                  onClick={() => { onMarcarTrilha?.(c, tm.id, Math.max(1, Math.abs(Number(dc) || 1))); setDc('') }}
                  className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition-colors font-mono"
                  title={`Marcar ${tm.nome}`}>
                  − {tm.simbolo || tm.nome}
                </button>
              ))}
              <button
                onClick={() => { onCurarTrilha?.(c, Math.max(1, Math.abs(Number(dc) || 1))); setDc('') }}
                className="px-2 py-0.5 bg-green-800 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                title="Curar caixinhas (menos severas primeiro)">
                ＋ Cura
              </button>
            </div>
          )}
        </div>
      )}

      {/* Controles de dano/cura (14.5) — HP numérico */}
      {!trilhaVida && podeAgir && hp.atual != null && (
        <div className="flex items-center gap-1.5 mt-1.5 pl-6">
          <input
            type="number"
            value={dc}
            onChange={e => setDc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') aplicarHp(-1) }}
            placeholder="0"
            className="w-14 px-1.5 py-1 bg-void border border-border text-white text-center rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button onClick={() => aplicarHp(-1)} className="px-2.5 py-1 min-h-[24px] bg-red-800 hover:bg-red-700 text-white text-xs rounded-lg transition-colors" title="Aplicar dano">− Dano</button>
          <button onClick={() => aplicarHp(+1)} className="px-2.5 py-1 min-h-[24px] bg-green-800 hover:bg-green-700 text-white text-xs rounded-lg transition-colors" title="Aplicar cura">＋ Cura</button>
          {/* F14.6 — aplicar o dano de poder pendente neste alvo */}
          {sugestaoDano && (
            <button
              onClick={() => onAplicarSugestao?.(c)}
              className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors font-medium animate-pulse"
              title={`Aplicar ${sugestaoDano.valor} de dano${sugestaoDano.origem ? ` (${sugestaoDano.origem})` : ''} neste alvo`}
            >
              <Ilustra nome="espadas" tamanho={15} /> −{sugestaoDano.valor}
            </button>
          )}
          {/* F22.6 — em vez de aplicar direto, pedir defesa ativa ao alvo */}
          {podePedirDefesa && (
            <button
              onClick={() => setPedindoDef(v => !v)}
              className="px-2 py-0.5 bg-sky-800 hover:bg-sky-700 text-white text-xs rounded-lg transition-colors"
              title="Pedir defesa ativa (rolagem oposta)"
            >
              🛡 Pedir defesa
            </button>
          )}
        </div>
      )}

      {/* F22.6 — form do mestre p/ pedir defesa */}
      {pedindoDef && podePedirDefesa && (
        <PedirDefesaForm combatente={c} sugestaoDano={sugestaoDano} onPedir={onPedirDefesa} onFechar={() => setPedindoDef(false)} />
      )}

      {/* F22.6 — prompt de reação para o defensor */}
      {mostrarPromptDefensor && (
        <DefesaAtivaPrompt
          combatente={c}
          card={c.ficha_id ? cardsPorFicha[c.ficha_id] : null}
          config={defesaAtiva}
          atributosSistema={atributosSistema}
          mesaId={mesaId}
          sessaoId={sessaoId}
          onResponder={onResponderDefesa}
          habilidadesProntas={habilidadesProntasDoCard(c.ficha_id ? cardsPorFicha[c.ficha_id] : null)}
          onUsarHabilidade={onUsarHabilidadeReacao}
        />
      )}

      {/* F22.6 — controle do mestre p/ resolver (status + fallback) */}
      {dp && isMestre && (
        <ResolverDefesaControl combatente={c} onResolver={onResolverDefesa} onCancelar={onCancelarDefesa} />
      )}

      {/* F22.6 — o defensor já respondeu e espera o mestre resolver */}
      {dp && dp.resposta && souDefensor && !isMestre && (
        <p className="mt-1.5 ml-6 text-sky-400/80 text-xs">
          🛡 {dp.resposta.opcao_id === 'nao_reagir' ? 'Você não reagiu' : `${dp.resposta.opcao_nome} (${dp.resposta.defesa_total})`} — aguardando o mestre resolver…
        </p>
      )}

      {/* Chips de condições ativas */}
      {condsDoComb.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 pl-6">
          {condsDoComb.map(cond => {
            const rest = rodadasRestantes(cond, rodadaAtual)
            return (
              <span key={cond.id} className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-lg border bg-fuchsia-900/40 border-fuchsia-600/50 text-fuchsia-200" title={cond.descricao || cond.nome}>
                {cond.nome}{rest != null ? ` (${rest})` : ''}
                {podeAgir && (
                  <button onClick={() => onRemoverCondicao(cond.id)} className="text-fuchsia-400 hover:text-white transition-colors" title="Remover condição">×</button>
                )}
              </span>
            )
          })}
        </div>
      )}

      {addCond && (
        <CondicaoForm onAplicar={patch => onAplicarCondicao(c.id, patch)} onFechar={() => setAddCond(false)} />
      )}
    </div>
  )
}

function FormInimigo({ onAdicionar }) {
  const [nome, setNome] = useState('')
  const [hp, setHp] = useState('')
  const [ca, setCa] = useState('')
  const [tipo, setTipo] = useState('inimigo')
  const [qtd, setQtd] = useState(1)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!nome.trim()) return
    setBusy(true)
    try {
      await onAdicionar({ nome, hp, ca, tipo, quantidade: qtd })
      setNome(''); setHp(''); setCa(''); setQtd(1)
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'px-2 py-1.5 rounded-lg bg-void border border-border text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="bg-void border border-border rounded-xl p-3 space-y-2">
      <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Adicionar inimigo/NPC</p>
      <div className="flex flex-wrap gap-2">
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome (ex: Goblin)" className={`${inputCls} flex-1 min-w-[8rem]`} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} className={inputCls} title="Tipo">
          <option value="inimigo">Inimigo</option>
          <option value="aliado">Aliado</option>
          <option value="npc">NPC</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input value={hp} onChange={e => setHp(e.target.value)} type="number" placeholder="HP" className={`${inputCls} w-20`} />
        <input value={ca} onChange={e => setCa(e.target.value)} type="number" placeholder="CA" className={`${inputCls} w-20`} />
        <label className="text-purple-400 text-xs flex items-center gap-1">
          Qtd
          <input value={qtd} onChange={e => setQtd(e.target.value)} type="number" min="1" className={`${inputCls} w-16`} />
        </label>
        <Botao variante="primario" tamanho="sm"
          onClick={submit}
          disabled={busy || !nome.trim()} className="ml-auto">
          + Adicionar
        </Botao>
      </div>
    </div>
  )
}

export default function CombatePanel({
  encontro,
  combatentes = [],
  condicoes = [],
  campoCaId = null,
  isMestre,
  meuUserId,
  mesaId,
  sessaoId,
  fichasSessao = [],
  onIniciar,
  onEncerrar,
  onAdicionarJogadores,
  onAdicionarInimigos,
  acoesBestiario = null, // F31.2
  onTrocarReserva, onDefinirReserva, // F32.4
  onUsarHabilidadeReacao, // F32.5
  onRemoverCombatente,
  onRolarIniciativa,
  onRolarIniciativaTodos,
  onSetIniciativa,
  onProximoTurno,
  onTurnoAnterior,
  onAplicarCondicao,
  onRemoverCondicao,
  onAplicarHp,
  onReordenar,
  sugestaoDano = null,          // F14.6
  onAplicarSugestao,
  onLimparSugestao,
  // F22.6 — defesa ativa
  defesaAtiva = null,
  atributosSistema = [],
  onPedirDefesa,
  onResponderDefesa,
  onResolverDefesa,
  onCancelarDefesa,
  // 24.2 — trilha-vida
  onMarcarTrilha,
  onCurarTrilha,
}) {
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const cardsPorFicha = {}
  for (const card of fichasSessao) cardsPorFicha[card.id] = card

  // Condições agrupadas por combatente
  const condsPorComb = {}
  for (const cond of condicoes) {
    if (!condsPorComb[cond.combatente_id]) condsPorComb[cond.combatente_id] = []
    condsPorComb[cond.combatente_id].push(cond)
  }

  // Pode definir/rolar iniciativa deste combatente: mestre (todos) ou dono da ficha (o seu)
  const podeAgir = c =>
    isMestre || (c.ficha_id && podeEditarFicha(cardsPorFicha[c.ficha_id]?.ficha, meuUserId))

  // F22.6 — defensor: o dono do alvo (jogador); o mestre responde pelos inimigos
  const souDefensor = c =>
    c.ficha_id
      ? podeEditarFicha(cardsPorFicha[c.ficha_id]?.ficha, meuUserId)
      : isMestre

  // Sem combate ativo
  if (!encontro) {
    if (!isMestre) return null
    return (
      <div className="mb-6 rounded-2xl border border-purple-800/60 bg-slate-800/40 px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold leading-tight flex items-center gap-2"><Ilustra nome="espadas" tamanho={18} /> Combate</p>
          <p className="text-purple-400 text-xs">Inicie um encontro para rastrear iniciativa, turnos e condições.</p>
        </div>
        <button
          onClick={async () => { setBusy(true); setErro(''); try { await onIniciar() } catch (e) { setErro(e.message || 'Erro') } finally { setBusy(false) } }}
          disabled={busy}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sobre-acento text-sm font-semibold rounded-lg transition-colors shrink-0 inline-flex items-center gap-2"
        >
          {busy ? 'Iniciando...' : <><Ilustra nome="espadas" tamanho={18} /> Iniciar combate</>}
        </button>
        {erro && <p className="text-red-400 text-xs w-full">{erro}</p>}
      </div>
    )
  }

  const ausentes = fichasSessao.filter(f => !combatentes.some(c => c.ficha_id === f.id))

  // Ordem de iniciativa + combatente ativo (turno_atual é índice nessa ordem)
  const ordenados = ordenarPorIniciativa(combatentes) // F32.4 — já ignora a reserva
  const naReservaLista = combatentes.filter(c => c.reserva)
  const turnoIdx = ordenados.length ? Math.min(Math.max(0, encontro.turno_atual ?? 0), ordenados.length - 1) : 0
  const ativo = ordenados[turnoIdx] || null

  // Desempate manual (14.7): troca a posição com o vizinho e persiste `ordem`
  function mover(id, dir) {
    const ids = ordenados.map(c => c.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    onReordenar?.(ids)
  }

  return (
    <div className="mb-6 rounded-2xl border border-red-800/50 bg-gradient-to-b from-red-950/30 to-slate-900/40 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-red-300 text-xs font-bold uppercase tracking-wider">
          <Ilustra nome="espadas" tamanho={15} /> {encontro.titulo || 'Combate'}
        </span>
        <span className="text-white text-sm font-semibold">Rodada {encontro.rodada}</span>
        {ativo && (
          <span className="text-amber-300 text-xs">
            Vez de <span className="font-semibold">{ativo.nome}</span>
          </span>
        )}
      </div>

      {/* Controles de turno (mestre) */}
      {isMestre && combatentes.length > 0 && (
        <div className="flex items-center gap-2">
          <Botao variante="secundario" onClick={() => onTurnoAnterior()}>◀ Anterior</Botao>
          {/* avançar turno é A ação da tela: fica no acento do tema, não em
              âmbar — âmbar é dos dados, e dois blocos âmbar grandes competiam */}
          <Botao variante="primario" onClick={() => onProximoTurno()} className="flex-1 font-semibold">
            Próximo turno ▶
          </Botao>
        </div>
      )}

      {/* 22.7 — derivados marcados "exibir no combate" do personagem ativo (todos veem) */}
      {ativo?.ficha_id && (cardsPorFicha[ativo.ficha_id]?.derivadosCombate || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-accent-300 text-xs">{ativo.nome}:</span>
          {cardsPorFicha[ativo.ficha_id].derivadosCombate.map(d => (
            <span key={d.id} className="text-xs px-2 py-0.5 rounded-lg border bg-slate-900/70 border-purple-800/60 text-purple-200">
              {d.nome} <span className="text-white font-bold">{d.valor != null ? d.valor : '—'}</span>
            </span>
          ))}
        </div>
      )}

      {/* Ações do personagem ativo (14.6) */}
      {ativo?.ficha_id && podeAgir(ativo) && cardsPorFicha[ativo.ficha_id] && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 space-y-2">
          <p className="text-amber-300 text-xs font-semibold">⚔️ Ações de {ativo.nome}</p>
          <AcoesCombate
            fichaId={ativo.ficha_id}
            nome={ativo.nome}
            modificadoresAtivos={cardsPorFicha[ativo.ficha_id].modificadoresAtivos || []}
            combateFinais={cardsPorFicha[ativo.ficha_id].combate || {}}
            hpMax={cardsPorFicha[ativo.ficha_id].hpMax || 0}
            mesaId={mesaId}
            sessaoId={sessaoId}
            combatentes={combatentes}
            onAplicarHp={onAplicarHp}
          />
        </div>
      )}

      {/* F14.6 — dano de poder rolado por um jogador, aguardando um alvo */}
      {sugestaoDano && (
        <div className="mb-2 rounded-lg border border-amber-700/70 bg-amber-950/40 px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-amber-300 text-sm">
            ⚔ Dano pendente: <span className="font-bold">{sugestaoDano.valor}</span>
            {sugestaoDano.origem && <span className="text-amber-400/80"> — {sugestaoDano.origem}</span>}
            {sugestaoDano.autor && <span className="text-amber-500/70"> ({sugestaoDano.autor})</span>}
          </span>
          <span className="text-amber-500/70 text-xs">Clique no <span className="font-mono">⚔ −{sugestaoDano.valor}</span> de um alvo.</span>
          <button onClick={onLimparSugestao} className="ml-auto text-amber-500 hover:text-amber-200 text-sm" title="Descartar">✕</button>
        </div>
      )}

      {/* Lista de combatentes (ordenada por iniciativa) */}
      {combatentes.length === 0 ? (
        <p className="text-accent-300 text-sm py-2">Nenhum combatente ainda. {isMestre && 'Adicione abaixo.'}</p>
      ) : (
        <div className="space-y-1.5">
          {ordenados.map((c, idx) => (
            <CombatenteRow
              key={c.id}
              c={c}
              cardsPorFicha={cardsPorFicha}
              campoCaId={campoCaId}
              condsDoComb={condsPorComb[c.id] || []}
              rodadaAtual={encontro.rodada}
              isMestre={isMestre}
              podeAgir={podeAgir(c)}
              ativo={ativo?.id === c.id}
              podeSubir={idx > 0}
              podeDescer={idx < ordenados.length - 1}
              onMover={mover}
              onRemover={onRemoverCombatente}
              onRolarIniciativa={onRolarIniciativa}
              onSetIniciativa={onSetIniciativa}
              onAplicarCondicao={onAplicarCondicao}
              onRemoverCondicao={onRemoverCondicao}
              onAplicarHp={onAplicarHp}
              sugestaoDano={sugestaoDano}
              onAplicarSugestao={onAplicarSugestao}
              defesaAtiva={defesaAtiva}
              atributosSistema={atributosSistema}
              souDefensor={souDefensor(c)}
              mesaId={mesaId}
              sessaoId={sessaoId}
              onPedirDefesa={onPedirDefesa}
              onResponderDefesa={onResponderDefesa}
              onResolverDefesa={onResolverDefesa}
              onCancelarDefesa={onCancelarDefesa}
              onMarcarTrilha={onMarcarTrilha}
              onCurarTrilha={onCurarTrilha}
              onDefinirReserva={onDefinirReserva}
              onUsarHabilidadeReacao={onUsarHabilidadeReacao}
            />
          ))}
          {/* F32.4 — banco de reservas */}
          {onTrocarReserva && (
            <PainelReserva
              reserva={naReservaLista}
              emJogo={ordenados}
              isMestre={isMestre}
              onTrocar={onTrocarReserva}
              onDefinirReserva={onDefinirReserva}
            />
          )}
        </div>
      )}

      {/* Rolar iniciativa de todos (mestre) */}
      {isMestre && combatentes.length > 0 && (
        <Botao
          variante="dado" tamanho="sm"
          onClick={async () => { setBusy(true); setErro(''); try { await onRolarIniciativaTodos() } catch (e) { setErro(e.message || 'Erro') } finally { setBusy(false) } }}
          disabled={busy}
          className="w-full"
        >
          🎲 Rolar iniciativa de todos
        </Botao>
      )}

      {/* Controles do mestre para adicionar */}
      {isMestre && (
        <div className="space-y-2 pt-1">
          <Botao
            variante="secundario"
            onClick={async () => { setErro(''); try { await onAdicionarJogadores(ausentes) } catch (e) { setErro(e.message || 'Erro') } }}
            disabled={ausentes.length === 0}
            className="w-full"
          >
            {ausentes.length === 0 ? 'Todos os personagens já estão no combate' : `+ Adicionar personagens da mesa (${ausentes.length})`}
          </Botao>
          {acoesBestiario}
          <FormInimigo onAdicionar={onAdicionarInimigos} />
          {erro && <p className="text-red-400 text-xs">{erro}</p>}

          {/* F38 — encerrar combate veio do topo do painel, onde ficava colado
              no título e no "Próximo turno". Ação que desmonta o encontro fica
              no fim, discreta, longe do caminho do dedo. */}
          <div className="pt-2 flex">
            <Botao
              variante="fantasma" tamanho="sm"
              onClick={async () => { setBusy(true); try { await onEncerrar() } finally { setBusy(false) } }}
              disabled={busy}
              className="ml-auto text-red-300 hover:text-white hover:bg-red-950/40"
            >
              Encerrar combate
            </Botao>
          </div>
        </div>
      )}
    </div>
  )
}
