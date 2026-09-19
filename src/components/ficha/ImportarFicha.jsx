import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gravarImportacao, prepararImportacao } from '../../lib/fichaBanco'

// [singular, plural]
const ROTULOS = {
  valores_atributos: ['atributo', 'atributos'], pericias_ficha: ['perícia', 'perícias'],
  classes_ficha: ['classe', 'classes'], habilidades_ficha: ['habilidade', 'habilidades'],
  poderes_ficha: ['poder', 'poderes'], linhas_ficha: ['linha de poder', 'linhas de poder'],
  pools_ficha: ['reserva', 'reservas'], itens_ficha: ['item', 'itens'],
  maestrias_ficha: ['maestria', 'maestrias'], slots_ficha: ['espaço', 'espaços'],
  trilhas_ficha: ['trilha', 'trilhas'], estados_ficha: ['estado', 'estados'],
  valores_combate: ['campo de combate', 'campos de combate'], projetos_ficha: ['projeto', 'projetos'],
  imagens_ficha: ['imagem', 'imagens'], recompensas_ficha: ['recompensa', 'recompensas'],
  condicoes_manuais_ficha: ['condição', 'condições'], pontos_status_ficha: ['ponto de status', 'pontos de status'],
}
const contar = (tabela, n) => `${n} ${(ROTULOS[tabela] || [tabela, tabela])[n === 1 ? 0 : 1]}`

/** Fase 30.3 — importar ficha de arquivo .json, com prévia antes de gravar. */
export default function ImportarFicha({ mesaId, donoId, onImportada, className = '', extras = {}, rotulo = '⬆ Importar ficha' }) {
  const inputRef = useRef(null)
  const [plano, setPlano] = useState(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function aoEscolher(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcupado(true); setErro('')
    try {
      setPlano(await prepararImportacao(JSON.parse(await file.text()), mesaId))
    } catch (err) {
      setErro(err.message || 'Arquivo inválido.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmar() {
    setOcupado(true); setErro('')
    try {
      const id = await gravarImportacao(plano, { mesaId, donoId, extras })
      setPlano(null)
      onImportada(id)
    } catch (err) {
      setErro(err.message || 'Não foi possível importar.')
    } finally {
      setOcupado(false)
    }
  }

  const contagens = plano
    ? Object.entries(plano.filhos).filter(([, l]) => l.length).map(([t, l]) => contar(t, l.length))
    : []

  return (
    <>
      <input ref={inputRef} type="file" accept="application/json,.json" onChange={aoEscolher} className="hidden" />
      <button
        type="button" onClick={() => inputRef.current?.click()} disabled={ocupado}
        className={className || 'text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50'}
        title="Importar ficha de um arquivo .json"
      >
        {ocupado && !plano ? 'Lendo…' : rotulo}
      </button>
      {erro && !plano && <p className="text-red-400 text-xs mt-1">{erro}</p>}

      {plano && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => !ocupado && setPlano(null)}>
          <div
            role="dialog" aria-modal="true" aria-label="Importar ficha" onClick={e => e.stopPropagation()}
            className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-border bg-bg p-5 space-y-4 shadow-2xl"
          >
            <h2 className="text-ink text-lg font-bold">Importar “{plano.ficha.nome_personagem}”</h2>
            <p className="text-ink-dim text-sm">
              {[plano.ficha.raca, plano.ficha.classe, plano.ficha.nivel ? `nível ${plano.ficha.nivel}` : null].filter(Boolean).join(' · ') || 'sem detalhes'}
              {plano.sistemaOrigem ? ` · sistema de origem: ${plano.sistemaOrigem}` : ''}
            </p>
            <p className="text-ink text-sm">{contagens.length ? `Entram: ${contagens.join(', ')}.` : 'Só os dados básicos entram.'}</p>

            {plano.avisos.length > 0 && (
              <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 space-y-1">
                <p className="text-amber-300 text-xs font-semibold">Fica de fora ({plano.avisos.length}):</p>
                <ul className="text-amber-200/90 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                  {plano.avisos.map(a => <li key={a}>• {a}</li>)}
                </ul>
              </div>
            )}
            <p className="text-ink-dim text-xs">A ficha entra como sua, nesta mesa. Nada existente é alterado.</p>
            {erro && <p className="text-red-400 text-xs">{erro}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPlano(null)} disabled={ocupado} className="px-4 py-2 rounded-lg bg-hover text-ink text-sm hover:bg-border">Cancelar</button>
              <button type="button" onClick={confirmar} disabled={ocupado} className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white text-sm font-semibold">
                {ocupado ? 'Importando…' : 'Importar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
