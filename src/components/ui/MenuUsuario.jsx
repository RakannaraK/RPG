import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePerfil } from '../../hooks/usePerfil'
import { useFechaFora } from '../../hooks/useFechaFora'
import PreferenciasModal from '../preferencias/PreferenciasModal'
import GuiaMestre from '../ajuda/GuiaMestre'
import Avatar from './Avatar'
import Icone from './Icone'

/**
 * Fase 52 — menu da pessoa logada (avatar no canto do cabeçalho). Junta o que
 * antes eram quatro ícones soltos sem texto: mesas, comunidade, preferências,
 * guia do mestre e sair. Teclado: setas sobem/descem, Esc fecha.
 */
export default function MenuUsuario() {
  const { session, logout } = useAuth()
  const perfil = usePerfil()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [modal, setModal] = useState(null) // 'prefs' | 'guia'
  const [saindo, setSaindo] = useState(false)
  const menu = useRef(null)
  const botao = useRef(null)
  useFechaFora(menu, aberto, () => setAberto(false), botao)

  if (!session) return null
  const nome = perfil?.username || session.user.email?.split('@')[0] || 'Você'

  async function sair() {
    setSaindo(true)
    try { await logout() } catch { setSaindo(false) }
  }

  const itens = [
    { icone: 'dado', rotulo: 'Minhas mesas', acao: () => navigate('/dashboard') },
    { icone: 'globo', rotulo: 'Comunidade', acao: () => navigate('/comunidade') },
    { icone: 'ajustes', rotulo: 'Preferências', acao: () => setModal('prefs') },
    { icone: 'ajuda', rotulo: 'Guia do mestre', acao: () => setModal('guia') },
  ]

  function teclado(e) {
    const botoes = [...menu.current.querySelectorAll('[role="menuitem"]')]
    const i = botoes.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); botoes[(i + 1) % botoes.length]?.focus() }
    if (e.key === 'ArrowUp') { e.preventDefault(); botoes[(i - 1 + botoes.length) % botoes.length]?.focus() }
  }

  const item = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ink hover:bg-hover focus-visible:bg-hover outline-none transition-colors duration-rapida'

  return (
    <>
      <button
        ref={botao} onClick={() => setAberto(a => !a)}
        aria-haspopup="menu" aria-expanded={aberto} aria-label={`Menu de ${nome}`}
        className="flex items-center gap-2 rounded-full sm:rounded-xl p-0.5 sm:pl-1 sm:pr-2 sm:py-1 hover:bg-hover transition-colors duration-rapida focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400"
      >
        <Avatar url={perfil?.avatar_url} nome={nome} tamanho="sm" />
        <span className="hidden md:block text-sm text-ink max-w-[10rem] truncate">{nome}</span>
        <Icone nome="chevron-baixo" tamanho={16} className={`hidden sm:block text-ink-dim transition-transform duration-normal ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div
          ref={menu} role="menu" aria-label={`Menu de ${nome}`} onKeyDown={teclado}
          className="pop-entra absolute right-3 sm:right-6 top-full mt-1 w-64 rounded-2xl border border-border bg-raised shadow-nivel-3 z-menu p-1.5"
        >
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1 border-b border-border/70">
            <Avatar url={perfil?.avatar_url} nome={nome} tamanho="md" />
            <div className="min-w-0">
              <p className="text-ink text-sm font-semibold truncate">{nome}</p>
              <p className="text-ink-dim text-xs truncate">{session.user.is_anonymous ? 'Convidado' : session.user.email}</p>
            </div>
          </div>
          {itens.map((it, i) => (
            <button
              key={it.rotulo} role="menuitem" autoFocus={i === 0} className={item}
              onClick={() => { setAberto(false); it.acao() }}
            ><Icone nome={it.icone} tamanho={18} className="text-ink-dim" />{it.rotulo}</button>
          ))}
          <div className="my-1 border-t border-border/70" />
          <button role="menuitem" className={`${item} hover:text-harm`} onClick={sair} disabled={saindo}>
            <Icone nome="sair" tamanho={18} className="text-ink-dim" />{saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}

      {modal === 'prefs' && <PreferenciasModal onFechar={() => setModal(null)} />}
      {modal === 'guia' && <GuiaMestre onFechar={() => setModal(null)} />}
    </>
  )
}
