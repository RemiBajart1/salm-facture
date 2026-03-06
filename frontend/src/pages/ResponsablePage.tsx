import { useState } from 'react'
import styles from './Pages.module.css'
import { NouveauSejour } from '../components/responsable/NouveauSejour'
import { LignesLibres } from '../components/responsable/LignesLibres'
import { SejoursFactures } from '../components/responsable/SejoursFactures'
import { useAuth } from '../contexts/AuthContext'

type ResponsableTab = 'nouveau' | 'confirmer' | 'sejours'

/** Layout desktop pour le responsable location */
export function ResponsablePage() {
  const [tab, setTab] = useState<ResponsableTab>('nouveau')
  const { user, logout } = useAuth()

  return (
    <div className={styles.desktopPage}>
      <div className={styles.desktopContainer}>
        {/* Header */}
        <div className={styles.desktopHeader}>
          <div className={styles.dhBrand}>
            <div className={styles.dhLogo}>
              <svg viewBox="0 0 44 44" width="36" height="36">
                <polygon points="22,2 42,40 2,40" fill="#2a5c3f" />
                <text x="22" y="33" textAnchor="middle" fontFamily="serif" fontSize="17" fontWeight="bold" fill="white">Y</text>
              </svg>
            </div>
            <div>
              <div className={styles.dhName}>UCJG Salm — LocaGest</div>
              <div className={styles.dhSub}>Maison de vacances · 53 rue du Haut-Fourneau</div>
            </div>
          </div>
          <div className={styles.dhRole}>
            Responsable Location
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
            className={`${styles.dtab} ${tab === 'nouveau' ? styles.dtabActive : ''}`}
            onClick={() => setTab('nouveau')}
          >
            📋 Nouveau séjour
          </button>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'confirmer' ? styles.dtabActive : ''}`}
            onClick={() => setTab('confirmer')}
          >
            ⚠️ À confirmer
          </button>
          <button
            type="button"
            className={`${styles.dtab} ${tab === 'sejours' ? styles.dtabActive : ''}`}
            onClick={() => setTab('sejours')}
          >
            📊 Séjours &amp; factures
          </button>
        </div>

        {/* Contenu */}
        {tab === 'nouveau' && <NouveauSejour />}
        {tab === 'confirmer' && <LignesLibres />}
        {tab === 'sejours' && <SejoursFactures />}
      </div>
    </div>
  )
}
