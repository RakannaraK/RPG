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
    </div>
  )
}
