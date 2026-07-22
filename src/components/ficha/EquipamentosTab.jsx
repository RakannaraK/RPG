import { useState } from 'react'
import { useItens } from '../../hooks/useItens'
import { useRolagem } from '../../hooks/useRolagem'
import { validarNotacao, resolverNotacao } from '../../lib/diceNotation'
import { montarNotacaoComModificadores } from '../../lib/rollModifiers'
import { descreverTipoDano } from '../../lib/conversao'
import { limiarCritico, dadoPuro, ehCritico, multiplicadorCritico } from '../../lib/criticoEngine'
import { ModificadorForm, labelModificador } from '../sistema/RacasClassesEditor'
import { tocarSomDado, estimarNumDados } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import { redimensionarImagem } from '../../lib/imageUtils'
import { supabase } from '../../lib/supabase'
import ImageUpload from './ImageUpload'
import Dice3D from '../dados/Dice3D'
import { PRESET_IDS, resolveActionSound } from '../../engines/actionSoundEngine'
import { tocarPresetAcao, tocarSomAcao } from '../../audio/actionSynth'

const TIPOS_ITEM = ['item', 'arma', 'armadura', 'magico', 'outro']

const TIPO_LABELS = {
  item: 'Item',
  arma: 'Arma',
  armadura: 'Armadura',
  magico: 'Mágico',
  outro: 'Outro',
}

