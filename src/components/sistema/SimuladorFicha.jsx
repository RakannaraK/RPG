import { useState } from 'react'
import { avaliarFormula } from '../../lib/formulaEngine'
import { rolarNotacao } from '../../lib/diceNotation'
import { resolverRolagem, descreverResultado } from '../../lib/resolutionEngine'
import { rolarDados } from '../../lib/dice'

/** Avalia uma fórmula sem deixar erro vazar para a tela. */
function tentar(formula, ctx) {
  if (!formula || !String(formula).trim()) return { ok: true, valor: null }
  try {
    return { ok: true, valor: avaliarFormula(formula, ctx) }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}

/**
 * Simulador de ficha — prévia do sistema SEM criar mesa nem personagem.
 * Serve para fechar o ciclo de tentativa e erro dentro do próprio editor:
 * mexeu na fórmula do modificador, vê o efeito na hora.
 *
 * Só leitura: não grava nada, não toca no banco.
 */
export default function SimuladorFicha({ config, atributos = [], pericias = [] }) {
  const [valores, setValores] = useState({})
  const [nivel, setNivel] = useState(1)
  const [roll, setRoll] = useState(null)

  const valorDe = a => {
    const v = valores[a.id ?? a.nome]
    return v === undefined || v === '' ? 10 : Number(v)
  }

  const atributosCtx = {}
  atributos.forEach(a => {
    const v = valorDe(a)
    if (a.id) atributosCtx[a.id] = v
    if (a.nome) atributosCtx[a.nome] = v
  })

  const ctx = {
    atributos: atributosCtx,
    nivel: Number(nivel) || 1,
    niveisClasse: {},
    formulaModificador: config?.formula_modificador || '',
    formula_proficiencia: config?.formula_proficiencia || '',
    vida_atual: 0,
    vida_max: 0,
    pericias: {},
    recursos: {},
    pools: {},
    estados: {},
  }

  const prof = tentar(config?.formula_proficiencia, ctx)
  const modo = config?.resolucao?.modo || 'soma'

  function rolarTeste(atributo) {
    const valor = valorDe(atributo)
    const fm = config?.formula_modificador
    let usado = valor
    if (fm && String(fm).trim()) {
      const r = tentar(fm, { ...ctx, _x: valor })
      if (r.ok && r.valor != null) usado = r.valor
    }
    try {
      if (modo === 'soma') {
        const dado = config?.dado_padrao || 20
        const nota = `1d${dado}${usado >= 0 ? `+${usado}` : usado}`
        const res = rolarNotacao(nota)
        setRoll({ nome: atributo.nome, texto: `${nota} → ${res.total}` })
        return
      }
      if (modo === 'sucessos') {
        const faces = Number(config.resolucao.dado) || 10
        const qtd = Math.max(1, usado)
        const dados = rolarDados(qtd, faces)
        const est = resolverRolagem({
          config: config.resolucao, dados,
          dificuldade: config.resolucao.dificuldade_padrao ?? 6, especiais_idx: [],
        })
        const d = descreverResultado(est)
        setRoll({ nome: atributo.nome, texto: `${qtd}d${faces} → ${d?.texto || est.sucessos}` })
        return
      }
      if (modo === 'roll_under') {
        const faces = Number(config.resolucao.dado) || 100
        const dados = rolarDados(1, faces)
        const est = resolverRolagem({ config: config.resolucao, dados, dificuldade: usado, especiais_idx: [] })
        const d = descreverResultado(est)
        setRoll({ nome: atributo.nome, texto: `1d${faces} ≤ ${usado} → ${d?.texto || est.valor}` })
        return
      }
      // faixas
      const nb = config.resolucao.notacao_base || '2d6'
      const rolado = rolarNotacao(nb)
      const est = resolverRolagem({ config: config.resolucao, dados: rolado.mantidos, dificuldade: usado, especiais_idx: [] })
      const d = descreverResultado(est)
      setRoll({ nome: atributo.nome, texto: `${nb}+${usado} → ${d?.texto || est.total}` })
    } catch (e) {
      setRoll({ nome: atributo.nome, texto: `Erro: ${e.message}` })
    }
  }

  if (atributos.length === 0) {
    return (
      <p className="text-purple-500 text-sm">
        Crie ao menos um atributo para simular uma ficha.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-purple-200 text-sm font-semibold">Simulador</p>
        <p className="text-purple-500 text-xs mt-0.5">
          Prévia do sistema sem criar mesa nem personagem. Mexa nos valores e veja
          o efeito das suas fórmulas na hora. Nada aqui é salvo.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-purple-400 text-xs">Nível simulado</label>
        <input
          type="number" min={1} value={nivel}
          onChange={e => setNivel(Number(e.target.value) || 1)}
          className="w-20 px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <span className="text-purple-500 text-xs">
          modo de resolução: <span className="font-mono text-purple-300">{modo}</span>
        </span>
      </div>

      {config?.formula_proficiencia && (
        <div className="bg-slate-800 border border-purple-800 rounded-xl p-3">
          <span className="text-purple-400 text-xs">Proficiência: </span>
          {prof.ok
            ? <span className="text-white font-mono text-sm">{prof.valor ?? '—'}</span>
            : <span className="text-red-400 text-xs">⚠ {prof.erro}</span>}
        </div>
      )}

      <div className="space-y-2">
        {atributos.map(a => {
          const valor = valorDe(a)
          const mod = config?.formula_modificador
            ? tentar(config.formula_modificador, { ...ctx, _x: valor })
            : { ok: true, valor: null }
          return (
            <div key={a.id ?? a.nome} className="flex items-center gap-3 flex-wrap bg-slate-800 border border-purple-800 rounded-xl px-3 py-2">
              <span className="text-white text-sm font-medium min-w-[7rem]">{a.nome || '(sem nome)'}</span>
              <input
                type="number"
                value={valores[a.id ?? a.nome] ?? 10}
                onChange={e => setValores(v => ({ ...v, [a.id ?? a.nome]: e.target.value }))}
                className="w-20 px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {mod.ok && mod.valor != null && (
                <span className="text-purple-300 text-xs">
                  mod <span className="font-mono text-amber-400">{mod.valor >= 0 ? `+${mod.valor}` : mod.valor}</span>
                </span>
              )}
              {!mod.ok && <span className="text-red-400 text-xs">⚠ {mod.erro}</span>}
              <button
                type="button"
                onClick={() => rolarTeste(a)}
                className="ml-auto text-xs px-2.5 py-1 rounded-lg bg-amber-800 hover:bg-amber-700 text-white transition-colors"
              >🎲 Testar</button>
            </div>
          )
        })}
      </div>

      {roll && (
        <div className="bg-slate-900 border border-amber-700/60 rounded-xl p-3">
          <span className="text-purple-400 text-xs">{roll.nome}: </span>
          <span className="text-amber-300 text-sm font-mono">{roll.texto}</span>
        </div>
      )}

      {pericias.length > 0 && (
        <p className="text-purple-600 text-xs">
          {pericias.length} perícia(s) definida(s) — o total de cada uma na ficha é
          o bônus dela mais o atributo-base.
        </p>
      )}
    </div>
  )
}
