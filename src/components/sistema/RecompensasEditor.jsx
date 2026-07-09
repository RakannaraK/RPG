import { useState } from 'react'
import { useRecompensas } from '../../hooks/useRecompensas'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

/**
 * Fase 19.6 — CRUD das recompensas por nível do sistema.
 * São texto-guia ("Criar uma habilidade própria"); o app não aplica nada.
 */
export default function RecompensasEditor({ sistemaId, classes = [] }) {
  const { recompensas, criarRecompensa, removerRecompensa } = useRecompensas(sistemaId)
  const [nivel, setNivel] = useState('')
  const [classeId, setClasseId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function handleCriar() {
    setErro('')
    if (!titulo.trim()) { setErro('Informe o título da recompensa.'); return }
    if (nivel === '' || Number(nivel) < 1) { setErro('Informe um nível válido.'); return }
    setSalvando(true)
    try {
      await criarRecompensa({ classe_id: classeId || null, nivel, titulo, descricao })
      setTitulo(''); setDescricao(''); setNivel('')
    } catch (err) {
      setErro(err.message || 'Erro ao criar recompensa.')
    } finally {
      setSalvando(false)
    }
  }

  if (!sistemaId) return null

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Recompensas por nível</p>
      <p className="text-purple-500 text-xs">
        O que o personagem ganha ao chegar num nível. É um <span className="text-purple-300">checklist-guia</span>:
        o jogador aplica à mão (criar habilidade, subir atributo) e marca aqui. Deixe a classe em
        branco para valer no <span className="text-purple-300">nível total</span>.
      </p>

      {recompensas.length > 0 && (
        <div className="space-y-1.5">
          {recompensas.map(r => {
            const classe = r.classe_id ? classes.find(c => c.id === r.classe_id) : null
            return (
              <div key={r.id} className="flex items-start gap-2 bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
                <span className="text-amber-400 text-[11px] font-mono shrink-0 mt-0.5">
                  {classe ? `${classe.nome} ${r.nivel}` : `nv ${r.nivel}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-white text-xs block">{r.titulo}</span>
                  {r.descricao && <span className="text-purple-500 text-[11px] block">{r.descricao}</span>}
                </span>
                <button
                  onClick={() => removerRecompensa(r.id).catch(e => setErro(e.message))}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0"
                  title="Remover recompensa"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center border-t border-purple-900/50 pt-2">
        <select value={classeId} onChange={e => setClasseId(e.target.value)} className={INP} title="Classe (vazio = nível total)">
          <option value="">Nível total</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <input type="number" min={1} value={nivel} onChange={e => setNivel(e.target.value)}
          placeholder="Nv" className={`${INP} w-14 text-center`} />
        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
          placeholder="Ex: Criar uma habilidade própria" className={`${INP} flex-1 min-w-[12rem]`} />
        <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)}
          placeholder="Detalhe (opcional)" className={`${INP} flex-1 min-w-[10rem]`} />
        <button onClick={handleCriar} disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : '+ Adicionar'}
        </button>
      </div>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
