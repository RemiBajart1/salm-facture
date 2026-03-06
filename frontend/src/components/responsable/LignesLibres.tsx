import { useState, useEffect } from 'react'
import styles from './Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi } from '../../services/api'
import type { LigneSejour } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** RL2 — Saisies libres gardien en attente de validation */
export function LignesLibres() {
  const [lignes, setLignes] = useState<LigneSejour[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [montantsValides, setMontantsValides] = useState<Record<number, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<number | null>(null)

  const chargerLignes = () => {
    setLoading(true)
    adminApi
      .getLignesLibres()
      .then((data) => {
        setLignes(data)
        const initial: Record<number, string> = {}
        data.forEach((l) => { initial[l.id] = l.prixTotal.toFixed(2).replace('.', ',') })
        setMontantsValides(initial)
      })
      .catch((err) => {
        console.error('Erreur chargement lignes libres:', err)
        setError('Impossible de charger les saisies en attente')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { chargerLignes() }, [])

  const handlePromouvoir = async (ligne: LigneSejour) => {
    setProcessing(ligne.id)
    setActionError(null)
    try {
      await adminApi.promouvoirLigne(ligne.id, {
        categorieItem: 'CASSE',
        unite: 'unité',
        nomCatalogue: ligne.libelle,
      })
      setLignes((prev) => prev.filter((l) => l.id !== ligne.id))
    } catch (err) {
      console.error('Erreur promotion ligne:', err)
      setActionError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return <LoadingSpinner message="Chargement des saisies..." />
  if (error) return <ErrorBanner message={error} />

  return (
    <div className={styles.dcard}>
      <div className={styles.dcardTitle}>Saisies libres gardien — en attente</div>

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lignes.length === 0 && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: 16,
            }}
          >
            Aucun élément en attente.
          </div>
        )}

        {lignes.map((ligne) => (
          <div key={ligne.id} className={styles.ligneLibreItem}>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span className={styles.warnBadge}>⚠ À confirmer</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Séjour #{ligne.sejourId}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ligne.libelle}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Montant proposé par le gardien :{' '}
                <strong>{formatEuros(ligne.prixTotal)}</strong>
              </div>
            </div>

            <div className={styles.ligneLibreActions}>
              <div className={styles.dformGroup}>
                <div className={styles.dformLabel}>Montant validé</div>
                <input
                  className={styles.dformInput}
                  type="text"
                  value={montantsValides[ligne.id] ?? ''}
                  onChange={(e) =>
                    setMontantsValides((prev) => ({ ...prev, [ligne.id]: e.target.value }))
                  }
                  style={{ width: 90, padding: '8px 10px' }}
                  aria-label={`Montant validé pour ${ligne.libelle}`}
                />
              </div>
              <button
                type="button"
                className={styles.btnValider}
                onClick={() => handlePromouvoir(ligne)}
                disabled={processing === ligne.id}
              >
                {processing === ligne.id ? '...' : '✓ Valider'}
              </button>
              <button
                type="button"
                className={styles.btnRejeter}
                disabled={processing === ligne.id}
              >
                ✕ Rejeter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
