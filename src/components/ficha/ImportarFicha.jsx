import { useRef, useState } from 'react'
import { gravarImportacao, prepararImportacao } from '../../lib/fichaBanco'
import Modal, { FecharModal } from '../ui/Modal'
import Botao from '../ui/Botao'
import { t } from '../../i18n'

// [singular, plural]
const ROTULOS = {
  valores_atributos: [t('atributo'), t('atributos')], pericias_ficha: [t('perícia'), t('perícias')],
  classes_ficha: [t('classe'), t('classes')], habilidades_ficha: [t('habilidade'), t('habilidades')],
  poderes_ficha: [t('poder'), t('poderes')], linhas_ficha: [t('linha de poder'), t('linhas de poder')],
  pools_ficha: [t('reserva'), t('reservas')], itens_ficha: [t('item'), t('itens')],
  maestrias_ficha: [t('maestria'), t('maestrias')], slots_ficha: [t('espaço'), t('espaços')],
  trilhas_ficha: [t('trilha'), t('trilhas')], estados_ficha: [t('estado'), t('estados')],
  valores_combate: [t('campo de combate'), t('campos de combate')], projetos_ficha: [t('projeto'), t('projetos')],
  imagens_ficha: [t('imagem'), t('imagens')], recompensas_ficha: [t('recompensa'), t('recompensas')],
  condicoes_manuais_ficha: [t('condição'), t('condições')], pontos_status_ficha: [t('ponto de status'), t('pontos de status')],
}
const contar = (tabela, n) => `${n} ${(ROTULOS[tabela] || [tabela, tabela])[n === 1 ? 0 : 1]}`

/** Fase 30.3 — importar ficha de arquivo .json, com prévia antes de gravar. */
export default function ImportarFicha({ mesaId, donoId, onImportada, className = '', extras = {}, rotulo = t('⬆ Importar ficha') }) {
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
      setErro(err.message || t('Arquivo inválido.'))
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
      setErro(err.message || t('Não foi possível importar.'))
    } finally {
      setOcupado(false)
    }
  }

  const contagens = plano
    ? Object.entries(plano.filhos).filter(([, l]) => l.length).map(([tabela, l]) => contar(tabela, l.length))
    : []

  return (
    <>
      <input ref={inputRef} type="file" accept="application/json,.json" onChange={aoEscolher} className="hidden" />
      <button
        type="button" onClick={() => inputRef.current?.click()} disabled={ocupado}
        className={className || 'text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50'}
        title={t('Importar ficha de um arquivo .json')}
      >
        {ocupado && !plano ? t('Lendo…') : rotulo}
      </button>
      {erro && !plano && <p className="text-red-400 text-xs mt-1">{erro}</p>}

      {plano && (
        <Modal
          onFechar={() => setPlano(null)} bloqueado={ocupado} tamanho="md"
          titulo={t('Importar “{nome}”', { nome: plano.ficha.nome_personagem })}
          rodape={
            <>
              <FecharModal disabled={ocupado} />
              <Botao variante="primario" onClick={confirmar} disabled={ocupado}>{ocupado ? t('Importando…') : t('Importar')}</Botao>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-ink-dim text-sm">
              {[plano.ficha.raca, plano.ficha.classe, plano.ficha.nivel ? t('nível {n}', { n: plano.ficha.nivel }) : null].filter(Boolean).join(' · ') || t('sem detalhes')}
              {plano.sistemaOrigem ? t(' · sistema de origem: {sistema}', { sistema: plano.sistemaOrigem }) : ''}
            </p>
            <p className="text-ink text-sm">{contagens.length ? t('Entram: {lista}.', { lista: contagens.join(', ') }) : t('Só os dados básicos entram.')}</p>

            {plano.avisos.length > 0 && (
              <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 space-y-1">
                <p className="text-amber-300 text-xs font-semibold">{t('Fica de fora ({n}):', { n: plano.avisos.length })}</p>
                <ul className="text-amber-200/90 text-xs space-y-0.5 max-h-40 overflow-y-auto">
                  {plano.avisos.map(a => <li key={a}>• {a}</li>)}
                </ul>
              </div>
            )}
            <p className="text-ink-dim text-xs">{t('A ficha entra como sua, nesta mesa. Nada existente é alterado.')}</p>
            {erro && <p className="aviso-erro" role="alert">{erro}</p>}
          </div>
        </Modal>
      )}
    </>
  )
}
