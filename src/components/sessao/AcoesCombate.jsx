import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useItens } from '../../hooks/useItens'
import { useRolagem } from '../../hooks/useRolagem'
import { validarNotacao, resolverNotacao } from '../../lib/diceNotation'
import { montarNotacaoComModificadores } from '../../lib/rollModifiers'
import { calcularValoresFinais } from '../../lib/modifierEngine'
import { resolverAcertos } from '../../lib/alvosCombate'
import Botao from '../ui/Botao'
import ModalAplicarResultado from './ModalAplicarResultado'

/**
 * Fase 14.6 + 53 — ações do combatente da vez. Armas da ficha (14.6) e "ação
 * livre" para quem não tem arma (inimigo, NPC). Alvo: único, vários ou área
 * (o mapa devolve os ids em `alvosArea`). Com alvos, o dano abre o modal de
 * resultado: ataque x defesa por alvo e barras afetadas.
 */
const MODOS = [['unico', 'Único'], ['varios', 'Vários'], ['area', 'Área']]
const campo = 'w-full px-2 py-1 rounded-lg bg-void border border-border text-ink text-xs focus:outline-none focus:ring-1 focus:ring-accent-500'

export default function AcoesCombate({
  fichaId = null, nome, modificadoresAtivos = [], combateFinais = {}, hpMax = 0,
  mesaId, sessaoId, combatentes = [], cardsPorFicha = {}, defesaDe,
  onAplicarEmAlvos, onEscolherArea = null, alvosArea = [], unidadeArea = 'm',
}) {
  const { itens } = useItens(fichaId)
  const { registrarRolagem } = useRolagem()
  const [baseAttrs, setBaseAttrs] = useState({})
  const [modoAlvo, setModoAlvo] = useState('unico')
  const [alvoId, setAlvoId] = useState('')
  const [marcados, setMarcados] = useState([])
  const [raio, setRaio] = useState('3')
  const [ataques, setAtaques] = useState({}) // chave (item.id | 'livre') → total do último ataque
  const [livre, setLivre] = useState({ rotulo: '', ataque: '', dano: '' })
  const [modal, setModal] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!fichaId) return undefined
    let ativo = true
    supabase
      .from('valores_atributos')
      .select('atributo_id, valor')
      .eq('ficha_id', fichaId)
      .then(({ data }) => {
        if (!ativo) return
        const m = {}
        for (const v of data || []) m[v.atributo_id] = v.valor ?? 0
        setBaseAttrs(m)
      })
    return () => { ativo = false }
  }, [fichaId])

  // Atributos finais (base + mods) para resolver @tokens; combate vem do card
  const finais = calcularValoresFinais({ atributos: baseAttrs, vida_max: 0, combate: {} }, modificadoresAtivos)
  const valoresFinais = { atributos: finais.atributos, combate: combateFinais, vida_max: hpMax }

  const armas = fichaId ? itens.filter(i => i.tipo === 'arma' || i.atributos_extras?.ataque || i.atributos_extras?.dano) : []
  const emJogo = combatentes.filter(c => !c.reserva)

  const idsAlvo = modoAlvo === 'unico' ? (alvoId ? [alvoId] : []) : modoAlvo === 'varios' ? marcados : alvosArea
  const alvosEscolhidos = emJogo.filter(c => idsAlvo.includes(c.id))
  const acertosDe = ataque => {
    const r = resolverAcertos({ ataque, alvos: alvosEscolhidos, defesaDe })
    return r.map(a => ({ ...a, c: alvosEscolhidos.find(c => c.id === a.id) }))
  }

  // Rola e devolve o total (ou null se a notação não presta / o servidor recusou)
  async function rolarNotacao(rotulo, notacao, extra = {}) {
    setErro('')
    try {
      const res = await registrarRolagem({ mesaId, sessaoId, fichaId, rotulo, notacao, ...extra })
      return res.total
    } catch (e) {
      setErro(e.message || 'Não foi possível rolar.')
      return null
    }
  }

  async function rolarArma(item, tipo) {
    const base = resolverNotacao(item.atributos_extras?.[tipo], valoresFinais)
    if (!validarNotacao(base)) return
    const { notacaoFinal, percentual } = montarNotacaoComModificadores({
      tipo: tipo === 'ataque' ? 'acerto' : 'dano',
      notacaoBase: base,
      categoria: item.atributos_extras?.categoria || null,
      modificadoresAtivos,
    })
    const total = await rolarNotacao(`${item.nome} — ${tipo === 'ataque' ? 'Ataque' : 'Dano'}`, notacaoFinal, { percentual })
    if (total == null) return
    if (tipo === 'ataque') setAtaques(a => ({ ...a, [item.id]: total }))
    else abrirModal(item.nome, total, 'dano', ataques[item.id] ?? null)
  }

  async function rolarLivre(modo) {
    const nomeAcao = livre.rotulo.trim() || 'Ação livre'
    let ataque = null
    if (livre.ataque.trim()) {
      ataque = await rolarNotacao(`${nomeAcao} — Ataque`, livre.ataque.trim())
      if (ataque == null) return
      setAtaques(a => ({ ...a, livre: ataque }))
    }
    if (!livre.dano.trim()) return
    const total = await rolarNotacao(`${nomeAcao} — ${modo === 'cura' ? 'Cura' : 'Dano'}`, livre.dano.trim())
    if (total != null) abrirModal(nomeAcao, total, modo, modo === 'cura' ? null : ataque)
  }

  function abrirModal(rotulo, valor, modo, ataque) {
    if (alvosEscolhidos.length === 0) return // sem alvo = só rolar
    setModal({ rotulo: `${nome}: ${rotulo}`, valor, modo, ataque, alvos: acertosDe(ataque) })
  }

  const selos = ataque => ataque != null && alvosEscolhidos.length > 0 && (
    <p className="text-xs text-ink-dim w-full">
      Ataque {ataque}:{' '}
      {acertosDe(ataque).map(a => (
        <span key={a.id} className={`mr-2 ${a.acertou ? 'text-ok' : 'text-harm'}`}>{a.c.nome} {a.acertou ? 'acerta' : 'erra'}</span>
      ))}
    </p>
  )

  return (
    <div className="space-y-3">
      {/* Alvos */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-ink-dim text-xs mr-1">Alvos:</span>
          {MODOS.filter(([m]) => m !== 'area' || onEscolherArea).map(([m, rot]) => (
            <button
              key={m} type="button" onClick={() => setModoAlvo(m)}
              className={`px-2.5 py-1 min-h-[24px] text-xs rounded-lg transition-colors ${modoAlvo === m ? 'bg-accent-600 text-sobre-acento' : 'bg-hover text-ink hover:bg-border'}`}
            >{rot}</button>
          ))}
        </div>
        {modoAlvo === 'unico' && (
          <select value={alvoId} onChange={e => setAlvoId(e.target.value)} className={campo} aria-label="Alvo">
            <option value="">Nenhum (só rolar)</option>
            {emJogo.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {modoAlvo === 'varios' && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {emJogo.map(c => (
              <label key={c.id} className="flex items-center gap-1.5 min-h-[24px] text-ink text-xs">
                <input
                  type="checkbox" checked={marcados.includes(c.id)}
                  onChange={() => setMarcados(m => (m.includes(c.id) ? m.filter(x => x !== c.id) : [...m, c.id]))}
                />
                {c.nome}
              </label>
            ))}
          </div>
        )}
        {modoAlvo === 'area' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 text-ink-dim text-xs">
                Raio
                <input type="number" min="0" step="any" value={raio} onChange={e => setRaio(e.target.value)} className={`${campo} w-16`} />
                {unidadeArea}
              </label>
              <Botao variante="secundario" tamanho="sm" onClick={() => onEscolherArea(Number(raio) || 0)} disabled={!(Number(raio) > 0)}>
                Marcar no mapa
              </Botao>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {alvosEscolhidos.length === 0
                ? <span className="text-ink-dim text-xs">Nenhum alvo marcado.</span>
                : alvosEscolhidos.map(c => <span key={c.id} className="text-xs px-2 py-0.5 rounded-full border border-border text-ink">{c.nome}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Armas da ficha (14.6) */}
      {armas.map(item => {
        const temAtaque = item.atributos_extras?.ataque
        const temDano = item.atributos_extras?.dano
        return (
          <div key={item.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-ink text-sm flex-1 min-w-0 truncate">{item.nome}</span>
            {temAtaque && <Botao variante="dado" tamanho="sm" onClick={() => rolarArma(item, 'ataque')}>🎲 Ataque</Botao>}
            {temDano && <Botao variante="perigo" tamanho="sm" onClick={() => rolarArma(item, 'dano')}>💥 Dano</Botao>}
            {selos(ataques[item.id])}
          </div>
        )
      })}
      {fichaId && armas.length === 0 && (
        <p className="text-ink-dim text-xs">
          {nome} não tem armas cadastradas (itens com <span className="font-mono">ataque</span>/<span className="font-mono">dano</span>) — use a ação livre.
        </p>
      )}

      {/* Ação livre (53): NPC, criatura, qualquer coisa sem arma */}
      <div className="rounded-lg border border-border bg-void p-2 space-y-1.5">
        <p className="text-ink-dim text-xs font-semibold">Ação livre</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          <input value={livre.rotulo} onChange={e => setLivre(l => ({ ...l, rotulo: e.target.value }))} placeholder="Nome da ação" className={campo} aria-label="Nome da ação" />
          <input value={livre.ataque} onChange={e => setLivre(l => ({ ...l, ataque: e.target.value }))} placeholder="Ataque (opcional) 1d20+5" className={campo} aria-label="Notação de ataque" />
          <input value={livre.dano} onChange={e => setLivre(l => ({ ...l, dano: e.target.value }))} placeholder="Dano/cura 2d6+3" className={campo} aria-label="Notação de dano ou cura" />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Botao variante="perigo" tamanho="sm" onClick={() => rolarLivre('dano')} disabled={!livre.dano.trim()}>💥 Dano</Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => rolarLivre('cura')} disabled={!livre.dano.trim()}>＋ Cura</Botao>
          {selos(ataques.livre)}
        </div>
      </div>

      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}

      {modal && (
        <ModalAplicarResultado
          rotulo={modal.rotulo} valorInicial={modal.valor} modoInicial={modal.modo} ataque={modal.ataque}
          alvos={modal.alvos} cardsPorFicha={cardsPorFicha} area={modoAlvo === 'area'}
          onAplicar={onAplicarEmAlvos} onFechar={() => setModal(null)}
        />
      )}
    </div>
  )
}
