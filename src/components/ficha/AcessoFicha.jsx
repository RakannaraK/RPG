import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import { acessoDaFicha, colunasDeAcesso } from '../../lib/permissoesFicha'

const INP = 'w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const PAPEL = { mestre: 'mestre', 'co-mestre': 'co-mestre', jogador: 'jogador', espectador: 'espectador' }

/**
 * Fase 30.2 — pasta, privacidade e acesso por membro de UMA ficha.
 * `podeCompartilhar` (dono ou gestor) libera privacidade e acesso; o editor só
 * muda a pasta. O banco confere tudo de novo (RLS + gatilho).
 */
export default function AcessoFicha({ ficha, mesaId, podeCompartilhar, onSalvar, onFechar }) {
  const { membros } = useMembrosMesa(mesaId)
  const [pasta, setPasta] = useState(ficha.pasta || '')
  const [privada, setPrivada] = useState(!!ficha.privada)
  const [acesso, setAcesso] = useState(() => acessoDaFicha(ficha))
  const [pastas, setPastas] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  // Pastas já usadas na mesa, para sugerir
  useEffect(() => {
    let ativo = true
    supabase.from('fichas').select('pasta').eq('mesa_id', mesaId).not('pasta', 'is', null).then(({ data }) => {
      if (ativo) setPastas([...new Set((data || []).map(f => f.pasta))].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    })
    return () => { ativo = false }
  }, [mesaId])

  useEffect(() => {
    const aoTeclar = e => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onFechar])

  async function salvar() {
    setSalvando(true); setErro('')
    try {
      await onSalvar({
        pasta: pasta.trim() || null,
        ...(podeCompartilhar ? { privada, ...colunasDeAcesso(acesso, ficha.dono_id) } : {}),
      })
      onFechar()
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar.')
      setSalvando(false)
    }
  }

  const outros = membros.filter(m => m.usuario_id !== ficha.dono_id)

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        role="dialog" aria-modal="true" aria-label="Acesso e pasta"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-border bg-bg p-5 space-y-5 shadow-2xl"
      >
        <h2 className="text-ink text-lg font-bold">Acesso e pasta — {ficha.nome_personagem}</h2>

        <label className="block space-y-1">
          <span className="text-ink-dim text-xs">Pasta (vazio = sem pasta)</span>
          <input value={pasta} onChange={e => setPasta(e.target.value)} maxLength={60} list="pastas-da-mesa" placeholder="Ex.: Heróis, Vilões, Aliados" className={INP} />
          <datalist id="pastas-da-mesa">{pastas.map(p => <option key={p} value={p} />)}</datalist>
        </label>

        {podeCompartilhar ? (
          <>
            <div className="space-y-2">
              <p className="text-ink-dim text-xs">Quem vê a ficha</p>
              {[[false, '👥 Pública', 'Toda a mesa vê.'], [true, '🔒 Privada', 'Só você, o mestre e quem você liberar abaixo.']].map(([valor, rotulo, dica]) => (
                <label key={rotulo} className={`flex items-start gap-3 rounded-xl border px-3 py-2 cursor-pointer ${privada === valor ? 'border-accent-500 bg-hover' : 'border-border'}`}>
                  <input type="radio" name="privada" checked={privada === valor} onChange={() => setPrivada(valor)} className="mt-1" />
                  <span><span className="text-ink text-sm font-medium block">{rotulo}</span><span className="text-ink-dim text-xs">{dica}</span></span>
                </label>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-ink-dim text-xs">Acesso por pessoa</p>
              {outros.length === 0 && <p className="text-ink-dim text-xs italic">Ninguém mais na mesa.</p>}
              <ul className="space-y-1.5">
                {outros.map(m => (
                  <li key={m.usuario_id} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate text-ink text-sm">{m.nome} <span className="text-ink-dim text-xs">· {PAPEL[m.role] || m.role}</span></span>
                    <select
                      value={acesso[m.usuario_id] || 'nenhum'}
                      onChange={e => setAcesso(a => ({ ...a, [m.usuario_id]: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm"
                      aria-label={`Acesso de ${m.nome}`}
                    >
                      <option value="nenhum">{m.role === 'mestre' || m.role === 'co-mestre' ? 'Vê (é mestre)' : privada ? 'Não vê' : 'Vê (pública)'}</option>
                      <option value="ver">Pode ver</option>
                      {m.role !== 'espectador' && <option value="editar">Pode editar</option>}
                    </select>
                  </li>
                ))}
              </ul>
              <p className="text-ink-dim text-xs">Quem edita mexe em tudo como você, menos apagar a ficha e mudar o acesso.</p>
            </div>
          </>
        ) : (
          <p className="text-ink-dim text-xs">Só o dono da ficha ou o mestre mudam quem vê e quem edita.</p>
        )}

        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="px-4 py-2 rounded-lg bg-hover text-ink text-sm hover:bg-border">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando} className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-semibold">
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
