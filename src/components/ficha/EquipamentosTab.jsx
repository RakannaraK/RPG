import { useState } from 'react'
import { useItens } from '../../hooks/useItens'
import { useRolagem } from '../../hooks/useRolagem'
import { validarNotacao, resolverNotacao } from '../../lib/diceNotation'
import { montarNotacaoComModificadores } from '../../lib/rollModifiers'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import { redimensionarImagem } from '../../lib/imageUtils'
import { supabase } from '../../lib/supabase'
import ImageUpload from './ImageUpload'
import Dice3D from '../dados/Dice3D'

const TIPOS_ITEM = ['item', 'arma', 'armadura', 'magico', 'outro']

const TIPO_LABELS = {
  item: 'Item',
  arma: 'Arma',
  armadura: 'Armadura',
  magico: 'Mágico',
  outro: 'Outro',
}

const TIPO_COLORS = {
  item: 'bg-slate-700 text-slate-200',
  arma: 'bg-red-900 text-red-200',
  armadura: 'bg-blue-900 text-blue-200',
  magico: 'bg-purple-800 text-purple-200',
  outro: 'bg-gray-700 text-gray-200',
}

function pairsToObject(pairs) {
  return pairs.reduce((obj, p) => {
    if (p.chave.trim()) obj[p.chave.trim()] = p.valor
    return obj
  }, {})
}

function objectToPairs(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([chave, valor]) => ({ chave, valor: String(valor) }))
}

