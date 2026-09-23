import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useUpdateFicha } from '../hooks/useFicha'
import { usePresencaSessao } from '../hooks/usePresencaSessao'
import { useCardsDaMesa } from '../hooks/useSessaoFichas'
import { useAvancarTurno } from '../hooks/useAvancarTurno'
import { useAplicarHp } from '../hooks/useAplicarHp'
import { useEncontro } from '../hooks/useEncontro'
import { useRolagem } from '../hooks/useRolagem'
import { calcularDescanso } from '../lib/restEngine'
import { planejarDefesa } from '../lib/defesaEngine'
import { aoUsarHabilidade } from '../lib/combateAvancado'
import { ordenarPorIniciativa } from '../lib/iniciativa'
import { marcar, curar } from '../lib/trackEngine'
import PresencaBar from '../components/sessao/PresencaBar'
import PainelFichas from '../components/sessao/PainelFichas'
import CombatePanel from '../components/sessao/CombatePanel'
import DescansoGrupo from '../components/sessao/DescansoGrupo'
import ConcederXpGrupo from '../components/sessao/ConcederXpGrupo'
import PainelDesafios from '../components/minigames/PainelDesafios'
import InvocarBestiario from '../components/bestiario/InvocarBestiario'
import FeedRolagens from '../components/dados/FeedRolagens'
import PainelChat from '../components/mesa/PainelChat'
import PainelNotas from '../components/mesa/PainelNotas'
import PainelCalendario from '../components/mesa/PainelCalendario'
import { useChatMesa } from '../hooks/useChatMesa'
import Sininho from '../components/notificacoes/Sininho'
import Ilustra from '../components/arte/Ilustra'
import Botao from '../components/ui/Botao'

/**
 * Fase 13 — tela da sessão ao vivo.
 *  13.2 — cabeçalho + presença (feito aqui)
 *  13.3 — painel de fichas em tempo real (placeholder abaixo)
 *  13.4 — feed compartilhado (placeholder abaixo)
 */
