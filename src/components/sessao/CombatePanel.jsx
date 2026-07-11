import { useState } from 'react'
import AcoesCombate from './AcoesCombate'
import DefesaAtivaPrompt from './DefesaAtivaPrompt'
import { ordenarPorIniciativa } from '../../lib/iniciativa'

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
  const [busy, setBusy] = useState(false)
  const inputCls = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  async function submit() {
    if (!nome.trim()) return
    setBusy(true)
    try {
      const modificadorConfig = caMod !== '' && Number(caMod) !== 0
        ? { tipo: 'combate', alvo: 'ca', valor: Number(caMod) }
        : null
      await onAplicar({ nome, duracaoRodadas: dur, modificadorConfig })
      onFechar()
    } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-1.5 pl-6">
      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Condição (ex: Envenenado)" className={`${inputCls} flex-1 min-w-[8rem]`} />
      <label className="text-purple-400 text-[11px] flex items-center gap-1">
        Rodadas
        <input value={dur} onChange={e => setDur(e.target.value)} type="number" min="1" placeholder="∞" className={`${inputCls} w-14`} title="Vazio = permanente" />
      </label>
      <label className="text-purple-400 text-[11px] flex items-center gap-1">
        CA
        <input value={caMod} onChange={e => setCaMod(e.target.value)} type="number" placeholder="0" className={`${inputCls} w-14`} title="Efeito na CA (ex: -2)" />
      </label>
      <button onClick={submit} disabled={busy || !nome.trim()} className="px-2 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">Aplicar</button>
      <button onClick={onFechar} className="px-2 py-1 text-purple-400 hover:text-white text-xs transition-colors">Cancelar</button>
    </div>
  )
}

