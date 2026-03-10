import styles from './Gardien.module.css'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorBanner } from '../common/ErrorBanner'
import { useCurrentSejour } from '../../hooks/useSejour'
import type { GardienStep } from '../../pages/GardienPage'

interface AccueilGardienProps {
  onNavigate: (step: GardienStep) => void
}

/** G1 — Accueil gardien : séjour en cours + actions */
export function AccueilGardien({ onNavigate }: AccueilGardienProps) {
  const { sejour, loading, error } = useCurrentSejour()

  if (loading) return <LoadingSpinner message="Chargement du séjour..." />
  if (error) return <ErrorBanner message={error} />
  if (!sejour)
    return (
      <div className={styles.emptyState}>
        <p>Aucun séjour en cours.</p>
      </div>
    )

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const hasPersonnesSaisies = sejour.categories.some(
    (c) => c.nbReelles !== null && c.nbReelles !== undefined,
  )

  return (
    <>
      <div className={styles.scrollArea}>
        {/* Carte séjour hero */}
        <div className={styles.sejourCard}>
          <div className={styles.sejourBadge}>
            <span className={styles.badgeDot} />
            En cours
          </div>
          <div className={styles.sejourName}>{sejour.nomLocataire}</div>
          <div className={styles.sejourDates}>
            {formatDate(sejour.dateArrivee)} – {formatDate(sejour.dateDepart)} · {sejour.nbNuits} nuit{sejour.nbNuits > 1 ? 's' : ''}
          </div>

          {/* Horaires */}
          <div className={styles.horairesRow}>
            <div className={styles.horaireChip}>
              <div className={styles.horaireType}>Arrivée prévue</div>
              <div className={styles.horaireTime}>{sejour.heureArriveePrevue ?? '—'}</div>
            </div>
            <div className={styles.horaireChip}>
              <div className={styles.horaireType}>Arrivée réelle</div>
              <div className={`${styles.horaireTime} ${styles.horaireReal}`}>
                {sejour.heureArriveeReelle ?? '—'}
              </div>
            </div>
            <div className={styles.horaireChip}>
              <div className={styles.horaireType}>Départ prévu</div>
              <div className={styles.horaireTime}>{sejour.heureDepartPrevu ?? '—'}</div>
            </div>
            <div className={styles.horaireChip}>
              <div className={styles.horaireType}>Départ réel</div>
              <div className={`${styles.horaireTime} ${styles.horaireReal}`}>
                {sejour.heureDepartReelle ?? '—'}
              </div>
            </div>
          </div>

          {/* Résumé catégories */}
          <div className={styles.catChips}>
            {sejour.categories.map((cat) => (
              <div key={cat.id} className={styles.catChip}>
                <div>
                  <div className={styles.catChipName}>{cat.nom}</div>
                  <div className={styles.catChipPrice}>
                    {cat.prixNuit.toFixed(2)} €/pers/nuit · prévu {cat.nbPrevues}
                  </div>
                </div>
                <div className={styles.catChipVal}>
                  {cat.nbReelles !== null && cat.nbReelles !== undefined
                    ? `${cat.nbReelles} réels`
                    : '— saisi'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actionsGrid}>
          <button
            className={`${styles.actionBtn} ${styles.actionBtnFull}`}
            onClick={() => onNavigate('personnes')}
          >
            <div className={styles.actionIcon}>✏️</div>
            <div className={styles.actionLabel}>Saisir le séjour</div>
            <div className={styles.actionSub}>Personnes par catégorie + suppléments</div>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => onNavigate('recapitulatif')}
            disabled={!hasPersonnesSaisies}
          >
            <div className={styles.actionIcon}>📄</div>
            <div className={styles.actionLabel}>Voir facture</div>
            <div className={styles.actionSub}>
              {hasPersonnesSaisies ? 'Récapitulatif' : 'En attente'}
            </div>
          </button>
          <button
            className={styles.actionBtn}
            onClick={() => onNavigate('encaissement')}
            disabled={!hasPersonnesSaisies}
          >
            <div className={styles.actionIcon}>💳</div>
            <div className={styles.actionLabel}>Encaisser</div>
            <div className={styles.actionSub}>Chèque / virement</div>
          </button>
        </div>

        {/* Contact locataire */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Contact locataire</div>
          <div className={styles.contactRow}>
            <div>
              <div className={styles.contactName}>{sejour.nomLocataire}</div>
              <div className={styles.contactDetail}>
                {sejour.emailLocataire}
                {sejour.telephoneLocataire && ` · ${sejour.telephoneLocataire}`}
              </div>
            </div>
            {sejour.telephoneLocataire && (
              <a href={`tel:${sejour.telephoneLocataire}`} className={styles.telLink} aria-label="Appeler">
                📞
              </a>
            )}
          </div>
          {sejour.optionsPresaisies && (
            <>
              <div className={styles.divider} />
              <div>
                {sejour.optionsPresaisies.split(',').map((opt) => (
                  <span key={opt.trim()} className={styles.optionTag}>
                    {opt.trim()}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
