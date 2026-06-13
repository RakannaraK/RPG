import { useState } from 'react'
import DiceRoller from './DiceRoller'
import Dice3D from '../dados/Dice3D'

function formulaTexto(regra) {
  if (!regra) return ''
  if (regra.tipo === 'dados') {
    const partes = [`${regra.quantidade}d${regra.lados}`]
    if (regra.descartar_menores > 0) partes.push(`-${regra.descartar_menores}↓`)
    if (regra.descartar_maiores > 0) partes.push(`-${regra.descartar_maiores}↑`)
    if (regra.bonus_fixo > 0) partes.push(`+${regra.bonus_fixo}`)
    else if (regra.bonus_fixo < 0) partes.push(String(regra.bonus_fixo))
    return partes.join(' ')
  }
  if (regra.tipo === 'fixo') return `Fixo ${regra.valor}`
  if (regra.tipo === 'pontos') return `${regra.pool_total} pts`
  return ''
}

function buildNotacaoTeste(valor) {
  if (valor === null || valor === undefined) return '1d20'
  if (valor > 0) return `1d20+${valor}`
  if (valor < 0) return `1d20${valor}`
  return '1d20'
}

export default function AtributoCard({ atributo, valorAtributo, onSave, canEdit, mesaId, fichaId, registrarRolagem }) {
  const [rolando, setRolando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [valorManual, setValorManual] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [testeResultado, setTesteResultado] = useState(null)
  const [testeRolando, setTesteRolando] = useState(false)
  const [testando, setTestando] = useState(false)
  const [erroTeste, setErroTeste] = useState('')

  const valor = valorAtributo?.valor
  const regra = atributo?.regra_rolagem
  const podeRolar = canEdit && regra?.tipo !== 'fixo'

  async function handleConfirmar(resultado) {
    setSalvando(true)
    setErro('')
    try {
      await onSave(
        atributo.id,
        resultado.valor,
        resultado.resultados?.length > 0
          ? {
              resultados: resultado.resultados,
              mantidos: resultado.mantidos,
              descartados: resultado.descartados,
            }
          : null
      )
      setRolando(false)
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarManual() {
    const v = Number(valorManual)
    if (isNaN(v) || valorManual === '') return
    setSalvando(true)
    setErro('')
    try {
      await onSave(atributo.id, v, null)
      setEditando(false)
      setValorManual('')
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleTestar() {
    if (testando || !registrarRolagem) return
    setTestando(true)
    setErroTeste('')
    try {
      const notacao = buildNotacaoTeste(valor)
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: `Teste de ${atributo.nome}`,
        notacao,
      })
      setTesteResultado(res)
      setTesteRolando(true)
      setTimeout(() => { setTesteRolando(false); setTestando(false) }, 1400)
    } catch (err) {
      setErroTeste(err.message || 'Erro ao rolar.')
      setTestando(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold">{atributo.nome}</p>
          {atributo.descricao && (
            <p className="text-purple-400 text-xs mt-0.5">{atributo.descricao}</p>
          )}
          <p className="text-amber-500 text-xs font-mono mt-1">{formulaTexto(regra)}</p>
        </div>
        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
          <p className="text-white font-bold text-3xl leading-none">
            {valor !== undefined && valor !== null ? valor : '—'}
          </p>
          {mesaId && registrarRolagem && (
            <button
              type="button"
              onClick={handleTestar}
              disabled={testando}
              title={`Teste de ${atributo.nome}`}
              className="text-xs text-amber-500 hover:text-amber-300 disabled:opacity-40 transition-colors px-2 py-0.5 rounded hover:bg-amber-900/30"
            >
              🎲 Testar
            </button>
          )}
        </div>
      </div>

      {/* Resultado do teste contextual */}
      {testeResultado && (
        <div className="border-t border-purple-800 pt-3 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-purple-400 font-mono text-xs">{testeResultado.notacao}</span>
            <button
              type="button"
              onClick={() => setTesteResultado(null)}
              className="text-purple-600 hover:text-purple-400 text-xs transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {testeResultado.dados.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <Dice3D
                  lados={d.lados}
                  resultado={d.valor}
                  rolando={testeRolando}
                  descartado={d.descartado}
                />
                {d.descartado && <span className="text-red-500 text-[9px]">desc.</span>}
              </div>
            ))}
            <div className="flex items-baseline gap-1.5 ml-1">
              <span className="text-purple-400 text-xs">Total:</span>
              <span className="text-2xl font-bold text-white leading-none">{testeResultado.total}</span>
            </div>
          </div>
          {(testeResultado.mantidos.length > 1 || testeResultado.modificador !== 0) && (
            <p className="text-purple-500 text-xs">
              ({testeResultado.mantidos.join(' + ')}
              {testeResultado.modificador > 0 && ` + ${testeResultado.modificador}`}
              {testeResultado.modificador < 0 && ` − ${Math.abs(testeResultado.modificador)}`})
            </p>
          )}
          {erroTeste && <p className="text-red-400 text-xs">{erroTeste}</p>}
        </div>
      )}

      {/* Roller inline */}
      {rolando && (
        <div className="border-t border-purple-800 pt-3">
          <DiceRoller
            regra={regra}
            onConfirmar={handleConfirmar}
          />
          <button
            type="button"
            onClick={() => setRolando(false)}
            className="mt-2 text-xs text-purple-500 hover:text-purple-300 transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Edição manual */}
      {editando && !rolando && (
        <div className="border-t border-purple-800 pt-3">
          <div className="flex gap-2">
            <input
              type="number"
              value={valorManual}
              onChange={e => setValorManual(e.target.value)}
              placeholder={valor !== undefined ? String(valor) : '0'}
              autoFocus
              className="flex-1 px-3 py-1.5 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="button"
              onClick={handleSalvarManual}
              disabled={salvando}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => { setEditando(false); setValorManual('') }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      {canEdit && !rolando && !editando && (
        <div className="flex gap-2 mt-1">
          {podeRolar && (
            <button
              type="button"
              onClick={() => setRolando(true)}
              className="flex-1 py-1.5 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              🎲 {valor !== undefined ? 'Rolar novamente' : 'Rolar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setEditando(true)
              setValorManual(valor !== undefined ? String(valor) : '')
            }}
            className="flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            ✎ Editar
          </button>
        </div>
      )}

      {erro && <p className="mt-2 text-red-400 text-xs">{erro}</p>}
    </div>
  )
}
