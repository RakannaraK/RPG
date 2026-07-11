import { validarFaixasDefesa } from '../../lib/defesaEngine'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId() {
  return `o${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
}

/**
 * Fase 22.5 — config de defesa ativa: opções de reação (com notação), faixas de
 * redução por (defesa − ataque) e o contra-ataque. Assíncrona no combate (22.6).
 */
export default function DefesaAtivaEditor({ cfg = {}, onChange }) {
  const opcoes = cfg.opcoes || []
  const faixas = cfg.faixas || []
  const contra = cfg.contra_ataque || {}
  const set = patch => onChange({ ...cfg, ...patch })
  const status = faixas.length > 0 ? validarFaixasDefesa(faixas) : null

  const setOpcao = (i, patch) => set({ opcoes: opcoes.map((o, j) => (j === i ? { ...o, ...patch } : o)) })
  const setFaixa = (i, patch) => set({ faixas: faixas.map((f, j) => (j === i ? { ...f, ...patch } : f)) })
  const setContra = patch => set({ contra_ataque: { ...contra, ...patch } })
  const setCond = patch => setContra({ condicao: { ...(contra.condicao || {}), ...patch } })

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">Defesa ativa</p>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!cfg.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          ativar
        </label>
      </div>
      <p className="text-purple-500 text-xs">
        No combate, o alvo pode reagir (rolagem oposta). A faixa é escolhida por
        <span className="font-mono text-purple-300"> defesa − ataque</span> e reduz o dano. É
        <span className="text-amber-400"> assíncrona</span>: sem resposta, o mestre resolve — nunca trava o turno.
      </p>

      {cfg.ativo && (
        <>
          {/* Opções de reação */}
          <div className="space-y-1.5 border-t border-purple-900/50 pt-2">
            <p className="text-purple-400 text-[11px]">Reações (o defensor rola a notação escolhida)</p>
            {opcoes.map((o, i) => (
              <div key={o.id || i} className="flex items-center gap-2 flex-wrap">
                <input type="text" value={o.nome || ''} onChange={e => setOpcao(i, { nome: e.target.value })}
                  placeholder="Desviar" className={`${INP} w-28`} />
                <input type="text" value={o.notacao || ''} onChange={e => setOpcao(i, { notacao: e.target.value })}
                  placeholder="1d100 + atributo(agilidade)" className={`${INP} flex-1 min-w-[10rem] font-mono`} />
                <button onClick={() => set({ opcoes: opcoes.filter((_, j) => j !== i) })}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => set({ opcoes: [...opcoes, { id: novoId(), nome: '', notacao: '' }] })}
              className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
              + reação
            </button>
          </div>

          {/* Faixas de redução */}
          <div className="space-y-1.5 border-t border-purple-900/50 pt-2">
            <p className="text-purple-400 text-[11px]">Faixas de redução (por defesa − ataque). Vazio = aberto (−∞ / +∞).</p>
            {faixas.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-purple-600 text-[11px]">de</span>
                <input type="number" value={f.de ?? ''} onChange={e => setFaixa(i, { de: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="−∞" className={`${INP} w-14 text-center`} />
                <span className="text-purple-600 text-[11px]">até</span>
                <input type="number" value={f.ate ?? ''} onChange={e => setFaixa(i, { ate: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="+∞" className={`${INP} w-14 text-center`} />
                <span className="text-purple-600 text-[11px]">reduz</span>
                <input type="number" value={f.reducao_percentual ?? ''} onChange={e => setFaixa(i, { reducao_percentual: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="%" className={`${INP} w-14 text-center`} />
                <span className="text-purple-600 text-[11px]">%</span>
                <input type="text" value={f.rotulo || ''} onChange={e => setFaixa(i, { rotulo: e.target.value })}
                  placeholder="rótulo" className={`${INP} flex-1 min-w-[6rem]`} />
                <button onClick={() => set({ faixas: faixas.filter((_, j) => j !== i) })}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => set({ faixas: [...faixas, { de: null, ate: null, reducao_percentual: '', rotulo: '' }] })}
              className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
              + faixa
            </button>
            {status && !status.valida && <p className="text-red-400 text-[11px]">⚠ {status.erro}</p>}
            {status && status.valida && <p className="text-green-600 text-[11px]">✓ faixas contíguas</p>}
          </div>

          {/* Contra-ataque */}
          <div className="space-y-1.5 border-t border-purple-900/50 pt-2">
            <p className="text-purple-400 text-[11px]">Contra-ataque</p>
            <label className="text-purple-400 text-[11px] flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={contra.sofre_dano_cheio !== false} onChange={e => setContra({ sofre_dano_cheio: e.target.checked })} className="accent-purple-500" />
              o defensor sofre o dano cheio
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-purple-500 text-[11px]">aplica no atacante:</span>
              <input type="text" value={contra.condicao?.nome || ''} onChange={e => setCond({ nome: e.target.value })}
                placeholder="Exposto" className={`${INP} w-28`} />
              <span className="text-purple-500 text-[11px]">por</span>
              <input type="number" min={1} value={contra.condicao?.duracao_rodadas ?? 1} onChange={e => setCond({ duracao_rodadas: Number(e.target.value) })}
                className={`${INP} w-14 text-center`} />
              <span className="text-purple-500 text-[11px]">rodada(s)</span>
            </div>
            <input type="text" value={contra.condicao?.descricao || ''} onChange={e => setCond({ descricao: e.target.value })}
              placeholder="Descrição da condição (ex: desvantagem no próximo desvio)" className={`${INP} w-full`} />
          </div>
        </>
      )}
    </div>
  )
}