function RollResultCompact({ resultado, rotulo, rolando, onClose, skin, detalhamento }) {
  const { notacao, dados, mantidos, descartados, modificador, total } = resultado
  const extras = (detalhamento || []).filter(d => d.fonte)
  return (
    <div className="bg-slate-700/60 border border-purple-700/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2 flex-wrap">
          {rotulo && <span className="text-white text-xs font-semibold">{rotulo}</span>}
          <span className="text-purple-400 font-mono text-xs">{notacao}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-purple-600 hover:text-purple-400 text-xs ml-2 transition-colors"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {dados.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <Dice3D
              lados={d.lados}
              resultado={d.valor}
              rolando={rolando}
              descartado={d.descartado}
              skin={skin}
            />
            {d.descartado && <span className="text-red-500 text-[9px]">desc.</span>}
          </div>
        ))}
        <div className="flex items-baseline gap-1.5 ml-1">
          <span className="text-purple-400 text-xs">Total:</span>
          <span className="text-2xl font-bold text-white leading-none">{total}</span>
        </div>
      </div>
      {(mantidos.length > 1 || modificador !== 0) && (
        <p className="text-purple-500 text-xs">
          ({mantidos.join(' + ')}
          {modificador > 0 && ` + ${modificador}`}
          {modificador < 0 && ` − ${Math.abs(modificador)}`})
        </p>
      )}
      {descartados.length > 0 && (
        <p className="text-red-500 text-xs">descartados: {descartados.join(', ')}</p>
      )}
      {extras.length > 0 && (
        <p className="text-purple-500 text-[10px] leading-tight">
          {extras.map((d, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {d.fonte}: {d.tipo === 'dados' ? d.valor : (d.valor > 0 ? `+${d.valor}` : d.valor)}
              {d.escopo ? ` (${d.escopo})` : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}

function ItemForm({ item, fichaId, donoId, categorias = [], onSalvar, onFechar }) {
  const [nome, setNome] = useState(item?.nome || '')
  const [tipo, setTipo] = useState(item?.tipo || 'item')
  const [categoriaId, setCategoriaId] = useState(item?.categoria_id || '') // 21.1
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [pairs, setPairs] = useState(objectToPairs(item?.atributos_extras))
  const [selectedFile, setSelectedFile] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  function addPair() {
    setPairs(prev => [...prev, { chave: '', valor: '' }])
  }

  function removePair(i) {
    setPairs(prev => prev.filter((_, idx) => idx !== i))
  }

  function updatePair(i, campo, valor) {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, [campo]: valor } : p))
  }

  async function handleSalvar() {
    setErro('')
    if (!nome.trim()) { setErro('O nome do item é obrigatório.'); return }
    setSalvando(true)
    try {
      let imagem_url = item?.imagem_url || null

      if (selectedFile) {
        const resized = await redimensionarImagem(selectedFile)
        const path = `${donoId}/${fichaId}/itens/${Date.now()}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('fichas-imagens')
          .upload(path, resized, { contentType: 'image/jpeg' })
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage
          .from('fichas-imagens')
          .getPublicUrl(path)
        imagem_url = urlData.publicUrl
      }

      const atributosObj = pairsToObject(pairs)

      await onSalvar({
        nome: nome.trim(),
        tipo,
        categoria_id: categoriaId || null, // 21.1
        descricao: descricao.trim() || null,
        atributos_extras: Object.keys(atributosObj).length > 0 ? atributosObj : null,
        imagem_url,
      })
    } catch (err) {
      setErro(err.message || 'Erro ao salvar item.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900 shrink-0">
          <h2 className="text-white font-bold text-lg">
            {item ? 'Editar item' : 'Novo item'}
          </h2>
          <button
            onClick={onFechar}
            className="text-purple-400 hover:text-white text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-purple-200 mb-1">Nome *</label>
              <input
                type="text"
                placeholder="Ex: Espada Longa +1"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {TIPOS_ITEM.map(t => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 21.1 — categoria do item (para maestria por categoria) */}
          {categorias.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-1">Categoria</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descrição, história ou efeito do item..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-purple-200">Propriedades extras</label>
              <button
                type="button"
                onClick={addPair}
                className="text-xs text-purple-400 hover:text-purple-200 transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {pairs.length === 0 ? (
              <p className="text-purple-600 text-xs">
                Nenhuma propriedade. Ex: dano, ataque, CA, Alcance, Peso...
              </p>
            ) : (
              <div className="space-y-2">
                {pairs.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Propriedade"
                      value={p.chave}
                      onChange={e => updatePair(i, 'chave', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded bg-purple-950 border border-purple-700 text-white placeholder-purple-600 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <input
                      type="text"
                      placeholder="Valor"
                      value={p.valor}
                      onChange={e => updatePair(i, 'valor', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded bg-purple-950 border border-purple-700 text-white placeholder-purple-600 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePair(i)}
                      className="text-red-500 hover:text-red-400 text-xs px-2 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">Imagem</label>
            <ImageUpload
              currentUrl={item?.imagem_url}
              onSelect={setSelectedFile}
              label="Adicionar imagem do item"
            />
          </div>

          {erro && <p className="text-red-400 text-sm">{erro}</p>}
        </div>

        <div className="px-6 py-4 border-t border-purple-900 flex justify-between shrink-0">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-purple-400 hover:text-white text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EquipamentosTab({ fichaId, donoId, isDono, mesaId, valoresFinais = {}, modificadoresAtivos = [], categorias = [] }) {
  const { itens, loading, error, createItem, updateItem, deleteItem } = useItens(fichaId)
  const { registrarRolagem } = useRolagem()
  const { preferencias } = usePreferencias()
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteErro, setDeleteErro] = useState('')

  const [rollResultado, setRollResultado] = useState(null)
  const [rollRotulo, setRollRotulo] = useState('')
  const [rollDetalhamento, setRollDetalhamento] = useState(null)
  const [rollRolando, setRollRolando] = useState(false)
  const [rollProcessing, setRollProcessing] = useState(false)
  const [rollItemId, setRollItemId] = useState(null)
  const [rollErro, setRollErro] = useState('')

  async function handleSalvar(data) {
    if (editingItem) {
      await updateItem(editingItem.id, data)
    } else {
      await createItem(data)
    }
    setShowForm(false)
    setEditingItem(null)
  }

  async function handleDelete(item) {
    if (!window.confirm(`Remover "${item.nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(item.id)
    setDeleteErro('')
    try {
      await deleteItem(item.id)
    } catch (err) {
      setDeleteErro(err.message || 'Erro ao remover item.')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleRolarItem(item, campo) {
    if (rollProcessing) return
    const notacaoBase = resolverNotacao(String(item.atributos_extras?.[campo] || ''), valoresFinais)
    if (!validarNotacao(notacaoBase)) {
      setRollItemId(item.id)
      setRollErro(`Notação inválida: "${notacaoBase}". Ex: 1d8+4, 1d20+5`)
      return
    }
    // Aplica modificadores de acerto/dano ativos (globais + categoria da arma) — Fase 12.2
    const { notacaoFinal, detalhamento, percentual } = montarNotacaoComModificadores({
      tipo: campo === 'dano' ? 'dano' : 'acerto',
      notacaoBase,
      categoria: item.atributos_extras?.categoria || null,
      modificadoresAtivos,
    })
    const rotulo = `${campo === 'dano' ? 'Dano' : 'Ataque'} — ${item.nome}`
    setRollProcessing(true)
    setRollItemId(item.id)
    setRollErro('')
    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo,
      volume: preferencias.som_volume,
      numDados: estimarNumDados(notacaoFinal),
    })
    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo,
        notacao: notacaoFinal,
        percentual,
      })
      setRollResultado(res)
      setRollRotulo(rotulo)
      setRollDetalhamento(detalhamento)
      setRollRolando(true)
      setTimeout(() => { setRollRolando(false); setRollProcessing(false) }, 1400)
    } catch {
      setRollProcessing(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-purple-400">Carregando itens...</div>
  }

  if (error) {
    return <div className="py-8 text-center text-red-400">{error}</div>
  }

  return (
    <div className="space-y-4">
      {deleteErro && (
        <div className="p-3 bg-red-950 border border-red-800 rounded-lg text-red-400 text-sm">
          {deleteErro}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-purple-300 text-sm">
          {itens.length > 0
            ? `${itens.length} item${itens.length > 1 ? 'ns' : ''}`
            : 'Nenhum item'}
        </p>
        {isDono && (
          <button
            onClick={() => { setEditingItem(null); setShowForm(true) }}
            className="text-sm px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            + Adicionar item
          </button>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-purple-800 rounded-2xl">
          <div className="text-4xl mb-4">⚔️</div>
          <p className="text-purple-300 text-lg font-medium mb-2">Nenhum item ainda</p>
          {isDono ? (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              + Adicionar item
            </button>
          ) : (
            <p className="text-purple-500 text-sm">
              O dono do personagem ainda não adicionou itens.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {itens.map(item => {
            const extras = item.atributos_extras || {}
            const temDano = extras.dano && validarNotacao(String(extras.dano))
            const temAtaque = extras.ataque && validarNotacao(String(extras.ataque))
            const temRoll = mesaId && (temDano || temAtaque || extras.dano || extras.ataque)

            return (
              <div
                key={item.id}
                className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden"
              >
                <div className="flex gap-4 p-4">
                  {item.imagem_url && (
                    <img
                      src={item.imagem_url}
                      alt={item.nome}
                      className="w-20 h-20 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold">{item.nome}</p>
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                            TIPO_COLORS[item.tipo] || TIPO_COLORS.outro
                          }`}
                        >
                          {TIPO_LABELS[item.tipo] || item.tipo}
                        </span>
                      </div>
                      {isDono && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingItem(item); setShowForm(true) }}
                            className="p-1.5 text-purple-400 hover:text-white hover:bg-purple-800 rounded-lg transition-colors text-sm"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 rounded-lg transition-colors text-sm disabled:opacity-40"
                            title="Remover"
                          >
                            {deletingId === item.id ? '…' : '🗑'}
                          </button>
                        </div>
                      )}
                    </div>

                    {item.descricao && (
                      <p className="text-purple-400 text-sm mt-2">{item.descricao}</p>
                    )}

                    {Object.keys(extras).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(extras).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-xs bg-amber-900/50 border border-amber-700 text-amber-300 px-2 py-0.5 rounded-full"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botões de rolagem contextual */}
                    {temRoll && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {(temAtaque || extras.ataque) && (
                            <button
                              type="button"
                              onClick={() => handleRolarItem(item, 'ataque')}
                              disabled={rollProcessing}
                              className="px-3 py-1.5 text-xs bg-amber-800 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                            >
                              🎲 Rolar ataque
                            </button>
                          )}
                          {(temDano || extras.dano) && (
                            <button
                              type="button"
                              onClick={() => handleRolarItem(item, 'dano')}
                              disabled={rollProcessing}
                              className="px-3 py-1.5 text-xs bg-red-900 hover:bg-red-800 disabled:opacity-40 text-white rounded-lg transition-colors"
                            >
                              🎲 Rolar dano
                            </button>
                          )}
                        </div>

                        {rollItemId === item.id && rollErro && (
                          <p className="text-red-400 text-xs">{rollErro}</p>
                        )}

                        {rollItemId === item.id && rollResultado && !rollErro && (
                          <RollResultCompact
                            resultado={rollResultado}
                            rotulo={rollRotulo}
                            rolando={rollRolando}
                            onClose={() => { setRollResultado(null); setRollItemId(null) }}
                            skin={preferencias.dado_skin}
                            detalhamento={rollDetalhamento}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <ItemForm
          item={editingItem}
          fichaId={fichaId}
          donoId={donoId}
          categorias={categorias}
          onSalvar={handleSalvar}
          onFechar={() => { setShowForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
