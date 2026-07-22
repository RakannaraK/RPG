import { useState } from 'react'
import { validarCompra } from '../../lib/purchaseEngine'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-xs placeholder-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-500'

function tempo(ts) {
  return ts ? new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''
}

/**
 * Fase 25.2 — progressão por XP DIRETO na ficha. Sem nível: o XP disponível
 * (fichas.xp) fica em destaque; "Gastar XP" abre o fluxo categoria → alvo →
 * custo ao vivo → confirmar (+1 no alvo, débito e log — contrato 25.1).
 * Mestre/dono concedem XP com motivo. Histórico legível (xp_log).
 */
export default function PainelXpDireto({
  ficha, progressao, contextoFormula, isDono, souGestor, nomes = {},
  alvosDe,      // (categoria) => [{ id, nome, valor, fora? }]
  onConceder,   // (quantidade, motivo) => void
  onComprar,    // (categoria, alvo, validacao) => void
  log = [],
}) {
  const [aba, setAba] = useState(null) // null | 'gastar' | 'conceder' | 'historico'
  const [catId, setCatId] = useState('')
  const [alvoId, setAlvoId] = useState('')
  const [qtd, setQtd] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  const saldo = Math.max(0, Math.floor(Number(ficha.xp) || 0))
  const categorias = progressao?.categorias_compra || []
  const categoria = categorias.find(c => c.id === catId) || null
  const alvos = categoria ? (alvosDe?.(categoria) || []) : []
  const alvo = alvos.find(a => a.id === alvoId) || null
  const validacao = categoria && alvo
    ? validarCompra(categoria, alvo.valor, saldo, contextoFormula, { fora: !!alvo.fora })
    : null

  async function confirmarCompra() {
    if (!validacao?.permitida || busy) return
    setBusy(true)
    setErro('')
    try {
      await onComprar(categoria, alvo, validacao)
      setAlvoId('')
    } catch (e) { setErro(e.message || 'Erro na compra.') }
    finally { setBusy(false) }
  }

  async function confirmarConcessao() {
    const n = Math.floor(Number(qtd))
    if (!n || n <= 0 || busy) return
    setBusy(true)
    setErro('')
    try {
      await onConceder(n, motivo.trim())
      setQtd(''); setMotivo(''); setAba(null)
    } catch (e) { setErro(e.message || 'Erro ao conceder.') }
    finally { setBusy(false) }
  }

  // Linha legível do histórico
  function descreverLinha(l) {
    const d = l.detalhe || {}
    if (l.tipo === 'gasto' && d.para != null) {
      const nomeAlvo = nomes[d.alvo_id] || d.alvo_id || 'alvo'
      return `${nomeAlvo} ${d.de} → ${d.para}`
    }
    if (l.tipo === 'ganho') return d.motivo || 'XP concedido'
    return d.motivo || 'Ajuste'
  }

  return (
    <div className="bg-raised border border-dice-500/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <p className="text-dice-400 text-[11px] uppercase tracking-[.12em] font-medium">Experiência</p>
          <p className="text-ink font-bold text-3xl leading-tight">
            {saldo} <span className="text-dice-500/70 text-sm font-normal">XP disponível</span>
          </p>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          {isDono && categorias.length > 0 && (
            <button onClick={() => setAba(aba === 'gastar' ? null : 'gastar')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${aba === 'gastar' ? 'bg-dice-500 text-ink' : 'bg-dice-700 hover:bg-dice-500 text-ink'}`}>
              Gastar XP
            </button>
          )}
          {(isDono || souGestor) && (
            <button onClick={() => setAba(aba === 'conceder' ? null : 'conceder')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${aba === 'conceder' ? 'bg-accent-600 text-ink' : 'bg-hover hover:bg-accent-700 text-ink'}`}>
              + Conceder
            </button>
          )}
          <button onClick={() => setAba(aba === 'historico' ? null : 'historico')}
            className="px-3 py-1.5 text-sm rounded-lg border border-border text-accent-300 hover:text-ink hover:border-accent-500 transition-colors">
            Histórico
          </button>
        </div>
      </div>

      {/* Gastar: categoria → alvo → custo ao vivo → confirmar */}
      {aba === 'gastar' && (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={catId} onChange={e => { setCatId(e.target.value); setAlvoId('') }} className={INP}>
              <option value="">— categoria —</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nome || c.alvo}</option>)}
            </select>
            {categoria && (
              alvos.length > 0 ? (
                <select value={alvoId} onChange={e => setAlvoId(e.target.value)} className={INP}>
                  <option value="">— o quê? —</option>
                  {alvos.map(a => <option key={a.id} value={a.id}>{a.nome} ({a.valor}){a.fora ? ' — fora' : ''}</option>)}
                </select>
              ) : (
                <span className="text-ink-dim text-xs">Nenhum alvo disponível nesta categoria.</span>
              )
            )}
          </div>
          {alvo && validacao && (
            <div className="flex items-center gap-3 flex-wrap rounded-lg border border-border/60 bg-void/50 px-3 py-2">
              <span className="text-ink text-sm">
                {alvo.nome}: <span className="font-mono">{alvo.valor} → {validacao.novoValor}</span>
              </span>
              {validacao.custo != null && (
                <span className={`text-sm font-bold ${validacao.permitida ? 'text-dice-400' : 'text-harm'}`}>
                  {validacao.custo} XP
                </span>
              )}
              {validacao.permitida ? (
                <button onClick={confirmarCompra} disabled={busy}
                  className="ml-auto px-3 py-1 text-sm bg-dice-700 hover:bg-dice-500 disabled:opacity-50 text-ink rounded-lg transition-colors">
                  {busy ? '…' : 'Confirmar compra'}
                </button>
              ) : (
                <span className="ml-auto text-harm text-xs">{validacao.motivoBloqueio}</span>
              )}
            </div>
          )}
          <p className="text-ink-dim text-[11px]">Compra é definitiva (+1 por vez); correções só via ajuste do mestre.</p>
        </div>
      )}

      {/* Conceder XP (mestre/dono) com motivo */}
      {aba === 'conceder' && (
        <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-2">
          <input type="number" min={1} value={qtd} onChange={e => setQtd(e.target.value)} placeholder="XP" className={`${INP} w-20`} />
          <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="motivo (ex: Sessão 12)" className={`${INP} flex-1 min-w-[10rem]`} />
          <button onClick={confirmarConcessao} disabled={busy || !Number(qtd)}
            className="px-3 py-1.5 text-sm bg-accent-700 hover:bg-accent-600 disabled:opacity-50 text-ink rounded-lg transition-colors">
            Conceder
          </button>
        </div>
      )}

      {/* Histórico legível */}
      {aba === 'historico' && (
        <div className="border-t border-border/50 pt-2 space-y-1 max-h-64 overflow-y-auto">
          {log.length === 0 && <p className="text-ink-dim text-xs">Nenhum registro ainda.</p>}
          {log.map(l => (
            <div key={l.id} className="flex items-baseline gap-2 text-xs">
              <span className={`font-mono font-bold shrink-0 w-12 text-right ${l.quantidade >= 0 ? 'text-ok' : 'text-harm'}`}>
                {l.quantidade >= 0 ? `+${l.quantidade}` : l.quantidade}
              </span>
              <span className="text-ink flex-1 min-w-0 truncate">{descreverLinha(l)}</span>
              <span className="text-ink-dim shrink-0">{tempo(l.created_at)}</span>
            </div>
          ))}
        </div>
      )}

      {erro && <p className="text-harm text-xs">{erro}</p>}
    </div>
  )
}
