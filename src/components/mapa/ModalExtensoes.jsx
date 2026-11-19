import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'
import { baixarJson } from '../../lib/baixarArquivo'
import { CATALOGO, PACOTE_ESSENCIAL, validarPacote, conteudoInstalado } from '../../lib/extensoes'
import { LIMITES } from '../../lib/efeitosVocabulario'
import { t, tn } from '../../i18n'

/** Fase 60 — catálogo de extensões da mesa, importar e baixar `.json`. `onInstalar(idOuPacote)` e `onRemover(id)` chamam o servidor (podem lançar erro). */
export default function ModalExtensoes({ aberto, onFechar, extensoes = [], onInstalar, onRemover }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [erros, setErros] = useState([])

  const idsInstalados = new Set(extensoes.map(x => (typeof x === 'string' ? x : x?.id)))
  const importadas = conteudoInstalado(extensoes).pacotes.filter(p => p.id !== PACOTE_ESSENCIAL.id && !CATALOGO.some(c => c.id === p.id))

  async function agir(acao) {
    setBusy(true)
    setErros([])
    try { await acao(); return true } catch (e) { setErros([e.message || t('Não foi possível salvar.')]); return false } finally { setBusy(false) }
  }

  async function importar(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.size > LIMITES.bytesPacote) { setErros([t('Arquivo grande demais (máximo {max} bytes).', { max: LIMITES.bytesPacote })]); return }
    const v = validarPacote(await arquivo.text())
    if (!v.ok) { setErros(v.erros); return }
    if (await agir(() => onInstalar(v.pacote)) && v.erros.length) setErros(v.erros)
  }

  const resumo = p => `${tn(p.cenas.length, '{n} cena', '{n} cenas')} · ${tn(p.efeitos.length, '{n} efeito', '{n} efeitos')}`
  const cartao = (p, instalada, removivel, publicavel) => (
    <li key={p.id} className="rounded-xl border border-border bg-void px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-ink text-sm font-medium flex-1 min-w-0 truncate">{p.nome}</span>
        <span className="text-ink-dim text-xs">{resumo(p)}</span>
      </div>
      {p.descricao && <p className="text-ink-dim text-xs">{p.descricao}</p>}
      <div className="flex flex-wrap gap-2">
        {removivel && (instalada
          ? <Botao tamanho="sm" variante="secundario" disabled={busy} onClick={() => agir(() => onRemover(p.id))}>{t('Remover')}</Botao>
          : <Botao tamanho="sm" variante="primario" disabled={busy} onClick={() => agir(() => onInstalar(p.id))}>{t('Instalar')}</Botao>)}
        <Botao tamanho="sm" variante="contorno" onClick={() => baixarJson(`${p.id}.json`, p)}>{t('Baixar .json')}</Botao>
        {publicavel && <Botao tamanho="sm" variante="contorno" onClick={() => navigate('/comunidade', { state: { publicar: { tipo: 'extensao', conteudo: p } } })}>{t('Publicar na Comunidade')}</Botao>}
      </div>
    </li>
  )

  return (
    <Modal
      aberto={aberto} onFechar={onFechar} titulo={t('Extensões')} tamanho="lg" bloqueado={busy}
      subtitulo={t('Pacotes de cenas e efeitos para a mesa.')}
      rodape={<FecharModal>{t('Fechar')}</FecharModal>}
    >
      <div className="space-y-4">
        <p className="text-ink-dim text-sm">
          {t('Uma extensão é um arquivo .json com cenas e efeitos. “Baixar .json” serve de modelo para criar a sua.')}
        </p>
        {erros.length > 0 && (
          <ul className="text-harm text-sm space-y-0.5" role="alert">{erros.map((m, i) => <li key={i}>{m}</li>)}</ul>
        )}
        <ul className="space-y-2">
          {cartao(PACOTE_ESSENCIAL, true, false)}
          {CATALOGO.map(p => cartao(p, idsInstalados.has(p.id), true))}
        </ul>
        {importadas.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-ink text-sm font-medium">{t('Importadas')}</h3>
            <ul className="space-y-2">{importadas.map(p => cartao(p, true, true, true))}</ul>
          </section>
        )}
        <label className="flex flex-wrap items-center gap-2 text-ink text-sm">
          {t('Importar arquivo')}
          <input type="file" accept="application/json,.json" onChange={importar} disabled={busy} className="text-ink-dim text-xs" />
        </label>
      </div>
    </Modal>
  )
}
