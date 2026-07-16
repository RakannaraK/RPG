import { useState } from 'react'
import { ModificadorForm, labelModificador } from './RacasClassesEditor'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId(prefixo) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
}

const ESTADO_NOVO = () => ({
  id: novoId('estado'),
  nome: '',
  min: 0, max: 5, inicial: 0,
  destaque: true,
  feed: true,
  alimenta_dados_especiais: false,
  efeitos_por_faixa: [],
})

function FaixaEfeito({ faixa, onChange, onRemove, atributos, pericias, camposCombate, pools }) {
  const [addMod, setAddMod] = useState(false)
  const set = patch => onChange({ ...faixa, ...patch })
  const mods = faixa.modificadores || []

  return (
    <div className="rounded-lg border border-purple-900/50 bg-slate-900/40 p-2 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-purple-600 text-[11px]">de</span>
        <input type="number" value={faixa.de ?? ''} onChange={e => set({ de: e.target.value === '' ? null : Number(e.target.value) })} placeholder="−∞" className={`${INP} w-14 text-center`} />
        <span className="text-purple-600 text-[11px]">até</span>
        <input type="number" value={faixa.ate ?? ''} onChange={e => set({ ate: e.target.value === '' ? null : Number(e.target.value) })} placeholder="+∞" className={`${INP} w-14 text-center`} />
        <input type="text" value={faixa.aviso || ''} onChange={e => set({ aviso: e.target.value })}
          placeholder="aviso (chip na ficha — ex: A Besta está próxima.)" className={`${INP} flex-1 min-w-[10rem]`} />
        <button onClick={onRemove} className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
      </div>
      <input type="text" value={(faixa.bloqueios || []).join(', ')}
        onChange={e => set({ bloqueios: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        placeholder="bloqueios informativos, separados por vírgula (ex: gastar recurso X)" className={`${INP} w-full`} />

      {/* Efeitos (modificadores F12) da faixa */}
      {mods.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mods.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border bg-purple-950/70 border-purple-700 text-purple-200">
              {labelModificador(m, { atributos, pericias, camposCombate })}
              <button onClick={() => set({ modificadores: mods.filter((_, j) => j !== i) })} className="text-purple-500 hover:text-red-400">×</button>
            </span>
          ))}
        </div>
      )}
      {addMod ? (
        <div className="border border-purple-900/60 rounded-lg p-2">
          <ModificadorForm
            atributos={atributos} pericias={pericias} camposCombate={camposCombate} pools={pools}
            onAdd={payload => { set({ modificadores: [...mods, { id: novoId('m'), ...payload }] }); setAddMod(false) }}
          />
          <button onClick={() => setAddMod(false)} className="mt-1 text-[11px] text-purple-500 hover:text-purple-300">Cancelar</button>
        </div>
      ) : (
        <button onClick={() => setAddMod(true)}
          className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
          + efeito (modificador)
        </button>
      )}
    </div>
  )
}

/**
 * Fase 24.4 — estados com gatilhos (config_layout.estados). Contadores centrais
 * (Fome 0-5, Sanidade 0-10) com efeitos POR FAIXA — os modificadores entram no
 * pipeline F12/18 normal quando a faixa está ativa. Nomes/textos do mestre.
 */
export default function EstadosEditor({ estados = [], onChange, atributos = [], pericias = [], camposCombate = [], pools = [] }) {
  const setEstado = (i, patch) => onChange(estados.map((e, j) => (j === i ? { ...e, ...patch } : e)))

  return (
    <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-purple-200 text-sm font-semibold">Estados com gatilhos</p>
        <p className="text-purple-500 text-xs mt-0.5">
          Contadores centrais do sistema (ex: Fome 0-5) com efeitos por faixa de valor. Os efeitos
          entram e saem sozinhos; avisos viram chips; bloqueios informam (a mesa arbitra).
          A variável <span className="font-mono text-purple-300">estado(nome)</span> fica disponível nas fórmulas.
        </p>
      </div>

      {estados.map((cfg, i) => (
        <div key={cfg.id} className="rounded-xl border border-purple-900/60 bg-slate-900/40 p-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <input type="text" value={cfg.nome || ''} onChange={e => setEstado(i, { nome: e.target.value })}
              placeholder="Nome (ex: Fome)" className={`${INP} w-32 font-semibold`} />
            <label className="text-purple-400 text-[11px] flex items-center gap-1">min
              <input type="number" value={cfg.min ?? 0} onChange={e => setEstado(i, { min: Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
            <label className="text-purple-400 text-[11px] flex items-center gap-1">max
              <input type="number" value={cfg.max ?? 5} onChange={e => setEstado(i, { max: Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
            <label className="text-purple-400 text-[11px] flex items-center gap-1">inicial
              <input type="number" value={cfg.inicial ?? 0} onChange={e => setEstado(i, { inicial: Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
            <button onClick={() => onChange(estados.filter((_, j) => j !== i))}
              className="ml-auto w-6 h-6 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">✕</button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={cfg.destaque !== false} onChange={e => setEstado(i, { destaque: e.target.checked })} className="accent-purple-500" />
              destaque (cabeçalho da ficha + card de sessão)
            </label>
            <label className="text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={cfg.feed !== false} onChange={e => setEstado(i, { feed: e.target.checked })} className="accent-purple-500" />
              registrar mudanças no feed
            </label>
            <label className="text-purple-300 text-[11px] flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={!!cfg.alimenta_dados_especiais} onChange={e => setEstado(i, { alimenta_dados_especiais: e.target.checked })} className="accent-purple-500" />
              alimenta os dados especiais (F23): quantidade = valor deste estado
            </label>
          </div>

          <p className="text-purple-400 text-[11px]">Efeitos por faixa de valor</p>
          {(cfg.efeitos_por_faixa || []).map((f, k) => (
            <FaixaEfeito key={k} faixa={f}
              onChange={nova => setEstado(i, { efeitos_por_faixa: cfg.efeitos_por_faixa.map((x, j) => (j === k ? nova : x)) })}
              onRemove={() => setEstado(i, { efeitos_por_faixa: cfg.efeitos_por_faixa.filter((_, j) => j !== k) })}
              atributos={atributos} pericias={pericias} camposCombate={camposCombate} pools={pools}
            />
          ))}
          <button onClick={() => setEstado(i, { efeitos_por_faixa: [...(cfg.efeitos_por_faixa || []), { de: null, ate: null, aviso: '', bloqueios: [], modificadores: [] }] })}
            className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
            + faixa
          </button>
        </div>
      ))}

      <button onClick={() => onChange([...estados, ESTADO_NOVO()])}
        className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + Adicionar estado
      </button>
    </div>
  )
}
