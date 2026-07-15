import { useRef } from 'react'
import { validarResolucao } from '../../lib/resolutionEngine'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

const MODOS = [
  { id: 'soma', nome: 'Soma', desc: 'Rola, soma e compara (o de sempre).' },
  { id: 'sucessos', nome: 'Sucessos', desc: 'Parada de dados; conta dados ≥ dificuldade (WoD/V5).' },
  { id: 'roll_under', nome: 'Roll-under', desc: 'Sucesso se rolar ≤ o alvo (Call of Cthulhu).' },
  { id: 'faixas', nome: 'Faixas', desc: 'Soma e cai numa faixa com rótulo e texto (PbtA).' },
]

// Presets NEUTROS — estruturas, nunca emulação nomeada de jogos comerciais.
const PRESETS = [
  { rotulo: 'Parada de d10 (contar sucessos)', cfg: { modo: 'sucessos', dado: 10, dificuldade_padrao: 6, par_de_max_critico: true, um_anula_sucesso: false, max_conta_dobrado: false, botch: true } },
  { rotulo: 'd100 roll-under com qualidades', cfg: { modo: 'roll_under', dado: 100, faixas_qualidade: true, critico_em: 1, desastre_em: 100 } },
  { rotulo: '2d6 por faixas', cfg: { modo: 'faixas', notacao_base: '2d6', faixas: [
    { de: null, ate: 6, rotulo: 'Falha', texto: 'Algo dá errado.', cor: 'vermelho' },
    { de: 7, ate: 9, rotulo: 'Sucesso parcial', texto: 'Você consegue, mas a um custo.', cor: 'ambar' },
    { de: 10, ate: null, rotulo: 'Sucesso pleno', texto: 'Você consegue plenamente.', cor: 'verde' },
  ] } },
]

const CORES = [
  { id: 'verde', nome: '🟢 Verde' }, { id: 'ambar', nome: '🟡 Âmbar' }, { id: 'vermelho', nome: '🔴 Vermelho' }, { id: 'roxo', nome: '🟣 Roxo' },
]

function Check({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-start gap-1.5 text-purple-300 text-xs cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} className="accent-purple-500 mt-0.5" />
      <span>{label}{hint && <span className="text-purple-600"> — {hint}</span>}</span>
    </label>
  )
}

/**
 * Fase 23.2 — config do MODO de resolução do sistema. Um modo por sistema. Trocar
 * o modo muda como TODAS as rolagens se resolvem — avisa quando muda.
 */
