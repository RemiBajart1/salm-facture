import { useState, useEffect } from 'react'
import styles from './Gardien.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import { formatEuros } from '../../utils/calcul'
import type { LigneSejour, Facture } from '../../types'
import type { GardienStep } from '../../pages/GardienPage'
import { useSejourByIdOrCurrent } from '../../hooks/useSejour'

interface RecapitulatifProps {
  onNavigate: (step: GardienStep) => void
  onFactureGenerated?: (facture: Facture) => void
  sejourId?: string
}

/** G4 — Récapitulatif de la facture avant envoi */
export function Recapitulatif({ onNavigate, onFactureGenerated, sejourId }: RecapitulatifProps) {
  const { sejour } = useSejourByIdOrCurrent(sejourId)
  const [lignes, setLignes] = useState<LigneSejour[]>([])
  const [factureStatut, setFactureStatut] = useState<Facture['statut'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    if (!sejour) return
    Promise.all([
      sejourApi.getLignes(sejour.id),
      sejourApi.getFacture(sejour.id).catch(() => null),
    ])
      .then(([lignesData, factureData]) => {
        setLignes(lignesData)
        setFactureStatut(factureData?.statut ?? null)
      })
      .catch((err) => {
        console.error('Erreur chargement facture:', err)
        setError('Impossible de charger la facture')
      })
      .finally(() => setLoading(false))
  }, [sejour])

  if (loading) return <LoadingSpinner message="Calcul de la facture..." />
  if (error) return <ErrorBanner message={error} />

  const lignesHeberg = lignes.filter((l) => l.typeLigne === 'HEBERGEMENT')
  const lignesEnergie = lignes.filter((l) => l.typeLigne === 'ENERGIE')
  const lignesTaxe = lignes.filter((l) => l.typeLigne === 'TAXE_SEJOUR')
  const lignesSuppl = lignes.filter(
    (l) => l.typeLigne === 'SUPPLEMENT' || l.typeLigne === 'LIBRE',
  )

  const total = lignes.reduce((s, l) => s + l.montant, 0)

  const handleEnvoyer = async () => {
    if (!sejour) return
    setSending(true)
    setSendError(null)
    try {
      const facture = await sejourApi.generateFacture(sejour.id)
      onFactureGenerated?.(facture)
      onNavigate('succes')
    } catch (err) {
      console.error('Erreur génération facture:', err)
      setSendError('Une erreur est survenue lors de l\'envoi de la facture.')
    } finally {
      setSending(false)
    }
  }

  const handleSauvegarder = async () => {
    if (!sejour) return
    setSending(true)
    setSendError(null)
    try {
      await sejourApi.generateFacture(sejour.id)
      onNavigate('accueil')
    } catch (err) {
      console.error('Erreur sauvegarde facture:', err)
      setSendError('Une erreur est survenue.')
    } finally {
      setSending(false)
    }
  }

  const handleInvalider = async () => {
    if (!sejour) return
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir invalider cette facture ?\n\nLa saisie sera débloquée et une nouvelle facture (nouveau numéro) devra être générée.',
    )
    if (!confirmed) return
    setSending(true)
    setSendError(null)
    try {
      await sejourApi.invaliderFacture(sejour.id)
      onNavigate('personnes')
    } catch (err) {
      console.error('Erreur invalidation facture:', err)
      setSendError("Une erreur est survenue lors de l'invalidation.")
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className={styles.scrollArea}>
        {sendError && <ErrorBanner message={sendError} onDismiss={() => setSendError(null)} />}

        {/* Hébergement + énergies + taxe */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Hébergement</div>
          {[...lignesHeberg, ...lignesEnergie, ...lignesTaxe].map((ligne) => (
            <div key={ligne.id} className={styles.recapLine}>
              <span className={styles.recapLbl}>{ligne.designation}</span>
              <span className={styles.recapVal}>{formatEuros(ligne.montant)}</span>
            </div>
          ))}
        </div>

        {/* Suppléments */}
        {lignesSuppl.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Suppléments</div>
            {lignesSuppl.map((ligne) => (
              <div key={ligne.id} className={styles.recapLine}>
                <span
                  className={styles.recapLbl}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {ligne.quantite > 1 ? `${ligne.quantite} × ` : ''}{ligne.designation}
                  {ligne.statut === 'A_CONFIRMER' && (
                    <span className={styles.warnBadge}>⚠ À confirmer</span>
                  )}
                </span>
                <span className={styles.recapVal}>{formatEuros(ligne.montant)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className={styles.calcCard}>
          <div className={`${styles.recapLine} ${styles.recapLineTotal}`}>
            <span>TOTAL DÛ</span>
            <span>{formatEuros(total)}</span>
          </div>
        </div>

        {sejour?.emailLocataire && (
          <div className={styles.infoBox}>
            <span>📬</span>
            <span>
              Facture envoyée à <strong>{sejour.emailLocataire}</strong> après validation.
            </span>
          </div>
        )}
      </div>

      <div className={styles.bottomBar}>
        {factureStatut === 'EMISE' || factureStatut === 'PAYEE' ? (
          <>
            <div className={styles.infoBox} style={{ margin: 0 }}>
              <span>🔒</span>
              <span>
                Facture <strong>{factureStatut === 'PAYEE' ? 'payée' : 'déjà envoyée'}</strong> — aucune modification possible.
              </span>
            </div>
            {factureStatut === 'EMISE' && (
              <button
                className="btn-secondary"
                style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={handleInvalider}
                disabled={sending}
              >
                {sending ? 'Invalidation...' : 'Déclarer la facture invalide'}
              </button>
            )}
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={handleEnvoyer} disabled={sending}>
              {sending ? 'Envoi en cours...' : 'Valider et envoyer la facture'}
            </button>
            <button className="btn-secondary" onClick={handleSauvegarder} disabled={sending}>
              Enregistrer sans envoyer
            </button>
          </>
        )}
      </div>
    </>
  )
}
