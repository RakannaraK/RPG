import { memo, useId, useMemo, useRef, useState } from 'react'
import { MAX_SEGMENTOS, caminhoSvg, encaixarPonta, normalizarParedes, poligonoVisivel, segmentoMaisProximo } from '../../lib/visao'
import { useConfirmar } from '../ui/Confirmar'
import CapturaMapa from './CapturaMapa'
import { t } from '../../i18n'

/**
 * Fase 63 — linha de visão: tudo coberto, menos os polígonos que cada origem enxerga.
 * Mesma cor da névoa de guerra. `chave` = origens como "x,y|x,y" (estável entre quadros), `blocos` = bloqueios().
 */
export const CamadaVisao = memo(function CamadaVisao({ chave, blocos, largura, altura, translucida }) {
  const caminhos = useMemo(
    () => chave.split('|').map(s => {
      const [x, y] = s.split(',').map(Number)
      return caminhoSvg(poligonoVisivel({ x, y }, blocos, { largura, altura }))
    }),
    [chave, blocos, largura, altura],
  )
  const id = `visao-${useId().replace(/:/g, '')}`
  return (
    <g pointerEvents="none">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={largura} height={altura}>
          <rect width={largura} height={altura} fill="white" />
          {caminhos.map((d, i) => <path key={i} d={d} fill="black" />)}
        </mask>
      </defs>
      <rect width={largura} height={altura} fill="#05030a" opacity={translucida ? 0.55 : 1} mask={`url(#${id})`} />
    </g>
  )
})

/** Linhas das paredes (só gestor): parede cheia, porta em outra cor, porta aberta tracejada. */
export const ParedesGestor = memo(function ParedesGestor({ paredes, selecionada }) {
  return (
    <g pointerEvents="none" fill="none" strokeLinecap="round">
      {normalizarParedes(paredes).segmentos.map(s => (
        <line
          key={s.id}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="currentColor"
          className={s.id === selecionada ? 'text-accent-300' : s.porta ? 'text-warn' : 'text-ink'}
          strokeWidth={s.id === selecionada ? 5 : 3}
          strokeDasharray={s.porta && s.aberta ? '6 6' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
})

/** Gestos do mestre: arrastar cria segmento; clicar abre/fecha porta ou seleciona parede. */
export function EditorParedes({ ctx, largura, altura, paredes, grade, modo, onAdicionar, onAlternarPorta, onSelecionar }) {
  const atual = useRef(null)
  const [rascunho, setRascunho] = useState(null)
  const tol = 12 / ctx.vista.zoom // 12 px na tela

  const ponta = p => encaixarPonta(p, paredes, grade, tol)
  return (
    <>
      <CapturaMapa
        ctx={ctx}
        largura={largura}
        altura={altura}
        onInicio={p => { atual.current = { p0: p, a: ponta(p) } }}
        onMover={p => {
          const a = atual.current
          if (!a) return
          const b = ponta(p)
          setRascunho({ x1: a.a.x, y1: a.a.y, x2: b.x, y2: b.y })
        }}
        onFim={(p, concluiu) => {
          const a = atual.current
          atual.current = null
          setRascunho(null)
          if (!concluiu || !a) return
          if (Math.hypot(p.x - a.p0.x, p.y - a.p0.y) * ctx.vista.zoom < 4) {
            const id = segmentoMaisProximo(p, paredes, tol)
            const seg = id && normalizarParedes(paredes).segmentos.find(s => s.id === id)
            if (seg?.porta) onAlternarPorta(id)
            onSelecionar(id)
            return
          }
          const b = ponta(p)
          onAdicionar({ x1: a.a.x, y1: a.a.y, x2: b.x, y2: b.y, porta: modo === 'porta' })
        }}
      />
      {rascunho && (
        <line
          {...rascunho} pointerEvents="none" stroke="currentColor" strokeWidth={3} strokeDasharray="4 4"
          className="text-accent-300" vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  )
}

const BTN = 'px-2.5 py-1.5 min-h-[24px] rounded-lg text-sm transition-colors whitespace-nowrap'
const ativoCls = on => (on ? 'bg-accent-600 text-sobre-acento' : 'bg-hover text-ink hover:bg-border')

/** Barra flutuante da ferramenta de paredes (mestre). */
export function BarraParedes({ paredes, modo, onModo, selecionada, onAlternarVisao, onApagar, onLimpar, onFechar }) {
  const { confirmar } = useConfirmar()
  const p = normalizarParedes(paredes)
  async function limpar() {
    if (await confirmar({ titulo: t('Limpar todas as paredes?'), mensagem: t('Paredes e portas desta cena saem do mapa.'), confirmar: t('Limpar tudo'), perigo: true })) onLimpar()
  }
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-1.5rem)]" onPointerDown={e => e.stopPropagation()}>
      <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-bg/95 backdrop-blur shadow-xl px-2 py-2">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button onClick={onAlternarVisao} aria-pressed={p.ativa} className={`${BTN} ${p.ativa ? 'bg-ok/15 text-ok' : 'bg-hover text-ink-dim'}`} title={t('Cada jogador só vê o que os próprios tokens enxergam')}>
            {p.ativa ? t('Linha de visão ligada') : t('Linha de visão desligada')}
          </button>
          <span className="w-px h-6 bg-border" />
          <button onClick={() => onModo('parede')} aria-pressed={modo === 'parede'} className={`${BTN} ${ativoCls(modo === 'parede')}`}>{t('Parede')}</button>
          <button onClick={() => onModo('porta')} aria-pressed={modo === 'porta'} className={`${BTN} ${ativoCls(modo === 'porta')}`}>{t('Porta')}</button>
          <span className="w-px h-6 bg-border" />
          {selecionada && <button onClick={onApagar} className={`${BTN} bg-hover text-harm hover:bg-border`}>{t('Apagar')}</button>}
          <button onClick={limpar} disabled={!p.segmentos.length} className={`${BTN} bg-hover text-ink hover:bg-border disabled:opacity-50`}>{t('Limpar tudo')}</button>
          <span className="text-xs text-ink-dim px-1">{t('{n} de {max}', { n: p.segmentos.length, max: MAX_SEGMENTOS })}</span>
          <button onClick={onFechar} className={`${BTN} text-ink-dim hover:text-ink`} title={t('Voltar a mover')} aria-label={t('Fechar ferramenta de paredes')}>✕</button>
        </div>
        <p className="text-xs text-ink-dim text-center">{t('Arraste para traçar. Clique numa porta para abrir ou fechar; clique numa parede para selecionar.')}</p>
      </div>
    </div>
  )
}
