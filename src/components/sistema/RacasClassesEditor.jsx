import { useState } from 'react'
import { useRacasClasses } from '../../hooks/useRacasClasses'

const TIPOS_MOD = [
  { value: 'atributo',       label: 'Atributo',           alvoTipo: 'atributo', hasValor: true,  hasOperacao: true  },
  { value: 'vida_max',       label: 'Vida máxima',        alvoTipo: null,       hasValor: true,  hasOperacao: true  },
  { value: 'vida_temp',      label: 'Vida temporária',    alvoTipo: null,       hasValor: true,  hasOperacao: false },
  { value: 'resistencia',    label: 'Resistência',        alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'imunidade',      label: 'Imunidade',          alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'vulnerabilidade',label: 'Vulnerabilidade',    alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'combate',        label: 'Campo de combate',   alvoTipo: 'combate',  hasValor: true,  hasOperacao: true  },
]

const OPERACOES = [
  { value: 'somar',      label: '+ Somar'      },
  { value: 'definir',    label: '= Definir'    },
  { value: 'multiplicar',label: '× Multiplicar'},
]

function labelModificador(mod, atributos, camposCombate) {
  const op = mod.operacao === 'somar' ? '+' : mod.operacao === 'definir' ? '=' : '×'
  switch (mod.tipo) {
    case 'atributo': {
      const attr = atributos.find(a => a.id === mod.alvo)
      return `${op}${mod.valor} em ${attr?.nome || '?'}`
    }
    case 'vida_max':
      return `${op}${mod.valor} Vida máx.`
    case 'vida_temp':
      return `+${mod.valor} Vida temp.`
    case 'resistencia':
      return `Resistência: ${mod.alvo || '?'}`
    case 'imunidade':
      return `Imunidade: ${mod.alvo || '?'}`
    case 'vulnerabilidade':
      return `Vulnerabilidade: ${mod.alvo || '?'}`
    case 'combate': {
      const campo = camposCombate.find(c => c.id === mod.alvo)
      return `${op}${mod.valor} ${campo?.nome || '?'}`
    }
    default:
      return mod.tipo
  }
}

