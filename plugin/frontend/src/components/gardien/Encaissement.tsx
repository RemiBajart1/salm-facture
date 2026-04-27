import { useState, useEffect, useRef } from 'react'
import styles from './Gardien.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import { formatEuros } from '../../utils/calcul'
import type { ModePaiement } from '../../types'
import type { GardienStep } from '../../pages/GardienPage'
import { useCurrentSejour } from '../../hooks/useSejour'

interface EncaissementProps {
  onNavigate: (step: GardienStep) => void
}

/** G5 — Encaissement du paiement */
export function Encaissement({ onNavigate }: EncaissementProps) {
  const { sejour } = useCurrentSejour()
  const [montantTotal, setMontantTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ModePaiement>('CHEQUE')
  const [numeroCheque, setNumeroCheque] = useState('')
  const [banque, setBanque] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!sejour) return
    sejourApi
      .getFacture(sejour.id)
      .then((f) => setMontantTotal(f.montantTotal))
      .catch((err) => {
        console.error('Erreur chargement facture:', err)
        // Fallback : recalcul depuis les lignes
        sejourApi.getLignes(sejour.id).then((lignes) => {
          setMontantTotal(lignes.reduce((s, l) => s + l.montant, 0))
        }).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [sejour])

  const handleConfirmer = async () => {
    if (!sejour || montantTotal === null) return
    setSaving(true)
    setSaveError(null)
    try {
      await sejourApi.addPaiement(sejour.id, {
        montant: montantTotal,
        mode,
        numeroCheque: mode === 'CHEQUE' ? numeroCheque : undefined,
        banqueEmettrice: mode === 'CHEQUE' ? banque : undefined,
      })
      // Upload photo chèque si sélectionnée (non bloquant en cas d'échec)
      if (mode === 'CHEQUE' && photoFile) {
        try {
          const paiements = await sejourApi.getPaiements(sejour.id)
          const dernier = paiements[paiements.length - 1]
          if (dernier) {
            await sejourApi.uploadPhotoCheque(sejour.id, dernier.id, photoFile)
          }
        } catch (photoErr) {
          console.error('Upload photo chèque échoué (non bloquant):', photoErr)
        }
      }
      onNavigate('succes')
    } catch (err) {
      console.error('Erreur encaissement:', err)
      setSaveError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Chargement de la facture..." />

  return (
    <>
      <div className={styles.scrollArea}>
        {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

        {/* Montant total */}
        <div className={styles.totalMontant}>
          <div className={styles.totalMontantValue}>
            {montantTotal !== null ? formatEuros(montantTotal) : '—'}
          </div>
          <div className={styles.totalMontantLabel}>Montant total dû</div>
        </div>

        {/* Mode de paiement */}
        <div className={styles.cardTitle} style={{ marginBottom: 4 }}>
          Mode de paiement
        </div>
        <div className={styles.payMode}>
          <button
            type="button"
            className={`${styles.payChip} ${mode === 'CHEQUE' ? styles.payChipSelected : ''}`}
            onClick={() => setMode('CHEQUE')}
            aria-pressed={mode === 'CHEQUE'}
          >
            <div className={styles.payIcon}>📝</div>
            <div className={styles.payLabel}>Chèque</div>
          </button>
          <button
            type="button"
            className={`${styles.payChip} ${mode === 'VIREMENT' ? styles.payChipSelected : ''}`}
            onClick={() => setMode('VIREMENT')}
            aria-pressed={mode === 'VIREMENT'}
          >
            <div className={styles.payIcon}>🏦</div>
            <div className={styles.payLabel}>Virement</div>
          </button>
          <div className={`${styles.payChip} ${styles.payChipDisabled}`} aria-disabled="true">
            <div className={styles.payIcon}>💳</div>
            <div className={styles.payLabel}>Carte — bientôt</div>
          </div>
        </div>

        {/* Détails chèque */}
        {mode === 'CHEQUE' && (
          <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={styles.cardTitle}>Photo du chèque</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setPhotoFile(file)
              }}
              aria-label="Sélectionner la photo du chèque"
            />
            <button
              type="button"
              className={`${styles.photoArea} ${photoFile ? styles.photoAreaDone : ''}`}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Prendre une photo du chèque"
            >
              {photoFile ? (
                <>
                  <div style={{ fontSize: 32 }}>✅</div>
                  <div style={{ fontSize: 13, color: 'var(--forest)' }}>{photoFile.name}</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 32 }}>📷</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Appuyer pour prendre une photo
                  </div>
                </>
              )}
            </button>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="numero-cheque">
                N° du chèque
              </label>
              <input
                id="numero-cheque"
                className={styles.formInput}
                type="text"
                value={numeroCheque}
                onChange={(e) => setNumeroCheque(e.target.value)}
                placeholder="Ex: 7654321"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor="banque">
                Banque émettrice
              </label>
              <input
                id="banque"
                className={styles.formInput}
                type="text"
                value={banque}
                onChange={(e) => setBanque(e.target.value)}
                placeholder="Ex: Crédit Agricole"
              />
            </div>
          </div>
        )}

        {mode === 'VIREMENT' && (
          <div className={styles.infoBox}>
            <span>🏦</span>
            <span>
              Le locataire doit effectuer un virement. Confirmez la réception avant de valider.
            </span>
          </div>
        )}
      </div>

      <div className={styles.bottomBar}>
        <button
          className="btn-primary"
          onClick={handleConfirmer}
          disabled={saving || montantTotal === null}
        >
          {saving ? 'Confirmation...' : 'Confirmer l\'encaissement ✓'}
        </button>
      </div>
    </>
  )
}