export default function SessaoPage() {
  const { id: mesaId, sessaoId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [sessao, setSessao] = useState(null)
  const [isMestre, setIsMestre] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sugestaoDano, setSugestaoDano] = useState(null) // F14.6 — dano de poder a aplicar num alvo

  const { conectados } = usePresencaSessao(sessaoId, mesaId)

  // Sistema da mesa + cards das fichas pelo motor (13.3; extraído p/ o mapa na 26.2)
  const { sistema, habilidades, atributos, cards, loading: loadingCards, error: erroCards, conectado } = useCardsDaMesa(mesaId)
  const camposCombate = sistema?.config_layout?.campos_combate || []
  const descansos = sistema?.config_layout?.descansos || []
  const defesaAtiva = sistema?.config_layout?.defesa_ativa || null // 22.6
  const progressaoModo = sistema?.config_layout?.progressao?.modo || 'nivel' // 25.5

  // Encontro de combate (Fase 14)
  const encontroApi = useEncontro(sessaoId, mesaId)
  const { registrarRolagem, registrarEvento } = useRolagem()
  const { updateFicha } = useUpdateFicha()
  // Aplica dano (delta<0) ou cura (delta>0) a um combatente (14.5); jogador → HP
  // da ficha (vida temp consumida antes), inimigo → HP do combatente. F32.3: é
  // um hook, porque a virada de turno (aqui e no mapa) aplica efeito contínuo.
  const handleAplicarHp = useAplicarHp({ cards, encontroApi, mesaId, sessaoId })

  // 14.4 + 20.5 + 32.3 — próximo turno com expiração de condições, custo por
  // turno, recarga/ultimate e dano/cura contínuos (extraído na 26.5 p/ o mapa)
  const { proximoTurno: handleProximoTurno, avisoTurno, setAvisoTurno } = useAvancarTurno({ encontroApi, cards, mesaId, sessaoId, aplicarHp: handleAplicarHp })

  // Iniciativa (14.2): 1d{padrão} + campo de combate cujo nome contenha "inici"
  const dadoPadrao = sistema?.config_layout?.dado_padrao || 20
  const campoIniciativa = camposCombate.find(c => /inici/i.test(c.nome || '')) || null
  // Campo de CA (para condições que afetam a CA, 14.4)
  const campoCa = camposCombate.find(cc => {
    const n = (cc.nome || '').trim().toLowerCase()
    return n === 'ca' || n.includes('armadura') || n.includes('defesa')
  }) || null

  async function handleRolarIniciativa(c) {
    let mod = 0
    if (c.ficha_id && campoIniciativa) {
      const card = cards.find(cd => cd.id === c.ficha_id)
      mod = Number(card?.combate?.[campoIniciativa.id]) || 0
    }
    const notacao = mod > 0 ? `1d${dadoPadrao}+${mod}` : mod < 0 ? `1d${dadoPadrao}${mod}` : `1d${dadoPadrao}`
    const res = await registrarRolagem({ mesaId, sessaoId, rotulo: `Iniciativa — ${c.nome}`, notacao })
    await encontroApi.atualizarCombatente(c.id, { iniciativa: res.total })
  }

  async function handleRolarIniciativaTodos() {
    for (const c of encontroApi.combatentes) {
      await handleRolarIniciativa(c)
    }
  }

  function handleSetIniciativa(id, val) {
    return encontroApi.atualizarCombatente(id, { iniciativa: val === '' ? null : Number(val) })
  }

  // Ordem de iniciativa dos combatentes (mesma dos turnos). Usada p/ achar quem
  // age agora (custo por turno 20.5; atacante da defesa ativa 22.6).
  const ordemIniciativa = () => ordenarPorIniciativa(encontroApi.combatentes)

  // ---- Defesa ativa (22.6) — fluxo assíncrono no combate ----
  // O mestre PEDE a defesa: grava o pedido no combatente-alvo (Realtime). O
  // atacante é quem age agora (turno atual). Consome o dano de poder pendente.
  async function handlePedirDefesa(alvo, { ataque, dano }) {
    const idx = encontroApi.encontro?.turno_atual ?? 0
    const atacante = ordemIniciativa()[idx] || null
    const pendente = {
      ataque: Number(ataque) || 0,
      dano: Number(dano) || 0,
      atacante_combatente_id: atacante && atacante.id !== alvo.id ? atacante.id : null,
      atacante_nome: atacante && atacante.id !== alvo.id ? atacante.nome : null,
      solicitado_em: new Date().toISOString(),
      resposta: null,
    }
    await encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: pendente })
    setSugestaoDano(null)
  }

  // O DEFENSOR responde: grava a escolha + total no PRÓPRIO combatente (mesma
  // permissão de definir a iniciativa). O mestre então resolve.
  async function handleResponderDefesa(alvo, resposta) {
    const dp = alvo.defesa_pendente
    if (!dp) return
    await encontroApi.atualizarCombatente(alvo.id, {
      defesa_pendente: { ...dp, resposta: { ...resposta, respondido_em: new Date().toISOString() } },
    })
  }

  // O MESTRE resolve: o motor puro decide dano/condição/narração; aqui só os
  // efeitos (HP, condição no atacante, feed). Sem resposta = dano cheio. Limpa.
  async function handleResolverDefesa(alvo) {
    const dp = alvo.defesa_pendente
    if (!dp) return
    const plano = planejarDefesa(dp, defesaAtiva || {}, alvo.nome)
    if (!plano) return

    if (plano.condicao) {
      try {
        await encontroApi.aplicarCondicao(plano.condicao.combatente_id, {
          nome: plano.condicao.nome, descricao: plano.condicao.descricao, duracaoRodadas: plano.condicao.duracao_rodadas,
        })
      } catch { /* RLS — segue sem a condição */ }
    }
    if (plano.danoFinal > 0) await handleAplicarHp(alvo, -plano.danoFinal, plano.narracao)
    else await registrarEvento({ mesaId, sessaoId, fichaId: alvo.ficha_id || null, rotulo: plano.narracao, notacao: '', total: 0, dados: [] })
    await encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: null })
  }

  const handleCancelarDefesa = (alvo) => encontroApi.atualizarCombatente(alvo.id, { defesa_pendente: null })

  // 22.7 — o dono liga/desliga uma condição manual (ex: CA situacional) direto na
  // sessão. Escreve no próprio (RLS ok); o Realtime recalcula o card.
  async function handleToggleCondicao(fichaId, modificadorId, novo) {
    try {
      await supabase.from('condicoes_manuais_ficha').upsert(
        { ficha_id: fichaId, modificador_id: modificadorId, ativa: novo },
        { onConflict: 'ficha_id,modificador_id' }
      )
    } catch { /* RLS/rede — silencioso, o card não muda */ }
  }

  // 24.2 — dano/cura do combate traduzidos para MARCAS quando a ficha tem uma
  // trilha que substitui a vida. O fluxo é o mesmo do F14.5 (não bifurca): o
  // controle do row chama isto em vez de HP. RLS: mestre marcar ficha alheia
  // exige política de UPDATE p/ gestor em trilhas_ficha (senão falha silenciosa).
  async function handleMarcarTrilha(c, tipoId, n) {
    const card = cards.find(cd => cd.id === c.ficha_id)
    const tv = card?.trilhaVida
    if (!tv || !n) return
    let marcas = tv.marcas
    const eventos = []
    for (let i = 0; i < n; i++) {
      const r = marcar(marcas, tipoId, tv.config)
      marcas = r.marcas
      eventos.push(...r.eventos)
    }
    try {
      const { error: err } = await supabase.from('trilhas_ficha')
        .upsert({ ficha_id: c.ficha_id, trilha_id: tv.id, marcas }, { onConflict: 'ficha_id,trilha_id' })
      if (err) throw err
    } catch { return /* RLS/rede — silencioso, igual ao HP (F14.5) */ }
    const tipoNome = (tv.config.tipos_marca || []).find(tm => tm.id === tipoId)?.nome || 'dano'
    await registrarEvento({
      mesaId, sessaoId, fichaId: c.ficha_id,
      rotulo: `${c.nome} sofreu ${n} de dano ${tipoNome.toLowerCase()}`,
      notacao: '', total: n, dados: [],
    })
    // Encheu do maior: anuncia e (se configurado) vira condição no combatente (F14)
    if (eventos.includes('encheu_do_maior') && tv.config.ao_encher_do_maior?.rotulo) {
      const enc = tv.config.ao_encher_do_maior
      await registrarEvento({
        mesaId, sessaoId, fichaId: c.ficha_id,
        rotulo: `${c.nome} — ${enc.rotulo}! (${tv.nome} cheia)`,
        notacao: '', total: 0, dados: [],
      })
      if (enc.aplica_condicao) {
        try {
          await encontroApi.aplicarCondicao(c.id, { nome: enc.rotulo, descricao: enc.descricao || null, duracaoRodadas: null })
        } catch { /* RLS — segue sem a condição */ }
      }
    }
  }

  // Cura N marcas, das MENOS severas primeiro (a mais recente de cada tipo)
  async function handleCurarTrilha(c, n) {
    const card = cards.find(cd => cd.id === c.ficha_id)
    const tv = card?.trilhaVida
    if (!tv || !n) return
    const tipos = [...(tv.config.tipos_marca || [])].sort((a, b) => (a.severidade || 0) - (b.severidade || 0))
    let marcas = tv.marcas
    let curadas = 0
    for (let i = 0; i < n; i++) {
      let ok = false
      for (const tm of tipos) {
        const r = curar(marcas, tm.id)
        if (r.curada) { marcas = r.marcas; ok = true; curadas++; break }
      }
      if (!ok) break
    }
    if (curadas === 0) return
    try {
      const { error: err } = await supabase.from('trilhas_ficha')
        .upsert({ ficha_id: c.ficha_id, trilha_id: tv.id, marcas }, { onConflict: 'ficha_id,trilha_id' })
      if (err) throw err
    } catch { return }
    await registrarEvento({
      mesaId, sessaoId, fichaId: c.ficha_id,
      rotulo: `${c.nome} recuperou ${curadas} caixinha${curadas === 1 ? '' : 's'} de ${tv.nome}`,
      notacao: '', total: curadas, dados: [],
    })
  }

  // F14.6 — dano de poder rolado por um jogador vira sugestão para o mestre lançar
  // num alvo do combate. Só o mestre; o próprio handleAplicarHp já registra no feed.
  function aoNovaRolagem(rolagem) {
    if (!isMestre || !sessao?.ativa) return
    const ap = rolagem?.resultados?.aplicavel
    if (ap?.tipo === 'dano' && Number(ap.valor) > 0) {
      setSugestaoDano({ valor: Number(ap.valor), origem: ap.origem || '', autor: rolagem.autor_nome || '' })
    }
  }

  async function aplicarSugestaoDano(combatente) {
    if (!sugestaoDano) return
    await handleAplicarHp(combatente, -sugestaoDano.valor)
    setSugestaoDano(null)
  }

  // Descanso do grupo (15.4): calcula e aplica por ficha; retorna resumo por personagem.
  // Requer RLS de UPDATE em fichas e habilidades_ficha para o mestre (senão só o próprio dono).
  async function handleDescansoGrupo(tipo) {
    const fichaIds = cards.map(c => c.id)
    let habsRows = []
    if (fichaIds.length) {
      const { data } = await supabase.from('habilidades_ficha').select('*').in('ficha_id', fichaIds)
      habsRows = data || []
    }
    const itens = []
    for (const card of cards) {
      const hfList = habsRows
        .filter(r => r.ficha_id === card.id)
        .map(r => ({ ...r, habilidade: habilidades.find(h => h.id === r.habilidade_id) || null }))
      const resultado = calcularDescanso({
        tipoDescanso: tipo,
        ficha: card.ficha,
        valoresFinais: { vida_max: card.hpMax },
        habilidadesFicha: hfList,
        // 17.5 — contexto p/ fórmulas do descanso (nível/vida; atributos não estão no card)
        contexto: {
          nivel: card.ficha?.nivel ?? 1,
          vida_atual: card.ficha?.hp_atual ?? 0,
          vida_max: card.hpMax ?? 0,
          atributos: {}, recursos: {},
          formulaModificador: sistema?.config_layout?.formula_modificador || '',
        },
      })
      const patch = { hp_atual: resultado.vida.para }
      if (resultado.vida_temp.para !== resultado.vida_temp.de) patch.vida_temp_atual = resultado.vida_temp.para
      try { await updateFicha(card.id, patch) } catch { /* RLS */ }
      for (const r of resultado.recursos) {
        try { await supabase.from('habilidades_ficha').update({ recurso_atual: r.para }).eq('id', r.habilidadeFichaId) } catch { /* RLS */ }
      }
      try {
        await supabase.from('descansos_log').insert({
          ficha_id: card.id, sessao_id: sessaoId, tipo_descanso: tipo.nome,
          recuperado: { vida: resultado.vida.recuperado, recursos: resultado.recursos },
        })
      } catch { /* log opcional */ }
      itens.push({ nome: card.nome, resumo: resultado.resumo })
    }
    await registrarEvento({
      mesaId, sessaoId,
      rotulo: `O grupo fez um ${tipo.nome} — todos recuperados`,
      notacao: '', total: 0, dados: [],
    })
    return itens
  }

  // 25.5 — conceder XP a todos os personagens da sessão (mestre; modo
  // xp_direto). Ganho de XP NÃO vai ao feed (decisão F19.3, mantida).
  // Best-effort por ficha: uma falha (RLS/rede) não impede as demais.
  async function handleConcederXpGrupo(quantidade, motivo) {
    const itens = []
    for (const card of cards) {
      try {
        const { error: err } = await supabase.rpc('adicionar_xp', { p_ficha_id: card.id, p_delta: quantidade })
        if (err) throw err
        try {
          await supabase.from('xp_log').insert({ ficha_id: card.id, tipo: 'ganho', quantidade, detalhe: { motivo: motivo || null } })
        } catch { /* RLS de ficha alheia — best-effort, mesma ressalva da 25.2 */ }
        itens.push({ nome: card.nome })
      } catch {
        itens.push({ nome: card.nome, erro: true })
      }
    }
    return itens
  }

  // Aba ativa no mobile (no desktop painel e feed aparecem lado a lado)
  const [abaMobile, setAbaMobile] = useState('fichas')
  // F29.2 — a lateral alterna entre rolagens e chat
  const [lateral, setLateral] = useState('feed')
  const chat = useChatMesa(mesaId, session?.user?.id)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setError('')
      try {
        const { data, error: err } = await supabase
          .from('sessoes')
          .select('*')
          .eq('id', sessaoId)
          .maybeSingle()
        if (err) throw err
        // RLS: não-membros não recebem a sessão
        if (!data) throw new Error('Sessão não encontrada ou você não tem acesso a ela.')
        setSessao(data)
        // Gestor = criador OU co-mestre (controles de combate/descanso) — Fase 16.5
        const { data: mesaData } = await supabase
          .from('mesas')
          .select('criador_id')
          .eq('id', mesaId)
          .maybeSingle()
        let gestor = mesaData?.criador_id === session.user.id
        if (!gestor) {
          const { data: membro } = await supabase
            .from('membros_mesa')
            .select('role')
            .eq('mesa_id', mesaId)
            .eq('usuario_id', session.user.id)
            .maybeSingle()
          gestor = membro?.role === 'co-mestre'
        }
        setIsMestre(gestor)
      } catch (err) {
        setError(err.message || 'Erro ao carregar sessão.')
      } finally {
        setLoading(false)
      }
    }
    if (session && sessaoId) carregar()
  }, [session, sessaoId, mesaId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando sessão...</div>
      </div>
    )
  }

  if (error || !sessao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Sessão não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      {/* Cabeçalho */}
      <header className="border-b border-purple-800 py-4 sticky top-0 z-20 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-4 flex-wrap">
          <Botao variante="fantasma" tamanho="sm" onClick={() => navigate(`/mesa/${mesaId}`)} className="shrink-0">
            ← Sair da sessão
          </Botao>
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {sessao.titulo || 'Sessão'}
            </h1>
            {sessao.ativa ? (
              <span className="inline-flex items-center gap-1.5 text-red-300 text-xs font-bold uppercase tracking-wider shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Ao vivo
              </span>
            ) : (
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider shrink-0">
                Encerrada
              </span>
            )}
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <button
              onClick={() => navigate(`/mesa/${mesaId}/mapa`, { state: { voltar: `/mesa/${mesaId}/sessao/${sessaoId}` } })}
              className="px-2.5 py-1.5 text-sm text-purple-200 hover:text-white bg-purple-900/50 hover:bg-purple-800/60 rounded-lg transition-colors"
              title="Abrir o mapa da mesa"
            >
              <Ilustra nome="mapa" tamanho={18} /> <span className="hidden sm:inline">Mapa</span>
            </button>
            <Sininho />
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                conectado ? 'text-emerald-300' : 'text-amber-300'
              }`}
              title={conectado ? 'Tempo real conectado' : 'Reconectando ao tempo real...'}
            >
              <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="hidden sm:inline">{conectado ? 'Conectado' : 'Reconectando…'}</span>
            </span>
            <PresencaBar conectados={conectados} meuId={session?.user?.id} />
          </div>
        </div>
      </header>

      {/* Corpo: painel de fichas + feed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* 20.5 — aviso ao mestre quando a cobrança de custo por turno falha */}
        {avisoTurno && (
          <div className="mb-4 rounded-xl border border-amber-700/70 bg-amber-950/40 px-4 py-3 flex items-start gap-3">
            <span className="text-amber-400 shrink-0">⚠</span>
            <p className="text-amber-200 text-sm flex-1">{avisoTurno}</p>
            <button
              onClick={() => setAvisoTurno('')}
              className="text-amber-500 hover:text-amber-200 transition-colors text-sm shrink-0"
              title="Dispensar"
            >
              ✕
            </button>
          </div>
        )}

        {!sessao.ativa && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-purple-300 text-sm">
            Esta sessão foi encerrada. Você está vendo o registro dela.
          </div>
        )}

        {/* Painel de combate (Fase 14) — só em sessão ativa */}
        {sessao.ativa && (
          <CombatePanel
            encontro={encontroApi.encontro}
            combatentes={encontroApi.combatentes}
            condicoes={encontroApi.condicoes}
            campoCaId={campoCa?.id || null}
            isMestre={isMestre}
            meuUserId={session?.user?.id}
            mesaId={mesaId}
            sessaoId={sessaoId}
            fichasSessao={cards}
            onIniciar={encontroApi.iniciarCombate}
            onEncerrar={encontroApi.encerrarCombate}
            onAdicionarJogadores={encontroApi.adicionarJogadores}
            onAdicionarInimigos={encontroApi.adicionarInimigos}
            onTrocarReserva={async (saiId, entraId) => {
              const narracao = await encontroApi.trocarReserva(saiId, entraId)
              await registrarEvento({ mesaId, sessaoId, rotulo: `⇄ ${narracao}`, notacao: '', total: 0, dados: [] })
            }}
            onDefinirReserva={encontroApi.definirReserva}
            onUsarHabilidadeReacao={async hf => {
              // F32.5 — a habilidade usada como reação entra em recarga / gasta a carga
              const patch = aoUsarHabilidade(hf, hf.habilidade || {})
              if (Object.keys(patch).length === 0) return
              await supabase.from('habilidades_ficha').update(patch).eq('id', hf.id)
            }}
            acoesBestiario={
              <InvocarBestiario
                mesaId={mesaId} meuId={session?.user?.id} isGestor={isMestre}
                camposCombate={camposCombate}
                nomesExistentes={encontroApi.combatentes.map(c => c.nome)}
                onInvocar={linhas => encontroApi.adicionarCombatentes(linhas)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-purple-200 hover:text-white text-sm rounded-lg transition-colors"
                rotulo={<span className="inline-flex items-center justify-center gap-2 w-full"><Ilustra nome="garra" tamanho={18} /> Invocar do bestiário</span>}
              />
            }
            onRemoverCombatente={encontroApi.removerCombatente}
            onRolarIniciativa={handleRolarIniciativa}
            onRolarIniciativaTodos={handleRolarIniciativaTodos}
            onSetIniciativa={handleSetIniciativa}
            onProximoTurno={handleProximoTurno}
            onTurnoAnterior={encontroApi.turnoAnterior}
            onAplicarCondicao={encontroApi.aplicarCondicao}
            onRemoverCondicao={encontroApi.removerCondicao}
            onAplicarHp={handleAplicarHp}
            onReordenar={encontroApi.reordenar}
            sugestaoDano={sugestaoDano}
            onAplicarSugestao={aplicarSugestaoDano}
            onLimparSugestao={() => setSugestaoDano(null)}
            defesaAtiva={defesaAtiva}
            atributosSistema={atributos || []}
            onPedirDefesa={handlePedirDefesa}
            onResponderDefesa={handleResponderDefesa}
            onResolverDefesa={handleResolverDefesa}
            onCancelarDefesa={handleCancelarDefesa}
            onMarcarTrilha={handleMarcarTrilha}
            onCurarTrilha={handleCurarTrilha}
          />
        )}

        {/* Descanso do grupo (Fase 15.4) — só mestre, sessão ativa, se houver descansos */}
        {sessao.ativa && isMestre && descansos.length > 0 && (
          <DescansoGrupo descansos={descansos} onDescansar={handleDescansoGrupo} />
        )}

        {/* Conceder XP ao grupo (25.5) — só mestre, sessão ativa, modo xp_direto */}
        {sessao.ativa && isMestre && progressaoModo === 'xp_direto' && (
          <ConcederXpGrupo onConceder={handleConcederXpGrupo} />
        )}

        {/* F29.4 — data da campanha (o mestre passa o tempo daqui) */}
        <PainelCalendario mesaId={mesaId} isGestor={isMestre && sessao.ativa} sessaoId={sessao.ativa ? sessaoId : null} recolhivel />

        {/* F29.3 — notas (o plano do mestre à mão durante a sessão) */}
        <details className="mb-6 rounded-xl border border-purple-900 bg-slate-900/60">
          <summary className="cursor-pointer px-4 py-3 text-purple-200 text-sm font-medium"><span className="inline-flex items-center gap-2 align-middle"><Ilustra nome="nota" tamanho={18} /> Notas</span></summary>
          <div className="px-4 pb-4">
            <PainelNotas mesaId={mesaId} meuId={session?.user?.id} />
          </div>
        </details>

        {/* F28.5 — desafios de minigame durante a sessão */}
        {sessao.ativa && (
          <details className="mb-6 rounded-xl border border-purple-900 bg-slate-900/60">
            <summary className="cursor-pointer px-4 py-3 text-purple-200 text-sm font-medium"><span className="inline-flex items-center gap-2 align-middle"><Ilustra nome="jogo" tamanho={18} /> Desafios de minigame</span></summary>
            <div className="px-4 pb-4">
              <PainelDesafios mesaId={mesaId} meuId={session?.user?.id} isGestor={isMestre} sessaoId={sessaoId} />
            </div>
          </details>
        )}

        {/* Abas — só no mobile */}
        <div className="flex lg:hidden gap-2 mb-4">
          <button
            onClick={() => setAbaMobile('fichas')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              abaMobile === 'fichas' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
            }`}
          >
            Personagens
          </button>
          {[['feed', 'Rolagens'], ['chat', 'Chat']].map(([valor, rotulo]) => (
            <button
              key={valor}
              onClick={() => { setAbaMobile('feed'); setLateral(valor) }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                abaMobile === 'feed' && lateral === valor ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'
              }`}
            >
              {rotulo}{valor === 'chat' && chat.naoLidas > 0 && lateral !== 'chat' ? ` (${chat.naoLidas})` : ''}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Painel de fichas (13.3) */}
          <div className={`flex-1 min-w-0 w-full ${abaMobile === 'fichas' ? 'block' : 'hidden'} lg:block`}>
            <p className="hidden lg:block text-purple-300 text-sm font-medium mb-3">Personagens na sessão</p>
            <PainelFichas
              cards={cards}
              camposCombate={camposCombate}
              loading={loadingCards}
              error={erroCards}
              meuUserId={session?.user?.id}
              onToggleCondicao={handleToggleCondicao}
            />
          </div>

          {/* Feed compartilhado (13.4) */}
          <aside className={`w-full lg:w-80 xl:w-96 shrink-0 ${abaMobile === 'feed' ? 'block' : 'hidden'} lg:block`}>
            <div className="hidden lg:flex gap-4 mb-3">
              {[['feed', sessao.ativa ? 'Rolagens' : 'Rolagens da sessão'], ['chat', 'Chat']].map(([valor, rotulo]) => (
                <button
                  key={valor} onClick={() => setLateral(valor)}
                  className={`text-sm font-medium transition-colors ${lateral === valor ? 'text-white' : 'text-purple-400 hover:text-purple-200'}`}
                >
                  {rotulo}
                  {valor === 'chat' && chat.naoLidas > 0 && lateral !== 'chat' && (
                    <span className="ml-1.5 inline-flex items-center justify-center text-xs font-bold bg-accent-500 text-ink rounded-full w-5 h-5">
                      {chat.naoLidas > 9 ? '9+' : chat.naoLidas}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {lateral === 'chat' && (
              <PainelChat chat={chat} mesaId={mesaId} meuId={session?.user?.id} isGestor={isMestre} sessaoId={sessao.ativa ? sessaoId : null} className="h-[70vh]" />
            )}
            {/* O feed fica montado escondido: continua avisando dano aplicável ao mestre */}
            <div className={lateral === 'chat' ? 'hidden' : ''}>
            {sessao.ativa ? (
              <FeedRolagens mesaId={mesaId} onNovaRolagem={aoNovaRolagem} />
            ) : (
              <FeedRolagens
                mesaId={mesaId}
                desde={sessao.iniciada_em}
                ate={sessao.encerrada_em}
                aoVivo={false}
              />
            )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
