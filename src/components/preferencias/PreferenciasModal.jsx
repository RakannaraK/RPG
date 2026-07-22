import Dice3D from '../dados/Dice3D'
import { listarSkins } from '../../lib/diceSkins'
import { tocarSomDado } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'

const SKINS = listarSkins()

export default function PreferenciasModal({ onFechar }) {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const { dado_skin, som_ativo, som_volume, som_acao_ativo, som_acao_volume } = preferencias

  function escolher(id) {
    salvarPreferencias({ dado_skin: id })
    // Toca um preview da skin escolhida (respeita som on/off e volume)
    tocarSomDado(id, { ativo: som_ativo, volume: som_volume, numDados: 3 })
  }

  function ouvir(e, id) {
    e.stopPropagation()
    tocarSomDado(id, { ativo: som_ativo, volume: som_volume, numDados: 3 })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Preferências</h2>
            <p className="text-purple-400 text-xs mt-0.5">Skin do dado e som das rolagens</p>
          </div>
          <button
            onClick={onFechar}
            className="text-purple-400 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Grid de skins */}
          <div>
            <p className="text-sm font-medium text-purple-200 mb-3">Skin do dado</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SKINS.map(s => {
                const ativa = dado_skin === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => escolher(s.id)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                      ativa
                        ? 'border-purple-400 bg-purple-900/40'
                        : 'border-purple-800 bg-purple-950/30 hover:border-purple-600'
                    }`}
                  >
                    {ativa && (
                      <span className="absolute top-1.5 left-2 text-green-400 text-xs">✓</span>
                    )}
                    <span
                      onClick={e => ouvir(e, s.id)}
                      title={`Ouvir ${s.nome}`}
                      className="absolute top-1 right-1.5 text-sm text-purple-300 hover:text-white cursor-pointer"
                    >
                      🔊
                    </span>
                    <Dice3D lados={20} resultado={20} rolando={false} skin={s.id} />
                    <span className={`text-xs font-semibold ${ativa ? 'text-white' : 'text-purple-300'}`}>
                      {s.nome}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Controles de som */}
          <div className="space-y-3 border-t border-purple-900 pt-5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-purple-200">Som das rolagens</span>
              <input
                type="checkbox"
                checked={som_ativo}
                onChange={e => salvarPreferencias({ som_ativo: e.target.checked })}
                className="w-5 h-5 accent-purple-500"
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-purple-200">Volume</span>
                <span className="text-purple-400 text-xs tabular-nums">{Math.round(som_volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={som_volume}
                onChange={e => salvarPreferencias({ som_volume: Number(e.target.value) })}
                disabled={!som_ativo}
                className="w-full accent-purple-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* FV.4c — sons de ação (combate), independentes do som de dado acima */}
          <div className="space-y-3 border-t border-purple-900 pt-5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-purple-200">Sons de ação</span>
              <input
                type="checkbox"
                checked={som_acao_ativo}
                onChange={e => salvarPreferencias({ som_acao_ativo: e.target.checked })}
                className="w-5 h-5 accent-purple-500"
              />
            </label>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-purple-200">Volume</span>
                <span className="text-purple-400 text-xs tabular-nums">{Math.round(som_acao_volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={som_acao_volume}
                onChange={e => salvarPreferencias({ som_acao_volume: Number(e.target.value) })}
                disabled={!som_acao_ativo}
                className="w-full accent-purple-500 disabled:opacity-40"
              />
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-purple-900 flex justify-end shrink-0">
          <button
            onClick={onFechar}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
