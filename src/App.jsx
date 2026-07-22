import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PreferenciasProvider } from './context/PreferenciasContext'
import PageTransition from './theme/PageTransition'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import MesaPage from './pages/MesaPage'
import FichaPage from './pages/FichaPage'
import SessaoPage from './pages/SessaoPage'
import DadosTestePage from './pages/DadosTestePage'

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-purple-400 text-xl">Carregando...</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-purple-400 text-xl">Carregando...</div>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <PageTransition>
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
        <Route path="/teste-dados" element={<DadosTestePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PreferenciasProvider>
          <AppRoutes />
        </PreferenciasProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
