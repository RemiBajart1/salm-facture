import { useState, useEffect } from 'react'
import styles from './Desktop.module.css'
import modal from './SejourDetail.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import type { Sejour, Facture, Paiement } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** RL3 — Liste des séjours et factures */
export function SejoursFactures() {
  const [sejours, setSejours]           = useState<Sejour[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [statutFiltre, setStatutFiltre] = useState('')

  // Modale de détail
  const [detail, setDetail]             = useState<Sejour | null>(null)
  const [detailFacture, setDetailFacture] = useState<Facture | null | 'none'>('none')
  const [detailPaiements, setDetailPaiements] = useState<Paiement[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

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

  const openDetail = async (sejour: Sejour) => {
    setDetail(sejour)
    setDetailFacture('none')
    setDetailPaiements([])
    setDetailLoading(true)
    try {
      const [fullSejour, paiements] = await Promise.all([
        sejourApi.getById(sejour.id),
        sejourApi.getPaiements(sejour.id),
      ])
      setDetail(fullSejour)
      setDetailPaiements(paiements)
    } catch { /* paiements absents acceptables */ }
    try {
      setDetailFacture(await sejourApi.getFacture(sejour.id))
    } catch {
      setDetailFacture(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  const formatDateCourt = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const statutLabel: Record<string, string> = {
    PLANIFIE: 'Planifié',
    EN_COURS: 'En cours',
    TERMINE:  'Terminé',
    ANNULE:   'Annulé',
  }

  const statutColor: Record<string, string> = {
    PLANIFIE: 'var(--teal)',
    EN_COURS: 'var(--warm)',
    TERMINE:  'var(--forest)',
    ANNULE:   'var(--red)',
  }

  const totalEffectifPrevu = (s: Sejour) =>
    s.categories.reduce((sum, c) => sum + c.nbPrevues, 0)

  if (loading) return <LoadingSpinner message="Chargement des séjours..." />
  if (error)   return <ErrorBanner message={error} />

  const stats = {
    totalSejours: sejours.length,
    enCours:   sejours.filter((s) => s.statut === 'EN_COURS').length,
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
                    <button
                      type="button"
                      className={styles.tblEdit}
                      onClick={() => openDetail(sejour)}
                    >
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

      {/* Modale de détail */}
      {detail && (
        <div className={modal.backdrop} onClick={() => setDetail(null)}>
          <div className={modal.panel} onClick={(e) => e.stopPropagation()}>
            <div className={modal.panelHeader}>
              <div>
                <div className={modal.panelTitle}>{detail.nomLocataire}</div>
                <div className={modal.panelSub}>
                  {formatDate(detail.dateArrivee)} – {formatDate(detail.dateDepart)} · {detail.nbNuits} nuit{detail.nbNuits > 1 ? 's' : ''}
                </div>
              </div>
              <button type="button" className={modal.closeBtn} onClick={() => setDetail(null)}>✕</button>
            </div>

            {detailLoading && <LoadingSpinner message="Chargement du détail..." />}

            {!detailLoading && (
              <>
                {/* Catégories */}
                <div className={modal.section}>
                  <div className={modal.sectionTitle}>Personnes par catégorie</div>
                  {detail.categories.map((c) => (
                    <div key={c.id} className={modal.catRow}>
                      <div>
                        <strong>{c.nom}</strong>
                        <span className={modal.catPrice}> · {formatEuros(c.prixNuit)}/nuit</span>
                      </div>
                      <div className={modal.catNbs}>
                        <span>Prévu : <strong>{c.nbPrevues}</strong></span>
                        {c.nbReelles != null && (
                          <span>Réel : <strong>{c.nbReelles}</strong></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Facture */}
                <div className={modal.section}>
                  <div className={modal.sectionTitle}>Facture</div>
                  {detailFacture === null && (
                    <div className={modal.emptyNote}>Pas encore générée</div>
                  )}
                  {detailFacture && detailFacture !== 'none' && (
                    <div className={modal.factureCard}>
                      <div className={modal.factureRow}>
                        <span>N°</span><strong>{detailFacture.numero}</strong>
                      </div>
                      <div className={modal.factureRow}>
                        <span>Statut</span>
                        <span className={modal.factureBadge} data-statut={detailFacture.statut}>
                          {detailFacture.statut}
                        </span>
                      </div>
                      <div className={modal.factureRow}>
                        <span>Total</span><strong>{formatEuros(detailFacture.montantTotal)}</strong>
                      </div>
                      {detailFacture.pdfUrl && (
                        <div className={modal.factureRow}>
                          <span>PDF</span>
                          <a href={detailFacture.pdfUrl} target="_blank" rel="noreferrer" className={modal.pdfLink}>
                            Télécharger
                          </a>
                        </div>
                      )}
                      <div className={modal.factureRow}>
                        <span>Email envoyé</span>
                        <span>{detailFacture.emailEnvoye ? '✅ Oui' : '❌ Non'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Paiements */}
                {detailPaiements.length > 0 && (
                  <div className={modal.section}>
                    <div className={modal.sectionTitle}>Paiements</div>
                    {detailPaiements.map((p) => (
                      <div key={p.id} className={modal.paiementRow}>
                        <div>
                          <strong>{formatEuros(p.montant)}</strong>
                          <span className={modal.paiementMode}>{p.mode}</span>
                        </div>
                        <div className={modal.paiementDate}>{formatDateCourt(p.dateEncaissement)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
