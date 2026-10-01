import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Fase 52 — faixa de abas. O traço da aba ativa DESLIZA de uma aba para a
 * outra (transform só, nada de layout); com abas demais para a largura, a
 * faixa rola de lado e esmaece nas pontas que têm mais abas escondidas.
 * Teclado: setas, Home e End (padrão ARIA de abas).
 *
 *   <Abas rotulo="Seções da mesa" abas={[{ id: 'fichas', rotulo: 'Fichas', contador: 2 }]}
 *         atual={aba} onTrocar={setAba} />
 *
 * O conteúdo da aba fica com quem usa; para ele entrar animado, troque a
 * `key` do contêiner: `<div key={aba} className="entra-aba">`.
 */
export default function Abas({ abas, atual, onTrocar, rotulo, className = '', tamanho = 'md', idPainel }) {
  const faixa = useRef(null)
  const botoes = useRef({})
  const [traco, setTraco] = useState(null) // { x, w }
  const [pontas, setPontas] = useState({ esq: false, dir: false })

  const medir = useCallback(() => {
    const el = botoes.current[atual]
    if (el) setTraco({ x: el.offsetLeft, w: el.offsetWidth })
    const f = faixa.current
    if (f) setPontas({ esq: f.scrollLeft > 2, dir: f.scrollLeft + f.clientWidth < f.scrollWidth - 2 })
  }, [atual])

  useLayoutEffect(() => { medir() }, [medir, abas.length])

  useEffect(() => {
    const f = faixa.current
    if (!f) return
    const obs = new ResizeObserver(medir)
    obs.observe(f)
    f.addEventListener('scroll', medir, { passive: true })
    document.fonts?.ready.then(medir).catch(() => {})
    return () => { obs.disconnect(); f.removeEventListener('scroll', medir) }
  }, [medir])

  // a aba escolhida (por clique, teclado ou link) sempre fica visível
  useEffect(() => {
    botoes.current[atual]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [atual])

  function teclado(e) {
    const i = abas.findIndex(a => a.id === atual)
    let j = null
    if (e.key === 'ArrowRight') j = (i + 1) % abas.length
    else if (e.key === 'ArrowLeft') j = (i - 1 + abas.length) % abas.length
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = abas.length - 1
    if (j === null) return
    e.preventDefault()
    onTrocar(abas[j].id)
    botoes.current[abas[j].id]?.focus()
  }

  const pad = tamanho === 'sm' ? 'px-3 py-2 text-sm' : 'px-4 py-3 text-sm sm:text-[0.9375rem]'

  return (
    <div className={`abas relative ${className}`} data-ponta-esq={pontas.esq || undefined} data-ponta-dir={pontas.dir || undefined}>
      <div ref={faixa} role="tablist" aria-label={rotulo} onKeyDown={teclado} className="abas-faixa relative flex overflow-x-auto">
        {abas.map(a => {
          const ativa = a.id === atual
          return (
            <button
              key={a.id}
              ref={el => { botoes.current[a.id] = el }}
              type="button" role="tab" aria-selected={ativa} tabIndex={ativa ? 0 : -1}
              aria-controls={idPainel}
              onClick={() => onTrocar(a.id)}
              className={`aba relative shrink-0 whitespace-nowrap inline-flex items-center gap-2 font-medium ${pad} ${ativa ? 'text-ink' : 'text-ink-dim hover:text-ink'}`}
            >
              {a.icone}
              {a.rotulo}
              {a.contador > 0 && !ativa && (
                <span className="contador" aria-label={`${a.contador} novas`}>{a.contador > 9 ? '9+' : a.contador}</span>
              )}
              {a.selo}
            </button>
          )
        })}
        {traco && (
          <span
            aria-hidden="true"
            className="abas-traco"
            style={{ transform: `translateX(${traco.x}px) scaleX(${traco.w})` }}
          />
        )}
      </div>
    </div>
  )
}
