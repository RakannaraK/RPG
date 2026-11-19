import { useState } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'
import EquipamentosTab from '../EquipamentosTab'
import AcoesTab from './AcoesTab'
import PainelHabilidades from './PainelHabilidades'
import ArvoreHabilidades from '../ArvoreHabilidades'
import Abas from '../../ui/Abas'
import { t } from '../../../i18n'

function TextoTab({ fichaId, campo, valor: valorInicial, isDono, placeholder, onRefetch }) {
  const [valor, setValor] = useState(valorInicial)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const { updateFicha } = useUpdateFicha()

  async function handleSalvar() {
    setErro('')
    try {
      await updateFicha(fichaId, { [campo]: valor })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
      onRefetch()
    } catch (err) {
      setErro(err.message || t('Erro ao salvar.'))
    }
  }

  return (
    <div className="space-y-2">
      {isDono && (
        <div className="flex justify-end print:hidden">
          <button
            onClick={handleSalvar}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              salvo
                ? 'bg-ok text-green-100'
                : 'bg-hover hover:bg-accent-700 text-sobre-acento'
            }`}
          >
            {salvo ? t('✓ Salvo') : t('Salvar')}
          </button>
        </div>
      )}
      {isDono ? (
        <textarea
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className="w-full px-3 py-2.5 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none print:hidden"
        />
      ) : null}
      {/* F45 — no papel o textarea cortaria o texto: sai como parágrafo */}
      {isDono && <p className="hidden print:block text-sm whitespace-pre-wrap">{valor || t('Sem conteúdo.')}</p>}
      {isDono ? null : valor ? (
        <p className="text-ink text-sm whitespace-pre-wrap min-h-[6rem] px-3 py-2.5 bg-hover rounded-lg border border-border">
          {valor}
        </p>
      ) : (
        <p className="text-ink-dim text-sm italic px-3 py-2.5 bg-hover rounded-lg border border-border min-h-[6rem]">
          {t('Sem conteúdo.')}
        </p>
      )}
      {erro && <p className="text-harm text-xs">{erro}</p>}
    </div>
  )
}

/** F45 — aba sempre montada (o conteúdo já carregou quando alguém imprime):
 *  a inativa some na tela e aparece no papel, com o nome da aba como título. */
function Aba({ id, atual, rotulo, children }) {
  return (
    <div className={id === atual ? 'entra-aba print:mt-4' : 'hidden print:block print:mt-4'}>
      <h3 className="hidden print:block font-semibold mb-2">{rotulo}</h3>
      {children}
    </div>
  )
}

export default function AbasCentrais({
  secoes, fichaId, donoId, isDono, mesaId, ficha, onRefetch,
  habilidades = [], habilidadesFicha = [],
  onToggleHabilidade, onAdicionarHabilidade, onRemoverHabilidade, onAjustarRecurso, onRecuperarRecursos,
  onUsarHabilidade, onAjustarCargaHabilidade, onLiberarRecargaHabilidade, // F32.2
  volumeSomHabilidade = 0.6, // F35.4
  valoresFinais = {}, modificadoresAtivos = [], onUsarAcaoHabilidade,
  condicoesManuais = {}, condicoesManuaisDisponiveis = [], onToggleCondicao, nomesAlvos = {},
  habilidadesBloqueadas = [], // 19.5
  contextoNivel = {}, // F33.3 — { nivel, niveisClasse } para a árvore
  pontosArvore = null, // F54 — { total, gastos, saldo, erro, rotulo }
  poolsPorId = {}, onPagarTurno,  // 20.5
  categorias = [], // 21.1
  maestria = null, onGanharMaestria, // 21.3
  maestriaDoItem, // 21.4
  atributos = [], camposCombate = [], pericias = [], classes = [], pools = [], // 21 — item como modificador
  critico = null, // 22.3
  configSom = null, // FV.5
}) {
  const temHabilidades = habilidades.length > 0 || habilidadesFicha.length > 0 || condicoesManuaisDisponiveis.length > 0
    || habilidadesBloqueadas.length > 0
  const tabsList = [
    secoes.acoes      && { id: 'acoes',       label: t('Ações') },
    secoes.inventario && { id: 'inventario',  label: t('Inventário') },
    secoes.tracos     && { id: 'tracos',      label: t('Traços') },
    secoes.notas      && { id: 'notas',       label: t('Notas') },
    temHabilidades    && { id: 'habilidades', label: t('Habilidades') },
    // F33.3 — a árvore só aparece quando o sistema liga habilidades entre si
    (habilidades.some(h => h.requer_habilidade_id || h.requer_habilidades_ids?.length)
      || ((pontosArvore?.total != null || pontosArvore?.erro) && habilidades.some(h => h.custo_pontos > 0))) && { id: 'arvore', label: t('Árvore') },
  ].filter(Boolean)

  const [activeTab, setActiveTab] = useState(tabsList[0]?.id || '')

  if (tabsList.length === 0) return null

  const currentTab = tabsList.find(ab => ab.id === activeTab) ? activeTab : tabsList[0].id
  const rotuloDe = id => tabsList.find(ab => ab.id === id)?.label

  return (
    <div className="bg-raised border border-border rounded-xl overflow-hidden">
      <div className="px-2 print:hidden">
        <Abas
          rotulo={t('Seções da ficha')} tamanho="sm" idPainel="painel-da-ficha"
          abas={tabsList.map(ab => ({ id: ab.id, rotulo: ab.label }))}
          atual={currentTab} onTrocar={setActiveTab}
        />
      </div>

      <div className="p-4" id="painel-da-ficha" role="tabpanel" aria-label={rotuloDe(currentTab)}>
        {tabsList.some(ab => ab.id === 'acoes') && (
          <Aba id="acoes" atual={currentTab} rotulo={rotuloDe('acoes')}>
          <AcoesTab
            fichaId={fichaId}
            isDono={isDono}
            mesaId={mesaId}
            valoresFinais={valoresFinais}
            modificadoresAtivos={modificadoresAtivos}
          />
          </Aba>
        )}
        {tabsList.some(ab => ab.id === 'inventario') && (
          <Aba id="inventario" atual={currentTab} rotulo={rotuloDe('inventario')}>
          <EquipamentosTab
            fichaId={fichaId}
            donoId={donoId}
            isDono={isDono}
            mesaId={mesaId}
            valoresFinais={valoresFinais}
            modificadoresAtivos={modificadoresAtivos}
            categorias={categorias}
            maestria={maestria}
            onGanharMaestria={onGanharMaestria}
            maestriaDoItem={maestriaDoItem}
            atributos={atributos}
            camposCombate={camposCombate}
            pericias={pericias}
            classes={classes}
            pools={pools}
            critico={critico}
            configSom={configSom}
          />
          </Aba>
        )}
        {tabsList.some(ab => ab.id === 'tracos') && (
          <Aba id="tracos" atual={currentTab} rotulo={rotuloDe('tracos')}>
          <TextoTab
            fichaId={fichaId}
            campo="tracos"
            valor={ficha.tracos || ''}
            isDono={isDono}
            placeholder={t('Traços de personalidade, características de raça, habilidades de classe...')}
            onRefetch={onRefetch}
          />
          </Aba>
        )}
        {tabsList.some(ab => ab.id === 'notas') && (
          <Aba id="notas" atual={currentTab} rotulo={rotuloDe('notas')}>
          <TextoTab
            fichaId={fichaId}
            campo="notas"
            valor={ficha.notas || ''}
            isDono={isDono}
            placeholder={t('Histórico, anotações, segredos, contatos...')}
            onRefetch={onRefetch}
          />
          </Aba>
        )}
        {currentTab === 'arvore' && (
          <div className="entra-aba"><ArvoreHabilidades
            habilidades={habilidades}
            habilidadesFicha={habilidadesFicha}
            contexto={contextoNivel}
            isDono={isDono}
            onAdicionar={onAdicionarHabilidade}
            onRemover={onRemoverHabilidade}
            pontos={pontosArvore}
          /></div>
        )}

        {tabsList.some(ab => ab.id === 'habilidades') && (
          <Aba id="habilidades" atual={currentTab} rotulo={rotuloDe('habilidades')}>
          <PainelHabilidades
            habilidades={habilidades}
            habilidadesFicha={habilidadesFicha}
            isDono={isDono}
            onToggle={onToggleHabilidade}
            onAdicionar={onAdicionarHabilidade}
            onRemover={onRemoverHabilidade}
            onAjustarRecurso={onAjustarRecurso}
            onUsarHabilidade={onUsarHabilidade}
            onAjustarCarga={onAjustarCargaHabilidade}
            onLiberarRecarga={onLiberarRecargaHabilidade}
            volumeSom={volumeSomHabilidade}
            onRecuperarRecursos={onRecuperarRecursos}
            onUsarAcao={onUsarAcaoHabilidade}
            condicoesManuais={condicoesManuais}
            condicoesManuaisDisponiveis={condicoesManuaisDisponiveis}
            onToggleCondicao={onToggleCondicao}
            modificadoresAtivos={modificadoresAtivos}
            nomesAlvos={nomesAlvos}
            habilidadesBloqueadas={habilidadesBloqueadas}
            poolsPorId={poolsPorId}
            onPagarTurno={onPagarTurno}
          />
          </Aba>
        )}
      </div>
    </div>
  )
}
