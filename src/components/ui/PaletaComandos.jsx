import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMesas } from '../../hooks/useMesa'
import { useMeusPersonagens } from '../../hooks/useMeusPersonagens'
import { lerRecentes } from '../../lib/recentes'
import { montarItens, filtrarItens } from '../../lib/paleta'
import Modal, { useFecharModal } from './Modal'
import EstadoVazio from './EstadoVazio'
import Icone from './Icone'

// Trechos seguidos do mesmo grupo (o filtro pode intercalar), mantendo o índice da lista plana.
const gruposDe = lista => lista.reduce((gs, it, i) => {
  if (gs.at(-1)?.nome !== it.grupo) gs.push({ nome: it.grupo, itens: [] })
  gs.at(-1).itens.push({ it, i })
  return gs
}, [])

/** F62.D — busca global: Ctrl+K / ⌘K ou o botão da barra. Só navega. */
function Miolo() {
  const navigate = useNavigate()
  const fechar = useFecharModal()
  const { mesas } = useMesas()
  const { personagens } = useMeusPersonagens() // ponytail: só os 12 personagens mais recentes
  const [recentes] = useState(lerRecentes)
  const [texto, setTexto] = useState('')
  const [ativo, setAtivo] = useState(0)
  const idLista = useId()
  const listaRef = useRef(null)

  const itens = useMemo(() => montarItens({ recentes, mesas, personagens }), [recentes, mesas, personagens])
  const lista = useMemo(() => filtrarItens(itens, texto), [itens, texto])
  const atual = Math.min(ativo, lista.length - 1)
  const idOpcao = i => `${idLista}-${i}`

  useEffect(() => {
    listaRef.current?.querySelector(`[id="${idLista}-${atual}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [atual, idLista])

  const abrir = item => { if (!item) return; navigate(item.rota); fechar() }
  const teclar = e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (lista.length) setAtivo((atual + (e.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length)
    } else if (e.key === 'Enter') { e.preventDefault(); abrir(lista[atual]) }
  }

  return (
    <div className="-mx-5 sm:-mx-6 -my-5">
      <div className="flex items-center gap-2 px-4 border-b border-border/70">
        <Icone nome="busca" tamanho={18} className="text-ink-dim shrink-0" />
        <input
          autoFocus type="text" value={texto} onKeyDown={teclar}
          onChange={e => { setTexto(e.target.value); setAtivo(0) }}
          role="combobox" aria-expanded="true" aria-controls={lista.length ? idLista : undefined} aria-autocomplete="list"
          aria-activedescendant={lista.length ? idOpcao(atual) : undefined}
          aria-label="Buscar mesa, personagem ou página" placeholder="Buscar mesa, personagem ou página…"
          className="flex-1 min-w-0 bg-transparent py-4 text-ink placeholder:text-ink-dim outline-none"
        />
      </div>
      {lista.length === 0 ? (
        <div className="p-2"><EstadoVazio compacto titulo="Nada encontrado" descricao="Tente outra palavra." /></div>
      ) : (
      <div ref={listaRef} id={idLista} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-2">
        {gruposDe(lista).map((g, n) => (
          <div key={n} role="group" aria-labelledby={`${idLista}-g-${n}`}>
            <p id={`${idLista}-g-${n}`} className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-dim">{g.nome}</p>
            {g.itens.map(({ it, i }) => (
            <div
              key={it.chave} id={idOpcao(i)} role="option" aria-selected={i === atual}
              onClick={() => abrir(it)} onMouseMove={() => ativo !== i && setAtivo(i)}
              className={`flex items-baseline gap-3 min-h-[32px] px-3 py-2 rounded-lg cursor-pointer text-ink ${i === atual ? 'bg-accent-600/20' : ''}`}
            >
              <span className="truncate">{it.titulo}</span>
              {it.detalhe && <span className="ml-auto shrink-0 text-xs text-ink-dim">{it.detalhe}</span>}
            </div>
            ))}
          </div>
        ))}
      </div>
      )}
      <p className="px-4 py-2 border-t border-border/70 text-xs text-ink-dim">↑↓ escolher · Enter abrir · Esc fechar</p>
    </div>
  )
}

export default function PaletaComandos() {
  const { session } = useAuth()
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!session) return
    const teclar = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAberto(true) }
    }
    const abrir = () => setAberto(true)
    window.addEventListener('keydown', teclar)
    window.addEventListener('dp:abrir-busca', abrir)
    return () => { window.removeEventListener('keydown', teclar); window.removeEventListener('dp:abrir-busca', abrir) }
  }, [session])

  if (!session || !aberto) return null
  return (
    <Modal titulo="Busca" semCabecalho tamanho="md" onFechar={() => setAberto(false)}>
      <Miolo />
    </Modal>
  )
}
