import { useState, FormEvent } from 'react'
import styles from './Pages.module.css'
import { ErrorBanner } from '../components/common/ErrorBanner'
import { useAuth } from '../contexts/AuthContext'

/** Page de connexion — JWT WordPress */
export function LoginPage() {
  const { login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isDev = import.meta.env.DEV

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <svg viewBox="0 0 52 52" width="52" height="52">
            <polygon points="26,2 50,48 2,48" fill="#2a5c3f" stroke="#f5f0e6" strokeWidth="1.5" />
            <text x="26" y="38" textAnchor="middle" fontFamily="serif" fontSize="16" fontWeight="bold" fill="#f5f0e6">Y</text>
          </svg>
          <div className={styles.loginTitle}>LocaGest</div>
          <div className={styles.loginSub}>UCJG Salm — Maison de vacances</div>
        </div>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className={styles.loginFormGroup}>
            <label className={styles.loginLabel} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className={styles.loginInput}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.fr"
            />
          </div>
          <div className={styles.loginFormGroup}>
            <label className={styles.loginLabel} htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className={styles.loginInput}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        {isDev && (
          <div className={styles.loginHint}>
            <strong>Comptes de développement :</strong>
            <br />
            Gardien : <code>gardien@test.fr</code> / <code>test</code>
            <br />
            Resp. : <code>resp@test.fr</code> / <code>test</code>
            <br />
            Trésorier : <code>tresorier@test.fr</code> / <code>test</code>
          </div>
        )}
      </div>
    </div>
  )
}