const TIPO_COLORS = {
  item: 'bg-hover text-ink',
  arma: 'bg-harm/15 text-harm',
  armadura: 'bg-temp/15 text-temp',
  magico: 'bg-accent-600/15 text-accent-300',
  outro: 'bg-hover text-ink-dim',
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
    <div className="bg-hover/60 border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2 flex-wrap">
          {rotulo && <span className="text-ink text-xs font-semibold">{rotulo}</span>}
          <span className="text-ink-dim font-mono text-xs">{notacao}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-ink-dim hover:text-ink text-xs ml-2 transition-colors"
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
            {d.descartado && <span className="text-harm text-[9px]">desc.</span>}
          </div>
        ))}
        <div className="flex items-baseline gap-1.5 ml-1">
          <span className="text-ink-dim text-xs">Total:</span>
          <span className="text-2xl font-bold text-ink leading-none">{total}</span>
        </div>
      </div>
      {(mantidos.length > 1 || modificador !== 0) && (
        <p className="text-ink-dim text-xs">
          ({mantidos.join(' + ')}
          {modificador > 0 && ` + ${modificador}`}
          {modificador < 0 && ` − ${Math.abs(modificador)}`})
        </p>
      )}
      {descartados.length > 0 && (
        <p className="text-harm text-xs">descartados: {descartados.join(', ')}</p>
      )}
      {extras.length > 0 && (
        <p className="text-ink-dim text-[10px] leading-tight">
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

function ItemForm({ item, fichaId, donoId, categorias = [], atributos = [], camposCombate = [], pericias = [], classes = [], pools = [], onSalvar, onFechar }) {
  const { preferencias } = usePreferencias()
  const [nome, setNome] = useState(item?.nome || '')
  const [tipo, setTipo] = useState(item?.tipo || 'item')
  const [categoriaId, setCategoriaId] = useState(item?.categoria_id || '') // 21.1
  const [descricao, setDescricao] = useState(item?.descricao || '')
  const [tipoDano, setTipoDano] = useState(item?.atributos_extras?.tipo_dano || '') // 21.5
  const [somPreset, setSomPreset] = useState(item?.som_preset || '') // FV.5a — som da ação (opcional)
  // 21.5 — recurso (contador) e durabilidade
  const [rec, setRec] = useState(item?.recurso || null)
  const [durab, setDurab] = useState(item?.durabilidade || null)
  // 21 — item como fonte de modificador
  const [mods, setMods] = useState(Array.isArray(item?.modificadores) ? item.modificadores : [])
  const [equipado, setEquipado] = useState(item?.equipado ?? true)
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
      if (tipoDano.trim()) atributosObj.tipo_dano = tipoDano.trim() // 21.5

      // 21.5 — normaliza recurso/durabilidade (números; nulo se vazio)
      const recurso = rec && String(rec.nome || '').trim()
        ? {
            nome: rec.nome.trim(),
            atual: Math.max(0, Math.floor(Number(rec.atual) || 0)),
            maximo: Math.max(1, Math.floor(Number(rec.maximo) || 1)),
            ao_completar: (rec.ao_completar || '').trim() || null,
            reinicia_ao_completar: !!rec.reinicia_ao_completar,
          }
        : null
      const durabilidade = durab && durab.maximo
        ? { atual: Math.max(0, Math.floor(Number(durab.atual ?? durab.maximo) || 0)), maximo: Math.max(1, Math.floor(Number(durab.maximo) || 1)) }
        : null

      await onSalvar({
        nome: nome.trim(),
        tipo,
        categoria_id: categoriaId || null, // 21.1
        descricao: descricao.trim() || null,
        atributos_extras: Object.keys(atributosObj).length > 0 ? atributosObj : null,
        recurso,
        durabilidade,
        modificadores: mods.length > 0 ? mods : null, // 21 — efeitos do item
        equipado,
        imagem_url,
        som_preset: somPreset || null, // FV.5a
      })
    } catch (err) {
      setErro(err.message || 'Erro ao salvar item.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-void border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-ink font-bold text-lg">
            {item ? 'Editar item' : 'Novo item'}
          </h2>
          <button
            onClick={onFechar}
            className="text-ink-dim hover:text-ink text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink mb-1">Nome *</label>
              <input
                type="text"
                placeholder="Ex: Espada Longa +1"
                value={nome}
                onChange={e => setNome(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
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
              <label className="block text-sm font-medium text-ink mb-1">Categoria</label>
              <select
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">Sem categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descrição, história ou efeito do item..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 resize-none"
            />
          </div>

          {/* 21.5 — tipo de dano (base para conversões) */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Tipo de dano</label>
            <input
              type="text"
              value={tipoDano}
              onChange={e => setTipoDano(e.target.value)}
              placeholder="ex: físico, fogo, elétrico (opcional)"
              className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <p className="text-ink-dim text-xs mt-1">Usado pelas conversões (manoplas físico → elétrico) e resistências do alvo.</p>
          </div>

          {/* FV.5a — som da ação (opcional; vazio = usa o som padrão do sistema, se houver) */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Som da ação</label>
            <div className="flex items-center gap-2">
              <select
                value={somPreset}
                onChange={e => setSomPreset(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              >
                <option value="">Nenhum (usa o padrão do sistema)</option>
                {PRESET_IDS.map(id => <option key={id} value={id}>{id}</option>)}
              </select>
              {somPreset && (
                <button
                  type="button"
                  onClick={() => tocarPresetAcao(somPreset, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume })}
                  title="Ouvir"
                  className="text-accent-300 hover:text-ink text-sm shrink-0"
                >▶</button>
              )}
            </div>
          </div>

          {/* 21.5 — recurso (contador) */}
          <div className="border border-border/60 rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input type="checkbox" checked={!!rec}
                onChange={e => setRec(e.target.checked ? { nome: '', atual: 0, maximo: 10, ao_completar: '', reinicia_ao_completar: false } : null)}
                className="accent-accent-500" />
              Recurso / contador (ex: Almas 29/50)
            </label>
            {rec && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={rec.nome} onChange={e => setRec({ ...rec, nome: e.target.value })}
                    placeholder="Nome (Almas)" className="flex-1 min-w-[8rem] px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500" />
                  <input type="number" value={rec.atual} onChange={e => setRec({ ...rec, atual: e.target.value })}
                    placeholder="atual" className="w-20 px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent-500" />
                  <span className="text-ink-dim self-center">/</span>
                  <input type="number" value={rec.maximo} onChange={e => setRec({ ...rec, maximo: e.target.value })}
                    placeholder="máx" className="w-20 px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent-500" />
                </div>
                <input type="text" value={rec.ao_completar || ''} onChange={e => setRec({ ...rec, ao_completar: e.target.value })}
                  placeholder="Ao completar (texto do efeito)" className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500" />
                <label className="text-ink-dim text-xs flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={!!rec.reinicia_ao_completar}
                    onChange={e => setRec({ ...rec, reinicia_ao_completar: e.target.checked })} className="accent-accent-500" />
                  reinicia ao completar (volta a 0)
                </label>
              </div>
            )}
          </div>

          {/* 21.5 — durabilidade */}
          <div className="border border-border/60 rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
              <input type="checkbox" checked={!!durab}
                onChange={e => setDurab(e.target.checked ? { atual: 100, maximo: 100 } : null)}
                className="accent-accent-500" />
              Durabilidade
            </label>
            {durab && (
              <div className="mt-2 flex items-center gap-2">
                <input type="number" value={durab.atual} onChange={e => setDurab({ ...durab, atual: e.target.value })}
                  placeholder="atual" className="w-20 px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent-500" />
                <span className="text-ink-dim">/</span>
                <input type="number" value={durab.maximo} onChange={e => setDurab({ ...durab, maximo: e.target.value })}
                  placeholder="máx" className="w-20 px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent-500" />
                <span className="text-ink-dim text-xs">em 0 = danificado (efeitos desativados)</span>
              </div>
            )}
          </div>

          {/* 21 — item como fonte de modificador (efeitos ao equipar) */}
          <div className="border border-border/60 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-ink">Efeitos do item</label>
              <label className="text-accent-300 text-xs flex items-center gap-1.5 cursor-pointer" title="Só o item equipado aplica seus efeitos">
                <input type="checkbox" checked={equipado} onChange={e => setEquipado(e.target.checked)} className="accent-accent-500" />
                equipado
              </label>
            </div>
            <p className="text-ink-dim text-xs">
              Modificadores que entram no motor quando o item está equipado (ex: manoplas convertendo
              físico → elétrico). Item danificado (durabilidade 0) desliga os efeitos.
            </p>
            {mods.length > 0 && (
              <div className="space-y-1">
                {mods.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 bg-void/40 border border-border rounded-lg px-2 py-1">
                    <span className="text-ink text-xs flex-1 min-w-0 truncate">{labelModificador(m, atributos, camposCombate, pericias)}</span>
                    <button type="button" onClick={() => setMods(mods.filter((_, j) => j !== i))}
                      className="w-5 h-5 flex items-center justify-center text-ink-dim hover:text-harm transition-colors">×</button>
                  </div>
                ))}
              </div>
            )}
            <ModificadorForm
              onAdd={m => { setMods(prev => [...prev, m]); return Promise.resolve() }}
              atributos={atributos}
              camposCombate={camposCombate}
              pericias={pericias}
              classes={classes}
              pools={pools}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-ink">Propriedades extras</label>
              <button
                type="button"
                onClick={addPair}
                className="text-xs text-ink-dim hover:text-ink transition-colors"
              >
                + Adicionar
              </button>
            </div>
            {pairs.length === 0 ? (
              <p className="text-ink-dim text-xs">
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
                      className="flex-1 px-2 py-1.5 rounded bg-void border border-border text-ink placeholder-accent-600 text-xs focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    <input
                      type="text"
                      placeholder="Valor"
                      value={p.valor}
                      onChange={e => updatePair(i, 'valor', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded bg-void border border-border text-ink placeholder-accent-600 text-xs focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePair(i)}
                      className="text-harm hover:text-harm text-xs px-2 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">Imagem</label>
            <ImageUpload
              currentUrl={item?.imagem_url}
              onSelect={setSelectedFile}
              label="Adicionar imagem do item"
            />
          </div>

          {erro && <p className="text-harm text-sm">{erro}</p>}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-between shrink-0">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-ink-dim hover:text-ink text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-semibold rounded-lg text-sm transition-colors"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 21.3 — atalho de ganho de XP de maestria após rolar acerto/dano com uma arma
function MaestriaGanhoInline({ item, maestria, categorias, onGanhar }) {
  if (!maestria?.ativo) return null
  const escopo = maestria.escopo === 'item' ? 'item' : 'categoria'
  const alvo = escopo === 'item'
    ? { item_id: item.id }
    : (item.categoria_id ? { categoria_id: item.categoria_id } : null)
  const ganhos = maestria.ganhos_padrao || []
  if (!alvo || ganhos.length === 0) return null
  const nome = escopo === 'item' ? item.nome : (categorias.find(c => c.id === item.categoria_id)?.nome || 'categoria')

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pt-1.5 border-t border-border/40">
      <span className="text-dice-400/80 text-[11px]">Maestria ({nome}):</span>
      {ganhos.map((g, i) => (
        <button
          key={i}
          onClick={() => onGanhar(alvo, Number(g.xp) || 0, nome)}
          className="text-[11px] px-2 py-0.5 rounded-lg bg-dice-700/40 hover:bg-dice-700/60 text-dice-200 transition-colors"
          title={`+${g.xp} XP de maestria`}
        >
          {g.rotulo || `+${g.xp}`} <span className="text-dice-400/70">+{g.xp}</span>
        </button>
      ))}
    </div>
  )
}

// 21.4 — chips das propriedades de maestria do item (desbloqueadas + bloqueadas)
function MaestriaChips({ info }) {
  if (!info) return null
  const { desbloqueadas = [], bloqueadas = [] } = info
  if (desbloqueadas.length === 0 && bloqueadas.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {desbloqueadas.map(p => (
        <span key={p.id} title={p.descricao}
          className="text-[10px] px-1.5 py-0.5 rounded bg-dice-700/50 border border-dice-500/60 text-dice-200 cursor-help">
          {p.sigla || p.nome}
        </span>
      ))}
      {bloqueadas.map(p => (
        <span key={p.id} title={`${p.descricao} (requer maestria ${p.maestria_minima})`}
          className="text-[10px] px-1.5 py-0.5 rounded bg-raised border border-border/60 text-ink-dim cursor-help">
          🔒 {p.sigla || p.nome} <span className="text-ink-dim">nv {p.maestria_minima}</span>
        </span>
      ))}
    </div>
  )
}

// 21.5 — contador de recurso, barra de durabilidade e badge de danificado
function RecursoDurabilidade({ item, isDono, onRecurso, onDurab }) {
  const r = item.recurso
  const d = item.durabilidade
  const danificado = d && Number(d.atual) <= 0
  if (!r && !d) return null
  const btn = 'w-6 h-6 flex items-center justify-center rounded-lg border border-border text-accent-300 hover:text-ink hover:border-accent-500 transition-colors disabled:opacity-30'

  return (
    <div className="mt-2 space-y-1.5">
      {danificado && (
        <span className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-harm/60 border border-harm/50 text-harm">
          ⚠ Danificado — efeitos desativados até reparo
        </span>
      )}

      {r && (() => {
        const max = Number(r.maximo) || 0
        const atual = Number(r.atual) || 0
        const pct = max > 0 ? Math.min(100, (atual / max) * 100) : 0
        const cheio = atual >= max
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-accent-300 text-xs">{r.nome}</span>
            <div className="flex-1 min-w-[6rem] h-2 bg-hover rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${cheio ? 'bg-dice-400' : 'bg-accent-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-xs font-mono ${cheio ? 'text-dice-400' : 'text-ink-dim'}`}>{atual}/{max}</span>
            {isDono && (
              <span className="flex items-center gap-1">
                <button onClick={() => onRecurso(-1)} disabled={atual <= 0} className={btn} title="−1">−</button>
                <button onClick={() => onRecurso(1)} className={btn} title="+1">+</button>
              </span>
            )}
          </div>
        )
      })()}

      {d && (() => {
        const max = Number(d.maximo) || 0
        const atual = Number(d.atual) || 0
        const pct = max > 0 ? Math.max(0, Math.min(100, (atual / max) * 100)) : 0
        const cor = pct > 50 ? 'bg-ok' : pct > 20 ? 'bg-dice-500' : 'bg-harm'
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-accent-300 text-xs">Durabilidade</span>
            <div className="flex-1 min-w-[6rem] h-2 bg-hover rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-mono text-ink-dim">{atual}/{max}</span>
            {isDono && (
              <span className="flex items-center gap-1">
                <button onClick={() => onDurab(-1)} disabled={atual <= 0} className={btn} title="Consumir 1">−</button>
                <button onClick={() => onDurab(1)} disabled={atual >= max} className={btn} title="Reparar 1">+</button>
              </span>
            )}
          </div>
        )
      })()}
    </div>
  )
}

export default function EquipamentosTab({ fichaId, donoId, isDono, mesaId, valoresFinais = {}, modificadoresAtivos = [], categorias = [], maestria = null, onGanharMaestria, maestriaDoItem, atributos = [], camposCombate = [], pericias = [], classes = [], pools = [], critico = null, configSom = null }) {
  const { itens, loading, error, createItem, updateItem, deleteItem } = useItens(fichaId)
  const { registrarRolagem, registrarEvento } = useRolagem()
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
  const [rollCritico, setRollCritico] = useState(null) // 22.3 — { natural, limiar }
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

  // 21.5 — contador de recurso do item: ajusta, avisa no feed ao completar,
  // reinicia se configurado.
  async function ajustarRecurso(item, delta) {
    const r = item.recurso
    if (!r) return
    const max = Number(r.maximo) || 0
    const antes = Number(r.atual) || 0
    let novo = Math.max(0, Math.min(max, antes + delta))
    const completou = antes < max && novo >= max
    try {
      await updateItem(item.id, { recurso: { ...r, atual: completou && r.reinicia_ao_completar ? 0 : novo } })
      if (completou && mesaId) {
        await registrarEvento({
          mesaId, fichaId,
          rotulo: `${item.nome} — ${r.nome} completo!${r.ao_completar ? ` ${r.ao_completar}` : ''}`,
          notacao: '', total: max, dados: [],
        })
      }
    } catch { /* silencioso */ }
  }

  // 21.5 — consumo/reparo de durabilidade
  async function ajustarDurabilidade(item, delta) {
    const d = item.durabilidade
    if (!d) return
    const max = Number(d.maximo) || 0
    const novo = Math.max(0, Math.min(max, (Number(d.atual) || 0) + delta))
    try { await updateItem(item.id, { durabilidade: { ...d, atual: novo } }) } catch {}
  }

  // 21 — equipar/desequipar rápido (só faz sentido se o item tem efeitos)
  async function toggleEquipado(item) {
    try { await updateItem(item.id, { equipado: !(item.equipado ?? true) }) } catch {}
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
    const tipo = campo === 'dano' ? 'dano' : 'acerto'
    // 21.5 — item danificado (durabilidade 0): efeitos do item desativados
    const danificado = item.durabilidade && Number(item.durabilidade.atual) <= 0
    // 21.4 — maestria do item: efeitos das propriedades desbloqueadas entram no
    // cálculo (F12) e o percentual da maestria soma no pipeline (F18).
    const mst = danificado ? null : (maestriaDoItem?.(item) || null)
    const propMods = (mst?.desbloqueadas || [])
      .map(p => p.modificador_config)
      .filter(cfg => cfg && cfg.tipo === tipo)
      .map(cfg => ({
        tipo, operacao: 'somar',
        valor: cfg.valor, dados_extras: cfg.dados_extras, percentual_rolagem: cfg.percentual_rolagem,
        _fonte: 'Propriedade',
      }))

    // Aplica modificadores de acerto/dano ativos (globais + categoria da arma) — Fase 12.2
    const { notacaoFinal, detalhamento, percentual } = montarNotacaoComModificadores({
      tipo,
      notacaoBase,
      categoria: item.atributos_extras?.categoria || null,
      modificadoresAtivos: [...modificadoresAtivos, ...propMods],
    })
    // percentual da maestria (acerto → acerto_percentual; dano → efeito_percentual)
    const pctMaestria = mst ? (tipo === 'dano' ? mst.efeito_percentual : mst.acerto_percentual) : 0
    const percentualTotal = (percentual || 0) + (Number(pctMaestria) || 0)
    let rotulo = `${campo === 'dano' ? 'Dano' : 'Ataque'} — ${item.nome}`
      + (mst?.nivel > 0 ? ` (Maestria ${mst.nivel})` : '')
    // 21.5 — tipo de dano final (após conversões ativas) no rótulo do dano
    if (tipo === 'dano' && item.atributos_extras?.tipo_dano) {
      rotulo += ` [${descreverTipoDano(item.atributos_extras.tipo_dano, modificadoresAtivos)}]`
    }
    // 22.4 — dano em modo crítico: multiplica dados+fixos antes dos percentuais
    const critDano = (tipo === 'dano' && rollCritico?.itemId === item.id)
      ? { multiplicador: rollCritico.multiplicador, modo: rollCritico.modo }
      : null
    if (critDano) rotulo += ` — 🎯 crítico ×${critDano.multiplicador}`

    setRollProcessing(true)
    setRollItemId(item.id)
    setRollErro('')
    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo,
      volume: preferencias.som_volume,
      numDados: estimarNumDados(notacaoFinal),
    })
    // FV.5b — som da ação: o preset do próprio item vence; sem preset, cai no
    // padrão do sistema por tipo de evento. Nunca inventa crítico/falha.
    const tipoEvento = tipo === 'acerto' ? 'ataque' : 'dano'
    const som = item.som_preset
      ? { presetId: item.som_preset, intensity: 1, layer: critDano ? 'critico' : null }
      : resolveActionSound({ tipo: tipoEvento, resultado: { critico: !!critDano } }, configSom)

    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo,
        notacao: notacaoFinal,
        percentual: percentualTotal,
        critico: critDano,
        som,
      })
      if (critDano) setRollCritico(null) // consumido pelo dano
      setRollResultado(res)
      setRollRotulo(rotulo)
      setRollDetalhamento(detalhamento)
      setRollRolando(true)
      setTimeout(() => {
        setRollRolando(false)
        setRollProcessing(false)
        // FV.5b — som de ação sincronizado com o pouso do dado (não com o clique)
        if (som) tocarSomAcao(som, { ativo: preferencias.som_acao_ativo, volume: preferencias.som_acao_volume })
      }, 1400)

      // 22.3 — crítico: avaliado no DADO PURO do ACERTO (antes de bônus)
      setRollCritico(null)
      if (tipo === 'acerto' && critico?.ativo) {
        const catCrit = categorias.find(c => c.id === item.categoria_id)?.critico_config
        const limiar = limiarCritico(critico, { maestria: mst?.nivel ?? 0 })
        const natural = dadoPuro(res.dados)
        if (ehCritico(natural, limiar)) {
          setRollCritico({ itemId: item.id, natural, limiar, multiplicador: multiplicadorCritico(critico, catCrit), modo: critico.modo_multiplicador || 'total' })
          try {
            await registrarEvento({
              mesaId, fichaId,
              rotulo: `🎯 CRÍTICO! ${item.nome} (rolou ${natural}, limiar ${limiar})`,
              notacao: '', total: natural, dados: [],
            })
          } catch { /* feed best-effort */ }
        }
      }
    } catch {
      setRollProcessing(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-ink-dim">Carregando itens...</div>
  }

  if (error) {
    return <div className="py-8 text-center text-harm">{error}</div>
  }

  return (
    <div className="space-y-4">
      {deleteErro && (
        <div className="p-3 bg-harm/10 border border-harm/50 rounded-lg text-harm text-sm">
          {deleteErro}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-accent-300 text-sm">
          {itens.length > 0
            ? `${itens.length} item${itens.length > 1 ? 'ns' : ''}`
            : 'Nenhum item'}
        </p>
        {isDono && (
          <button
            onClick={() => { setEditingItem(null); setShowForm(true) }}
            className="text-sm px-4 py-2 bg-accent-700 hover:bg-accent-600 text-ink rounded-lg transition-colors"
          >
            + Adicionar item
          </button>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <div className="text-4xl mb-4">⚔️</div>
          <p className="text-accent-300 text-lg font-medium mb-2">Nenhum item ainda</p>
          {isDono ? (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 px-5 py-2 bg-accent-600 hover:bg-accent-700 text-ink rounded-lg text-sm transition-colors"
            >
              + Adicionar item
            </button>
          ) : (
            <p className="text-ink-dim text-sm">
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
                className="bg-raised border border-border rounded-xl overflow-hidden"
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
                        <p className="text-ink font-semibold">{item.nome}</p>
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                            TIPO_COLORS[item.tipo] || TIPO_COLORS.outro
                          }`}
                        >
                          {TIPO_LABELS[item.tipo] || item.tipo}
                        </span>
                        {/* 21 — equipar/desequipar (só se o item tem efeitos) */}
                        {Array.isArray(item.modificadores) && item.modificadores.length > 0 && (
                          isDono ? (
                            <button
                              onClick={() => toggleEquipado(item)}
                              className={`ml-1.5 inline-block text-xs px-2 py-0.5 rounded-full transition-colors ${
                                (item.equipado ?? true)
                                  ? 'bg-ok/50 border border-ok text-ok hover:bg-ok/60'
                                  : 'bg-raised border border-border text-ink-dim hover:text-ink'
                              }`}
                              title="Equipar / desequipar"
                            >
                              {(item.equipado ?? true) ? '✓ equipado' : 'desequipado'}
                            </button>
                          ) : (
                            (item.equipado ?? true) && <span className="ml-1.5 inline-block text-xs px-2 py-0.5 rounded-full bg-ok/50 border border-ok text-ok">✓ equipado</span>
                          )
                        )}
                        <MaestriaChips info={maestriaDoItem?.(item)} />
                      </div>
                      {isDono && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingItem(item); setShowForm(true) }}
                            className="p-1.5 text-ink-dim hover:text-ink hover:bg-hover rounded-lg transition-colors text-sm"
                            title="Editar"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-harm hover:text-harm hover:bg-harm/10 rounded-lg transition-colors text-sm disabled:opacity-40"
                            title="Remover"
                          >
                            {deletingId === item.id ? '…' : '🗑'}
                          </button>
                        </div>
                      )}
                    </div>

                    {item.descricao && (
                      <p className="text-ink-dim text-sm mt-2">{item.descricao}</p>
                    )}

                    {/* 21.5 — recurso, durabilidade e badge de danificado */}
                    <RecursoDurabilidade
                      item={item}
                      isDono={isDono}
                      onRecurso={d => ajustarRecurso(item, d)}
                      onDurab={d => ajustarDurabilidade(item, d)}
                    />

                    {Object.keys(extras).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(extras).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-xs bg-dice-700/50 border border-dice-500 text-dice-400 px-2 py-0.5 rounded-full"
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
                              className="px-3 py-1.5 text-xs bg-dice-700 hover:bg-dice-500 disabled:opacity-40 text-ink rounded-lg transition-colors"
                            >
                              🎲 Rolar ataque
                            </button>
                          )}
                          {(temDano || extras.dano) && (() => {
                            const critPronto = rollCritico?.itemId === item.id
                            return (
                              <button
                                type="button"
                                onClick={() => handleRolarItem(item, 'dano')}
                                disabled={rollProcessing}
                                className={`px-3 py-1.5 text-xs disabled:opacity-40 text-ink rounded-lg transition-colors ${
                                  critPronto ? 'bg-dice-700 hover:bg-dice-500 font-semibold animate-pulse' : 'bg-harm/15 hover:bg-harm'
                                }`}
                                title={critPronto ? `Dano crítico ×${rollCritico.multiplicador} (${rollCritico.modo})` : undefined}
                              >
                                {critPronto ? `🎯 Dano crítico ×${rollCritico.multiplicador}` : '🎲 Rolar dano'}
                              </button>
                            )
                          })()}
                        </div>

                        {rollItemId === item.id && rollErro && (
                          <p className="text-harm text-xs">{rollErro}</p>
                        )}

                        {rollItemId === item.id && rollResultado && !rollErro && (
                          <>
                            <RollResultCompact
                              resultado={rollResultado}
                              rotulo={rollRotulo}
                              rolando={rollRolando}
                              onClose={() => { setRollResultado(null); setRollItemId(null); setRollCritico(null) }}
                              skin={preferencias.dado_skin}
                              detalhamento={rollDetalhamento}
                            />
                            {/* 22.3 — crítico detectado no acerto */}
                            {rollCritico?.itemId === item.id && !rollRolando && (
                              <div className="mt-1.5 flex items-center gap-2 flex-wrap bg-dice-700/50 border border-dice-500/60 rounded-lg px-2.5 py-1.5">
                                <span className="text-dice-400 text-sm font-bold animate-pulse">🎯 CRÍTICO!</span>
                                <span className="text-dice-500/80 text-[11px]">
                                  rolou {rollCritico.natural}, limiar {rollCritico.limiar} · dano ×{rollCritico.multiplicador} ({rollCritico.modo})
                                </span>
                              </div>
                            )}
                            {isDono && onGanharMaestria && (
                              <MaestriaGanhoInline
                                item={item}
                                maestria={maestria}
                                categorias={categorias}
                                onGanhar={onGanharMaestria}
                              />
                            )}
                          </>
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
          atributos={atributos}
          camposCombate={camposCombate}
          pericias={pericias}
          classes={classes}
          pools={pools}
          onSalvar={handleSalvar}
          onFechar={() => { setShowForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
