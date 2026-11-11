import { useState } from 'react'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'
import { baixarJson } from '../../lib/baixarArquivo'
import { CATALOGO, PACOTE_ESSENCIAL, validarPacote, conteudoInstalado, instalar, desinstalar } from '../../lib/extensoes'
import { LIMITES } from '../../lib/efeitosVocabulario'

/** Fase 60 — catálogo de extensões da mesa, importar e baixar `.json`. `onSalvar(novaLista)` grava (pode lançar erro). */
export default function ModalExtensoes({ aberto, onFechar, extensoes = [], onSalvar }) {
  const [busy, setBusy] = useState(false)
  const [erros, setErros] = useState([])

  const idsInstalados = new Set(extensoes.map(x => (typeof x === 'string' ? x : x?.id)))
  const importadas = conteudoInstalado(extensoes).pacotes.filter(p => p.id !== PACOTE_ESSENCIAL.id && !CATALOGO.some(c => c.id === p.id))

  async function salvar(nova) {
    setBusy(true)
    setErros([])
    try { await onSalvar(nova) } catch (e) { setErros([e.message || 'Não foi possível salvar.']) } finally { setBusy(false) }
  }

  async function importar(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    if (arquivo.size > LIMITES.bytesPacote) { setErros([`Arquivo grande demais (máximo ${LIMITES.bytesPacote} bytes).`]); return }
    const v = validarPacote(await arquivo.text())
    if (!v.ok) { setErros(v.erros); return }
    await salvar(instalar(extensoes, v.pacote))
    if (v.erros.length) setErros(v.erros)
  }

  const resumo = p => `${p.cenas.length} cena${p.cenas.length === 1 ? '' : 's'} · ${p.efeitos.length} efeito${p.efeitos.length === 1 ? '' : 's'}`
  const cartao = (p, instalada, removivel) => (
    <li key={p.id} className="rounded-xl border border-border bg-void px-3 py-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-ink text-sm font-medium flex-1 min-w-0 truncate">{p.nome}</span>
        <span className="text-ink-dim text-xs">{resumo(p)}</span>
      </div>
      {p.descricao && <p className="text-ink-dim text-xs">{p.descricao}</p>}
      <div className="flex flex-wrap gap-2">
        {removivel && (instalada
          ? <Botao tamanho="sm" variante="secundario" disabled={busy} onClick={() => salvar(desinstalar(extensoes, p.id))}>Remover</Botao>
          : <Botao tamanho="sm" variante="primario" disabled={busy} onClick={() => salvar(instalar(extensoes, p.id))}>Instalar</Botao>)}
        <Botao tamanho="sm" variante="contorno" onClick={() => baixarJson(`${p.id}.json`, p)}>Baixar .json</Botao>
      </div>
    </li>
  )

  return (
    <Modal
      aberto={aberto} onFechar={onFechar} titulo="Extensões" tamanho="lg" bloqueado={busy}
      subtitulo="Pacotes de cenas e efeitos para a mesa."
      rodape={<FecharModal>Fechar</FecharModal>}
    >
      <div className="space-y-4">
        <p className="text-ink-dim text-sm">
          Uma extensão é um arquivo .json com cenas e efeitos. “Baixar .json” serve de modelo para criar a sua.
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
            <h3 className="text-ink text-sm font-medium">Importadas</h3>
            <ul className="space-y-2">{importadas.map(p => cartao(p, true, true))}</ul>
          </section>
        )}
        <label className="flex flex-wrap items-center gap-2 text-ink text-sm">
          Importar arquivo
          <input type="file" accept="application/json,.json" onChange={importar} disabled={busy} className="text-ink-dim text-xs" />
        </label>
      </div>
    </Modal>
  )
}
