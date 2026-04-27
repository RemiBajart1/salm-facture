import styles from './Gardien.module.css'
import type { GardienStep } from '../../pages/GardienPage'
import { useCurrentSejour } from '../../hooks/useSejour'

interface SuccesPageProps {
  onNavigate: (step: GardienStep) => void
}

/** G6 — Page de succès après envoi de la facture */
export function SuccesPage({ onNavigate }: SuccesPageProps) {
  const { sejour } = useCurrentSejour()

  return (
    <div className={styles.successScreen}>
      <div className={styles.successCircle}>✓</div>
      <div className={styles.successTitle}>Facture envoyée !</div>
      <div className={styles.successSub}>
        {sejour?.emailLocataire && (
          <>
            Envoyée à <strong>{sejour.emailLocataire}</strong>
            <br />
            et au responsable location.
          </>
        )}
      </div>
      <button
        className="btn-secondary"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => onNavigate('accueil')}
      >
        Retour à l'accueil
      </button>
    </div>
  )
}
