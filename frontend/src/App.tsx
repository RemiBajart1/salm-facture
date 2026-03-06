import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { GardienPage } from './pages/GardienPage'
import { ResponsablePage } from './pages/ResponsablePage'
import { TresorierPage } from './pages/TresorierPage'
import type { UserRole } from './contexts/AuthContext'

/** Redirige vers la page adaptée au rôle de l'utilisateur */
function RoleRedirect() {
  const { user } = useAuth()
  const routes: Record<UserRole, string> = {
    gardien: '/gardien',
    resp_location: '/responsable',
    tresorier: '/admin',
  }
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={routes[user.role]} replace />
}

/** Guard : redirige vers /login si non connecté, ou vers la page du rôle si rôle invalide */
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
}) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (!allowedRoles.includes(user.role)) {
    // Redirige vers la page correspondant au rôle réel
    const routes: Record<UserRole, string> = {
      gardien: '/gardien',
      resp_location: '/responsable',
      tresorier: '/admin',
    }
    return <Navigate to={routes[user.role]} replace />
  }

  return <>{children}</>
}

export function App() {
  const { user, loading } = useAuth()

  if (loading) return null

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <RoleRedirect /> : <LoginPage />}
      />
      <Route
        path="/gardien"
        element={
          <ProtectedRoute allowedRoles={['gardien']}>
            <GardienPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/responsable"
        element={
          <ProtectedRoute allowedRoles={['resp_location']}>
            <ResponsablePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['tresorier']}>
            <TresorierPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
