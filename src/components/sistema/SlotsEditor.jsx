import { useState } from 'react'
import FormulaInput from './FormulaInput'
import { useRacasClasses } from '../../hooks/useRacasClasses'
import { linhaDaGrade } from '../../lib/slotsEngine'
import Botao from '../ui/Botao'
import { t } from '../../i18n'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-white text-xs placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-purple-500'

/**
 * Grade de uma classe: linhas por nível, colunas por círculo.
 * O mestre só precisa preencher os níveis em que a grade MUDA — o motor usa a
 * maior linha definida que não passa do nível do personagem.
 */
function GradeClasse({ classe, grade = {}, circuloMax, onChange }) {
  const [novoNivel, setNovoNivel] = useState('')
  const niveis = Object.keys(grade).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  const circulos = Array.from({ length: Math.max(1, Math.min(12, circuloMax)) }, (_, i) => i + 1)

  function setCelula(nivel, circulo, valor) {
    const linha = [...(grade[nivel] || [])]
    while (linha.length < circulo) linha.push(0)
    linha[circulo - 1] = Math.max(0, Math.floor(Number(valor) || 0))
    // corta zeros à direita para não guardar lixo
    while (linha.length && linha[linha.length - 1] === 0) linha.pop()
    onChange({ ...grade, [nivel]: linha })
  }

  function addNivel() {
    const n = Math.floor(Number(novoNivel) || 0)
    if (n < 1 || grade[n]) return
    onChange({ ...grade, [n]: [] })
    setNovoNivel('')
  }

  function removerNivel(n) {
    const copia = { ...grade }
    delete copia[n]
    onChange(copia)
  }

  return (
    <div className="space-y-1.5">
      {niveis.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-purple-400 text-xs font-normal px-1.5 py-1 text-left">{t('Nv')}</th>
                {circulos.map(c => (
                  <th key={c} className="text-purple-400 text-xs font-normal px-1 py-1 w-10">{t('{c}º', { c })}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {niveis.map(n => (
                <tr key={n}>
                  <td className="text-white font-mono px-1.5 py-0.5">{n}</td>
                  {circulos.map(c => (
                    <td key={c} className="px-0.5 py-0.5">
                      <input
                        type="number"
                        min={0}
                        value={grade[n]?.[c - 1] ?? ''}
                        onChange={e => setCelula(n, c, e.target.value)}
                        placeholder="0"
                        className="w-10 px-1 py-0.5 rounded-lg bg-void border border-border text-white text-xs text-center placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>
                  ))}
                  <td className="pl-1">
                    <button type="button" onClick={() => removerNivel(n)}
                      className="w-5 h-5 flex items-center justify-center text-accent-300 hover:text-red-400 transition-colors"
                      title={t('Remover linha')}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <input type="number" min={1} value={novoNivel} onChange={e => setNovoNivel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addNivel() }}
          placeholder={t('Nv')} className={`${INP} w-14 text-center`} />
        <Botao variante="contorno" tamanho="sm" type="button" onClick={addNivel} disabled={!novoNivel}>
          {t('+ linha de nível')}
        </Botao>
        {niveis.length > 0 && (
          <span className="text-accent-300 text-xs">
            {t('Nv 4 de {classe} → [{linha}]', { classe: String(classe.nome ?? ''), linha: (linhaDaGrade(grade, 4) || []).join(', ') || '—' })}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Fase 20.3 — configuração de slots do sistema (modo opcional).
 * Vive em config_layout.slots. Total por círculo é DERIVADO da grade.
 */
export default function SlotsEditor({ sistemaId, config, onChange, descansos = [] }) {
  const { classes } = useRacasClasses(sistemaId) // grade é por classe
  const slots = config?.slots || {}
  const [classeAberta, setClasseAberta] = useState(null)

  const set = patch => onChange({ ...config, slots: { ...slots, ...patch } })

  function setGrade(classeId, grade) {
    set({ grades: { ...(slots.grades || {}), [classeId]: grade } })
  }

  function setRecuperacao(descId, modo) {
    set({ recuperacao: { ...(slots.recuperacao || {}), [descId]: { modo } } })
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-purple-200 text-sm font-semibold">{t('Slots por círculo')}</p>
        <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!slots.ativo}
            onChange={e => set({ ativo: e.target.checked })} className="accent-purple-500" />
          {t('ativar')}
        </label>
      </div>
      <p className="text-accent-300 text-xs">
        {t('Modo opcional. O')} <span className="text-purple-300">{t('total')}</span> {t('de cada círculo é derivado da grade × níveis das classes da ficha (multiclasse soma as grades) — nunca guardado. Sistemas sem slots deixam isso desligado.')}
      </p>

      {!slots.ativo ? (
        <p className="text-accent-300 text-xs">{t('Desativado: a ficha não mostra painel de slots.')}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="text" value={slots.rotulo || ''} onChange={e => set({ rotulo: e.target.value })}
              placeholder={t('Rótulo (Espaços de Magia)')} className={`${INP} flex-1 min-w-[10rem]`} />
            <span className="text-accent-300 text-xs">{t('círculo máx.')}</span>
            <input type="number" min={1} max={12} value={slots.circulo_max ?? 9}
              onChange={e => set({ circulo_max: Number(e.target.value) })}
              className={`${INP} w-14 text-center`} />
            <label className="text-purple-300 text-xs flex items-center gap-1.5 cursor-pointer"
              title={t('Conhecidas vs preparadas')}>
              <input type="checkbox" checked={!!slots.preparacao}
                onChange={e => set({ preparacao: e.target.checked })} className="accent-purple-500" />
              {t('preparação')}
            </label>
          </div>

          <div>
            <p className="text-purple-400 text-xs mb-1">{t('CD padrão dos poderes (cada poder pode sobrescrever)')}</p>
            <FormulaInput
              value={slots.cd_formula || ''}
              onChange={cd_formula => set({ cd_formula })}
              placeholder={t('ex: 8 + proficiencia + mod(carisma)')}
              variaveis={['proficiencia', 'mod(', 'nivel']}
            />
          </div>

          {/* Grade por classe */}
          <div className="border-t border-purple-900/50 pt-2 space-y-1.5">
            <p className="text-purple-400 text-xs">
              {t('Grade por classe — preencha só os níveis em que a grade muda.')}
            </p>
            {classes.length === 0 && (
              <p className="text-accent-300 text-xs">{t('Crie classes para montar a grade.')}</p>
            )}
            {classes.map(c => {
              const grade = (slots.grades || {})[c.id] || {}
              const temLinhas = Object.keys(grade).length > 0
              return (
                <div key={c.id} className="bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5">
                  <button type="button"
                    onClick={() => setClasseAberta(classeAberta === c.id ? null : c.id)}
                    className="flex items-center gap-2 w-full text-left">
                    <span className="text-accent-300 text-xs w-4">{classeAberta === c.id ? '▾' : '▸'}</span>
                    <span className="text-white text-xs font-medium flex-1">{c.nome}</span>
                    <span className="text-accent-300 text-xs">
                      {temLinhas ? t('{n} linha(s)', { n: Object.keys(grade).length }) : t('sem slots')}
                    </span>
                  </button>
                  {classeAberta === c.id && (
                    <div className="mt-2 pt-2 border-t border-purple-900/60">
                      <GradeClasse
                        classe={c}
                        grade={grade}
                        circuloMax={slots.circulo_max ?? 9}
                        onChange={g => setGrade(c.id, g)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Recuperação */}
          <div className="border-t border-purple-900/50 pt-2 space-y-1.5">
            <p className="text-purple-400 text-xs">{t('Recuperação por descanso')}</p>
            {descansos.length === 0 ? (
              <p className="text-accent-300 text-xs">{t('Configure os descansos primeiro.')}</p>
            ) : (
              descansos.map(d => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-purple-400 text-xs w-24 shrink-0 truncate">{d.nome || t('Descanso')}</span>
                  <select
                    value={(slots.recuperacao || {})[d.id]?.modo || 'nada'}
                    onChange={e => setRecuperacao(d.id, e.target.value)}
                    className={INP}
                  >
                    <option value="nada">{t('Nada')}</option>
                    <option value="total">{t('Devolve todos')}</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
