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
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const JWT_KEY = 'locagest_jwt'
const USER_KEY = 'locagest_user'

const WP_API_BASE = '/wp-json/locagest/v1'

function roleFromWP(wpRole: string): UserRole {
  const map: Record<string, UserRole> = {
    locagest_gardien:       'gardien',
    locagest_resp_location: 'resp_location',
    locagest_tresorier:     'tresorier',
  }
  return map[wpRole] ?? 'gardien'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const storedUser  = localStorage.getItem(USER_KEY)
    const storedToken = localStorage.getItem(JWT_KEY)
    const cfg         = window.locagestConfig

    // Token injecté par WP (page admin) → session automatique sans login
    if (cfg?.token && cfg.roles && cfg.roles.length > 0) {
      const role      = roleFromWP(cfg.roles[0] ?? '')
      const autoUser: AuthUser = {
        username: cfg.username ?? cfg.userEmail ?? 'utilisateur',
        email:    cfg.userEmail ?? cfg.username ?? '',
        role,
        token:    cfg.token,
      }
      localStorage.setItem(JWT_KEY,  cfg.token)
      localStorage.setItem(USER_KEY, JSON.stringify(autoUser))
      setUser(autoUser)
      setLoading(false)
      return
    }

    // Session manuelle (login via formulaire)
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser)
      } catch {
        localStorage.removeItem(USER_KEY)
        localStorage.removeItem(JWT_KEY)
      }
    }
    setLoading(false)
  }, [])

  const login = async (username: string, password: string) => {
    setError(null)
    try {
      const apiBase = window.locagestConfig?.apiBase ?? WP_API_BASE
      const res = await fetch(`${apiBase}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Identifiants incorrects')
      }

      const data = await res.json() as { token: string; roles: string[]; user_id: number }
      const role = roleFromWP(data.roles[0] ?? '')
      const authUser: AuthUser = {
        username,
        email: username,
        role,
        token: data.token,
      }
      localStorage.setItem(JWT_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(authUser))
      setUser(authUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    localStorage.removeItem(JWT_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}
