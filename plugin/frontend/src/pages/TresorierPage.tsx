import { useState } from 'react'
import styles from './Pages.module.css'
import { TarifsPersonne } from '../components/tresorier/TarifsPersonne'
import { ItemsSupplements } from '../components/tresorier/ItemsSupplements'
import { ConfigSite } from '../components/tresorier/ConfigSite'
import { Dashboard } from '../components/tresorier/Dashboard'

type TresorierTab = 'tarifs' | 'items' | 'config' | 'dashboard'

/** Layout trésorier */
export function TresorierPage() {
  const [tab, setTab] = useState<TresorierTab>('tarifs')

  return (
    <div className={styles.desktopPage}>
      <div className={styles.desktopContainer}>
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

        {tab === 'tarifs'    && <TarifsPersonne />}
        {tab === 'items'     && <ItemsSupplements />}
        {tab === 'config'    && <ConfigSite />}
        {tab === 'dashboard' && <Dashboard />}
      </div>
    </div>
  )
}
