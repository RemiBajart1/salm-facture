import { useState, useEffect } from 'react'
import styles from './Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import type { Sejour } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** RL3 — Liste des séjours et factures */
export function SejoursFactures() {
  const [sejours, setSejours] = useState<Sejour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statutFiltre, setStatutFiltre] = useState('')

  useEffect(() => {
    setLoading(true)
    sejourApi
      .list(statutFiltre || undefined)
      .then((data) => setSejours(data.content ?? []))
      .catch((err) => {
        console.error('Erreur chargement séjours:', err)
        setError('Impossible de charger les séjours')
      })
      .finally(() => setLoading(false))
  }, [statutFiltre])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  const statutLabel: Record<string, string> = {
    PLANIFIE: 'Planifié',
    EN_COURS: 'En cours',
    TERMINE: 'Terminé',
    ANNULE: 'Annulé',
  }

  const statutColor: Record<string, string> = {
    PLANIFIE: 'var(--teal)',
    EN_COURS: 'var(--warm)',
    TERMINE: 'var(--forest)',
    ANNULE: 'var(--red)',
  }

  const totalEffectifPrevu = (s: Sejour) =>
    s.categories.reduce((sum, c) => sum + c.nbPrevues, 0)

  if (loading) return <LoadingSpinner message="Chargement des séjours..." />
  if (error) return <ErrorBanner message={error} />

  const stats = {
    totalSejours: sejours.length,
    enCours: sejours.filter((s) => s.statut === 'EN_COURS').length,
    planifies: sejours.filter((s) => s.statut === 'PLANIFIE').length,
  }

  return (
    <>
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.totalSejours}</div>
          <div className={styles.statLbl}>Séjours total</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.enCours}</div>
          <div className={styles.statLbl}>En cours</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>{stats.planifies}</div>
          <div className={styles.statLbl}>Planifiés</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statVal}>
            {formatEuros(
              sejours
                .filter((s) => s.statut === 'TERMINE')
                .reduce((sum, s) => {
                  return sum + s.categories.reduce((catSum, c) => {
                    const eff = c.nbReelles ?? c.nbPrevues
                    return catSum + eff * c.prixNuit * s.nbNuits
                  }, 0)
                }, 0),
            )}
          </div>
          <div className={styles.statLbl}>Chiffre d'affaires (estimé)</div>
        </div>
      </div>

      <div className={styles.dcard}>
        <div className={styles.dcardTitle}>
          Séjours &amp; factures
          <select
            className={styles.dformInput}
            style={{ width: 'auto', padding: '6px 12px', fontSize: 13 }}
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANIFIE">Planifié</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINE">Terminé</option>
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Locataire</th>
                <th>Dates</th>
                <th>Personnes</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sejours.map((sejour) => (
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
                  <td>{totalEffectifPrevu(sejour)} prévus</td>
                  <td>
                    <span
                      className={styles.actifBadge}
                      style={{
                        background: `${statutColor[sejour.statut]}18`,
                        color: statutColor[sejour.statut],
                      }}
                    >
                      {statutLabel[sejour.statut] ?? sejour.statut}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className={styles.tblEdit}>
                      📄 Voir
                    </button>
                    {sejour.statut === 'TERMINE' && (
                      <button
                        type="button"
                        className={styles.tblEdit}
                        onClick={() => sejourApi.renvoyerFacture(sejour.id).catch(console.error)}
                      >
                        📧 Renvoyer
                      </button>
                    )}
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
