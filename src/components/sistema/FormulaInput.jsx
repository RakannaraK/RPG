import { useState } from 'react'
import { validarFormula } from '../../lib/formulaEngine'

// Uma entrada da referência: nome da função, o que ela faz em português simples,
// e um exemplo com números de verdade.
function Verbete({ codigo, texto, exemplo, nota }) {
  return (
    <div className="py-1 border-b border-purple-900/40 last:border-0">
      <span className="font-mono text-purple-200">{codigo}</span>
      <span className="text-purple-400"> — {texto}</span>
      {exemplo && <div className="font-mono text-accent-300 mt-0.5">{exemplo}</div>}
      {nota && <div className="text-amber-500/90 mt-0.5">{nota}</div>}
    </div>
  )
}

// 17.6 — referência da gramática (aberta pelo "?"). Escrita para quem não tem
// base em matemática/computação: cada função tem explicação simples e exemplo.
function AjudaGramatica() {
  return (
    <div className="mt-1.5 bg-slate-900 border border-purple-800 rounded-lg p-3 text-xs space-y-3 max-h-96 overflow-y-auto">
      <div className="space-y-1">
        <p className="text-purple-300">
          Uma fórmula sempre resulta num <span className="font-semibold">número</span>. Você mistura
          números fixos com valores da ficha do personagem.
        </p>
        <p className="text-accent-300">
          Operadores: <span className="font-mono text-purple-300">+ − * / ( )</span> — multiplicação e
          divisão acontecem antes de soma e subtração; use parênteses para mandar na ordem.
        </p>
        <p className="text-accent-300">
          Decimais usam <span className="font-mono text-purple-300">ponto</span>, não vírgula:
          escreva <span className="font-mono text-purple-300">0.5</span>.
        </p>
      </div>

      <div>
        <p className="text-purple-200 font-semibold mb-1">Arredondar e limitar</p>
        <Verbete
          codigo="piso(n)"
          texto="arredonda PARA BAIXO (corta o que sobra)"
          exemplo="piso(7 / 2) → 3"
          nota="Atenção com negativo: piso(-1.5) → -2 (para baixo é mais longe do zero), não -1."
        />
        <Verbete
          codigo="teto(n)"
          texto="arredonda PARA CIMA"
          exemplo="teto(7 / 2) → 4"
        />
        <Verbete
          codigo="arredondar(n)"
          texto="vai para o número inteiro mais PRÓXIMO"
          exemplo="arredondar(3.4) → 3     ·     arredondar(3.5) → 4"
        />
        <Verbete
          codigo="abs(n)"
          texto="tira o sinal de menos (o quanto o número vale, sem ser negativo)"
          exemplo="abs(-5) → 5     ·     abs(5) → 5"
        />
        <Verbete
          codigo="min(a, b)"
          texto="devolve o MENOR dos dois. Serve para criar um teto: o valor nunca passa disso"
          exemplo="min(nivel, 10) → nível 13 vira 10; nível 4 continua 4"
        />
        <Verbete
          codigo="max(a, b)"
          texto="devolve o MAIOR dos dois. Serve para criar um piso: o valor nunca cai abaixo disso"
          exemplo="max(1, mod(forca)) → se o modificador for -2, o resultado é 1"
        />
      </div>

      <div>
        <p className="text-purple-200 font-semibold mb-1">Valores da ficha</p>
        <Verbete codigo="atributo(nome)" texto="o valor do atributo, sem nenhuma conta" exemplo="atributo(forca)" />
        <Verbete
          codigo="mod(nome)"
          texto="o modificador do atributo (passa pela fórmula de modificador do sistema; se o sistema não tem uma, é igual ao valor do atributo)"
          exemplo="10 + mod(destreza)"
        />
        <Verbete codigo="pericia(nome)" texto="o valor daquela perícia" exemplo="pericia(furtividade)" />
        <Verbete codigo="recurso(nome)" texto="o valor do recurso de uma habilidade" exemplo="recurso(furia)" />
        <Verbete codigo="pool(nome)" texto="quanto aquele pool tem AGORA" exemplo="pool(mana)" />
        <Verbete codigo="estado(nome)" texto="o valor atual de um estado (Fome, Sanidade...)" exemplo="estado(fome)" />
        <Verbete codigo="nivel" texto="o nível total do personagem" exemplo="2 * nivel" />
        <Verbete
          codigo="nivel(classe)"
          texto="o nível naquela classe específica (0 se o personagem não tem a classe)"
          exemplo="5 * nivel(paladino)"
        />
        <Verbete codigo="proficiencia" texto="o resultado da fórmula de proficiência do sistema" exemplo="proficiencia + mod(carisma)" />
        <Verbete codigo="vida_atual / vida_max" texto="a vida agora e a vida máxima" exemplo="abs(vida_max - vida_atual) → quanto falta de vida" />
      </div>

      <div>
        <p className="text-purple-200 font-semibold mb-1">Só funcionam em campos específicos</p>
        <p className="text-accent-300 mb-1">
          Estas existem apenas no campo indicado — usar em outro lugar dá erro.
        </p>
        <Verbete
          codigo="x"
          texto="na fórmula do MODIFICADOR de atributo: o valor do atributo"
          exemplo="piso((x - 10) / 2) → atributo 7 dá -2; atributo 16 dá +3"
        />
        <Verbete codigo="maestria" texto="no limiar de crítico: o nível de maestria do item usado" exemplo="85 - 15 * piso(maestria / 2)" />
        <Verbete codigo="proximo_nivel" texto="na curva de maestria: o nível que está sendo adquirido" exemplo="100 * proximo_nivel" />
        <Verbete codigo="novo_valor" texto="no custo de compra por XP: o valor DEPOIS da compra" exemplo="novo_valor * 5" />
      </div>

      <div className="border-t border-purple-900 pt-2">
        <p className="text-purple-300 font-semibold mb-0.5">Como os bônus se combinam (ordem)</p>
        <p className="text-accent-300">base → somas → <span className="text-amber-400">percentuais (somados entre si)</span> → multiplicadores → definir</p>
        <p className="text-accent-300">Ex: base 20, +5, <span className="text-amber-400">+13% e +10% = +23%</span> → piso(25 × 1,23) = <span className="text-green-400">30</span></p>
      </div>
    </div>
  )
}

