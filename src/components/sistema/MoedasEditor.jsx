import { useState } from 'react'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId() {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
}

/**
 * Fase 21.6 — denominações de moeda do sistema (config_layout.moedas).
 * `valor` = quanto vale na unidade-base (a menor). Ex: PC=1, PP=10, PO=100.
 */
export default function MoedasEditor({ config, onChange }) {
  const m = config?.moedas || { ativo: false, denominacoes: [] }
  const denom = m.denominacoes || []
  const [nome, setNome] = useState('')
  const [sigla, setSigla] = useState('')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')

  const set = patch => onChange({ ...config, moedas: { ...m, ...patch } })

  function setDenom(i, patch) {
    set({ denominacoes: denom.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  }
  function remover(i) {
    set({ denominacoes: denom.filter((_, j) => j !== i) })
  }
  function adicionar() {
    setErro('')
    if (!nome.trim()) { setErro('Informe o nome da moeda.'); return }
    if (valor === '' || Number(valor) <= 0) { setErro('O valor deve ser positivo.'); return }
    const nova = [...denom, { id: novoId(), nome: nome.trim(), sigla: (sigla || '').trim(), valor: Number(valor) }]
      .sort((a, b) => a.valor - b.valor)
    set({ denominacoes: nova })
    setNome(''); setSigla(''); setValor('')
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Moedas</p>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!m.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          ativar
        </label>
      </div>
      <p className="text-purple-500 text-xs">
        Denominações e taxas do sistema. <span className="font-mono text-purple-300">valor</span> = quanto vale
        na unidade-base (a menor). Ex: Cobre 1, Prata 10, Ouro 100. Sem moedas, a ficha não mostra carteira.
      </p>

      {!m.ativo ? (
        <p className="text-purple-600 text-xs">Desativado.</p>
      ) : (
        <>
          {denom.length > 0 && (
            <div className="space-y-1.5">
              {denom.map((d, i) => (
                <div key={d.id} className="flex items-center gap-2 bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
                  <input type="text" value={d.nome} onChange={e => setDenom(i, { nome: e.target.value })}
                    className={`${INP} flex-1 min-w-[7rem]`} />
                  <input type="text" value={d.sigla} onChange={e => setDenom(i, { sigla: e.target.value })}
                    placeholder="sigla" className={`${INP} w-16 text-center`} />
                  <span className="text-purple-500 text-[11px]">vale</span>
                  <input type="number" value={d.valor} onChange={e => setDenom(i, { valor: Number(e.target.value) })}
                    className={`${INP} w-20 text-center`} />
                  <button onClick={() => remover(i)}
                    className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0">×</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap border-t border-purple-900/50 pt-2">
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome (Ouro)" className={`${INP} flex-1 min-w-[8rem]`} />
            <input type="text" value={sigla} onChange={e => setSigla(e.target.value)}
              placeholder="PO" className={`${INP} w-16 text-center`} />
            <input type="number" value={valor} onChange={e => setValor(e.target.value)}
              placeholder="valor" className={`${INP} w-20 text-center`} />
            <button onClick={adicionar}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-lg transition-colors">
              + Adicionar
            </button>
          </div>
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
        </>
      )}
    </div>
  )
}
