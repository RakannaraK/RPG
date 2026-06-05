import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import MesaPage from './pages/MesaPage'
import FichaPage from './pages/FichaPage'

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
