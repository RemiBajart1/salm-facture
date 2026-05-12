import { useState } from 'react'
import styles from './Gardien.module.css'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { ErrorBanner } from '../common/ErrorBanner'
import { useSejourList } from '../../hooks/useSejour'
import type { Sejour } from '../../types'

interface AccueilGardienProps {
  onSelectSejour: (sejourId: string) => void
}

export function AccueilGardien({ onSelectSejour }: AccueilGardienProps) {
  const [showAll, setShowAll] = useState(false)

  const { sejours, loading, error } = useSejourList({
    actifOnly: !showAll,
    sort: 'asc',
  })

  if (loading) return <LoadingSpinner message="Chargement des séjours..." />
  if (error) return <ErrorBanner message={error} />

  const today = new Date().toISOString().slice(0, 10)

  const isPast = (s: Sejour) => s.dateDepart < today
  const isCurrent = (s: Sejour) => s.dateArrivee <= today && s.dateDepart >= today
  const highlightedId = sejours.find((s) => isCurrent(s))?.id ?? sejours.find((s) => !isPast(s))?.id

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  const statutLabel: Record<string, string> = {
    PLANIFIE: 'Planifié',
    EN_COURS: 'En cours',
    TERMINE: 'Terminé',
    ANNULE: 'Annulé',
  }

  return (
    <div className={styles.scrollArea}>
      {/* Toggle filtre */}
      <div className={styles.filterRow}>
        <button
          type="button"
          className={`${styles.filterChip} ${!showAll ? styles.filterChipActive : ''}`}
          onClick={() => setShowAll(false)}
        >
          En cours / à venir
        </button>
        <button
          type="button"
          className={`${styles.filterChip} ${showAll ? styles.filterChipActive : ''}`}
          onClick={() => setShowAll(true)}
        >
          Tous
        </button>
      </div>

      {sejours.length === 0 && (
        <div className={styles.emptyState}>
          <p>Aucun séjour {showAll ? '' : 'en cours ou à venir'}.</p>
        </div>
      )}

      {/* Liste des séjours */}
      <div className={styles.sejourList}>
        {sejours.map((sejour) => {
          const past = isPast(sejour)
          const highlighted = sejour.id === highlightedId
          const cardClass = [
            styles.sejourListCard,
            past ? styles.sejourCardDimmed : '',
            highlighted ? styles.sejourCardHighlighted : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={sejour.id}
              type="button"
              className={cardClass}
              onClick={() => onSelectSejour(sejour.id)}
            >
              <div className={styles.sejourListHeader}>
                <div className={styles.sejourListDates}>
                  {formatDate(sejour.dateArrivee)} → {formatDate(sejour.dateDepart)}
                  <span className={styles.sejourListNuits}>
                    {sejour.nbNuits} nuit{sejour.nbNuits > 1 ? 's' : ''}
                  </span>
                </div>
                <span className={styles.sejourListBadge} data-statut={sejour.statut}>
                  {isCurrent(sejour) && '● '}{statutLabel[sejour.statut] ?? sejour.statut}
                </span>
              </div>
              <div className={styles.sejourListSecondary}>
                {sejour.nomGroupe || sejour.nomLocataire}
                {sejour.objetSejour && <> — {sejour.objetSejour}</>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
