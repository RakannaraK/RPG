import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import PainelBestiario from './PainelBestiario'
import { defesaSugerida } from '../../lib/invocacao'
import { invocarCriatura, valoresCombateDaCriatura } from '../../lib/invocarBanco'
import { tocarPresetAcao } from '../../audio/actionSynth'
import { usePreferencias } from '../../context/PreferenciasContext'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-1 focus:ring-accent-500'
const TIPOS = [['inimigo', 'Inimigo'], ['aliado', 'Aliado'], ['npc', 'NPC']]

/** Diálogo de uma invocação: quantos, de que lado, vida, defesa, ficha própria. */
function Dialogo({ criatura, camposCombate, comMapa, onConfirmar, onFechar }) {
  const [quantidade, setQuantidade] = useState(1)
  const [tipo, setTipo] = useState('inimigo')
  const [vida, setVida] = useState(criatura.hp_maximo ?? '')
  const [defesa, setDefesa] = useState('')
  const [dicaDefesa, setDicaDefesa] = useState('')
  const [fichaPropria, setFichaPropria] = useState(false)
  const [noMapa, setNoMapa] = useState(comMapa)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true
    valoresCombateDaCriatura(criatura.id).then(valores => {
      const d = defesaSugerida(valores, camposCombate)
      if (!ativo || !d) return
      setDefesa(String(d.valor))
      setDicaDefesa(`da ficha: ${d.nome}`)
    })
    return () => { ativo = false }
  }, [criatura.id, camposCombate])

  async function confirmar() {
    setOcupado(true); setErro('')
    try {
      await onConfirmar({ quantidade, tipo, vida, defesa, fichaPropria, noMapa })
      onFechar()
    } catch (e) {
      setErro(e.message || 'Não foi possível invocar.')
      setOcupado(false)
    }
  }

  return (
    <div className="rounded-xl border border-accent-600 bg-void p-3 space-y-3">
      <p className="text-ink font-semibold text-sm">Invocar {criatura.nome_personagem}</p>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-ink-dim text-xs space-y-1">Quantos
          <input type="number" min={1} value={quantidade} onChange={e => setQuantidade(e.target.value)} className={`${INP} w-20 block`} />
        </label>
        <label className="text-ink-dim text-xs space-y-1">Lado
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={`${INP} block`}>
            {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select>
        </label>
        <label className="text-ink-dim text-xs space-y-1">Vida de cada um
          <input type="number" value={vida} onChange={e => setVida(e.target.value)} placeholder="—" className={`${INP} w-24 block`} />
        </label>
        <label className="text-ink-dim text-xs space-y-1">Defesa {dicaDefesa && <span className="text-ink-dim">({dicaDefesa})</span>}
          <input type="number" value={defesa} onChange={e => setDefesa(e.target.value)} placeholder="—" className={`${INP} w-24 block`} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-xs text-ink">
        <input type="checkbox" checked={fichaPropria} onChange={e => setFichaPropria(e.target.checked)} className="mt-0.5" />
        <span>Cada um com <b>ficha própria</b> (boss/NPC importante): ganha uma cópia da ficha, com recursos e habilidades só dele.</span>
      </label>
      {comMapa && (
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" checked={noMapa} onChange={e => setNoMapa(e.target.checked)} />
          <span>Pôr token na cena do mapa</span>
        </label>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className="px-3 py-1.5 rounded-lg bg-hover text-ink text-sm hover:bg-border">Cancelar</button>
        <button type="button" onClick={confirmar} disabled={ocupado} className="px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-semibold">
          {ocupado ? 'Invocando…' : '⚔ Invocar'}
        </button>
      </div>
    </div>
  )
}

/**
 * Fase 31.2 — botão "Bestiário" que abre a lista e invoca no combate (e no mapa).
 * `onInvocar(linhas, { criatura, noMapa })` recebe as linhas de combatente
 * prontas e decide o que fazer com elas (sessão insere no encontro; o mapa
 * insere e ainda cria os tokens).
 */
export default function InvocarBestiario({ mesaId, meuId, isGestor, camposCombate = [], nomesExistentes = [], comMapa = false, onInvocar, rotulo = '🐾 Bestiário', className = '' }) {
  const { preferencias } = usePreferencias()
  const [aberto, setAberto] = useState(false)
  const [criatura, setCriatura] = useState(null)
  const [aviso, setAviso] = useState('')

  async function confirmar(opcoes) {
    const linhas = await invocarCriatura({ criatura, mesaId, meuId, nomesExistentes, ...opcoes })
    await onInvocar(linhas, { criatura, noMapa: opcoes.noMapa })
    if (criatura.som_preset) tocarPresetAcao(criatura.som_preset, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume })
    setAviso(`${linhas.length > 1 ? `${linhas.length} × ` : ''}${criatura.nome_personagem} ${linhas.length > 1 ? 'entraram' : 'entrou'} no combate.`)
    setCriatura(null)
    setTimeout(() => setAviso(''), 4000)
  }

  return (
    <>
      <button
        type="button" onClick={() => setAberto(true)}
        className={className || 'px-3 py-1.5 rounded-lg bg-hover text-ink text-sm hover:bg-border transition-colors'}
        title="Invocar criatura do bestiário"
      >{rotulo}</button>

      {aberto && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-start justify-center p-4 overflow-y-auto" onClick={() => { setAberto(false); setCriatura(null) }}>
          <div
            role="dialog" aria-modal="true" aria-label="Bestiário" onClick={e => e.stopPropagation()}
            className="w-full max-w-4xl my-8 rounded-2xl border border-border bg-bg p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-ink text-lg font-bold">🐾 Bestiário</h2>
              <button type="button" onClick={() => { setAberto(false); setCriatura(null) }} className="text-ink-dim hover:text-ink px-2">✕</button>
            </div>
            {aviso && <p className="text-emerald-300 text-sm">{aviso}</p>}
            {criatura && (
              <Dialogo criatura={criatura} camposCombate={camposCombate} comMapa={comMapa} onConfirmar={confirmar} onFechar={() => setCriatura(null)} />
            )}
            <PainelBestiario
              mesaId={mesaId} meuId={meuId} isGestor={isGestor} podeEscrever={isGestor}
              onAbrir={id => window.open(`/mesa/${mesaId}/ficha/${id}`, '_blank')}
              acoesExtras={c => (
                <button
                  type="button" onClick={() => setCriatura(c)}
                  className="flex-1 py-1.5 text-dice-300 hover:text-white hover:bg-purple-900/40 transition-colors"
                  title="Invocar no combate"
                >⚔</button>
              )}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
