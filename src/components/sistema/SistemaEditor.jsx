import { useState, useEffect } from 'react'
import { useSistema, useSaveSistema } from '../../hooks/useSistema'
import AtributoEditor from './AtributoEditor'

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

export default function SistemaEditor({ mesaId, isMestre }) {
  const { sistema: sistemaDB, atributos: atributosDB, loading, error, refetch } = useSistema(mesaId)
  const { saveSistema, loading: saving } = useSaveSistema()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [atributos, setAtributos] = useState([])
  const [removedIds, setRemovedIds] = useState([])
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sincroniza estado local quando dados do DB chegam
  useEffect(() => {
    setNome(sistemaDB?.nome || '')
    setDescricao(sistemaDB?.descricao || '')
    setAtributos(atributosDB.map(a => ({ ...a })))
    setRemovedIds([])
  }, [sistemaDB, atributosDB])

  function addAtributo() {
    setAtributos(prev => [...prev, newAtributo()])
  }

  function updateAtributo(index, updated) {
    setAtributos(prev => prev.map((a, i) => i === index ? updated : a))
  }

  function removeAtributo(index) {
    const attr = atributos[index]
    if (attr.id && !attr.id.startsWith('temp_')) {
      const nome = attr.nome || 'este atributo'
      if (!window.confirm(`Remover "${nome}"? Os valores já salvos em fichas existentes serão apagados ao salvar o sistema.`)) return
      setRemovedIds(prev => [...prev, attr.id])
    }
    setAtributos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaveError('')
    setSaveSuccess(false)

    const atributosInvalidos = atributos.filter(a => !a.nome.trim())
    if (atributosInvalidos.length > 0) {
      setSaveError('Todos os atributos precisam ter um nome.')
      return
    }
    if (!nome.trim()) {
      setSaveError('O sistema precisa ter um nome.')
      return
    }

    try {
      await saveSistema({
        mesaId,
        sistema: { id: sistemaDB?.id, nome: nome.trim(), descricao: descricao.trim() },
        atributos,
        removedAtributoIds: removedIds,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      refetch()
    } catch (err) {
      setSaveError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-purple-400">Carregando sistema...</div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-400">{error}</div>
    )
  }

  // Jogadores só visualizam
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

  // Mestre: editor completo
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {sistemaDB ? 'Editar sistema' : 'Criar sistema de regras'}
        </h2>

        <div className="space-y-3">
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
      </div>

      {/* Atributos */}
      <div>
        <div className="flex items-center justify-between mb-3">
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

      {/* Salvar */}
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
