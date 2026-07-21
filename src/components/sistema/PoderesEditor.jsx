import { useState, useMemo } from 'react'
import { usePoderes } from '../../hooks/usePoderes'
import { usePools } from '../../hooks/usePools'
import { useLinhasPoder } from '../../hooks/useLinhasPoder'
import { useRacasClasses } from '../../hooks/useRacasClasses'
import {
  validarPoder, descreverCusto, descreverEscala,
  filtrarPoderes, opcoesDeFiltro, ordenarPoderes,
} from '../../lib/poderes'
import { CustoEditor, EscalaEditor } from './CustoEditor'
import FormulaInput from './FormulaInput'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

const VAZIO = {
  nome: '', descricao: '', categoria: '', circulo: '',
  custo: [], acao: '', alcance: '', duracao: '',
  efeito_notacao: '', efeito_tipo: '', escala_circulo: null,
  cd_formula: '', tags: '', classe_id: '', nivel_minimo: '',
  linha_id: '', nivel_linha: '',
}

function paraFormulario(p) {
  return {
    ...VAZIO,
    ...p,
    circulo: p.circulo ?? '',
    nivel_minimo: p.nivel_minimo ?? '',
    efeito_tipo: p.efeito_tipo || '',
    classe_id: p.classe_id || '',
    custo: p.custo || [],
    tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    linha_id: p.linha_id || '',
    nivel_linha: p.nivel_linha ?? '',
  }
}