function ModificadorForm({ onAdd, atributos, camposCombate }) {
  const [tipo, setTipo] = useState('atributo')
  const [alvo, setAlvo] = useState('')
  const [operacao, setOperacao] = useState('somar')
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const cfg = TIPOS_MOD.find(t => t.value === tipo)

  function handleTipoChange(novo) {
    setTipo(novo)
    setAlvo('')
    setValor('')
    setErro('')
  }

  async function handleAdd() {
    setErro('')
    if (cfg.alvoTipo === 'atributo' && !alvo)       { setErro('Selecione um atributo.'); return }
    if (cfg.alvoTipo === 'combate' && !alvo)         { setErro('Selecione um campo de combate.'); return }
    if (cfg.alvoTipo === 'texto' && !alvo.trim())    { setErro('Informe o tipo de dano (ex: fogo).'); return }
    if (cfg.hasValor && (valor === '' || isNaN(Number(valor)))) { setErro('Informe um valor numérico válido.'); return }

    setSalvando(true)
    try {
      await onAdd({
        tipo,
        alvo: alvo.trim() || null,
        operacao: cfg.hasOperacao ? operacao : 'somar',
        valor: cfg.hasValor ? valor : null,
      })
      setAlvo('')
      setValor('')
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar modificador.')
    } finally {
      setSalvando(false)
    }
  }

  const inputClass = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="space-y-2 bg-slate-700/40 border border-purple-800/50 rounded-lg p-3">
      <p className="text-purple-400 text-xs font-medium">Adicionar modificador</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={tipo} onChange={e => handleTipoChange(e.target.value)} className={inputClass}>
          {TIPOS_MOD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        {cfg.alvoTipo === 'atributo' && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={inputClass}>
            <option value="">Atributo...</option>
            {atributos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}

        {cfg.alvoTipo === 'combate' && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={inputClass}>
            <option value="">Campo...</option>
            {camposCombate.map(c => (
              <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>
            ))}
          </select>
        )}

        {cfg.alvoTipo === 'texto' && (
          <input
            type="text"
            value={alvo}
            onChange={e => setAlvo(e.target.value)}
            placeholder="Tipo de dano (ex: fogo)"
            className={`${inputClass} w-40`}
          />
        )}

        {cfg.hasOperacao && (
          <select value={operacao} onChange={e => setOperacao(e.target.value)} className={inputClass}>
            {OPERACOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}

        {cfg.hasValor && (
          <input
            type="number"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="Valor"
            className={`${inputClass} w-16 text-center`}
          />
        )}

        <button
          onClick={handleAdd}
          disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
        >
          {salvando ? '...' : '+ Adicionar'}
        </button>
      </div>
      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}

function ItemCard({ item, onUpdate, onDelete, onAddMod, onRemoveMod, atributos, camposCombate }) {
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpdate() {
    if (!editNome.trim()) { setErro('Nome obrigatório.'); return }
    setSalvando(true)
    setErro('')
    try {
      await onUpdate(item.id, editNome, editDesc)
      setEditando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover "${item.nome}"? Todos os modificadores serão apagados.`)) return
    setDeleting(true)
    try {
      await onDelete(item.id)
    } catch {
      setDeleting(false)
    }
  }

  function startEdit() {
    setEditNome(item.nome)
    setEditDesc(item.descricao || '')
    setErro('')
    setEditando(true)
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        {editando ? (
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={editNome}
              onChange={e => setEditNome(e.target.value)}
              placeholder="Nome"
              autoFocus
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                disabled={salvando}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
              >
                {salvando ? '...' : '✓ Salvar'}
              </button>
              <button
                onClick={() => setEditando(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setExpandido(!expandido)} className="flex-1 text-left min-w-0">
              <p className="text-white font-medium text-sm truncate">{item.nome}</p>
              {item.descricao && (
                <p className="text-purple-400 text-xs truncate mt-0.5">{item.descricao}</p>
              )}
            </button>

            {item.modificadores.length > 0 && (
              <span className="text-purple-600 text-[11px] shrink-0">
                {item.modificadores.length} mod.
              </span>
            )}

            <button
              onClick={startEdit}
              className="p-1.5 text-purple-500 hover:text-purple-300 hover:bg-purple-900/40 rounded-lg transition-colors shrink-0"
              title="Editar"
            >
              ✎
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              title="Remover"
            >
              🗑
            </button>
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1.5 text-purple-500 hover:text-purple-300 rounded-lg transition-colors shrink-0 text-xs"
            >
              {expandido ? '▲' : '▼'}
            </button>
          </>
        )}
      </div>

      {expandido && !editando && (
        <div className="border-t border-purple-900 p-4 space-y-3">
          {item.modificadores.length === 0 ? (
            <p className="text-purple-600 text-xs">Nenhum modificador ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {item.modificadores.map(mod => (
                <div
                  key={mod.id}
                  className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-700/50 rounded-lg pl-2.5 pr-1.5 py-1"
                >
                  <span className="text-purple-200 text-xs font-medium">
                    {labelModificador(mod, atributos, camposCombate)}
                  </span>
                  <button
                    onClick={() => onRemoveMod(mod.id)}
                    className="text-red-600 hover:text-red-400 text-xs transition-colors leading-none"
                    title="Remover modificador"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <ModificadorForm
            onAdd={mod => onAddMod(item.id, mod)}
            atributos={atributos}
            camposCombate={camposCombate}
          />
        </div>
      )}
    </div>
  )
}

function SecaoRacaClasse({
  titulo, descTipo, itens,
  onCreate, onUpdate, onDelete, onAddMod, onRemoveMod,
  atributos, camposCombate,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    setCriando(true)
    setErroNovo('')
    try {
      await onCreate(novoNome, novaDesc)
      setAddingNew(false)
      setNovoNome('')
      setNovaDesc('')
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  function cancelarNovo() {
    setAddingNew(false)
    setNovoNome('')
    setNovaDesc('')
    setErroNovo('')
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-purple-200 text-sm font-semibold">{titulo}</p>
        {!addingNew && (
          <button
            onClick={() => setAddingNew(true)}
            className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            + Adicionar
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">Nova {descTipo}</p>
          <input
            type="text"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder={`Nome da ${descTipo} *`}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={inputClass}
          />
          <input
            type="text"
            value={novaDesc}
            onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)"
            className={inputClass}
          />
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={criando}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button
              onClick={cancelarNovo}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {itens.length === 0 && !addingNew ? (
        <div className="border border-dashed border-purple-800 rounded-xl py-4 px-4">
          <p className="text-purple-600 text-xs">
            Nenhuma {descTipo} definida. Crie uma para configurar seus modificadores.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddMod={onAddMod}
              onRemoveMod={onRemoveMod}
              atributos={atributos}
              camposCombate={camposCombate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function RacasClassesEditor({ sistemaId, atributos, camposCombate }) {
  const {
    racas, classes, loading, error,
    createRaca, updateRaca, deleteRaca,
    createClasse, updateClasse, deleteClasse,
    addModificador, removeModificador,
  } = useRacasClasses(sistemaId)

  if (!sistemaId) {
    return (
      <div className="border border-dashed border-purple-800 rounded-xl py-6 px-4 text-center">
        <p className="text-purple-500 text-sm">Salve o sistema antes de criar raças e classes.</p>
        <p className="text-purple-600 text-xs mt-1">
          Clique em "Salvar sistema" acima e volte a esta aba.
        </p>
      </div>
    )
  }

  if (loading) {
    return <div className="py-8 text-center text-purple-400 text-sm">Carregando...</div>
  }

  if (error) {
    return <div className="py-8 text-center text-red-400 text-sm">{error}</div>
  }

  const atributosSalvos = atributos.filter(a => a.id && !a.id.startsWith('temp_'))

  return (
    <div className="space-y-8">
      <SecaoRacaClasse
        titulo="Raças"
        descTipo="raça"
        itens={racas}
        onCreate={createRaca}
        onUpdate={updateRaca}
        onDelete={deleteRaca}
        onAddMod={(itemId, mod) => addModificador({ raca_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
      />

      <div className="border-t border-purple-900" />

      <SecaoRacaClasse
        titulo="Classes"
        descTipo="classe"
        itens={classes}
        onCreate={createClasse}
        onUpdate={updateClasse}
        onDelete={deleteClasse}
        onAddMod={(itemId, mod) => addModificador({ classe_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
      />
    </div>
  )
}
