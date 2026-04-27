import { useState } from 'react'
import styles from './Pages.module.css'
import { NouveauSejour } from '../components/responsable/NouveauSejour'
import { LignesLibres } from '../components/responsable/LignesLibres'
import { SejoursFactures } from '../components/responsable/SejoursFactures'

type ResponsableTab = 'nouveau' | 'confirmer' | 'sejours'

/** Layout responsable location */
export function ResponsablePage() {
  const [tab, setTab] = useState<ResponsableTab>('nouveau')

  return (
    <div className={styles.desktopPage}>
      <div className={styles.desktopContainer}>
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

        {tab === 'nouveau'   && <NouveauSejour />}
        {tab === 'confirmer' && <LignesLibres />}
        {tab === 'sejours'   && <SejoursFactures />}
      </div>
    </div>
  )
}
