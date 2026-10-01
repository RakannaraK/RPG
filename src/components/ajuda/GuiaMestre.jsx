import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { passosDoGuia, quantosFeitos } from '../../lib/guia'
import Botao from '../ui/Botao'
import Modal from '../ui/Modal'
import Icone from '../ui/Icone'
import Esqueleto from '../ui/Esqueleto'

/**
 * Lê no banco o que já foi feito nas mesas onde você é mestre/co-mestre.
 * Só contagens: nada de dado de ninguém viaja para cá.
 */
export function useProgressoMestre(ativo = true) {
  const { session } = useAuth()
  const uid = session?.user?.id
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    if (!ativo || !uid) return
    let vivo = true
    ;(async () => {
      const { data: minhas } = await supabase.from('membros_mesa').select('mesa_id, role, mesa:mesa_id (arquivada, created_at)').eq('usuario_id', uid)
      const gestoras = (minhas || [])
        .filter(m => (m.role === 'mestre' || m.role === 'co-mestre') && !m.mesa?.arquivada)
        .sort((a, b) => String(a.mesa?.created_at).localeCompare(String(b.mesa?.created_at)))
        .map(m => m.mesa_id)
      if (!gestoras.length) { if (vivo) setEstado({}); return }
      const conta = r => r.count || 0
      const { data: sistemas } = await supabase.from('sistemas').select('id').in('mesa_id', gestoras)
      const ids = (sistemas || []).map(s => s.id)
      const [atr, mem, fic, ses] = await Promise.all([
        ids.length ? supabase.from('atributos').select('id', { count: 'exact', head: true }).in('sistema_id', ids) : Promise.resolve({ count: 0 }),
        supabase.from('membros_mesa').select('usuario_id', { count: 'exact', head: true }).in('mesa_id', gestoras).neq('usuario_id', uid),
        supabase.from('fichas').select('id', { count: 'exact', head: true }).in('mesa_id', gestoras),
        supabase.from('sessoes').select('id', { count: 'exact', head: true }).in('mesa_id', gestoras),
      ])
      if (vivo) setEstado({ mesaId: gestoras[0], atributos: conta(atr), outrosMembros: conta(mem), fichas: conta(fic), sessoes: conta(ses) })
    })().catch(() => { if (vivo) setEstado({}) })
    return () => { vivo = false }
  }, [ativo, uid])

  return estado
}

/**
 * Fase 52 — guia do mestre: em vez de um bloco de texto, cinco passos com o
 * que já está feito marcado (pelo que existe no banco) e um botão que leva
 * direto para onde fazer o próximo. Quem já sabe, fecha e segue.
 */
export default function GuiaMestre({ onFechar, onCriarMesa }) {
  const navigate = useNavigate()
  const estado = useProgressoMestre(true)
  const passos = passosDoGuia(estado || {})
  const feitos = quantosFeitos(passos)
  const proximo = passos.find(p => !p.feito)

  function ir(acao) {
    onFechar()
    if (acao.criar && onCriarMesa) onCriarMesa()
    else navigate(acao.para)
  }

  return (
    <Modal
      onFechar={onFechar} tamanho="lg"
      titulo="Guia do mestre" subtitulo="Do zero à primeira sessão, em cinco passos."
      rodape={<Botao variante="primario" onClick={onFechar}>{feitos === passos.length ? 'Tudo pronto' : 'Fechar'}</Botao>}
    >
      {!estado ? (
        <div className="space-y-3" role="status" aria-label="Carregando"><Esqueleto className="h-3 w-40" /><Esqueleto className="h-16" /><Esqueleto className="h-16" /><Esqueleto className="h-16" /></div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-ink font-medium">{feitos} de {passos.length} concluídos</span>
              {feitos === passos.length && <span className="text-ok inline-flex items-center gap-1"><Icone nome="check" tamanho={14} /> Mesa pronta para jogar</span>}
            </div>
            <div className="h-2 rounded-full bg-void ring-1 ring-inset ring-border overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={passos.length} aria-valuenow={feitos} aria-label="Progresso do guia">
              <div className="h-full rounded-full bg-accent-500 transition-[width] duration-lenta ease-padrao" style={{ width: `${(feitos / passos.length) * 100}%` }} />
            </div>
          </div>

          <ol className="space-y-2.5">
            {passos.map((p, i) => {
              const ehProximo = p === proximo
              return (
                <li key={p.id} className={`flex gap-4 rounded-xl border p-4 transition-colors duration-normal ${ehProximo ? 'selecionado' : p.feito ? 'border-border/60 bg-void/30' : 'border-border'}`}>
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full inline-flex items-center justify-center text-sm font-bold ${p.feito ? 'bg-ok/15 text-ok ring-1 ring-ok/50' : ehProximo ? 'bg-accent-600 text-sobre-acento' : 'bg-hover text-ink-dim'}`}
                    aria-hidden="true"
                  >{p.feito ? <Icone nome="check" tamanho={16} espessura={2.4} /> : i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold ${p.feito ? 'text-ink-dim' : 'text-ink'}`}>
                      <span className="sr-only">{p.feito ? 'Feito: ' : ehProximo ? 'Próximo: ' : ''}</span>{p.titulo}
                    </p>
                    <p className="text-ink-dim text-sm mt-0.5">{p.texto}</p>
                    {ehProximo && p.acao && (
                      <Botao variante="primario" tamanho="sm" className="mt-3" onClick={() => ir(p.acao)}>
                        {p.acao.rotulo} <Icone nome="seta-dir" tamanho={14} />
                      </Botao>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <details className="rounded-xl border border-border/60 px-4 py-3 text-sm">
            <summary className="cursor-pointer text-ink font-medium">Dicas</summary>
            <ul className="mt-2 space-y-1.5 text-ink-dim">
              <li>Não precisa configurar tudo de uma vez: ligue as seções do sistema conforme precisar.</li>
              <li><strong className="text-ink">Exporte</strong> o sistema (botão no editor) para ter um backup ou usar em outra mesa.</li>
              <li>O seu <strong className="text-ink">nome de exibição</strong> fica em Preferências, no menu do seu avatar.</li>
            </ul>
          </details>
        </div>
      )}
    </Modal>
  )
}
