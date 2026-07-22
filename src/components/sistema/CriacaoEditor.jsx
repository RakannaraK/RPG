import { useState } from 'react'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

function novoId(prefixo) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`
}

const ETAPA_GRUPOS = () => ({
  id: novoId('etapa'), nome: '', tipo: 'prioridade_grupos', alvo: 'atributo',
  grupos: [], valores_prioridade: [7, 5, 3], base_por_membro: 1, maximo_por_membro: 5,
})
const ETAPA_PONTOS = () => ({
  id: novoId('etapa'), nome: '', tipo: 'pontos_livres', alvo: 'linha_poder',
  pontos: 3, apenas_nativas: true, maximo_por_item: 2,
})
const ETAPA_TEXTO = () => ({
  id: novoId('etapa'), nome: '', tipo: 'texto_guia', descricao: '',
})

function EtapaGrupos({ etapa, onChange, atributos, pericias }) {
  const catalogo = etapa.alvo === 'pericia' ? pericias : atributos
  const setEtapa = patch => onChange({ ...etapa, ...patch })
  const grupos = etapa.grupos || []
  const setGrupo = (i, patch) => setEtapa({ grupos: grupos.map((g, j) => (j === i ? { ...g, ...patch } : g)) })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-purple-400 text-[11px] flex items-center gap-1">membros de
          <select value={etapa.alvo || 'atributo'} onChange={e => setEtapa({ alvo: e.target.value, grupos: [] })} className={INP}>
            <option value="atributo">Atributos</option>
            <option value="pericia">Perícias</option>
          </select>
        </label>
        <label className="text-purple-400 text-[11px] flex items-center gap-1">valores de prioridade
          <input type="text" value={(etapa.valores_prioridade || []).join(', ')}
            onChange={e => setEtapa({ valores_prioridade: e.target.value.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n)) })}
            placeholder="7, 5, 3" className={`${INP} w-28 font-mono`} /></label>
        <label className="text-purple-400 text-[11px] flex items-center gap-1">base/membro
          <input type="number" value={etapa.base_por_membro ?? 0} onChange={e => setEtapa({ base_por_membro: Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
        <label className="text-purple-400 text-[11px] flex items-center gap-1">máx/membro
          <input type="number" value={etapa.maximo_por_membro ?? ''} onChange={e => setEtapa({ maximo_por_membro: e.target.value === '' ? null : Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
      </div>
      {(etapa.valores_prioridade || []).length !== grupos.length && (
        <p className="text-amber-400/80 text-[11px]">⚠ {grupos.length} grupo(s) mas {(etapa.valores_prioridade || []).length} valor(es) de prioridade — devem ter a mesma quantidade.</p>
      )}
      <p className="text-purple-500 text-[11px]">Grupos (o jogador ordena estes grupos; a posição decide qual valor de prioridade cada um recebe)</p>
      {grupos.map((g, i) => (
        <div key={g.id} className="rounded-lg border border-purple-900/50 bg-slate-900/40 p-2 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <input type="text" value={g.nome || ''} onChange={e => setGrupo(i, { nome: e.target.value })}
              placeholder="Nome do grupo (ex: Físico)" className={`${INP} w-32`} />
            <button onClick={() => setEtapa({ grupos: grupos.filter((_, j) => j !== i) })}
              className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">×</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {catalogo.map(m => {
              const marcado = (g.membros || []).includes(m.id)
              return (
                <label key={m.id} className="text-[11px] flex items-center gap-1 text-purple-300 cursor-pointer">
                  <input type="checkbox" checked={marcado} className="accent-purple-500"
                    onChange={e => setGrupo(i, { membros: e.target.checked ? [...(g.membros || []), m.id] : (g.membros || []).filter(x => x !== m.id) })} />
                  {m.nome}
                </label>
              )
            })}
            {catalogo.length === 0 && <span className="text-purple-700 text-[11px]">Cadastre {etapa.alvo === 'pericia' ? 'perícias' : 'atributos'} primeiro.</span>}
          </div>
        </div>
      ))}
      <button onClick={() => setEtapa({ grupos: [...grupos, { id: novoId('grupo'), nome: '', membros: [] }] })}
        className="text-[11px] px-2 py-0.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
        + grupo
      </button>
    </div>
  )
}

function EtapaPontos({ etapa, onChange }) {
  const setEtapa = patch => onChange({ ...etapa, ...patch })
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-purple-400 text-[11px] flex items-center gap-1">alvo
        <select value={etapa.alvo || 'linha_poder'} onChange={e => setEtapa({ alvo: e.target.value })} className={INP}>
          <option value="linha_poder">Linha de poder</option>
        </select></label>
      <label className="text-purple-400 text-[11px] flex items-center gap-1">pontos
        <input type="number" min={0} value={etapa.pontos ?? 0} onChange={e => setEtapa({ pontos: Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
      <label className="text-purple-400 text-[11px] flex items-center gap-1">máx/item
        <input type="number" value={etapa.maximo_por_item ?? ''} onChange={e => setEtapa({ maximo_por_item: e.target.value === '' ? null : Number(e.target.value) })} className={`${INP} w-14 text-center`} /></label>
      <label className="text-purple-400 text-[11px] flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={etapa.apenas_nativas !== false} onChange={e => setEtapa({ apenas_nativas: e.target.checked })} className="accent-purple-500" />
        apenas linhas nativas
      </label>
    </div>
  )
}

function EtapaTexto({ etapa, onChange }) {
  return (
    <textarea rows={2} value={etapa.descricao || ''} onChange={e => onChange({ ...etapa, descricao: e.target.value })}
      placeholder="Texto-guia (ex: Escolha Convicções e Pilares; anote-os nas seções da ficha.)"
      className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" />
  )
}

/**
 * Fase 25.4b — criação de personagem por PRIORIDADES (config_layout.criacao_prioridades).
 * Excludente com rolagem (F3) e pontos de status (F22): quando ativo, o
 * assistente de prioridades substitui a criação normal.
 */
export default function CriacaoEditor({ cfg = {}, onChange, atributos = [], pericias = [], pontosStatusAtivo = false }) {
  const etapas = cfg.etapas || []
  const set = patch => onChange({ ...cfg, ...patch })
  const setEtapa = (i, patch) => set({ etapas: etapas.map((e, j) => (j === i ? { ...e, ...patch } : e)) })

  return (
    <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-purple-200 text-sm font-semibold">Criação por prioridades</p>
          <p className="text-purple-500 text-xs mt-0.5">
            Assistente clássico: o jogador distribui valores entre grupos (ex: 7/5/3 entre Físico/Social/Mental),
            em etapas configuráveis. Substitui a rolagem/point-buy quando ativo.
          </p>
        </div>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer shrink-0">
          <input type="checkbox" checked={!!cfg.ativo} onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          ativar
        </label>
      </div>

      {cfg.ativo && pontosStatusAtivo && (
        <p className="text-amber-400 text-[11px]">
          ⚠ Pontos de status (F22) também está ativo. Os métodos de criação são excludentes — desative um dos dois.
        </p>
      )}

      {cfg.ativo && (
        <div className="space-y-2">
          {etapas.map((etapa, i) => (
            <div key={etapa.id} className="rounded-xl border border-purple-900/60 bg-slate-900/40 p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <input type="text" value={etapa.nome || ''} onChange={e => setEtapa(i, { nome: e.target.value })}
                  placeholder="Nome da etapa (ex: Atributos)" className={`${INP} w-40 font-semibold`} />
                <span className="text-purple-600 text-[11px] uppercase tracking-wide">
                  {etapa.tipo === 'prioridade_grupos' ? 'grupos por prioridade' : etapa.tipo === 'pontos_livres' ? 'pontos livres' : 'texto-guia'}
                </span>
                <button onClick={() => set({ etapas: etapas.filter((_, j) => j !== i) })}
                  className="ml-auto w-6 h-6 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors">✕</button>
              </div>
              {etapa.tipo === 'prioridade_grupos' && (
                <EtapaGrupos etapa={etapa} onChange={nova => setEtapa(i, nova)} atributos={atributos} pericias={pericias} />
              )}
              {etapa.tipo === 'pontos_livres' && (
                <EtapaPontos etapa={etapa} onChange={nova => setEtapa(i, nova)} />
              )}
              {etapa.tipo === 'texto_guia' && (
                <EtapaTexto etapa={etapa} onChange={nova => setEtapa(i, nova)} />
              )}
            </div>
          ))}

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => set({ etapas: [...etapas, ETAPA_GRUPOS()] })}
              className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
              + etapa de grupos por prioridade
            </button>
            <button onClick={() => set({ etapas: [...etapas, ETAPA_PONTOS()] })}
              className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
              + etapa de pontos livres
            </button>
            <button onClick={() => set({ etapas: [...etapas, ETAPA_TEXTO()] })}
              className="text-[11px] px-2 py-1 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
              + etapa de texto-guia
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
