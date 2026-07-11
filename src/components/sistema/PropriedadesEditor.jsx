import { useState } from 'react'
import { usePropriedades } from '../../hooks/usePropriedades'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

/** Texto curto do efeito mecânico de uma propriedade. */
function descreverEfeito(cfg) {
  if (!cfg) return null
  const alvo = cfg.tipo === 'dano' ? 'dano' : 'acerto'
  const partes = []
  if (cfg.percentual_rolagem) partes.push(`+${cfg.percentual_rolagem}%`)
  if (cfg.dados_extras) partes.push(`+${cfg.dados_extras}`)
  if (cfg.valor) partes.push(`+${cfg.valor}`)
  return partes.length ? `${alvo}: ${partes.join(' ')}` : null
}

/**
 * Fase 21.4 — CRUD de propriedades desbloqueáveis por maestria.
 * Efeito mecânico opcional e simples (percentual/dados/bônus em acerto ou dano).
 */
export default function PropriedadesEditor({ sistemaId, categorias = [] }) {
  const { propriedades, criarPropriedade, removerPropriedade } = usePropriedades(sistemaId)
  const [f, setF] = useState({ nome: '', sigla: '', descricao: '', maestria_minima: '', categoria_id: '' })
  const [temEfeito, setTemEfeito] = useState(false)
  const [efeito, setEfeito] = useState({ tipo: 'dano', percentual_rolagem: '', dados_extras: '', valor: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const set = patch => setF(prev => ({ ...prev, ...patch }))

  async function adicionar() {
    setErro('')
    if (!f.nome.trim()) { setErro('Informe o nome da propriedade.'); return }
    if (!f.descricao.trim()) { setErro('Descreva a regra da propriedade.'); return }
    let modificador_config = null
    if (temEfeito) {
      modificador_config = {
        tipo: efeito.tipo,
        percentual_rolagem: efeito.percentual_rolagem !== '' ? Number(efeito.percentual_rolagem) : null,
        dados_extras: (efeito.dados_extras || '').trim() || null,
        valor: efeito.valor !== '' ? String(efeito.valor) : null,
      }
    }
    setSalvando(true)
    try {
      await criarPropriedade({ ...f, modificador_config })
      setF({ nome: '', sigla: '', descricao: '', maestria_minima: '', categoria_id: '' })
      setTemEfeito(false); setEfeito({ tipo: 'dano', percentual_rolagem: '', dados_extras: '', valor: '' })
    } catch (e) { setErro(e.message || 'Erro ao criar propriedade.') }
    finally { setSalvando(false) }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Propriedades desbloqueáveis</p>
      <p className="text-purple-500 text-xs">
        Regras que "ligam" na arma ao atingir um nível de maestria — "Crítico" (req 2),
        "Dupla" (req 4). O efeito mecânico é opcional; sem ele, é texto-guia.
      </p>

      {propriedades.length > 0 && (
        <div className="space-y-1.5">
          {propriedades.map(p => {
            const cat = p.categoria_id ? categorias.find(c => c.id === p.categoria_id) : null
            const ef = descreverEfeito(p.modificador_config)
            return (
              <div key={p.id} className="flex items-start gap-2 bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
                <span className="text-amber-400 text-[11px] font-mono shrink-0 mt-0.5 w-14">maestria {p.maestria_minima}</span>
                <span className="min-w-0 flex-1">
                  <span className="text-white text-xs font-medium">{p.nome}</span>
                  {p.sigla && <span className="text-purple-500 text-[11px] ml-1.5 font-mono">[{p.sigla}]</span>}
                  {cat && <span className="text-purple-500 text-[11px] ml-1.5">{cat.nome}</span>}
                  {!cat && <span className="text-purple-600 text-[11px] ml-1.5">geral</span>}
                  <span className="block text-purple-500 text-[11px]">{p.descricao}</span>
                  {ef && <span className="block text-amber-500/80 text-[11px] font-mono">↗ {ef}</span>}
                </span>
                <button onClick={() => removerPropriedade(p.id).catch(e => setErro(e.message))}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0">×</button>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-purple-900/50 pt-2 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <input type="text" value={f.nome} onChange={e => set({ nome: e.target.value })}
            placeholder="Nome (ex: Crítico)" className={`${INP} flex-1 min-w-[9rem]`} />
          <input type="text" value={f.sigla} onChange={e => set({ sigla: e.target.value })}
            placeholder="Sigla" className={`${INP} w-16`} />
          <span className="text-purple-500 text-[11px]">req.</span>
          <input type="number" min={0} value={f.maestria_minima} onChange={e => set({ maestria_minima: e.target.value })}
            placeholder="0" className={`${INP} w-14 text-center`} />
          <select value={f.categoria_id} onChange={e => set({ categoria_id: e.target.value })} className={INP}>
            <option value="">Geral</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <input type="text" value={f.descricao} onChange={e => set({ descricao: e.target.value })}
          placeholder="A regra (o que a propriedade faz)" className={`${INP} w-full`} />

        {/* Efeito mecânico opcional */}
        <label className="text-purple-400 text-[11px] flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={temEfeito} onChange={e => setTemEfeito(e.target.checked)} className="accent-purple-500" />
          efeito mecânico ao usar a arma
        </label>
        {temEfeito && (
          <div className="flex flex-wrap gap-2 items-center pl-4">
            <select value={efeito.tipo} onChange={e => setEfeito({ ...efeito, tipo: e.target.value })} className={INP}>
              <option value="dano">no dano</option>
              <option value="acerto">no acerto</option>
            </select>
            <span className="flex items-center gap-1">
              <input type="number" value={efeito.percentual_rolagem} onChange={e => setEfeito({ ...efeito, percentual_rolagem: e.target.value })}
                placeholder="%" className={`${INP} w-14 text-center`} title="Percentual sobre o total (F18)" />
              <span className="text-purple-500 text-[11px]">%</span>
            </span>
            <input type="text" value={efeito.dados_extras} onChange={e => setEfeito({ ...efeito, dados_extras: e.target.value })}
              placeholder="dados (ex: 1d6)" className={`${INP} w-28 font-mono`} />
            <input type="text" value={efeito.valor} onChange={e => setEfeito({ ...efeito, valor: e.target.value })}
              placeholder="fixo" className={`${INP} w-16 text-center`} />
          </div>
        )}

        <button onClick={adicionar} disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : '+ Adicionar propriedade'}
        </button>
      </div>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