function PoderForm({ inicial, pools, classes, linhas = [], onSalvar, onCancelar }) {
  const [f, setF] = useState(inicial || VAZIO)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const set = patch => setF(prev => ({ ...prev, ...patch }))

  async function salvar() {
    setErro('')
    const v = validarPoder(f, { pools })
    if (!v.valida) { setErro(v.erro); return }
    setSalvando(true)
    try {
      await onSalvar(f)
    } catch (e) {
      setErro(e.message || 'Erro ao salvar poder.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-slate-700/40 border border-purple-800/60 rounded-lg p-3 space-y-2.5">
      <div className="flex flex-wrap gap-2">
        <input type="text" value={f.nome} onChange={e => set({ nome: e.target.value })}
          placeholder="Nome do poder" className={`${INP} flex-1 min-w-[10rem]`} />
        <input type="text" value={f.categoria} onChange={e => set({ categoria: e.target.value })}
          placeholder="Categoria (Magia, Técnica...)" className={`${INP} w-44`} />
        <input type="number" min={0} value={f.circulo} onChange={e => set({ circulo: e.target.value })}
          placeholder="Círc." className={`${INP} w-16 text-center`} title="Círculo (vazio = sem círculo)" />
      </div>

      <textarea rows={2} value={f.descricao} onChange={e => set({ descricao: e.target.value })}
        placeholder="Descrição" className={`${INP} w-full`} />

      <div className="flex flex-wrap gap-2">
        <input type="text" value={f.acao} onChange={e => set({ acao: e.target.value })}
          placeholder="Ação (1 ação, ação bônus...)" className={`${INP} flex-1 min-w-[8rem]`} />
        <input type="text" value={f.alcance} onChange={e => set({ alcance: e.target.value })}
          placeholder="Alcance" className={`${INP} w-28`} />
        <input type="text" value={f.duracao} onChange={e => set({ duracao: e.target.value })}
          placeholder="Duração" className={`${INP} w-28`} />
      </div>

      {/* Custo */}
      <div className="border-t border-purple-900/50 pt-2">
        <p className="text-purple-400 text-[11px] mb-1.5">Custo ao usar</p>
        <CustoEditor custo={f.custo} pools={pools} onChange={custo => set({ custo })} />
      </div>

      {/* Efeito */}
      <div className="border-t border-purple-900/50 pt-2 space-y-1.5">
        <p className="text-purple-400 text-[11px]">Efeito (opcional)</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={f.efeito_tipo} onChange={e => set({ efeito_tipo: e.target.value })} className={INP}>
            <option value="">Só texto</option>
            <option value="dano">Dano</option>
            <option value="cura">Cura</option>
          </select>
          <input type="text" value={f.efeito_notacao} onChange={e => set({ efeito_notacao: e.target.value })}
            placeholder="2d6  ou  1d8 + mod(carisma)" spellCheck={false}
            className={`${INP} flex-1 min-w-[10rem] font-mono`} />
        </div>
      </div>

      {/* Escala por círculo */}
      <div className="border-t border-purple-900/50 pt-2">
        <p className="text-purple-400 text-[11px] mb-1.5">
          Escala por círculo — a taxa <span className="text-purple-300">acumula</span>: um poder de 1º
          lançado no 3º recebe 2× o extra.
        </p>
        <EscalaEditor escala={f.escala_circulo} onChange={escala_circulo => set({ escala_circulo })} />
      </div>

      {/* CD */}
      <div className="border-t border-purple-900/50 pt-2">
        <p className="text-purple-400 text-[11px] mb-1">CD deste poder (vazio = herda a do sistema)</p>
        <FormulaInput
          value={f.cd_formula}
          onChange={cd_formula => set({ cd_formula })}
          placeholder="ex: 8 + proficiencia + mod(carisma)"
          variaveis={['proficiencia', 'mod(', 'nivel', 'atributo(']}
        />
      </div>

      {/* Vínculo e requisito */}
      <div className="flex flex-wrap gap-2 items-center border-t border-purple-900/50 pt-2">
        <select value={f.classe_id} onChange={e => set({ classe_id: e.target.value })} className={INP}>
          <option value="">Sem classe</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <span className="text-purple-500 text-[11px]">nv mín.</span>
        <input type="number" min={1} value={f.nivel_minimo} onChange={e => set({ nivel_minimo: e.target.value })}
          placeholder="—" className={`${INP} w-14 text-center`} />
        <select value={f.linha_id} onChange={e => set({ linha_id: e.target.value })} className={INP}>
          <option value="">— sem linha —</option>
          {linhas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        {f.linha_id && (
          <>
            <span className="text-purple-500 text-[11px]">nv na linha</span>
            <input type="number" min={1} value={f.nivel_linha} onChange={e => set({ nivel_linha: e.target.value })}
              placeholder="—" className={`${INP} w-14 text-center`} />
          </>
        )}
        <input type="text" value={f.tags} onChange={e => set({ tags: e.target.value })}
          placeholder="tags: cura, área" className={`${INP} flex-1 min-w-[8rem]`} />
      </div>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}

      <div className="flex gap-2">
        <button onClick={salvar} disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : 'Salvar'}
        </button>
        <button onClick={onCancelar}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Fase 20.2 — catálogo de poderes do sistema. Genérico: a categoria é rótulo
 * livre do mestre, e nenhum poder vem embutido.
 */
export default function PoderesEditor({ sistemaId }) {
  const { poderes, criarPoder, atualizarPoder, removerPoder } = usePoderes(sistemaId)
  const { pools } = usePools(sistemaId)
  const { linhas } = useLinhasPoder(sistemaId) // 25.3 — p/ vincular poder a uma linha de poder
  const { classes } = useRacasClasses(sistemaId) // p/ vincular poder a uma classe
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState(null) // id
  const [erro, setErro] = useState('')
  const [filtros, setFiltros] = useState({ busca: '', circulo: '', categoria: '', classeId: '', tag: '' })

  const poolsPorId = useMemo(() => Object.fromEntries(pools.map(p => [p.id, p])), [pools])
  const opcoes = useMemo(() => opcoesDeFiltro(poderes), [poderes])
  const visiveis = useMemo(
    () => ordenarPoderes(filtrarPoderes(poderes, filtros)),
    [poderes, filtros]
  )

  const setF = patch => setFiltros(prev => ({ ...prev, ...patch }))

  if (!sistemaId) return null

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-purple-200 text-sm font-semibold">Poderes</p>
        <span className="text-purple-600 text-xs">
          {visiveis.length} de {poderes.length}
        </span>
      </div>
      <p className="text-purple-500 text-xs">
        Cartas de poder do sistema — "Magia", "Técnica", "Oração": a categoria é sua.
        O custo pode ser em <span className="text-purple-300">recurso</span> (pool) e/ou em{' '}
        <span className="text-purple-300">slot de círculo</span>.
      </p>

      {/* Busca e filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <input type="text" value={filtros.busca} onChange={e => setF({ busca: e.target.value })}
          placeholder="Buscar por nome ou descrição" className={`${INP} flex-1 min-w-[12rem]`} />
        <select value={filtros.circulo} onChange={e => setF({ circulo: e.target.value === '' ? '' : Number(e.target.value) })} className={INP}>
          <option value="">Todo círculo</option>
          <option value={-1}>Sem círculo</option>
          {opcoes.circulos.map(c => <option key={c} value={c}>{c}º círculo</option>)}
        </select>
        <select value={filtros.categoria} onChange={e => setF({ categoria: e.target.value })} className={INP}>
          <option value="">Toda categoria</option>
          {opcoes.categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtros.classeId} onChange={e => setF({ classeId: e.target.value })} className={INP}>
          <option value="">Toda classe</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {opcoes.tags.length > 0 && (
          <select value={filtros.tag} onChange={e => setF({ tag: e.target.value })} className={INP}>
            <option value="">Toda tag</option>
            {opcoes.tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-1.5">
        {visiveis.map(p => (
          editando === p.id ? (
            <PoderForm
              key={p.id}
              inicial={paraFormulario(p)}
              pools={pools}
              classes={classes}
              linhas={linhas}
              onSalvar={async dados => { await atualizarPoder(p.id, dados); setEditando(null) }}
              onCancelar={() => setEditando(null)}
            />
          ) : (
            <div key={p.id} className="bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-[11px] font-mono shrink-0 mt-0.5 w-12">
                  {p.circulo != null ? `${p.circulo}º` : '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-white text-xs font-medium">{p.nome}</span>
                  {p.categoria && <span className="text-purple-500 text-[11px] ml-1.5">{p.categoria}</span>}
                  {p.nivel_minimo != null && <span className="text-purple-500 text-[11px] ml-1.5">nv {p.nivel_minimo}+</span>}
                  <span className="block text-purple-500 text-[11px]">
                    {descreverCusto(p.custo, poolsPorId)}
                    {p.efeito_notacao && <span className="font-mono text-purple-400"> · {p.efeito_notacao}{p.efeito_tipo ? ` (${p.efeito_tipo})` : ''}</span>}
                  </span>
                  {descreverEscala(p.escala_circulo) && (
                    <span className="block text-purple-600 text-[11px]">↗ {descreverEscala(p.escala_circulo)}</span>
                  )}
                </span>
                <button onClick={() => { setEditando(p.id); setCriando(false) }}
                  className="text-purple-500 hover:text-white text-[11px] shrink-0">editar</button>
                <button onClick={() => removerPoder(p.id).catch(e => setErro(e.message))}
                  className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0"
                  title="Remover poder">×</button>
              </div>
            </div>
          )
        ))}
        {visiveis.length === 0 && (
          <p className="text-purple-600 text-xs">
            {poderes.length === 0 ? 'Nenhum poder cadastrado ainda.' : 'Nenhum poder bate com o filtro.'}
          </p>
        )}
      </div>

      {/* Criar */}
      {criando ? (
        <PoderForm
          pools={pools}
          classes={classes}
          linhas={linhas}
          onSalvar={async dados => { await criarPoder(dados); setCriando(false) }}
          onCancelar={() => setCriando(false)}
        />
      ) : (
        <button onClick={() => { setCriando(true); setEditando(null) }}
          className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors">
          + Novo poder
        </button>
      )}

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
