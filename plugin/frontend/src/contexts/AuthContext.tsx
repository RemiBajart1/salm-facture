import React, { createContext, useContext, useEffect, useState } from 'react'

export type UserRole = 'gardien' | 'resp_location' | 'tresorier'

export interface AuthUser {
  username: string
  email: string
  role: UserRole
  token: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const JWT_KEY  = 'locagest_jwt'
const USER_KEY = 'locagest_user'

function roleFromWP(wpRole: string): UserRole {
  const map: Record<string, UserRole> = {
    locagest_gardien:       'gardien',
    locagest_resp_location: 'resp_location',
    locagest_tresorier:     'tresorier',
  }
  return map[wpRole] ?? 'gardien'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cfg = window.locagestConfig

    // Token injecté par WP (ou mock dev) → session automatique
    if (cfg?.token && cfg.roles && cfg.roles.length > 0) {
      const role     = roleFromWP(cfg.roles[0] ?? '')
      const autoUser: AuthUser = {
        username: cfg.username  ?? cfg.userEmail ?? 'utilisateur',
        email:    cfg.userEmail ?? cfg.username  ?? '',
        role,
        token: cfg.token,
      }
      localStorage.setItem(JWT_KEY,  cfg.token)
      localStorage.setItem(USER_KEY, JSON.stringify(autoUser))
      setUser(autoUser)
      setLoading(false)
      return
    }

    // Fallback : session persistée en localStorage
    const storedUser  = localStorage.getItem(USER_KEY)
    const storedToken = localStorage.getItem(JWT_KEY)
    if (storedUser && storedToken) {
      try { setUser(JSON.parse(storedUser) as AuthUser) }
      catch { localStorage.removeItem(USER_KEY); localStorage.removeItem(JWT_KEY) }
    }
    setLoading(false)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
