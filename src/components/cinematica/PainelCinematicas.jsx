import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCinematicas } from '../../hooks/useCinematicas'
import { LIMITES_CINEMATICA, moverQuadro, normalizarQuadros, novoQuadro, validarCinematica } from '../../lib/cinematica'
import { SONS_AMBIENTE } from '../../lib/efeitosVocabulario'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Modal, { FecharModal } from '../ui/Modal'
import EstadoVazio from '../ui/EstadoVazio'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import { useConfirmar } from '../ui/Confirmar'
import { useToast } from '../ui/Toast'
import { t, tn } from '../../i18n'

const campo = 'campo w-full'

// 0 = manual; 1 e 2 sobem para o mínimo de 3 (o normalizador os trataria como manual)
const segundosValidos = v => { const n = Math.round(Number(v)) || 0; return n <= 0 ? 0 : Math.min(120, Math.max(3, n)) }

function EditorQuadro({ q, n, total, onMudar, onMover, onApagar, onImagem, ocupado }) {
  const muda = k => e => onMudar({ ...q, [k]: e.target.value })
  return (
    <fieldset className="rounded-xl border border-border p-3 space-y-2">
      <legend className="px-1 text-sm font-semibold text-ink">{t('Quadro {n}', { n: n + 1 })}</legend>
      <div className="flex items-center gap-2">
        {q.imagem_url
          ? <img src={q.imagem_url} alt="" className="w-20 h-12 object-cover rounded-lg border border-border" />
          : <div className="w-20 h-12 rounded-lg border border-dashed border-border" aria-hidden="true" />}
        <label className="text-sm text-accent-300 hover:text-ink cursor-pointer min-h-[24px] inline-flex items-center">
          {ocupado ? t('Enviando…') : q.imagem_url ? t('Trocar imagem') : t('Enviar imagem')}
          <input type="file" accept="image/*" className="sr-only" disabled={ocupado} onChange={onImagem} />
        </label>
        {q.imagem_url && <Botao variante="fantasma" tamanho="sm" onClick={() => onMudar({ ...q, imagem_url: '' })}>{t('Tirar')}</Botao>}
        <div className="ml-auto flex gap-1">
          <Botao variante="fantasma" tamanho="icone" aria-label={t('Subir quadro')} disabled={n === 0} onClick={() => onMover(-1)}>↑</Botao>
          <Botao variante="fantasma" tamanho="icone" aria-label={t('Descer quadro')} disabled={n === total - 1} onClick={() => onMover(1)}>↓</Botao>
          <Botao variante="fantasma" tamanho="icone" aria-label={t('Apagar quadro')} onClick={onApagar}><Icone nome="lixeira" tamanho={16} /></Botao>
        </div>
      </div>
      <label className="block text-xs text-ink-dim">{t('Título')}
        <input className={`${campo} mt-1`} value={q.titulo} maxLength={LIMITES_CINEMATICA.titulo} onChange={muda('titulo')} />
      </label>
      <label className="block text-xs text-ink-dim">{t('Texto')}
        <textarea className={`${campo} mt-1`} rows={3} value={q.texto} maxLength={LIMITES_CINEMATICA.texto} onChange={muda('texto')} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-ink-dim">{t('Som ambiente')}
          <select className={`${campo} mt-1`} value={q.som || ''} onChange={e => onMudar({ ...q, som: e.target.value || null })}>
            <option value="">{t('Sem som')}</option>
            {Object.entries(SONS_AMBIENTE).map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </label>
        <label className="block text-xs text-ink-dim">{t('Segundos (0 = manual, 3 a 120)')}
          <input type="number" min={0} max={120} className={`${campo} mt-1`} value={q.segundos}
            onChange={e => onMudar({ ...q, segundos: segundosValidos(e.target.value) })} />
        </label>
      </div>
    </fieldset>
  )
}

function FormCinematica({ inicial, onSalvar, enviarImagem, usuarioId, onOcupado }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [quadros, setQuadros] = useState(() => (inicial ? normalizarQuadros(inicial.quadros) : [novoQuadro()]))
  const [erro, setErro] = useState('')
  const [ocupado, setOcupadoLocal] = useState('') // id do quadro enviando imagem, ou 'salvando'
  const setOcupado = v => { setOcupadoLocal(v); onOcupado(!!v) } // o Modal fica bloqueado enquanto ocupado
  const mudar = q => setQuadros(qs => qs.map(x => (x.id === q.id ? q : x)))

  async function imagem(q, e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcupado(q.id); setErro('')
    try { mudar({ ...q, imagem_url: await enviarImagem(file, usuarioId) }) } catch (x) { setErro(x.message) }
    setOcupado('')
  }

  async function salvar(e) {
    e.preventDefault()
    const v = validarCinematica({ titulo, quadros })
    if (!v.ok) { setErro(v.erro); return }
    setOcupado('salvando'); setErro('')
    try { await onSalvar({ titulo, quadros }) } catch (x) { setErro(x.message); setOcupado('') }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <label className="block text-sm text-ink-dim">{t('Título da cinemática')}
        <input className={`${campo} mt-1`} value={titulo} maxLength={LIMITES_CINEMATICA.titulo} onChange={e => setTitulo(e.target.value)} autoFocus />
      </label>
      {quadros.map((q, i) => (
        <EditorQuadro key={q.id} q={q} n={i} total={quadros.length} ocupado={ocupado === q.id}
          onMudar={mudar} onImagem={e => imagem(q, e)}
          onMover={d => setQuadros(qs => moverQuadro(qs, q.id, d))}
          onApagar={() => setQuadros(qs => qs.filter(x => x.id !== q.id))} />
      ))}
      <Botao variante="contorno" disabled={quadros.length >= LIMITES_CINEMATICA.quadros}
        onClick={() => setQuadros(qs => [...qs, novoQuadro()])}>
        <Icone nome="mais" tamanho={16} /> {t('Adicionar quadro ({n}/{max})', { n: quadros.length, max: LIMITES_CINEMATICA.quadros })}
      </Botao>
      {erro && <p className="text-harm text-sm" role="alert">{erro}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <FecharModal disabled={!!ocupado}>{t('Cancelar')}</FecharModal>
        <Botao type="submit" variante="primario" disabled={!!ocupado}>{ocupado === 'salvando' ? t('Salvando…') : t('Salvar')}</Botao>
      </div>
    </form>
  )
}

/** Fase 64 — aba "Cinemáticas" do mestre: monta cenas em quadros e exibe para a mesa. */
export default function PainelCinematicas({ mesaId }) {
  const { session } = useAuth()
  const c = useCinematicas(mesaId)
  const { confirmar } = useConfirmar()
  const toast = useToast()
  const [editando, setEditando] = useState(null) // null | 'nova' | cinemática
  const [bloqueado, setBloqueado] = useState(false)

  async function exibir(cin) {
    try {
      await c.encerrar() // zera a exibição anterior: quem fechou a cena para si a recebe de novo
      await c.exibir(cin, 0)
      toast.ok(t('Cinemática em exibição'))
    } catch (e) { toast.erro(e.message) }
  }
  async function encerrar() {
    try { await c.encerrar(); toast.ok(t('Exibição encerrada')) } catch (e) { toast.erro(e.message) }
  }
  async function apagar(cin) {
    if (!(await confirmar({ titulo: t('Apagar cinemática?'), mensagem: t('{titulo} sai da mesa.', { titulo: cin.titulo }), confirmar: t('Apagar'), perigo: true }))) return
    try { await c.apagar(cin.id); toast.ok(t('Cinemática apagada')) } catch (e) { toast.erro(e.message) }
  }

  return (
    <div className="space-y-4">
      <CabecalhoSecao
        titulo={t('Cinemáticas')}
        descricao={t('Cenas em quadros, exibidas em tela cheia para toda a mesa.')}
        acoes={(
          <>
            <Botao variante="contorno" onClick={encerrar}>{t('Encerrar exibição')}</Botao>
            <Botao variante="primario" onClick={() => setEditando('nova')}><Icone nome="mais" tamanho={18} /> {t('Nova cinemática')}</Botao>
          </>
        )}
      />
      {c.erro && <p className="text-harm text-sm" role="alert">{c.erro}</p>}
      {!c.loading && c.cinematicas.length === 0 && (
        <EstadoVazio titulo={t('Nenhuma cinemática ainda')} descricao={t('Monte uma cena com imagem, texto e som ambiente e exiba para a mesa.')}>
          <Botao variante="primario" onClick={() => setEditando('nova')}><Icone nome="mais" tamanho={18} /> {t('Nova cinemática')}</Botao>
        </EstadoVazio>
      )}
      <ul className="space-y-2">
        {c.cinematicas.map(cin => (
          <li key={cin.id} className="rounded-xl border border-border bg-raised p-3 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-ink font-semibold truncate">{cin.titulo}</p>
              <p className="text-ink-dim text-xs">{(n => tn(n, '{n} quadro', '{n} quadros'))(normalizarQuadros(cin.quadros).length)}</p>
            </div>
            <Botao variante="primario" tamanho="sm" onClick={() => exibir(cin)}><Icone nome="play" tamanho={14} /> {t('Exibir para a mesa')}</Botao>
            <Botao variante="contorno" tamanho="sm" onClick={() => setEditando(cin)}>{t('Editar')}</Botao>
            <Botao variante="fantasma" tamanho="sm" aria-label={t('Apagar {titulo}', { titulo: cin.titulo })} onClick={() => apagar(cin)}><Icone nome="lixeira" tamanho={14} /></Botao>
          </li>
        ))}
      </ul>
      {editando && (
        <Modal titulo={editando === 'nova' ? t('Nova cinemática') : t('Editar cinemática')} tamanho="lg" bloqueado={bloqueado} onFechar={() => { setEditando(null); setBloqueado(false) }}>
          <FormCinematica
            inicial={editando === 'nova' ? null : editando}
            usuarioId={session?.user?.id}
            onOcupado={setBloqueado}
            enviarImagem={c.enviarImagem}
            onSalvar={async dados => {
              if (editando === 'nova') await c.criar(dados); else await c.atualizar(editando.id, dados)
              toast.ok(t('Cinemática salva'))
              setEditando(null); setBloqueado(false)
            }}
          />
        </Modal>
      )}
    </div>
  )
}
