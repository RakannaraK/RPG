import { useState } from 'react'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'

/**
 * Fase 25.5 — conceder XP a todos os personagens da sessão de uma vez (só o
 * mestre), no modo de progressão xp_direto. Mesmo padrão do DescansoGrupo
 * (F15.4): confirmar, aplicar, resumo por personagem. Ganho de XP não vai ao
 * feed (decisão da F19.3, mantida).
 */
export default function ConcederXpGrupo({ onConceder }) {
  const [aberto, setAberto] = useState(false)
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState('')

  async function aplicar() {
    const n = Math.floor(Number(quantidade))
    if (!n || n <= 0) return
    setAplicando(true)
    setErro('')
    try {
      const itens = await onConceder(n, motivo.trim())
      setResumo({ quantidade: n, itens: itens || [] })
      setAberto(false)
      setQuantidade('')
      setMotivo('')
    } catch (e) {
      setErro(e.message || 'Erro ao conceder XP.')
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-800/50 bg-amber-950/20 px-5 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-amber-300 text-sm font-medium mr-1">💰 XP do grupo:</span>
        <button
          onClick={() => { setResumo(null); setAberto(true) }}
          className="px-3 py-1.5 bg-amber-800/70 hover:bg-amber-700 text-amber-50 text-sm rounded-lg transition-colors"
        >
          Conceder a todos
        </button>
      </div>

      {resumo && (
        <div className="mt-3 border-t border-amber-900/50 pt-2">
          <p className="text-amber-300 text-xs font-medium mb-1">+{resumo.quantidade} XP concedido:</p>
          <ul className="space-y-0.5">
            {resumo.itens.map((it, i) => (
              <li key={i} className="text-purple-300 text-xs">
                <span className="text-white">{it.nome}</span>{it.erro ? <span className="text-red-400"> — falhou</span> : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {aberto && (
        <Modal
          onFechar={() => setAberto(false)} bloqueado={aplicando} tamanho="sm"
          titulo="Conceder XP a todos?" subtitulo="Todos os personagens da mesa recebem a mesma quantidade de XP."
          rodape={
            <>
              <FecharModal disabled={aplicando} />
              <Botao variante="dado" onClick={aplicar} disabled={aplicando || !Number(quantidade)}>{aplicando ? 'Aplicando…' : 'Conceder XP'}</Botao>
            </>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="rotulo">Quantidade de XP</span>
              <input type="number" min={1} value={quantidade} onChange={e => setQuantidade(e.target.value)} autoFocus className="campo w-full" />
            </label>
            <label className="block">
              <span className="rotulo">Motivo <span className="text-ink-dim font-normal">(opcional)</span></span>
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: Sessão 12" className="campo w-full" />
            </label>
            {erro && <p className="aviso-erro" role="alert">{erro}</p>}
          </div>
        </Modal>
      )}
    </div>
  )
}
