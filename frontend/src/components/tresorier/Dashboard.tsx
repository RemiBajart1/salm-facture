import { useState, useEffect } from 'react'
import styles from '../responsable/Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import type { Sejour } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** TR4 — Tableau de bord trésorier */
export function Dashboard() {
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    sejourApi
      .list()
      .then((data) => setSejours(data.content ?? []))
      .catch((err) => {
        console.error('Erreur chargement séjours:', err)
        setError('Impossible de charger les données')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner message="Chargement du tableau de bord..." />
  if (error) return <ErrorBanner message={error} />

  const sejoursTermines = sejours.filter((s) => s.statut === 'TERMINE')
  const enCours = sejours.filter((s) => s.statut === 'EN_COURS')
  const planifies = sejours.filter((s) => s.statut === 'PLANIFIE')

  // Estimations
  const nbPersonnesFact = sejours.reduce(
    (sum, s) => sum + s.categories.reduce((cs, c) => cs + (c.nbReelles ?? c.nbPrevues), 0),
    0,
  )

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{sejours.length}</div>
          <div className={styles.statLbl}>Séjours totaux</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{enCours.length + planifies.length}</div>
          <div className={styles.statLbl}>En cours / planifiés</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{nbPersonnesFact}</div>
          <div className={styles.statLbl}>Personnes facturées (total)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{sejoursTermines.length}</div>
          <div className={styles.statLbl}>Séjours terminés</div>
        </div>
      </div>

      <div className={styles.dcard}>
        <div className={styles.dcardTitle}>Derniers séjours</div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Période</th>
                <th>Catégories</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {sejours.slice(0, 10).map((sejour) => (
                <tr key={sejour.id}>
                  <td>
                    <strong>{sejour.nomLocataire}</strong>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {sejour.emailLocataire}
                    </div>
                  </td>
                  <td>
                    {formatDate(sejour.dateArrivee)} – {formatDate(sejour.dateDepart)}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {sejour.nbNuits} nuit{sejour.nbNuits > 1 ? 's' : ''}
                    </div>
                  </td>
                  <td>
                    {sejour.categories.map((c) => (
                      <div key={c.id} style={{ fontSize: 12 }}>
                        {c.nom} :{' '}
                        {c.nbReelles ?? c.nbPrevues} ×{' '}
                        {formatEuros(c.prixNuit)}/nuit
                      </div>
                    ))}
                  </td>
                  <td>
                    <span
                      className={styles.actifBadge}
                      style={{
                        background:
                          sejour.statut === 'TERMINE'
                            ? 'var(--green-dim)'
                            : sejour.statut === 'EN_COURS'
                              ? 'var(--warm-dim)'
                              : 'var(--teal-dim)',
                        color:
                          sejour.statut === 'TERMINE'
                            ? 'var(--forest)'
                            : sejour.statut === 'EN_COURS'
                              ? 'var(--warm)'
                              : 'var(--teal)',
                      }}
                    >
                      {sejour.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