// F22.6 — o mestre pede a defesa: informa o acerto do atacante e o dano (o dano
// vem pré-preenchido de um dano de poder pendente, se houver).
function PedirDefesaForm({ combatente, sugestaoDano, onPedir, onFechar }) {
  const [ataque, setAtaque] = useState('')
  const [dano, setDano] = useState(sugestaoDano ? String(sugestaoDano.valor) : '')
  const [busy, setBusy] = useState(false)
  const inp = 'w-16 px-1.5 py-0.5 bg-purple-950 border border-purple-700 text-white text-center rounded text-xs focus:outline-none focus:ring-1 focus:ring-sky-500'
  async function submit() {
    if (dano === '') return
    setBusy(true)
    try { await onPedir(combatente, { ataque: Number(ataque) || 0, dano: Number(dano) || 0 }); onFechar() }
    finally { setBusy(false) }
  }
  return (
    <div className="mt-1.5 ml-6 flex items-center gap-1.5 flex-wrap">
      <label className="text-sky-300 text-[11px] flex items-center gap-1">acerto
        <input type="number" value={ataque} onChange={e => setAtaque(e.target.value)} placeholder="71" className={inp} /></label>
      <label className="text-sky-300 text-[11px] flex items-center gap-1">dano
        <input type="number" value={dano} onChange={e => setDano(e.target.value)} placeholder="20" className={inp} /></label>
      <button onClick={submit} disabled={busy || dano === ''} className="px-2 py-0.5 bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-xs rounded transition-colors">Pedir</button>
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
      <span className="text-sky-300 text-[11px]">🛡 defesa: <span className="text-sky-100 font-medium">{label}</span></span>
      <button onClick={resolver} disabled={busy}
        className={`ml-auto px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-50 ${r ? 'bg-sky-700 hover:bg-sky-600 text-white' : 'bg-red-800 hover:bg-red-700 text-white'}`}>
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

  const abatido = hp.atual != null && hp.atual <= 0

  return (
    <div className={`rounded-xl px-3 py-2 border transition-all duration-300 ${
      abatido ? 'bg-slate-900/60 border-slate-700 opacity-70'
      : ativo ? 'bg-amber-950/40 border-amber-500/70 ring-1 ring-amber-500/40'
      : 'bg-slate-800/70 border-purple-900/50'
    }`}>
      <div className="flex items-center gap-2 sm:gap-3">
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
                className="w-9 px-1 py-0.5 bg-purple-950 border border-purple-700 text-white text-center rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                title="Iniciativa"
              />
              <button onClick={rolar} disabled={rolando} className="text-amber-500 hover:text-amber-300 disabled:opacity-40 transition-colors text-base leading-none" title="Rolar iniciativa">🎲</button>
            </>
          ) : (
            <span className="w-9 text-center text-white text-sm font-bold" title="Iniciativa">{c.iniciativa ?? '—'}</span>
          )}
        </div>

        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border shrink-0 ${estilo.badge}`}>{estilo.label}</span>
        <span className="text-white text-sm font-medium flex-1 min-w-0 truncate">
          {c.nome}
          {abatido && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 align-middle">Abatido</span>}
        </span>
        {hp.atual != null && (
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
          <button onClick={() => setAddCond(v => !v)} className="text-fuchsia-400 hover:text-fuchsia-200 transition-colors shrink-0 text-xs border border-fuchsia-800/60 rounded px-1" title="Aplicar condição">cond</button>
        )}
        {isMestre && (
          <div className="flex flex-col leading-none shrink-0">
            <button onClick={() => onMover(c.id, -1)} disabled={!podeSubir} className="text-purple-500 hover:text-white disabled:opacity-20 transition-colors text-[10px]" title="Subir (desempate)">▲</button>
            <button onClick={() => onMover(c.id, +1)} disabled={!podeDescer} className="text-purple-500 hover:text-white disabled:opacity-20 transition-colors text-[10px]" title="Descer (desempate)">▼</button>
          </div>
        )}
        {isMestre && (
          <button onClick={() => onRemover(c.id)} className="text-red-800 hover:text-red-500 transition-colors shrink-0 text-sm" title="Remover do combate">✕</button>
        )}
      </div>

      {/* Controles de dano/cura (14.5) */}
      {podeAgir && hp.atual != null && (
        <div className="flex items-center gap-1.5 mt-1.5 pl-6">
          <input
            type="number"
            value={dc}
            onChange={e => setDc(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') aplicarHp(-1) }}
            placeholder="0"
            className="w-14 px-1.5 py-0.5 bg-purple-950 border border-purple-700 text-white text-center rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button onClick={() => aplicarHp(-1)} className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white text-xs rounded transition-colors" title="Aplicar dano">− Dano</button>
          <button onClick={() => aplicarHp(+1)} className="px-2 py-0.5 bg-green-800 hover:bg-green-700 text-white text-xs rounded transition-colors" title="Aplicar cura">＋ Cura</button>
          {/* F14.6 — aplicar o dano de poder pendente neste alvo */}
          {sugestaoDano && (
            <button
              onClick={() => onAplicarSugestao?.(c)}
              className="px-2 py-0.5 bg-amber-700 hover:bg-amber-600 text-white text-xs rounded transition-colors font-medium animate-pulse"
              title={`Aplicar ${sugestaoDano.valor} de dano${sugestaoDano.origem ? ` (${sugestaoDano.origem})` : ''} neste alvo`}
            >
              ⚔ −{sugestaoDano.valor}
            </button>
          )}
          {/* F22.6 — em vez de aplicar direto, pedir defesa ativa ao alvo */}
          {podePedirDefesa && (
            <button
              onClick={() => setPedindoDef(v => !v)}
              className="px-2 py-0.5 bg-sky-800 hover:bg-sky-700 text-white text-xs rounded transition-colors"
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
        />
      )}

      {/* F22.6 — controle do mestre p/ resolver (status + fallback) */}
      {dp && isMestre && (
        <ResolverDefesaControl combatente={c} onResolver={onResolverDefesa} onCancelar={onCancelarDefesa} />
      )}

      {/* F22.6 — o defensor já respondeu e espera o mestre resolver */}
      {dp && dp.resposta && souDefensor && !isMestre && (
        <p className="mt-1.5 ml-6 text-sky-400/80 text-[11px]">
          🛡 {dp.resposta.opcao_id === 'nao_reagir' ? 'Você não reagiu' : `${dp.resposta.opcao_nome} (${dp.resposta.defesa_total})`} — aguardando o mestre resolver…
        </p>
      )}

      {/* Chips de condições ativas */}
      {condsDoComb.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 pl-6">
          {condsDoComb.map(cond => {
            const rest = rodadasRestantes(cond, rodadaAtual)
            return (
              <span key={cond.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border bg-fuchsia-900/40 border-fuchsia-600/50 text-fuchsia-200" title={cond.descricao || cond.nome}>
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

  const inputCls = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="bg-slate-900/50 border border-purple-900/50 rounded-xl p-3 space-y-2">
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
        <button
          onClick={submit}
          disabled={busy || !nome.trim()}
          className="ml-auto px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          + Adicionar
        </button>
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
    isMestre || (c.ficha_id && cardsPorFicha[c.ficha_id]?.ficha?.dono_id === meuUserId)

  // F22.6 — defensor: o dono do alvo (jogador); o mestre responde pelos inimigos
  const souDefensor = c =>
    c.ficha_id
      ? cardsPorFicha[c.ficha_id]?.ficha?.dono_id === meuUserId
      : isMestre

  // Sem combate ativo
  if (!encontro) {
    if (!isMestre) return null
    return (
      <div className="mb-6 rounded-2xl border border-purple-800/60 bg-slate-800/40 px-5 py-4 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold leading-tight">⚔️ Combate</p>
          <p className="text-purple-400 text-xs">Inicie um encontro para rastrear iniciativa, turnos e condições.</p>
        </div>
        <button
          onClick={async () => { setBusy(true); setErro(''); try { await onIniciar() } catch (e) { setErro(e.message || 'Erro') } finally { setBusy(false) } }}
          disabled={busy}
          className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
        >
          {busy ? 'Iniciando...' : '⚔️ Iniciar combate'}
        </button>
        {erro && <p className="text-red-400 text-xs w-full">{erro}</p>}
      </div>
    )
  }

  const ausentes = fichasSessao.filter(f => !combatentes.some(c => c.ficha_id === f.id))

  // Ordem de iniciativa + combatente ativo (turno_atual é índice nessa ordem)
  const ordenados = ordenarPorIniciativa(combatentes)
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
          ⚔️ {encontro.titulo || 'Combate'}
        </span>
        <span className="text-white text-sm font-semibold">Rodada {encontro.rodada}</span>
        {ativo && (
          <span className="text-amber-300 text-xs">
            Vez de <span className="font-semibold">{ativo.nome}</span>
          </span>
        )}
        {isMestre && (
          <button
            onClick={async () => { setBusy(true); try { await onEncerrar() } finally { setBusy(false) } }}
            disabled={busy}
            className="ml-auto px-3 py-1.5 text-red-300 hover:text-white border border-red-800 hover:border-red-600 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Encerrar combate
          </button>
        )}
      </div>

      {/* Controles de turno (mestre) */}
      {isMestre && combatentes.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTurnoAnterior()}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-purple-200 text-sm rounded-lg transition-colors"
          >
            ◀ Anterior
          </button>
          <button
            onClick={() => onProximoTurno()}
            className="flex-1 px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Próximo turno ▶
          </button>
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
        <p className="text-purple-500 text-sm py-2">Nenhum combatente ainda. {isMestre && 'Adicione abaixo.'}</p>
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
            />
          ))}
        </div>
      )}

      {/* Rolar iniciativa de todos (mestre) */}
      {isMestre && combatentes.length > 0 && (
        <button
          onClick={async () => { setBusy(true); setErro(''); try { await onRolarIniciativaTodos() } catch (e) { setErro(e.message || 'Erro') } finally { setBusy(false) } }}
          disabled={busy}
          className="w-full py-1.5 text-xs bg-amber-800/70 hover:bg-amber-700 text-amber-100 rounded-lg transition-colors disabled:opacity-50"
        >
          🎲 Rolar iniciativa de todos
        </button>
      )}

      {/* Controles do mestre para adicionar */}
      {isMestre && (
        <div className="space-y-2 pt-1">
          <button
            onClick={async () => { setErro(''); try { await onAdicionarJogadores(ausentes) } catch (e) { setErro(e.message || 'Erro') } }}
            disabled={ausentes.length === 0}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-purple-200 hover:text-white text-sm rounded-lg transition-colors"
          >
            {ausentes.length === 0 ? 'Todos os personagens já estão no combate' : `+ Adicionar personagens da mesa (${ausentes.length})`}
          </button>
          <FormInimigo onAdicionar={onAdicionarInimigos} />
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
        </div>
      )}
    </div>
  )
}
