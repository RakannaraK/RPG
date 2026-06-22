import { useState, useEffect } from 'react'
import { useSistema, useSaveSistema } from '../../hooks/useSistema'
import { mergeConfigLayout } from '../../lib/sistemaDefaults'
import AtributoEditor from './AtributoEditor'
import LayoutEditor from './LayoutEditor'
import RacasClassesEditor from './RacasClassesEditor'

const TABS_EDITOR = ['Atributos', 'Layout da ficha', 'Raças & Classes']

const REGRA_PADRAO = {
  tipo: 'dados',
  quantidade: 2,
  lados: 6,
  descartar_menores: 0,
  descartar_maiores: 0,
  bonus_fixo: 0,
}

function newAtributo() {
  return {
    id: `temp_${Date.now()}_${Math.random()}`,
    nome: '',
    descricao: '',
    ordem: 0,
    regra_rolagem: { ...REGRA_PADRAO },
  }
}

function newPericia() {
  return {
    id: `temp_${Date.now()}_${Math.random()}`,
    nome: '',
    atributo_base_id: null,
    ordem: 0,
  }
}

export default function SistemaEditor({ mesaId, isMestre }) {
  const { sistema: sistemaDB, atributos: atributosDB, pericias: periciasDB, loading, error, refetch } = useSistema(mesaId)
  const { saveSistema, loading: saving } = useSaveSistema()

  const [activeTab, setActiveTab] = useState('Atributos')

  // Sistema
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  // Atributos
  const [atributos, setAtributos] = useState([])
  const [removedAtributoIds, setRemovedAtributoIds] = useState([])

  // Layout
  const [configLayout, setConfigLayout] = useState(mergeConfigLayout(null))

  // Perícias
  const [pericias, setPericias] = useState([])
  const [removedPericiaIds, setRemovedPericiaIds] = useState([])

  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sincroniza estado local quando dados do DB chegam
  useEffect(() => {
    setNome(sistemaDB?.nome || '')
    setDescricao(sistemaDB?.descricao || '')
    setAtributos(atributosDB.map(a => ({ ...a })))
    setConfigLayout(mergeConfigLayout(sistemaDB?.config_layout))
    setPericias(periciasDB.map(p => ({ ...p })))
    setRemovedAtributoIds([])
    setRemovedPericiaIds([])
  }, [sistemaDB, atributosDB, periciasDB])

  // --- Atributos ---
  function addAtributo() {
    setAtributos(prev => [...prev, newAtributo()])
  }

  function updateAtributo(index, updated) {
    setAtributos(prev => prev.map((a, i) => (i === index ? updated : a)))
  }

  function removeAtributo(index) {
    const attr = atributos[index]
    if (attr.id && !attr.id.startsWith('temp_')) {
      const nomeAttr = attr.nome || 'este atributo'
      if (!window.confirm(`Remover "${nomeAttr}"? Os valores já salvos em fichas existentes serão apagados ao salvar o sistema.`)) return
      setRemovedAtributoIds(prev => [...prev, attr.id])
    }
    setAtributos(prev => prev.filter((_, i) => i !== index))
  }

  // --- Perícias ---
  function addPericia() {
    setPericias(prev => [...prev, newPericia()])
  }

  function updatePericia(index, updated) {
    setPericias(prev => prev.map((p, i) => (i === index ? updated : p)))
  }

  function removePericia(index, p) {
    if (p.id && !p.id.startsWith('temp_')) {
      setRemovedPericiaIds(prev => [...prev, p.id])
    }
    setPericias(prev => prev.filter((_, i) => i !== index))
  }

  // --- Salvar ---
  async function handleSave() {
    setSaveError('')
    setSaveSuccess(false)

    if (!nome.trim()) {
      setSaveError('O sistema precisa ter um nome.')
      return
    }
    const invalidos = atributos.filter(a => !a.nome.trim())
    if (invalidos.length > 0) {
      setSaveError('Todos os atributos precisam ter um nome.')
      return
    }

    try {
      await saveSistema({
        mesaId,
        sistema: { id: sistemaDB?.id, nome: nome.trim(), descricao: descricao.trim() },
        atributos,
        removedAtributoIds,
        configLayout,
        pericias,
        removedPericiaIds,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      refetch()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-purple-400">Carregando sistema...</div>
  }

  if (error) {
    return <div className="py-12 text-center text-red-400">{error}</div>
  }

  // Jogadores: visualização somente leitura
  if (!isMestre) {
    if (!sistemaDB) {
      return (
        <div className="text-center py-16 border border-dashed border-purple-800 rounded-2xl">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="text-purple-300 text-lg font-medium">Nenhum sistema definido</p>
          <p className="text-purple-500 text-sm mt-2">Aguarde o mestre configurar o sistema de regras.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white">{sistemaDB.nome}</h2>
          {sistemaDB.descricao && <p className="text-purple-300 mt-1 text-sm">{sistemaDB.descricao}</p>}
        </div>
        {atributosDB.length === 0 ? (
          <p className="text-purple-500 text-sm">Nenhum atributo definido ainda.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-purple-300 text-sm font-medium">Atributos ({atributosDB.length})</p>
            {atributosDB.map(attr => (
              <div key={attr.id} className="bg-slate-800 border border-purple-800 rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">{attr.nome}</p>
                    {attr.descricao && <p className="text-purple-400 text-xs mt-0.5">{attr.descricao}</p>}
                  </div>
                  <span className="text-amber-400 font-mono text-sm shrink-0">
                    {attr.regra_rolagem?.tipo === 'dados'
                      ? `${attr.regra_rolagem.quantidade}d${attr.regra_rolagem.lados}`
                      : attr.regra_rolagem?.tipo === 'fixo'
                      ? `Fixo ${attr.regra_rolagem.valor}`
                      : `${attr.regra_rolagem?.pool_total} pts`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Mestre: editor completo com abas
  return (
    <div className="space-y-6">
      {/* Nome e descrição do sistema */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-white">
          {sistemaDB ? 'Editar sistema' : 'Criar sistema de regras'}
        </h2>
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">Nome do sistema *</label>
          <input
            type="text"
            placeholder="Ex: D&D 5e, Homebrew, Call of Cthulhu..."
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-purple-200 mb-1">Descrição (opcional)</label>
          <input
            type="text"
            placeholder="Uma descrição breve do sistema..."
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Sub-abas: Atributos | Layout da ficha */}
      <div>
        <div className="flex border-b border-purple-900 mb-5 overflow-x-auto">
          {TABS_EDITOR.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
                activeTab === tab
                  ? 'text-white border-purple-500'
                  : 'text-purple-400 border-transparent hover:text-purple-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Atributos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-purple-200">
                Atributos {atributos.length > 0 && `(${atributos.length})`}
              </p>
              <button
                type="button"
                onClick={addAtributo}
                className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                + Adicionar atributo
              </button>
            </div>

            {atributos.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-purple-800 rounded-xl text-purple-500 text-sm">
                Nenhum atributo ainda. Clique em "Adicionar atributo" para começar.
              </div>
            ) : (
              <div className="space-y-3">
                {atributos.map((attr, i) => (
                  <AtributoEditor
                    key={attr.id}
                    atributo={attr}
                    index={i}
                    onChange={updated => updateAtributo(i, updated)}
                    onRemove={() => removeAtributo(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'Layout da ficha' && (
          <LayoutEditor
            config={configLayout}
            onConfigChange={setConfigLayout}
            pericias={pericias}
            onAddPericia={addPericia}
            onUpdatePericia={updatePericia}
            onRemovePericia={removePericia}
            atributos={atributos}
          />
        )}

        {activeTab === 'Raças & Classes' && (
          <RacasClassesEditor
            sistemaId={sistemaDB?.id}
            atributos={atributos}
            camposCombate={configLayout.campos_combate || []}
            pericias={pericias}
          />
        )}
      </div>

      {/* Botão salvar */}
      <div className="border-t border-purple-900 pt-4 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar sistema'}
        </button>

        {saveSuccess && (
          <span className="text-green-400 text-sm">✓ Sistema salvo!</span>
        )}
        {saveError && (
          <span className="text-red-400 text-sm">{saveError}</span>
        )}
      </div>
    </div>
  )
}
