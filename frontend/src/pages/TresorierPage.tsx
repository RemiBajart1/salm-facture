import { useState } from 'react'
import styles from './Pages.module.css'
import { TarifsPersonne } from '../components/tresorier/TarifsPersonne'
import { ItemsSupplements } from '../components/tresorier/ItemsSupplements'
import { ConfigSite } from '../components/tresorier/ConfigSite'
import { Dashboard } from '../components/tresorier/Dashboard'
import { useAuth } from '../contexts/AuthContext'

type TresorierTab = 'tarifs' | 'items' | 'config' | 'dashboard'

/** Layout desktop pour le trésorier */
export function TresorierPage() {
  const [tab, setTab] = useState<TresorierTab>('tarifs')
  const { user, logout } = useAuth()

  return (
    <div className={styles.desktopPage}>
      <div className={styles.desktopContainer}>
        {/* Header trésorier (couleur teal) */}
        <div className={`${styles.desktopHeader} ${styles.desktopHeaderTeal}`}>
          <div className={styles.dhBrand}>
            <div className={styles.dhLogo}>
              <svg viewBox="0 0 44 44" width="36" height="36">
                <polygon points="22,2 42,40 2,40" fill="#2a5c3f" />
                <text x="22" y="33" textAnchor="middle" fontFamily="serif" fontSize="17" fontWeight="bold" fill="white">Y</text>
              </svg>
            </div>
            <div>
              <div className={styles.dhName}>UCJG Salm — Administration</div>
              <div className={styles.dhSub}>Paramétrage des tarifs &amp; configuration globale</div>
            </div>
          </div>
          <div className={styles.dhRole}>
            Trésorier
            <button
              type="button"
              className={styles.desktopLogoutBtn}
              onClick={logout}
              title={`Déconnexion (${user?.email})`}
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className={styles.desktopTabs}>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'tarifs' ? styles.dtabActive : ''}`}
            onClick={() => setTab('tarifs')}
          >
            💶 Tarifs / personne
          </button>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'items' ? styles.dtabActive : ''}`}
            onClick={() => setTab('items')}
          >
            📦 Items suppléments
          </button>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'config' ? styles.dtabActive : ''}`}
            onClick={() => setTab('config')}
          >
            ⚙️ Configuration site
          </button>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'dashboard' ? styles.dtabActive : ''}`}
            onClick={() => setTab('dashboard')}
          >
            📊 Tableau de bord
          </button>
        </div>

        {/* Contenu */}
        {tab === 'tarifs' && <TarifsPersonne />}
        {tab === 'items' && <ItemsSupplements />}
        {tab === 'config' && <ConfigSite />}
        {tab === 'dashboard' && <Dashboard />}
      </div>
    </div>
  )
}
