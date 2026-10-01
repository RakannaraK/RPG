import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { souConvidado } from '../lib/convite'
import BannerConvidado from '../components/mesa/BannerConvidado'
import { supabase } from '../lib/supabase'
import { useMesas } from '../hooks/useMesa'
import MesaCard from '../components/mesa/MesaCard'
import MesaCreate from '../components/mesa/MesaCreate'
import MesaInvite from '../components/mesa/MesaInvite'
import BarraTopo from '../components/ui/BarraTopo'
import Botao from '../components/ui/Botao'
import Icone from '../components/ui/Icone'
import EstadoVazio from '../components/ui/EstadoVazio'
import { EsqueletoCartoes } from '../components/ui/Esqueleto'
import { useToast } from '../components/ui/Toast'
import { proximaDaMesa } from '../lib/agenda'
import GuiaMestre, { useProgressoMestre } from '../components/ajuda/GuiaMestre'
import { passosDoGuia, quantosFeitos } from '../lib/guia'
import { usePreferencias } from '../context/PreferenciasContext'

export default function DashboardPage() {
  const { session } = useAuth()
  const { mesas, loading, error, refetch } = useMesas()
  const navigate = useNavigate()
  const toast = useToast()

  const [showCreate, setShowCreate] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  // F40 — próxima sessão de cada mesa (uma consulta; a RLS devolve só as minhas)
  const [agendas, setAgendas] = useState([])
  useEffect(() => {
    supabase.from('agenda_mesa').select('id, mesa_id, inicio, duracao_min, recorrencia, ate, titulo')
      .then(({ data }) => setAgendas(data || []))
  }, [])
  const proximaDe = mesaId => proximaDaMesa(agendas.filter(a => a.mesa_id === mesaId))
  const [showArquivadas, setShowArquivadas] = useState(false)
  const [showGuia, setShowGuia] = useState(false)
  // F52 — primeiros passos do mestre: some quando tudo está feito ou a pessoa pula
  const { preferencias, salvarPreferencias } = usePreferencias()
  const progresso = useProgressoMestre(!preferencias.guia_dispensado)
  const passos = passosDoGuia(progresso || {})
  const feitos = quantosFeitos(passos)
  const proximoPasso = passos.find(p => !p.feito)

  // 16.8 — separa mesas ativas das arquivadas
  const ativas = mesas.filter(m => !m.arquivada)
  const arquivadas = mesas.filter(m => m.arquivada)
  const podeCriar = !souConvidado(session) // F47 — convidado joga, mas não cria mesa (o banco também barra)

  function handleMesaCreated(mesa) {
    setShowCreate(false)
    toast.ok('Mesa criada', { detalhe: 'Convide os jogadores pela aba Membros.' })
    refetch()
    navigate(`/mesa/${mesa.id}`)
  }

  function handleMesaJoined(mesa) {
    setShowInvite(false)
    toast.ok('Você entrou na mesa')
    refetch()
    navigate(`/mesa/${mesa.id}`)
  }

  const novaMesa = podeCriar && (
    <Botao variante="primario" tamanho="lg" onClick={() => setShowCreate(true)}>
      <Icone nome="mais" tamanho={18} /> Nova mesa
    </Botao>
  )
  const entrarCodigo = (
    <Botao variante="contorno" tamanho="lg" onClick={() => setShowInvite(true)}>
      Entrar com código
    </Botao>
  )

  return (
    <div className="min-h-screen">
      <BarraTopo />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BannerConvidado className="mb-6" />
        {progresso && !preferencias.guia_dispensado && feitos < passos.length && !souConvidado(session) && (
          <section className="mb-8 rounded-2xl border border-accent-700/50 bg-raised/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4" aria-label="Primeiros passos">
            <div className="flex-1 min-w-0">
              <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Primeiros passos do mestre · {feitos} de {passos.length}</p>
              <p className="font-sora text-ink text-lg font-semibold mt-1">Próximo: {proximoPasso?.titulo}</p>
              <div className="mt-3 h-1.5 rounded-full bg-void ring-1 ring-inset ring-border overflow-hidden max-w-sm" aria-hidden="true">
                <div className="h-full rounded-full bg-accent-500" style={{ width: `${(feitos / passos.length) * 100}%` }} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Botao variante="fantasma" onClick={() => salvarPreferencias({ guia_dispensado: true })}>Pular</Botao>
              <Botao variante="primario" onClick={() => setShowGuia(true)}>Ver o guia</Botao>
            </div>
          </section>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
          <div>
            <h1 className="font-sora text-3xl sm:text-4xl font-bold text-ink tracking-tight">Suas mesas</h1>
            <p className="text-ink-dim mt-1.5">
              {loading ? 'Abrindo o grimório…'
                : ativas.length === 0 ? 'Nenhuma mesa ativa'
                : `${ativas.length} ${ativas.length === 1 ? 'mesa ativa' : 'mesas ativas'}`}
            </p>
          </div>
          {!loading && mesas.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3 [&>*]:flex-1 sm:[&>*]:flex-none">
              {entrarCodigo}
              {novaMesa}
            </div>
          )}
        </div>

        {error && (
          <div className="aviso-erro mb-6 flex flex-wrap items-center justify-between gap-3" role="alert">
            <span>Não foi possível carregar as suas mesas. {error}</span>
            <Botao variante="secundario" tamanho="sm" onClick={refetch}>Tentar novamente</Botao>
          </div>
        )}

        {loading ? (
          <EsqueletoCartoes quantos={3} className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5" altura="h-52" />
        ) : mesas.length === 0 ? (
          <EstadoVazio
            arte="mapa" titulo="Nenhuma mesa ainda"
            descricao={podeCriar
              ? 'Crie a mesa da sua campanha ou entre numa com o código que o mestre mandou.'
              : 'Entre numa mesa com o código que o mestre mandou.'}
          >
            {entrarCodigo}
            {novaMesa}
          </EstadoVazio>
        ) : (
          <>
            {ativas.length > 0 ? (
              <div className="entra-lista grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {ativas.map((mesa, i) => (
                  <div key={mesa.id} style={{ '--i': i }}>
                    <MesaCard mesa={mesa} proxima={proximaDe(mesa.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <EstadoVazio compacto arte="tomo" titulo="Nenhuma mesa ativa" descricao="Suas mesas arquivadas estão logo abaixo." />
            )}

            {/* Arquivadas (16.8) */}
            {arquivadas.length > 0 && (
              <section className="mt-10">
                <button
                  onClick={() => setShowArquivadas(a => !a)} aria-expanded={showArquivadas}
                  className="inline-flex items-center gap-2 text-ink-dim hover:text-ink text-sm font-medium transition-colors duration-rapida"
                >
                  <Icone nome="chevron-dir" tamanho={16} className={`transition-transform duration-normal ${showArquivadas ? 'rotate-90' : ''}`} />
                  Arquivadas ({arquivadas.length})
                </button>
                {showArquivadas && (
                  <div className="entra-lista grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-4 opacity-80">
                    {arquivadas.map((mesa, i) => (
                      <div key={mesa.id} style={{ '--i': i }}>
                        <MesaCard mesa={mesa} proxima={proximaDe(mesa.id)} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {showCreate && <MesaCreate onClose={() => setShowCreate(false)} onCreated={handleMesaCreated} />}
      {showInvite && <MesaInvite onClose={() => setShowInvite(false)} onJoined={handleMesaJoined} />}
      {showGuia && <GuiaMestre onFechar={() => setShowGuia(false)} onCriarMesa={() => setShowCreate(true)} />}
    </div>
  )
}
