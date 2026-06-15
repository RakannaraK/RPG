import { useState } from 'react'
import { useRacasClasses } from '../../hooks/useRacasClasses'
import { useHabilidades } from '../../hooks/useHabilidades'

const TIPOS_MOD = [
  { value: 'atributo',        label: 'Atributo',          alvoTipo: 'atributo', hasValor: true,  hasOperacao: true  },
  { value: 'vida_max',        label: 'Vida máxima',       alvoTipo: null,       hasValor: true,  hasOperacao: true  },
  { value: 'vida_temp',       label: 'Vida temporária',   alvoTipo: null,       hasValor: true,  hasOperacao: false },
  { value: 'resistencia',     label: 'Resistência',       alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'imunidade',       label: 'Imunidade',         alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'vulnerabilidade', label: 'Vulnerabilidade',   alvoTipo: 'texto',    hasValor: false, hasOperacao: false },
  { value: 'combate',         label: 'Campo de combate',  alvoTipo: 'combate',  hasValor: true,  hasOperacao: true  },
]

const OPERACOES = [
  { value: 'somar',       label: '+ Somar'       },
  { value: 'definir',     label: '= Definir'     },
  { value: 'multiplicar', label: '× Multiplicar' },
]

function labelModificador(mod, atributos, camposCombate) {
  const op = mod.operacao === 'somar' ? '+' : mod.operacao === 'definir' ? '=' : '×'
  switch (mod.tipo) {
    case 'atributo': {
      const attr = atributos.find(a => a.id === mod.alvo)
      return `${op}${mod.valor} em ${attr?.nome || '?'}`
    }
    case 'vida_max':        return `${op}${mod.valor} Vida máx.`
    case 'vida_temp':       return `+${mod.valor} Vida temp.`
    case 'resistencia':     return `Resistência: ${mod.alvo || '?'}`
    case 'imunidade':       return `Imunidade: ${mod.alvo || '?'}`
    case 'vulnerabilidade': return `Vulnerabilidade: ${mod.alvo || '?'}`
    case 'combate': {
      const campo = camposCombate.find(c => c.id === mod.alvo)
      return `${op}${mod.valor} ${campo?.nome || '?'}`
    }
    default: return mod.tipo
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
    setTipo(novo); setAlvo(''); setValor(''); setErro('')
  }

  async function handleAdd() {
    setErro('')
    if (cfg.alvoTipo === 'atributo' && !alvo)     { setErro('Selecione um atributo.'); return }
    if (cfg.alvoTipo === 'combate' && !alvo)       { setErro('Selecione um campo de combate.'); return }
    if (cfg.alvoTipo === 'texto' && !alvo.trim())  { setErro('Informe o tipo de dano (ex: fogo).'); return }
    if (cfg.hasValor && (valor === '' || isNaN(Number(valor)))) { setErro('Informe um valor numérico válido.'); return }
    setSalvando(true)
    try {
      await onAdd({
        tipo,
        alvo: alvo.trim() || null,
        operacao: cfg.hasOperacao ? operacao : 'somar',
        valor: cfg.hasValor ? valor : null,
      })
      setAlvo(''); setValor('')
    } catch (err) {
      setErro(err.message || 'Erro ao adicionar modificador.')
    } finally {
      setSalvando(false)
    }
  }

  const ic = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="space-y-2 bg-slate-700/40 border border-purple-800/50 rounded-lg p-3">
      <p className="text-purple-400 text-xs font-medium">Adicionar modificador</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={tipo} onChange={e => handleTipoChange(e.target.value)} className={ic}>
          {TIPOS_MOD.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {cfg.alvoTipo === 'atributo' && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={ic}>
            <option value="">Atributo...</option>
            {atributos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        {cfg.alvoTipo === 'combate' && (
          <select value={alvo} onChange={e => setAlvo(e.target.value)} className={ic}>
            <option value="">Campo...</option>
            {camposCombate.map(c => <option key={c.id} value={c.id}>{c.nome || '(sem nome)'}</option>)}
          </select>
        )}
        {cfg.alvoTipo === 'texto' && (
          <input type="text" value={alvo} onChange={e => setAlvo(e.target.value)}
            placeholder="Tipo de dano (ex: fogo)" className={`${ic} w-40`} />
        )}
        {cfg.hasOperacao && (
          <select value={operacao} onChange={e => setOperacao(e.target.value)} className={ic}>
            {OPERACOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {cfg.hasValor && (
          <input type="number" value={valor} onChange={e => setValor(e.target.value)}
            placeholder="Valor" className={`${ic} w-16 text-center`} />
        )}
        <button onClick={handleAdd} disabled={salvando}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : '+ Adicionar'}
        </button>
      </div>
      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
    </div>
  )
}

function ModificadoresExpandido({ modificadores, onAddMod, onRemoveMod, atributos, camposCombate }) {
  return (
    <div className="border-t border-purple-900 p-4 space-y-3">
      <p className="text-purple-500 text-xs font-medium uppercase tracking-wider">Modificadores</p>
      {modificadores.length === 0 ? (
        <p className="text-purple-600 text-xs">Nenhum modificador ainda.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {modificadores.map(mod => (
            <div key={mod.id}
              className="flex items-center gap-1.5 bg-purple-900/40 border border-purple-700/50 rounded-lg pl-2.5 pr-1.5 py-1">
              <span className="text-purple-200 text-xs font-medium">
                {labelModificador(mod, atributos, camposCombate)}
              </span>
              <button onClick={() => onRemoveMod(mod.id)}
                className="text-red-600 hover:text-red-400 text-xs transition-colors leading-none"
                title="Remover modificador">✕</button>
            </div>
          ))}
        </div>
      )}
      <ModificadorForm onAdd={onAddMod} atributos={atributos} camposCombate={camposCombate} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Habilidades
// ──────────────────────────────────────────────────────────

const SEL = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500'
const INP = 'w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

// Card compartilhado: usado tanto dentro da seção da raça/classe quanto na seção de avulsas.
// Não expõe seletor de raça/classe no formulário de edição — vínculo é gerenciado pelo contexto.
function HabilidadeVinculadaCard({ habilidade, atributos, camposCombate, onUpdate, onDelete, onAddMod, onRemoveMod }) {
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editTipo, setEditTipo] = useState('passiva')
  const [editRecNome, setEditRecNome] = useState('')
  const [editRecMax, setEditRecMax] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpdate() {
    if (!editNome.trim()) { setErro('Nome obrigatório.'); return }
    if (editTipo === 'ativavel' && editRecNome.trim() &&
        (editRecMax === '' || isNaN(Number(editRecMax)) || Number(editRecMax) < 1)) {
      setErro('Informe um máximo de usos válido (número positivo).'); return
    }
    setSalvando(true); setErro('')
    try {
      await onUpdate(habilidade.id, {
        nome: editNome, descricao: editDesc, tipo: editTipo,
        recurso_nome: editTipo === 'ativavel' ? editRecNome : '',
        recurso_max: editTipo === 'ativavel' && editRecNome.trim() ? editRecMax : null,
      })
      setEditando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remover "${habilidade.nome}"? Todos os modificadores serão apagados.`)) return
    setDeleting(true)
    try { await onDelete(habilidade.id) } catch { setDeleting(false) }
  }

  function startEdit() {
    setEditNome(habilidade.nome)
    setEditDesc(habilidade.descricao || '')
    setEditTipo(habilidade.tipo || 'passiva')
    setEditRecNome(habilidade.recurso_nome || '')
    setEditRecMax(habilidade.recurso_max != null ? String(habilidade.recurso_max) : '')
    setErro(''); setEditando(true)
  }

  const tipoBadge = habilidade.tipo === 'ativavel'
    ? 'bg-blue-900/60 border border-blue-700/60 text-blue-300'
    : 'bg-green-900/60 border border-green-700/60 text-green-300'

  return (
    <div className="bg-slate-700/50 border border-purple-900/50 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        {editando ? (
          <div className="flex-1 space-y-2">
            <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
              placeholder="Nome" autoFocus className={INP} />
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição (opcional)" className={INP} />
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <p className="text-purple-400 text-xs mb-1">Tipo</p>
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className={SEL}>
                  <option value="passiva">Passiva (sempre ativa)</option>
                  <option value="ativavel">Ativável (toggle on/off)</option>
                </select>
              </div>
              {editTipo === 'ativavel' && (
                <>
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                    <input type="text" value={editRecNome} onChange={e => setEditRecNome(e.target.value)}
                      placeholder="Ex: Pontos de Fúria" className={`${SEL} w-44`} />
                  </div>
                  {editRecNome.trim() && (
                    <div>
                      <p className="text-purple-400 text-xs mb-1">Máximo</p>
                      <input type="number" value={editRecMax} onChange={e => setEditRecMax(e.target.value)}
                        min="1" className={`${SEL} w-20 text-center`} />
                    </div>
                  )}
                </>
              )}
            </div>
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={salvando}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
                {salvando ? '...' : '✓ Salvar'}
              </button>
              <button onClick={() => setEditando(false)}
                className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => setExpandido(!expandido)} className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-white text-xs font-medium">{habilidade.nome}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tipoBadge}`}>
                  {habilidade.tipo === 'ativavel' ? 'Ativável' : 'Passiva'}
                </span>
                {habilidade.tipo === 'ativavel' && habilidade.recurso_nome && (
                  <span className="text-amber-400 text-[10px]">
                    {habilidade.recurso_nome} · {habilidade.recurso_max ?? '?'} usos
                  </span>
                )}
              </div>
              {habilidade.descricao && (
                <p className="text-purple-500 text-[11px] mt-0.5 truncate">{habilidade.descricao}</p>
              )}
            </button>
            {habilidade.modificadores.length > 0 && (
              <span className="text-purple-600 text-[10px] shrink-0">{habilidade.modificadores.length} mod.</span>
            )}
            <button onClick={startEdit}
              className="p-1.5 text-purple-500 hover:text-purple-300 hover:bg-purple-900/40 rounded-lg transition-colors shrink-0"
              title="Editar">✎</button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              title="Remover">🗑</button>
            <button onClick={() => setExpandido(!expandido)}
              className="p-1.5 text-purple-500 hover:text-purple-300 rounded-lg transition-colors shrink-0 text-xs">
              {expandido ? '▲' : '▼'}
            </button>
          </>
        )}
      </div>
      {expandido && !editando && (
        <ModificadoresExpandido
          modificadores={habilidade.modificadores}
          onAddMod={onAddMod}
          onRemoveMod={onRemoveMod}
          atributos={atributos}
          camposCombate={camposCombate}
        />
      )}
    </div>
  )
}

// Seção de habilidades vinculadas que aparece dentro do card expandido de uma raça ou classe.
function HabilidadesVinculadas({
  parentId, parentTipo,
  habilidades, atributos, camposCombate,
  onCreate, onUpdate, onDelete, onAddMod, onRemoveMod,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoTipo, setNovoTipo] = useState('passiva')
  const [novoRecNome, setNovoRecNome] = useState('')
  const [novoRecMax, setNovoRecMax] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  const vinculadas = habilidades.filter(h =>
    parentTipo === 'raca' ? h.raca_id === parentId : h.classe_id === parentId
  )

  function resetNovo() {
    setNovoNome(''); setNovaDesc(''); setNovoTipo('passiva')
    setNovoRecNome(''); setNovoRecMax(''); setErroNovo('')
  }

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    if (novoTipo === 'ativavel' && novoRecNome.trim() &&
        (novoRecMax === '' || isNaN(Number(novoRecMax)) || Number(novoRecMax) < 1)) {
      setErroNovo('Informe um máximo de usos válido (número positivo).'); return
    }
    setCriando(true); setErroNovo('')
    try {
      const idField = parentTipo === 'raca' ? 'raca_id' : 'classe_id'
      const otherField = parentTipo === 'raca' ? 'classe_id' : 'raca_id'
      await onCreate({
        nome: novoNome, descricao: novaDesc, tipo: novoTipo,
        recurso_nome: novoTipo === 'ativavel' ? novoRecNome : '',
        recurso_max: novoTipo === 'ativavel' && novoRecNome.trim() ? novoRecMax : null,
        [idField]: parentId,
        [otherField]: null,
      })
      setAddingNew(false); resetNovo()
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="border-t border-purple-900/60 px-4 py-3 space-y-2 bg-slate-900/20">
      <div className="flex items-center justify-between">
        <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Habilidades</p>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-xs px-2.5 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white rounded-lg transition-colors border border-purple-700/50">
            + Nova habilidade
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-800 rounded-lg p-3 space-y-2">
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da habilidade *" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={INP} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={INP} />
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <p className="text-purple-400 text-xs mb-1">Tipo</p>
              <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} className={SEL}>
                <option value="passiva">Passiva (sempre ativa)</option>
                <option value="ativavel">Ativável (toggle on/off)</option>
              </select>
            </div>
            {novoTipo === 'ativavel' && (
              <>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                  <input type="text" value={novoRecNome} onChange={e => setNovoRecNome(e.target.value)}
                    placeholder="Ex: Pontos de Fúria" className={`${SEL} w-40`} />
                </div>
                {novoRecNome.trim() && (
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Máximo</p>
                    <input type="number" value={novoRecMax} onChange={e => setNovoRecMax(e.target.value)}
                      min="1" placeholder="4" className={`${SEL} w-20 text-center`} />
                  </div>
                )}
              </>
            )}
          </div>
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={() => { setAddingNew(false); resetNovo() }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {vinculadas.length === 0 && !addingNew && (
        <p className="text-purple-700 text-xs italic">Nenhuma habilidade vinculada ainda.</p>
      )}
      {vinculadas.map(h => (
        <HabilidadeVinculadaCard
          key={h.id}
          habilidade={h}
          atributos={atributos}
          camposCombate={camposCombate}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddMod={mod => onAddMod({ habilidade_id: h.id, ...mod })}
          onRemoveMod={onRemoveMod}
        />
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Raças & Classes
// ──────────────────────────────────────────────────────────

function ItemCard({
  item, parentTipo,
  onUpdate, onDelete, onAddMod, onRemoveMod,
  atributos, camposCombate,
  habilidades, onCreateHabilidade, onUpdateHabilidade, onDeleteHabilidade,
  onAddHabilidadeMod, onRemoveHabilidadeMod,
}) {
  const [expandido, setExpandido] = useState(false)
  const [editando, setEditando] = useState(false)
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [erro, setErro] = useState('')

  async function handleUpdate() {
    if (!editNome.trim()) { setErro('Nome obrigatório.'); return }
    setSalvando(true); setErro('')
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
    if (!window.confirm(`Remover "${item.nome}"?\nTodos os modificadores e habilidades vinculadas serão apagados.`)) return
    setDeleting(true)
    try { await onDelete(item.id) } catch { setDeleting(false) }
  }

  function startEdit() {
    setEditNome(item.nome); setEditDesc(item.descricao || ''); setErro(''); setEditando(true)
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        {editando ? (
          <div className="flex-1 space-y-2">
            <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)}
              placeholder="Nome" autoFocus
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-full px-3 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
            {erro && <p className="text-red-400 text-xs">{erro}</p>}
            <div className="flex gap-2">
              <button onClick={handleUpdate} disabled={salvando}
                className="px-3 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
                {salvando ? '...' : '✓ Salvar'}
              </button>
              <button onClick={() => setEditando(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
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
              <span className="text-purple-600 text-[11px] shrink-0">{item.modificadores.length} mod.</span>
            )}
            <button onClick={startEdit}
              className="p-1.5 text-purple-500 hover:text-purple-300 hover:bg-purple-900/40 rounded-lg transition-colors shrink-0"
              title="Editar">✎</button>
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 text-red-600 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              title="Remover">🗑</button>
            <button onClick={() => setExpandido(!expandido)}
              className="p-1.5 text-purple-500 hover:text-purple-300 rounded-lg transition-colors shrink-0 text-xs">
              {expandido ? '▲' : '▼'}
            </button>
          </>
        )}
      </div>

      {expandido && !editando && (
        <>
          <ModificadoresExpandido
            modificadores={item.modificadores}
            onAddMod={onAddMod}
            onRemoveMod={onRemoveMod}
            atributos={atributos}
            camposCombate={camposCombate}
          />
          <HabilidadesVinculadas
            parentId={item.id}
            parentTipo={parentTipo}
            habilidades={habilidades}
            atributos={atributos}
            camposCombate={camposCombate}
            onCreate={onCreateHabilidade}
            onUpdate={onUpdateHabilidade}
            onDelete={onDeleteHabilidade}
            onAddMod={onAddHabilidadeMod}
            onRemoveMod={onRemoveHabilidadeMod}
          />
        </>
      )}
    </div>
  )
}

function SecaoRacaClasse({
  titulo, descTipo, itens, parentTipo,
  onCreate, onUpdate, onDelete, onAddMod, onRemoveMod,
  atributos, camposCombate,
  habilidades, onCreateHabilidade, onUpdateHabilidade, onDeleteHabilidade,
  onAddHabilidadeMod, onRemoveHabilidadeMod,
}) {
  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    setCriando(true); setErroNovo('')
    try {
      await onCreate(novoNome, novaDesc)
      setAddingNew(false); setNovoNome(''); setNovaDesc('')
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  function cancelarNovo() {
    setAddingNew(false); setNovoNome(''); setNovaDesc(''); setErroNovo('')
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-purple-200 text-sm font-semibold">{titulo}</p>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors">
            + Adicionar
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">Nova {descTipo}</p>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder={`Nome da ${descTipo} *`} autoFocus
            onKeyDown={e => e.key === 'Enter' && handleCreate()} className={inputClass} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={inputClass} />
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={cancelarNovo}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {itens.length === 0 && !addingNew ? (
        <div className="border border-dashed border-purple-800 rounded-xl py-4 px-4">
          <p className="text-purple-600 text-xs">
            Nenhuma {descTipo} definida. Crie uma para configurar seus modificadores e habilidades.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itens.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              parentTipo={parentTipo}
              onUpdate={onUpdate}
              onDelete={onDelete}
              // Vincula item.id antes de repassar — garante que o modificador vai para a raça/classe correta
              onAddMod={mod => onAddMod(item.id, mod)}
              onRemoveMod={onRemoveMod}
              atributos={atributos}
              camposCombate={camposCombate}
              habilidades={habilidades}
              onCreateHabilidade={onCreateHabilidade}
              onUpdateHabilidade={onUpdateHabilidade}
              onDeleteHabilidade={onDeleteHabilidade}
              onAddHabilidadeMod={onAddHabilidadeMod}
              onRemoveHabilidadeMod={onRemoveHabilidadeMod}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Habilidades avulsas (sem raça nem classe)
// ──────────────────────────────────────────────────────────

function SecaoHabilidades({ habilidades, atributos, camposCombate, onCreate, onUpdate, onDelete, onAddMod, onRemoveMod }) {
  const avulsas = habilidades.filter(h => !h.raca_id && !h.classe_id)

  const [addingNew, setAddingNew] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDesc, setNovaDesc] = useState('')
  const [novoTipo, setNovoTipo] = useState('passiva')
  const [novoRecNome, setNovoRecNome] = useState('')
  const [novoRecMax, setNovoRecMax] = useState('')
  const [criando, setCriando] = useState(false)
  const [erroNovo, setErroNovo] = useState('')

  function resetNovo() {
    setNovoNome(''); setNovaDesc(''); setNovoTipo('passiva')
    setNovoRecNome(''); setNovoRecMax(''); setErroNovo('')
  }

  async function handleCreate() {
    if (!novoNome.trim()) { setErroNovo('Nome obrigatório.'); return }
    if (novoTipo === 'ativavel' && novoRecNome.trim() &&
        (novoRecMax === '' || isNaN(Number(novoRecMax)) || Number(novoRecMax) < 1)) {
      setErroNovo('Informe um máximo de usos válido (número positivo).'); return
    }
    setCriando(true); setErroNovo('')
    try {
      await onCreate({
        nome: novoNome, descricao: novaDesc, tipo: novoTipo,
        recurso_nome: novoTipo === 'ativavel' ? novoRecNome : '',
        recurso_max: novoTipo === 'ativavel' && novoRecNome.trim() ? novoRecMax : null,
        raca_id: null,
        classe_id: null,
      })
      setAddingNew(false); resetNovo()
    } catch (err) {
      setErroNovo(err.message || 'Erro ao criar.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-purple-200 text-sm font-semibold">Habilidades avulsas</p>
          <p className="text-purple-600 text-xs mt-0.5">
            Não vinculadas a raça ou classe — adicionadas manualmente às fichas.
          </p>
        </div>
        {!addingNew && (
          <button onClick={() => setAddingNew(true)}
            className="text-sm px-3 py-1.5 bg-purple-800 hover:bg-purple-700 text-white rounded-lg transition-colors shrink-0">
            + Adicionar
          </button>
        )}
      </div>

      {addingNew && (
        <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
          <p className="text-purple-300 text-xs font-medium">Nova habilidade avulsa</p>
          <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Nome da habilidade *" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className={INP} />
          <input type="text" value={novaDesc} onChange={e => setNovaDesc(e.target.value)}
            placeholder="Descrição (opcional)" className={INP} />
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <p className="text-purple-400 text-xs mb-1">Tipo</p>
              <select value={novoTipo} onChange={e => setNovoTipo(e.target.value)} className={SEL}>
                <option value="passiva">Passiva (sempre ativa)</option>
                <option value="ativavel">Ativável (toggle on/off)</option>
              </select>
            </div>
            {novoTipo === 'ativavel' && (
              <>
                <div>
                  <p className="text-purple-400 text-xs mb-1">Recurso (opcional)</p>
                  <input type="text" value={novoRecNome} onChange={e => setNovoRecNome(e.target.value)}
                    placeholder="Ex: Pontos de Fúria" className={`${SEL} w-44`} />
                </div>
                {novoRecNome.trim() && (
                  <div>
                    <p className="text-purple-400 text-xs mb-1">Máximo</p>
                    <input type="number" value={novoRecMax} onChange={e => setNovoRecMax(e.target.value)}
                      min="1" placeholder="4" className={`${SEL} w-20 text-center`} />
                  </div>
                )}
              </>
            )}
          </div>
          {erroNovo && <p className="text-red-400 text-xs">{erroNovo}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={criando}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors">
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button onClick={() => { setAddingNew(false); resetNovo() }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {avulsas.length === 0 && !addingNew ? (
        <div className="border border-dashed border-purple-800 rounded-xl py-4 px-4">
          <p className="text-purple-600 text-xs">
            Nenhuma habilidade avulsa. Crie uma passiva ou ativável que jogadores poderão adicionar manualmente às fichas.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {avulsas.map(h => (
            <HabilidadeVinculadaCard
              key={h.id}
              habilidade={h}
              atributos={atributos}
              camposCombate={camposCombate}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddMod={mod => onAddMod({ habilidade_id: h.id, ...mod })}
              onRemoveMod={onRemoveMod}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────

export default function RacasClassesEditor({ sistemaId, atributos, camposCombate }) {
  const {
    racas, classes, loading, error,
    createRaca, updateRaca, deleteRaca,
    createClasse, updateClasse, deleteClasse,
    addModificador, removeModificador,
  } = useRacasClasses(sistemaId)

  const {
    habilidades, loading: loadingHabs, error: errorHabs,
    createHabilidade, updateHabilidade, deleteHabilidade,
    addModificador: addHabMod, removeModificador: removeHabMod,
    refetch: refetchHabilidades,
  } = useHabilidades(sistemaId)

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

  if (loading || loadingHabs) {
    return <div className="py-8 text-center text-purple-400 text-sm">Carregando...</div>
  }

  if (error || errorHabs) {
    return <div className="py-8 text-center text-red-400 text-sm">{error || errorHabs}</div>
  }

  const atributosSalvos = atributos.filter(a => a.id && !a.id.startsWith('temp_'))

  // Após deletar raça/classe, o CASCADE do banco remove as habilidades vinculadas.
  // Fazemos refetch para sincronizar o estado local.
  async function handleDeleteRaca(id) {
    await deleteRaca(id)
    refetchHabilidades()
  }

  async function handleDeleteClasse(id) {
    await deleteClasse(id)
    refetchHabilidades()
  }

  return (
    <div className="space-y-8">
      <SecaoRacaClasse
        titulo="Raças"
        descTipo="raça"
        itens={racas}
        parentTipo="raca"
        onCreate={createRaca}
        onUpdate={updateRaca}
        onDelete={handleDeleteRaca}
        onAddMod={(itemId, mod) => addModificador({ raca_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        habilidades={habilidades}
        onCreateHabilidade={createHabilidade}
        onUpdateHabilidade={updateHabilidade}
        onDeleteHabilidade={deleteHabilidade}
        onAddHabilidadeMod={addHabMod}
        onRemoveHabilidadeMod={removeHabMod}
      />

      <div className="border-t border-purple-900" />

      <SecaoRacaClasse
        titulo="Classes"
        descTipo="classe"
        itens={classes}
        parentTipo="classe"
        onCreate={createClasse}
        onUpdate={updateClasse}
        onDelete={handleDeleteClasse}
        onAddMod={(itemId, mod) => addModificador({ classe_id: itemId, ...mod })}
        onRemoveMod={removeModificador}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        habilidades={habilidades}
        onCreateHabilidade={createHabilidade}
        onUpdateHabilidade={updateHabilidade}
        onDeleteHabilidade={deleteHabilidade}
        onAddHabilidadeMod={addHabMod}
        onRemoveHabilidadeMod={removeHabMod}
      />

      <div className="border-t border-purple-900" />

      <SecaoHabilidades
        habilidades={habilidades}
        atributos={atributosSalvos}
        camposCombate={camposCombate}
        onCreate={createHabilidade}
        onUpdate={updateHabilidade}
        onDelete={deleteHabilidade}
        onAddMod={addHabMod}
        onRemoveMod={removeHabMod}
      />
    </div>
  )
}
