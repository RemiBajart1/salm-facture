import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { GardienPage } from './pages/GardienPage'
import { ResponsablePage } from './pages/ResponsablePage'
import { TresorierPage } from './pages/TresorierPage'
import type { UserRole } from './contexts/AuthContext'

const ROLE_ROUTES: Record<UserRole, string> = {
  gardien:       '/gardien',
  resp_location: '/responsable',
  tresorier:     '/admin',
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={ROLE_ROUTES[user.role]} replace />
}

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
}) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return null
  if (!allowedRoles.includes(user.role)) return <Navigate to={ROLE_ROUTES[user.role]} replace />
  return <>{children}</>
}

export function App() {
  const { loading } = useAuth()
  if (loading) return null

  return (
    <Routes>
      <Route
        path="/gardien"
        element={<ProtectedRoute allowedRoles={['gardien']}><GardienPage /></ProtectedRoute>}
      />
      <Route
        path="/responsable"
        element={<ProtectedRoute allowedRoles={['resp_location']}><ResponsablePage /></ProtectedRoute>}
      />
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['tresorier']}><TresorierPage /></ProtectedRoute>}
      />
      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