/**
 * Fase 17 — editor de fórmula reutilizável (campos calculados, modificador de
 * atributo, modificadores, descansos). Validação de sintaxe ao vivo + presets +
 * variáveis clicáveis + ajuda da gramática.
 */
export default function FormulaInput({
  value,
  onChange,
  placeholder = 'ex: 10 + mod(destreza)',
  presets = [],
  variaveis = [],
  className = '',
}) {
  const [ajuda, setAjuda] = useState(false)
  const v = (value ?? '').trim()
  const status = v === '' ? null : validarFormula(v)
  const invalida = status && !status.valida

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className={`flex-1 px-3 py-2 rounded-lg bg-purple-950 border text-white text-sm font-mono placeholder-ink-dim focus:outline-none focus:ring-2 ${
            invalida ? 'border-red-600 focus:ring-red-500' : 'border-purple-700 focus:ring-purple-500'
          }`}
        />
        <button
          type="button"
          onClick={() => setAjuda(a => !a)}
          title="Referência da gramática"
          className={`w-7 h-7 shrink-0 rounded-lg border text-sm transition-colors ${
            ajuda ? 'bg-purple-700 border-purple-500 text-white' : 'border-purple-700 text-purple-400 hover:text-white'
          }`}
        >
          ?
        </button>
      </div>

      {ajuda && <AjudaGramatica />}

      {presets.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.valor)}
              className="text-xs px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-300 hover:text-white rounded-lg transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {variaveis.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-1.5">
          {variaveis.map(vv => (
            <button
              key={vv}
              type="button"
              onClick={() => onChange(`${value || ''}${vv}`)}
              className="text-xs font-mono px-1.5 py-0.5 bg-slate-700/60 hover:bg-slate-600 text-purple-300 rounded-lg transition-colors"
              title="Inserir na fórmula"
            >
              {vv}
            </button>
          ))}
        </div>
      )}

      {invalida && <p className="text-red-400 text-xs mt-1">⚠ {status.erro}</p>}
      {status && status.valida && <p className="text-green-600 text-xs mt-1">✓ sintaxe válida</p>}
    </div>
  )
}
