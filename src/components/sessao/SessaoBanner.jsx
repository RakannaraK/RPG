import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessoes } from '../../hooks/useSessoes'
import { useConfirmar } from '../ui/Confirmar'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Esqueleto from '../ui/Esqueleto'

/** Liga a aura de "sessão ao vivo" no site enquanto este componente existir. */
export function useAuraDeSessao(aoVivo) {
  useEffect(() => {
    if (!aoVivo) return
    const html = document.documentElement
    html.setAttribute('data-sessao', 'ao-vivo')
    return () => html.removeAttribute('data-sessao')
  }, [aoVivo])
}

/**
 * Fase 13.1 → 52 — o "modo sessão" é a AÇÃO PRINCIPAL da mesa:
 *  - sem sessão, o mestre vê "Iniciar sessão" grande; o jogador vê que está
 *    esperando o mestre;
 *  - com sessão ativa, aparece "SESSÃO AO VIVO" pulsando e o botão de entrar
 *    — e o site inteiro ganha a aura da sessão (luz do tema subindo pelas
 *    bordas, ver theme/rpg.css).
 */
export default function SessaoBanner({ mesaId, isGestor, className = '' }) {
  const navigate = useNavigate()
  const { confirmar } = useConfirmar()
  const { sessaoAtiva, loading, error, iniciarSessao, encerrarSessao } = useSessoes(mesaId)
  const [busy, setBusy] = useState(false)
  const [erroAcao, setErroAcao] = useState('')
  useAuraDeSessao(!!sessaoAtiva)

  // Se a tabela ainda não existe (SQL pendente) ou erro de carga, não mostra nada
  // — a mesa segue funcionando normalmente sem UI de sessão.
  if (error) return null
  if (loading) {
    return (
      <div className={`rounded-2xl border border-border bg-raised/60 p-5 ${className}`}>
        <Esqueleto className="h-4 w-24 mb-3" /><Esqueleto className="h-6 w-2/3 mb-4" /><Esqueleto className="h-11 w-44" />
      </div>
    )
  }

  function entrar() {
    if (sessaoAtiva) navigate(`/mesa/${mesaId}/sessao/${sessaoAtiva.id}`)
  }

  async function handleIniciar() {
    setBusy(true)
    setErroAcao('')
    try {
      const nova = await iniciarSessao()
      navigate(`/mesa/${mesaId}/sessao/${nova.id}`)
    } catch (err) {
      setErroAcao(err.message || 'Erro ao iniciar sessão.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEncerrar() {
    const ok = await confirmar({
      titulo: 'Encerrar a sessão?', confirmar: 'Encerrar sessão', perigo: true,
      mensagem: 'A sessão sai do ar para todo mundo. As rolagens dela ficam no histórico.',
    })
    if (!ok) return
    setBusy(true)
    setErroAcao('')
    try {
      await encerrarSessao(sessaoAtiva.id)
    } catch (err) {
      setErroAcao(err.message || 'Erro ao encerrar sessão.')
    } finally {
      setBusy(false)
    }
  }

  // ---- Sessão ativa ----
  if (sessaoAtiva) {
    return (
      <section className={`painel-sessao-viva relative overflow-hidden rounded-2xl border border-accent-500/50 bg-raised/80 p-5 shadow-brilho ${className}`} aria-label="Sessão ao vivo">
        <span className="selo-ao-vivo">
          <span className="ponto-vivo" aria-hidden="true" /> Sessão ao vivo
        </span>
        <p className="font-sora text-ink text-xl font-semibold leading-tight mt-3 truncate">
          {sessaoAtiva.titulo || 'Sessão em andamento'}
        </p>
        <p className="text-ink-dim text-sm mt-1">As fichas, o feed de rolagens e o combate da mesa estão lá.</p>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Botao variante="primario" tamanho="lg" onClick={entrar}>
            Entrar na sessão <Icone nome="seta-dir" tamanho={18} />
          </Botao>
          {isGestor && (
            <Botao variante="fantasma" onClick={handleEncerrar} disabled={busy} className="text-red-300 hover:!text-white hover:!bg-red-950/50">
              {busy ? 'Encerrando…' : 'Encerrar'}
            </Botao>
          )}
        </div>
        {erroAcao && <p className="aviso-erro mt-3" role="alert">{erroAcao}</p>}
      </section>
    )
  }

  // ---- Sem sessão ativa ----
  if (isGestor) {
    return (
      <section className={`rounded-2xl border border-border bg-raised/70 p-5 ${className}`} aria-label="Modo sessão">
        <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Modo sessão</p>
        <p className="font-sora text-ink text-xl font-semibold leading-tight mt-1.5">Pronto para jogar?</p>
        <p className="text-ink-dim text-sm mt-1">Reúne as fichas, o feed e o combate num painel ao vivo para a mesa toda.</p>
        <Botao variante="primario" tamanho="lg" onClick={handleIniciar} disabled={busy} className="mt-4">
          <Icone nome="play" tamanho={18} /> {busy ? 'Iniciando…' : 'Iniciar sessão'}
        </Botao>
        {erroAcao && <p className="aviso-erro mt-3" role="alert">{erroAcao}</p>}
      </section>
    )
  }

  // Jogador sem sessão ativa: estado neutro discreto
  return (
    <section className={`rounded-2xl border border-dashed border-border p-5 flex items-start gap-3 ${className}`} aria-label="Sessão">
      <Icone nome="relogio" tamanho={22} className="text-ink-dim mt-0.5" />
      <div>
        <p className="text-ink font-medium">Nenhuma sessão agora</p>
        <p className="text-ink-dim text-sm mt-0.5">Quando o mestre iniciar, o convite para entrar aparece aqui.</p>
      </div>
    </section>
  )
}