export default function ResolucaoEditor({ cfg = {}, onChange }) {
  const modoInicial = useRef(cfg.modo || 'soma')
  const modo = cfg.modo || 'soma'
  const set = patch => onChange({ ...cfg, ...patch })
  const faixas = cfg.faixas || []
  const setFaixa = (i, patch) => set({ faixas: faixas.map((f, j) => (j === i ? { ...f, ...patch } : f)) })

  const val = validarResolucao(cfg)
  const trocou = modo !== modoInicial.current

  return (
    <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-purple-200 text-sm font-semibold">Resolução de rolagens</p>
        <p className="text-purple-500 text-xs mt-0.5">
          Como uma rolagem se resolve neste sistema. <span className="text-purple-400">Soma</span> = comportamento de sempre.
        </p>
      </div>

      {/* Presets neutros */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-purple-500 text-[11px] self-center">Presets:</span>
        {PRESETS.map(p => (
          <button key={p.rotulo} onClick={() => set({ ...p.cfg })}
            className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
            {p.rotulo}
          </button>
        ))}
      </div>

      {/* Seletor de modo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {MODOS.map(m => (
          <button key={m.id} onClick={() => set({ modo: m.id })} title={m.desc}
            className={`px-2 py-1.5 rounded-lg text-xs border text-left transition-colors ${
              modo === m.id ? 'bg-purple-700 border-purple-500 text-white' : 'bg-purple-950 border-purple-800 text-purple-300 hover:border-purple-600'
            }`}>
            <span className="font-semibold block">{m.nome}</span>
          </button>
        ))}
      </div>
      <p className="text-purple-500 text-[11px]">{MODOS.find(m => m.id === modo)?.desc}</p>

      {trocou && (
        <div className="rounded-lg border border-amber-700/70 bg-amber-950/40 px-3 py-2 text-amber-200 text-[11px]">
          ⚠ Você trocou o modo de resolução. TODAS as rolagens do sistema passam a se resolver assim — revise as regras de rolagem dos atributos/perícias com o novo modo em mente.
        </div>
      )}

      {/* Campos do modo SUCESSOS */}
      {modo === 'sucessos' && (
        <div className="space-y-2 border-t border-purple-900/50 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-purple-300 text-xs flex items-center gap-1">dado d
              <input type="number" min={2} value={cfg.dado ?? 10} onChange={e => set({ dado: Number(e.target.value) })} className={`${INP} w-16`} /></label>
            <label className="text-purple-300 text-xs flex items-center gap-1">dificuldade (≥)
              <input type="number" min={1} value={cfg.dificuldade_padrao ?? 6} onChange={e => set({ dificuldade_padrao: Number(e.target.value) })} className={`${INP} w-16`} /></label>
          </div>
          <Check label="Dado máximo conta dobrado" hint="cada máximo = 2 sucessos" checked={cfg.max_conta_dobrado} onChange={v => set({ max_conta_dobrado: v })} />
          <Check label="Par de máximos = crítico" hint="cada par de máximos → +2 sucessos (estilo V5)" checked={cfg.par_de_max_critico} onChange={v => set({ par_de_max_critico: v })} />
          <Check label="1 anula sucesso" hint="cada 1 remove um sucesso (WoD clássico)" checked={cfg.um_anula_sucesso} onChange={v => set({ um_anula_sucesso: v })} />
          <Check label="Botch (falha crítica)" hint="0 sucessos e ao menos um 1" checked={cfg.botch} onChange={v => set({ botch: v })} />
        </div>
      )}

      {/* Campos do modo ROLL_UNDER */}
      {modo === 'roll_under' && (
        <div className="space-y-2 border-t border-purple-900/50 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-purple-300 text-xs flex items-center gap-1">dado d
              <input type="number" min={2} value={cfg.dado ?? 100} onChange={e => set({ dado: Number(e.target.value) })} className={`${INP} w-16`} /></label>
            <label className="text-purple-300 text-xs flex items-center gap-1">crítico ≤
              <input type="number" min={0} value={cfg.critico_em ?? 1} onChange={e => set({ critico_em: Number(e.target.value) })} className={`${INP} w-14`} /></label>
            <label className="text-purple-300 text-xs flex items-center gap-1">desastre ≥
              <input type="number" value={cfg.desastre_em ?? 100} onChange={e => set({ desastre_em: Number(e.target.value) })} className={`${INP} w-16`} /></label>
          </div>
          <Check label="Faixas de qualidade" hint="extremo ≤ alvo/5, bom ≤ alvo/2, normal ≤ alvo" checked={cfg.faixas_qualidade} onChange={v => set({ faixas_qualidade: v })} />
        </div>
      )}

      {/* Campos do modo FAIXAS */}
      {modo === 'faixas' && (
        <div className="space-y-1.5 border-t border-purple-900/50 pt-2">
          <label className="text-purple-300 text-xs flex items-center gap-1.5">
            notação base
            <input type="text" value={cfg.notacao_base ?? '2d6'} onChange={e => set({ notacao_base: e.target.value })} className={`${INP} w-24 font-mono`} />
            <span className="text-purple-600 text-[11px]">+ modificador da rolagem</span>
          </label>
          <p className="text-purple-500 text-[11px]">Faixas do resultado. Vazio = aberto (−∞ / +∞). Entre faixas que cobrem o total, vence a de maior "de".</p>
          {faixas.map((f, i) => (
            <div key={i} className="rounded-lg border border-purple-900/50 bg-slate-900/40 p-2 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-purple-600 text-[11px]">de</span>
                <input type="number" value={f.de ?? ''} onChange={e => setFaixa(i, { de: e.target.value === '' ? null : Number(e.target.value) })} placeholder="−∞" className={`${INP} w-14 text-center`} />
                <span className="text-purple-600 text-[11px]">até</span>
                <input type="number" value={f.ate ?? ''} onChange={e => setFaixa(i, { ate: e.target.value === '' ? null : Number(e.target.value) })} placeholder="+∞" className={`${INP} w-14 text-center`} />
                <input type="text" value={f.rotulo || ''} onChange={e => setFaixa(i, { rotulo: e.target.value })} placeholder="rótulo" className={`${INP} flex-1 min-w-[6rem]`} />
                <select value={f.cor || 'verde'} onChange={e => setFaixa(i, { cor: e.target.value })} className={INP}>
                  {CORES.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button onClick={() => set({ faixas: faixas.filter((_, j) => j !== i) })} className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
              </div>
              <input type="text" value={f.texto || ''} onChange={e => setFaixa(i, { texto: e.target.value })} placeholder="texto que aparece no feed (ex: Você consegue, mas a um custo.)" className={`${INP} w-full`} />
            </div>
          ))}
          <button onClick={() => set({ faixas: [...faixas, { de: null, ate: null, rotulo: '', texto: '', cor: 'verde' }] })}
            className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
            + faixa
          </button>
        </div>
      )}

      {/* Explosão (transversal) */}
      {modo !== 'roll_under' && (
        <div className="border-t border-purple-900/50 pt-2">
          <Check label="Dados explosivos" hint="o máximo rola de novo e acumula (trava de 20 por dado)" checked={cfg.explosao?.ativo} onChange={v => set({ explosao: { ...(cfg.explosao || {}), ativo: v } })} />
        </div>
      )}

      {/* Validação */}
      {val.erros.map((e, i) => <p key={`e${i}`} className="text-red-400 text-[11px]">⚠ {e}</p>)}
      {val.avisos.map((a, i) => <p key={`a${i}`} className="text-amber-400/80 text-[11px]">• {a}</p>)}
      {modo !== 'soma' && val.valido && val.erros.length === 0 && (
        <p className="text-green-600 text-[11px]">✓ configuração válida</p>
      )}
    </div>
  )
}
