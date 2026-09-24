import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRolagem } from '../../hooks/useRolagem'
import { resolverNotacaoFormula, validarNotacao } from '../../lib/diceNotation'
import { calcularValoresFinais } from '../../lib/modifierEngine'
import Botao from '../ui/Botao'

/**
 * Fase 22.6 — prompt de defesa ativa para o DEFENSOR (dono do alvo; o mestre
 * responde pelos inimigos). Rola a notação da reação (F17), resolvendo
 * `atributo(x)` etc. com o contexto da ficha, e devolve a escolha + total para
 * o mestre resolver a redução. Fallback: valor manual (inimigos sem atributos).
 */
export default function DefesaAtivaPrompt({
  combatente, card = null, config: configProp = null, atributosSistema = [],
  mesaId, sessaoId, onResponder,
  habilidadesProntas = [], onUsarHabilidade = null, // F32.5 — habilidade vs habilidade
}) {
  // O sistema pode ainda estar carregando (config = null): sem isto, uma defesa
  // pendente derrubava a página.
  const config = configProp || {}
  const { registrarRolagem, rolando } = useRolagem()
  const [baseAttrs, setBaseAttrs] = useState(null)
  const [erro, setErro] = useState('')
  const [manual, setManual] = useState('')
  const [opcaoManual, setOpcaoManual] = useState('')
  const [habEscolhida, setHabEscolhida] = useState('') // F32.5
  const [busy, setBusy] = useState(false)

  const opcoes = config.opcoes || []
  const fichaId = combatente.ficha_id || null

  // Atributos base da ficha (só p/ jogadores) — resolvem atributo(x) na notação
  useEffect(() => {
    if (!fichaId) { setBaseAttrs({}); return }
    let vivo = true
    supabase.from('valores_atributos').select('atributo_id, valor').eq('ficha_id', fichaId)
      .then(({ data }) => {
        if (!vivo) return
        const m = {}
        for (const v of data || []) m[v.atributo_id] = v.valor ?? 0
        setBaseAttrs(m)
      })
    return () => { vivo = false }
  }, [fichaId])

  // Contexto de fórmula: atributos finais (base+mods) por id E nome + o resto do card
  function montarContexto() {
    const finais = calcularValoresFinais(
      { atributos: baseAttrs || {}, vida_max: 0, combate: {} },
      card?.modificadoresAtivos || []
    )
    const atributos = {}
    for (const a of atributosSistema) {
      const v = finais.atributos[a.id]
      if (v != null) { atributos[a.id] = v; if (a.nome) atributos[a.nome] = v }
    }
    return { ...(card?.custosTurno?.contexto || {}), atributos }
  }

  /**
   * F32.5 — contra-ataque com rolagem: o defensor rola o dano do troco na hora
   * e ele vira "dano pendente" no feed, que o mestre aplica no atacante (F14.6).
   */
  async function rolarTroco() {
    const bruto = (config.contra_ataque?.notacao || '').trim()
    if (!bruto) return
    let resolvida
    try { resolvida = resolverNotacaoFormula(bruto, montarContexto()).notacao } catch { return }
    if (!validarNotacao(resolvida)) return
    await registrarRolagem({
      mesaId, sessaoId, fichaId,
      rotulo: `⚔ Contra-ataque de ${combatente.nome}`,
      notacao: resolvida,
    })
  }

  async function reagir(opcao, habilidade = null) {
    setErro('')
    setBusy(true)
    try {
      let resolvida
      try {
        resolvida = resolverNotacaoFormula(opcao.notacao || '', montarContexto()).notacao
      } catch (e) {
        setErro(`Não consegui resolver "${opcao.notacao}" (${e.message}). Use o valor manual.`)
        return
      }
      if (!validarNotacao(resolvida)) {
        setErro(`Notação inválida após resolver: "${resolvida}". Use o valor manual.`)
        return
      }
      const res = await registrarRolagem({
        mesaId, sessaoId, fichaId,
        rotulo: `${opcao.nome} — ${combatente.nome}`,
        notacao: resolvida,
      })
      await onResponder(combatente, {
        opcao_id: opcao.id,
        opcao_nome: habilidade ? `${habilidade.habilidade.nome} (${opcao.nome})` : opcao.nome,
        contra_ataque: !!opcao.contra_ataque, defesa_total: res.total,
      })
      // a habilidade usada como reação entra em recarga / gasta a carga
      if (habilidade && onUsarHabilidade) await onUsarHabilidade(habilidade)
      if (opcao.contra_ataque) await rolarTroco()
    } finally { setBusy(false) }
  }

  async function usarManual() {
    const v = Number(manual)
    if (Number.isNaN(v) || !opcaoManual) return
    const op = opcoes.find(o => o.id === opcaoManual)
    if (!op) return
    setBusy(true)
    try {
      await onResponder(combatente, {
        opcao_id: op.id, opcao_nome: op.nome,
        contra_ataque: !!op.contra_ataque, defesa_total: v,
      })
    } finally { setBusy(false) }
  }

  async function naoReagir() {
    setBusy(true)
    try {
      await onResponder(combatente, {
        opcao_id: 'nao_reagir', opcao_nome: 'Não reagir', contra_ataque: false, defesa_total: null,
      })
    } finally { setBusy(false) }
  }

  const dp = combatente.defesa_pendente || {}
  const trabalhando = busy || rolando

  return (
    <div className="mt-1.5 ml-6 rounded-lg border border-sky-600/60 bg-sky-950/40 p-2.5 space-y-2">
      <p className="text-sky-200 text-xs">
        🛡 <span className="font-semibold">{combatente.nome}</span> sob ataque
        {dp.atacante_nome ? ` de ${dp.atacante_nome}` : ''}
        {dp.ataque != null ? ` (acerto ${dp.ataque})` : ''} — dano <span className="font-bold">{dp.dano}</span>. Reagir?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opcoes.map(o => (
          <button
            key={o.id}
            onClick={() => reagir(o)}
            disabled={trabalhando}
            className="px-2 py-1 text-xs bg-sky-800 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            title={o.notacao}
          >
            {o.contra_ataque ? '⚔ ' : '🎲 '}{o.nome}
          </button>
        ))}
        {habilidadesProntas.length > 0 && opcoes.length > 0 && (
          <span className="flex items-center gap-1.5">
            <select
              value={habEscolhida} onChange={e => setHabEscolhida(e.target.value)}
              className="px-1.5 py-1 rounded-lg bg-void border border-border text-white text-xs"
              aria-label="Responder com habilidade"
            >
              <option value="">com habilidade…</option>
              {habilidadesProntas.map(hf => <option key={hf.id} value={hf.id}>{hf.habilidade?.nome}</option>)}
            </select>
            <button
              onClick={() => {
                const hf = habilidadesProntas.find(h => h.id === habEscolhida)
                const op = opcoes.find(o => o.id === opcaoManual) || opcoes[0]
                if (hf && op) reagir(op, hf)
              }}
              disabled={trabalhando || !habEscolhida}
              className="px-2 py-1 text-xs bg-dice-700 hover:bg-dice-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              title="Usa a habilidade como reação: rola a reação e a habilidade entra em recarga"
            >✨ Usar</button>
          </span>
        )}
        <Botao variante="secundario" tamanho="sm"
          onClick={naoReagir}
          disabled={trabalhando} className="text-slate-200">
          Não reagir
        </Botao>
      </div>
      {erro && (
        <div className="space-y-1">
          <p className="text-amber-400 text-xs">{erro}</p>
          <div className="flex items-center gap-1.5">
            <select value={opcaoManual} onChange={e => setOpcaoManual(e.target.value)}
              className="px-1.5 py-1 rounded-lg bg-void border border-border text-white text-xs">
              <option value="">reação…</option>
              {opcoes.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
            </select>
            <input type="number" value={manual} onChange={e => setManual(e.target.value)}
              placeholder="defesa" className="w-20 px-1.5 py-1 rounded-lg bg-void border border-border text-white text-xs text-center" />
            <button onClick={usarManual} disabled={trabalhando || !opcaoManual || manual === ''}
              className="px-2 py-1 text-xs bg-sky-800 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg transition-colors">
              usar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
