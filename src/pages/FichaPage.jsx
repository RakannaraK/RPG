import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFicha, useUpdateFicha } from '../hooks/useFicha'
import { useSistema } from '../hooks/useSistema'
import { useRolagem } from '../hooks/useRolagem'
import { supabase } from '../lib/supabase'
import { mergeConfigLayout } from '../lib/sistemaDefaults'
import CabecalhoPersonagem from '../components/ficha/layout/CabecalhoPersonagem'
import FaixaAtributos from '../components/ficha/layout/FaixaAtributos'
import PainelCombate from '../components/ficha/layout/PainelCombate'
import PainelPericias from '../components/ficha/layout/PainelPericias'
import PainelProficiencias from '../components/ficha/layout/PainelProficiencias'
import PainelDefesas from '../components/ficha/layout/PainelDefesas'
import PainelImagens from '../components/ficha/layout/PainelImagens'
import AbasCentrais from '../components/ficha/layout/AbasCentrais'

export default function FichaPage() {
  const { id: mesaId, fichaId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()

  const { ficha, valoresAtributos, loading, error, refetch } = useFicha(fichaId)
  const { sistema, pericias: periciasDoSistema } = useSistema(mesaId)
  const { updateValorAtributo } = useUpdateFicha()
  const { registrarRolagem } = useRolagem()

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDeleteFicha() {
    setDeleting(true)
    setDeleteError('')
    try {
      const { error: err } = await supabase.from('fichas').delete().eq('id', fichaId)
      if (err) throw err
      navigate(`/mesa/${mesaId}`)
    } catch (err) {
      setDeleteError(err.message || 'Erro ao deletar ficha.')
      setDeleting(false)
    }
  }

  async function handleSaveValor(atributoId, valor, dadosRolados) {
    await updateValorAtributo(fichaId, atributoId, valor, dadosRolados)
    refetch()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-purple-400 text-lg">Carregando ficha...</div>
      </div>
    )
  }

  if (error || !ficha) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Ficha não encontrada.'}</p>
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Voltar à mesa
          </button>
        </div>
      </div>
    )
  }

  const isDono = ficha.dono_id === session?.user?.id
  const config = sistema?.config_layout || mergeConfigLayout(null)
  const secoes = config.secoes
  const camposCombate = config.campos_combate || []
  const rotuloVida = config.rotulo_vida || 'Pontos de Vida'

  const hasLeft = secoes.pericias || secoes.proficiencias
  const hasRight = secoes.combate || secoes.defesas || secoes.imagens

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      {/* Barra de navegação */}
      <header className="border-b border-purple-800 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/mesa/${mesaId}`)}
            className="text-purple-400 hover:text-white transition-colors text-sm shrink-0"
          >
            ← Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-xl leading-tight truncate">
              {ficha.nome_personagem}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isDono && (
              <span className="text-xs text-purple-400 bg-purple-900/60 border border-purple-700 px-2 py-1 rounded-full">
                Visualizando
              </span>
            )}
            {isDono && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950/50 rounded-lg transition-colors"
                title="Deletar ficha"
              >
                🗑
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Cabeçalho do personagem */}
        <CabecalhoPersonagem
          ficha={ficha}
          rotuloVida={rotuloVida}
          isDono={isDono}
          onRefetch={refetch}
        />

        {/* Faixa de atributos */}
        <FaixaAtributos
          valoresAtributos={valoresAtributos}
          isDono={isDono}
          mesaId={mesaId}
          fichaId={fichaId}
          registrarRolagem={registrarRolagem}
          onSaveValor={handleSaveValor}
        />

        {/* Layout de 3 colunas */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Coluna esquerda — Perícias / Proficiências */}
          {hasLeft && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-4">
              {secoes.pericias && (
                <PainelPericias
                  pericias={periciasDoSistema}
                  fichaId={fichaId}
                  isDono={isDono}
                  valoresAtributos={valoresAtributos}
                  mesaId={mesaId}
                  registrarRolagem={registrarRolagem}
                />
              )}
              {secoes.proficiencias && (
                <PainelProficiencias
                  ficha={ficha}
                  isDono={isDono}
                  onRefetch={refetch}
                />
              )}
            </div>
          )}

          {/* Coluna central — Abas: Ações / Inventário / Traços / Notas */}
          <div className="flex-1 min-w-0">
            <AbasCentrais
              secoes={secoes}
              fichaId={fichaId}
              donoId={ficha.dono_id}
              isDono={isDono}
              mesaId={mesaId}
              ficha={ficha}
              onRefetch={refetch}
            />
          </div>

          {/* Coluna direita — Combate / Defesas / Imagens */}
          {hasRight && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 space-y-4">
              {secoes.combate && (
                <PainelCombate
                  campos={camposCombate}
                  fichaId={fichaId}
                  isDono={isDono}
                />
              )}
              {secoes.defesas && <PainelDefesas />}
              {secoes.imagens && (
                <PainelImagens
                  fichaId={fichaId}
                  donoId={ficha.dono_id}
                  isDono={isDono}
                />
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal de confirmação de deleção */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-800/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Deletar ficha?</h3>
            <p className="text-purple-300 text-sm mb-5">
              Tem certeza? Esta ação não pode ser desfeita. Todos os atributos,
              equipamentos e imagens desta ficha serão apagados permanentemente.
            </p>
            {deleteError && (
              <p className="text-red-400 text-sm mb-3">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                disabled={deleting}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFicha}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {deleting ? 'Deletando...' : 'Deletar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
