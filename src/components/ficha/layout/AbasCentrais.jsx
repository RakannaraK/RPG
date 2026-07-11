import { useState } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'
import EquipamentosTab from '../EquipamentosTab'
import AcoesTab from './AcoesTab'
import PainelHabilidades from './PainelHabilidades'

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
      setErro(err.message || 'Erro ao salvar.')
    }
  }

  return (
    <div className="space-y-2">
      {isDono && (
        <div className="flex justify-end">
          <button
            onClick={handleSalvar}
            className={`text-xs px-3 py-1 rounded-lg transition-colors ${
              salvo
                ? 'bg-green-700 text-green-100'
                : 'bg-purple-800 hover:bg-purple-700 text-white'
            }`}
          >
            {salvo ? '✓ Salvo' : 'Salvar'}
          </button>
        </div>
      )}
      {isDono ? (
        <textarea
          value={valor}
          onChange={e => setValor(e.target.value)}
          placeholder={placeholder}
          rows={10}
          className="w-full px-3 py-2.5 rounded-lg bg-slate-700 border border-purple-800 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
        />
      ) : valor ? (
        <p className="text-white text-sm whitespace-pre-wrap min-h-[6rem] px-3 py-2.5 bg-slate-700 rounded-lg border border-purple-800">
          {valor}
        </p>
      ) : (
        <p className="text-purple-500 text-sm italic px-3 py-2.5 bg-slate-700 rounded-lg border border-purple-800 min-h-[6rem]">
          Sem conteúdo.
        </p>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

export default function AbasCentrais({
  secoes, fichaId, donoId, isDono, mesaId, ficha, onRefetch,
  habilidades = [], habilidadesFicha = [],
  onToggleHabilidade, onAdicionarHabilidade, onRemoverHabilidade, onAjustarRecurso, onRecuperarRecursos,
  valoresFinais = {}, modificadoresAtivos = [], onUsarAcaoHabilidade,
  condicoesManuais = {}, condicoesManuaisDisponiveis = [], onToggleCondicao, nomesAlvos = {},
  habilidadesBloqueadas = [], // 19.5
  poolsPorId = {}, onPagarTurno,  // 20.5
  categorias = [], // 21.1
}) {
  const temHabilidades = habilidades.length > 0 || habilidadesFicha.length > 0 || condicoesManuaisDisponiveis.length > 0
    || habilidadesBloqueadas.length > 0
  const tabsList = [
    secoes.acoes      && { id: 'acoes',       label: 'Ações' },
    secoes.inventario && { id: 'inventario',  label: 'Inventário' },
    secoes.tracos     && { id: 'tracos',      label: 'Traços' },
    secoes.notas      && { id: 'notas',       label: 'Notas' },
    temHabilidades    && { id: 'habilidades', label: 'Habilidades' },
  ].filter(Boolean)

  const [activeTab, setActiveTab] = useState(tabsList[0]?.id || '')

  if (tabsList.length === 0) return null

  const currentTab = tabsList.find(t => t.id === activeTab) ? activeTab : tabsList[0].id

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="flex border-b border-purple-900 overflow-x-auto">
        {tabsList.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px shrink-0 ${
              currentTab === tab.id
                ? 'text-white border-purple-500'
                : 'text-purple-400 border-transparent hover:text-purple-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {currentTab === 'acoes' && (
          <AcoesTab
            fichaId={fichaId}
            isDono={isDono}
            mesaId={mesaId}
            valoresFinais={valoresFinais}
            modificadoresAtivos={modificadoresAtivos}
          />
        )}
        {currentTab === 'inventario' && (
          <EquipamentosTab
            fichaId={fichaId}
            donoId={donoId}
            isDono={isDono}
            mesaId={mesaId}
            valoresFinais={valoresFinais}
            modificadoresAtivos={modificadoresAtivos}
            categorias={categorias}
          />
        )}
        {currentTab === 'tracos' && (
          <TextoTab
            fichaId={fichaId}
            campo="tracos"
            valor={ficha.tracos || ''}
            isDono={isDono}
            placeholder="Traços de personalidade, características de raça, habilidades de classe..."
            onRefetch={onRefetch}
          />
        )}
        {currentTab === 'notas' && (
          <TextoTab
            fichaId={fichaId}
            campo="notas"
            valor={ficha.notas || ''}
            isDono={isDono}
            placeholder="Histórico, anotações, segredos, contatos..."
            onRefetch={onRefetch}
          />
        )}
        {currentTab === 'habilidades' && (
          <PainelHabilidades
            habilidades={habilidades}
            habilidadesFicha={habilidadesFicha}
            isDono={isDono}
            onToggle={onToggleHabilidade}
            onAdicionar={onAdicionarHabilidade}
            onRemover={onRemoverHabilidade}
            onAjustarRecurso={onAjustarRecurso}
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
        )}
      </div>
    </div>
  )
}
