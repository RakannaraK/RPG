import { JOGOS, NOMES_DIFICULDADE } from '../../lib/minigames/resultado'

const DIFICULDADES = ['normal', 'dificil', 'impossivel', 'personalizada']

// Parâmetros editáveis na dificuldade Personalizada (sem teto: só o mínimo que faz sentido)
const PARAMETROS = {
  roda: [
    ['vidas', 'Vidas', 1, 1], ['velocidade', 'Velocidade (°/s)', 10, 5], ['aceleracao', 'Acelera por acerto', 0, 1],
    ['largura', 'Largura da runa (°)', 2, 1], ['larguraMin', 'Largura mínima (°)', 1, 1], ['encolhe', 'Encolhe por acerto (°)', 0, 0.5],
    ['inverte', 'Inverte o giro a cada acerto', null],
  ],
  cronometro: [
    ['alvoMin', 'Alvo mínimo (s)', 0.5, 0.5], ['alvoMax', 'Alvo máximo (s)', 0.5, 0.5], ['ocultarFracao', 'Some depois de (fração do alvo, 0–1)', 0, 0.05],
  ],
  memoria: [
    ['tamanhoInicial', 'Runas na 1ª rodada', 1, 1], ['opcoes', 'Runas na grade (2–24)', 2, 1], ['exibir', 'Tempo para memorizar (s)', 0.2, 0.1],
    ['repete', 'Sequência pode repetir runas', null],
  ],
}

const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors'
const ativo = on => (on ? 'bg-accent-600 text-white' : 'bg-hover text-ink hover:bg-border')

/**
 * Fase 28 — escolha de jogo, dificuldade e (na Personalizada) todos os
 * parâmetros. Usado para jogar avulso e para montar desafios.
 * `config` é a configuração efetiva (para mostrar os valores atuais).
 */
export default function SeletorJogo({ tipo, onTipo, dificuldade, onDificuldade, config, onParametro }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(JOGOS).map(([id, jogo]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTipo(id)}
            aria-pressed={tipo === id}
            className={`rounded-xl border px-2 py-3 text-center transition-colors ${tipo === id ? 'border-accent-500 bg-raised' : 'border-border bg-void hover:bg-hover'}`}
          >
            <span className="block text-2xl">{jogo.icone}</span>
            <span className="block text-ink text-xs font-semibold mt-1">{jogo.nome}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DIFICULDADES.map(d => (
          <button key={d} type="button" onClick={() => onDificuldade(d)} aria-pressed={dificuldade === d} className={`${BTN} ${ativo(dificuldade === d)}`}>
            {NOMES_DIFICULDADE[d]}
          </button>
        ))}
      </div>

      {dificuldade === 'personalizada' && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-void p-3">
          {PARAMETROS[tipo].map(([chave, rotulo, minimo, passo]) => (
            minimo === null ? (
              <label key={chave} className="col-span-2 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={!!config[chave]} onChange={e => onParametro(chave, e.target.checked)} />
                {rotulo}
              </label>
            ) : (
              <label key={chave} className="block">
                <span className="text-ink-dim text-xs">{rotulo}</span>
                <input
                  type="number"
                  min={minimo}
                  step={passo}
                  value={config[chave]}
                  onChange={e => onParametro(chave, Math.max(minimo, Number(e.target.value) || minimo))}
                  className="w-full bg-bg border border-border rounded-lg px-2 py-1 text-sm text-ink"
                />
              </label>
            )
          ))}
        </div>
      )}
    </div>
  )
}
