import { useState, useEffect } from 'react'
import Dice3D from '../dados/Dice3D'
import { listarSkins } from '../../lib/diceSkins'
import { tocarSomDado } from '../../lib/diceSounds'
import { usePreferencias } from '../../context/PreferenciasContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const SKINS = listarSkins()

export default function PreferenciasModal({ onFechar }) {
  const { preferencias, salvarPreferencias } = usePreferencias()
  const { dado_skin, som_ativo, som_volume, som_acao_ativo, som_acao_volume } = preferencias
  const { session } = useAuth()

  // Nome de exibição (apelido global) — o que outras pessoas veem no lugar do e-mail.
  const [apelido, setApelido] = useState('')
  const [apelidoSalvo, setApelidoSalvo] = useState(false)
  const [apelidoErro, setApelidoErro] = useState('')
  const [salvandoApelido, setSalvandoApelido] = useState(false)

  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    supabase.from('profiles').select('username').eq('id', uid).single()
      .then(({ data }) => { if (data?.username) setApelido(data.username) })
  }, [session?.user?.id])

  async function salvarApelido() {
    const uid = session?.user?.id
    const v = apelido.trim()
    setApelidoErro('')
    if (!uid) return
    if (!v) { setApelidoErro('O apelido não pode ficar vazio.'); return }
    setSalvandoApelido(true)
    const { error } = await supabase.from('profiles').update({ username: v }).eq('id', uid)
    setSalvandoApelido(false)
    if (error) { setApelidoErro(error.message || 'Erro ao salvar.'); return }
    setApelido(v)
    setApelidoSalvo(true)
    setTimeout(() => setApelidoSalvo(false), 2000)
  }

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
          {/* Nome de exibição (apelido global) */}
          <div>
            <p className="text-sm font-medium text-purple-200 mb-1">Nome de exibição</p>
            <p className="text-purple-500 text-xs mb-2">É o que as outras pessoas veem (no lugar do seu e-mail). Pode trocar a qualquer hora.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={apelido}
                onChange={e => setApelido(e.target.value)}
                maxLength={40}
                placeholder="Seu apelido"
                className="flex-1 px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={salvarApelido}
                disabled={salvandoApelido}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${apelidoSalvo ? 'bg-green-700 text-green-100' : 'bg-purple-700 hover:bg-purple-600 text-white'}`}
              >
                {apelidoSalvo ? '✓ Salvo' : salvandoApelido ? '...' : 'Salvar'}
              </button>
            </div>
            {apelidoErro && <p className="text-red-400 text-xs mt-1">{apelidoErro}</p>}
          </div>

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
