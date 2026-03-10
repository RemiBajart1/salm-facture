/**
 * Contexte d'authentification — wrapping d'AWS Amplify Cognito.
 * En développement (MSW activé), simule les groupes Cognito avec un login fictif.
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'

export type UserRole = 'gardien' | 'resp_location' | 'tresorier'

export interface AuthUser {
  username: string
  email: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEV_USERS: Record<string, { password: string; user: AuthUser }> = {
  'gardien@test.fr': {
    password: 'test',
    user: { username: 'gardien@test.fr', email: 'gardien@test.fr', role: 'gardien' },
  },
  'resp@test.fr': {
    password: 'test',
    user: { username: 'resp@test.fr', email: 'resp@test.fr', role: 'resp_location' },
  },
  'tresorier@test.fr': {
    password: 'test',
    user: { username: 'tresorier@test.fr', email: 'tresorier@test.fr', role: 'tresorier' },
  },
}

const IS_DEV = import.meta.env.DEV

/** Lit le rôle depuis les groupes Cognito dans le JWT */
function extractRole(groups: string[]): UserRole {
  if (groups.includes('tresorier')) return 'tresorier'
  if (groups.includes('resp_location')) return 'resp_location'
  return 'gardien'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (IS_DEV) {
      // Recharge la session mock depuis localStorage
      const stored = localStorage.getItem('locagest_dev_user')
      if (stored) {
        try {
          setUser(JSON.parse(stored) as AuthUser)
        } catch {
          localStorage.removeItem('locagest_dev_user')
        }
      }
      setLoading(false)
      return
    }

    // Production : vérifie la session Cognito existante
    getCurrentUser()
      .then(async (cognitoUser) => {
        const session = await fetchAuthSession()
        const groups =
          (session.tokens?.idToken?.payload['cognito:groups'] as string[]) ?? []
        setUser({
          username: cognitoUser.username,
          email: (session.tokens?.idToken?.payload.email as string) ?? cognitoUser.username,
          role: extractRole(groups),
        })
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (username: string, password: string) => {
    setError(null)
    try {
      if (IS_DEV) {
        const devUser = DEV_USERS[username]
        if (!devUser || devUser.password !== password) {
          throw new Error('Identifiants incorrects')
        }
        setUser(devUser.user)
        localStorage.setItem('locagest_dev_user', JSON.stringify(devUser.user))
        return
      }

      await signIn({ username, password })
      const cognitoUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const groups =
        (session.tokens?.idToken?.payload['cognito:groups'] as string[]) ?? []
      setUser({
        username: cognitoUser.username,
        email: (session.tokens?.idToken?.payload.email as string) ?? cognitoUser.username,
        role: extractRole(groups),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(message)
      throw err
    }
  }

  const logout = async () => {
    if (IS_DEV) {
      localStorage.removeItem('locagest_dev_user')
      setUser(null)
      return
    }
    await signOut()
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
