import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PreferenciasProvider } from './context/PreferenciasContext'
import PageTransition from './theme/PageTransition'
import ErrorBoundary from './components/ErrorBoundary'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import OuvinteDadosMesa from './components/dados/OuvinteDadosMesa'
import OuvinteDesafios from './components/minigames/OuvinteDesafios'
import Selo from './components/marca/Selo'
import { destinoDepoisDoLogin } from './lib/convite'

// F52 — cada página grande vira um pedaço próprio do código: quem abre o site
// baixa só a entrada e o painel; a mesa, a ficha, a sessão e o mapa chegam
// quando a pessoa vai até eles.
const MesaPage = lazy(() => import('./pages/MesaPage'))
const FichaPage = lazy(() => import('./pages/FichaPage'))
const SessaoPage = lazy(() => import('./pages/SessaoPage'))
const MapaPage = lazy(() => import('./pages/MapaPage'))
const DadosTestePage = lazy(() => import('./pages/DadosTestePage'))
const OverlayPage = lazy(() => import('./pages/OverlayPage'))
const ComunidadePage = lazy(() => import('./pages/ComunidadePage'))
const ConvitePage = lazy(() => import('./pages/ConvitePage'))

/** Enquanto a página (ou o login) chega: o selo respirando, sem texto piscando. */
function CarregandoPagina() {
  return (
    <div className="min-h-screen flex items-center justify-center" role="status">
      <Selo tamanho={44} pulso />
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <CarregandoPagina />

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation() // F47: quem veio de um convite volta para ele

  if (loading) return <CarregandoPagina />

  if (session) {
    return <Navigate to={destinoDepoisDoLogin(location.state)} replace />
  }

  return children
}

function AppRoutes() {
  return (
    <PageTransition>
      <Suspense fallback={<CarregandoPagina />}>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesa/:id"
          element={
            <ProtectedRoute>
              <MesaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesa/:id/ficha/:fichaId"
          element={
            <ProtectedRoute>
              <FichaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesa/:id/sessao/:sessaoId"
          element={
            <ProtectedRoute>
              <SessaoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mesa/:id/mapa"
          element={
            <ProtectedRoute>
              <MapaPage />
            </ProtectedRoute>
          }
        />
        {/* F36 — comunidade: abre sem login (vitrine em leitura + demo) */}
        <Route path="/comunidade" element={<ComunidadePage />} />
        {/* F47 — convite por link: com conta ou como convidado */}
        <Route path="/convite/:codigo" element={<ConvitePage />} />
        {/* F34 — overlay para OBS: sem login, só com o token secreto */}
        <Route path="/overlay/:token" element={<OverlayPage />} />
        <Route path="/teste-dados" element={<DadosTestePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </PageTransition>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <PreferenciasProvider>
            <AppRoutes />
            {/* F27 — bandeja de dados da mesa (fora da transição de página) */}
            <OuvinteDadosMesa />
            {/* F28 — aviso de desafio de minigame (fora da transição de página) */}
            <OuvinteDesafios />
          </PreferenciasProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
