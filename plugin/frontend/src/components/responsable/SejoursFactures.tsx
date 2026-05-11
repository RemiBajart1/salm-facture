import { useState, useEffect } from 'react'
import styles from './Desktop.module.css'
import modal from './SejourDetail.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { sejourApi } from '../../services/api'
import type { Sejour, Facture, Paiement } from '../../types'
import { formatEuros } from '../../utils/calcul'
import { useAuth } from '../../contexts/AuthContext'

/** RL3 — Liste des séjours et factures */
export function SejoursFactures() {
  const { user } = useAuth()
  const isTresorier = user?.role === 'tresorier'

  const [sejours, setSejours]           = useState<Sejour[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [statutFiltre, setStatutFiltre] = useState('')

  // Modale de détail
  const [detail, setDetail]             = useState<Sejour | null>(null)
  const [detailFacture, setDetailFacture] = useState<Facture | null | 'none'>('none')
  const [detailPaiements, setDetailPaiements] = useState<Paiement[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionMsg, setActionMsg]         = useState<string | null>(null)
  const [actionError, setActionError]     = useState<string | null>(null)

  // Mode édition séjour
  const [editing, setEditing] = useState(false)
  const [editObjet, setEditObjet] = useState('')
  const [editNomGroupe, setEditNomGroupe] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDateArrivee, setEditDateArrivee] = useState('')
  const [editDateDepart, setEditDateDepart] = useState('')
  const [editHeureArrivee, setEditHeureArrivee] = useState('')
  const [editHeureDepart, setEditHeureDepart] = useState('')
  const [editMinPersonnes, setEditMinPersonnes] = useState(40)
  const [editModePaiement, setEditModePaiement] = useState('')
  const [editOptions, setEditOptions] = useState('')
  const [editSaving, setEditSaving] = useState(false)

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
    setActionMsg(null)
    setActionError(null)
    setEditing(false)
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

  const startEdit = () => {
    if (!detail) return
    setEditObjet(detail.objetSejour ?? '')
    setEditNomGroupe(detail.nomGroupe ?? '')
    setEditNotes(detail.notesInternes ?? '')
    setEditDateArrivee(detail.dateArrivee ?? '')
    setEditDateDepart(detail.dateDepart ?? '')
    setEditHeureArrivee(detail.heureArriveePrevue ?? '')
    setEditHeureDepart(detail.heureDepartPrevu ?? '')
    setEditMinPersonnes(detail.minPersonnesTotal ?? 40)
    setEditModePaiement(detail.modePaiement ?? 'CHEQUE')
    setEditOptions(detail.optionsPresaisies ?? '')
    setEditing(true)
  }

  const handleSaveEdit = async () => {
    if (!detail) return
    setEditSaving(true)
    setActionError(null)
    try {
      const updated = await sejourApi.update(detail.id, {
        objetSejour: editObjet,
        nomGroupe: editNomGroupe,
        notesInternes: editNotes,
        dateArrivee: editDateArrivee || undefined,
        dateDepart: editDateDepart || undefined,
        heureArriveePrevue: editHeureArrivee,
        heureDepartPrevu: editHeureDepart,
        minPersonnesTotal: editMinPersonnes,
        modePaiement: editModePaiement as 'CHEQUE' | 'VIREMENT' || undefined,
        optionsPresaisies: editOptions,
      })
      setDetail(updated)
      setSejours((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
      setEditing(false)
      setActionMsg('Séjour mis à jour.')
    } catch (err) {
      console.error('Erreur mise à jour séjour:', err)
      setActionError('Une erreur est survenue.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleRegenerePdf = async () => {
    if (!detail) return
    setActionError(null)
    setActionMsg(null)
    try {
      const facture = await sejourApi.regenererFacture(detail.id)
      setDetailFacture(facture)
      setActionMsg('PDF régénéré avec succès.')
    } catch (err) {
      console.error('Erreur régénération PDF:', err)
      setActionError('Impossible de régénérer le PDF.')
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
                <th>Objet / Groupe</th>
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
                    <div style={{ fontSize: 13 }}>{sejour.objetSejour || '—'}</div>
                    {sejour.nomGroupe && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sejour.nomGroupe}</div>
                    )}
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
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {detail.statut === 'PLANIFIE' && !editing && (
                  <button type="button" className={styles.tblEdit} onClick={startEdit}>
                    ✎ Modifier
                  </button>
                )}
                <button type="button" className={modal.closeBtn} onClick={() => setDetail(null)}>✕</button>
              </div>
            </div>

            {actionMsg && (
              <div style={{ padding: '8px 16px', background: 'var(--forest)', color: 'white', fontSize: 13 }}>
                ✅ {actionMsg}
              </div>
            )}
            {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

            {detailLoading && <LoadingSpinner message="Chargement du détail..." />}

            {!detailLoading && (
              <>
                {/* Infos générales */}
                <div className={modal.section}>
                  <div className={modal.sectionTitle}>Informations générales</div>
                  {editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className={styles.formGrid}>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Objet du séjour *</label>
                          <input className={styles.dformInput} value={editObjet} onChange={(e) => setEditObjet(e.target.value)} placeholder="Ex: Anniversaire 40 ans" />
                        </div>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Nom du groupe</label>
                          <input className={styles.dformInput} value={editNomGroupe} onChange={(e) => setEditNomGroupe(e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Date arrivée</label>
                          <input className={styles.dformInput} type="date" value={editDateArrivee} onChange={(e) => setEditDateArrivee(e.target.value)} />
                        </div>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Date départ</label>
                          <input className={styles.dformInput} type="date" value={editDateDepart} onChange={(e) => setEditDateDepart(e.target.value)} />
                        </div>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Heure arrivée</label>
                          <input className={styles.dformInput} type="time" value={editHeureArrivee} onChange={(e) => setEditHeureArrivee(e.target.value)} />
                        </div>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Heure départ</label>
                          <input className={styles.dformInput} type="time" value={editHeureDepart} onChange={(e) => setEditHeureDepart(e.target.value)} />
                        </div>
                      </div>
                      <div className={styles.formGrid}>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Min. personnes</label>
                          <input className={styles.dformInput} type="number" min={1} value={editMinPersonnes} onChange={(e) => setEditMinPersonnes(parseInt(e.target.value, 10) || 40)} />
                        </div>
                        <div className={styles.dformGroup}>
                          <label className={styles.dformLabel}>Mode paiement</label>
                          <select className={styles.dformInput} value={editModePaiement} onChange={(e) => setEditModePaiement(e.target.value)}>
                            <option value="CHEQUE">Chèque</option>
                            <option value="VIREMENT">Virement</option>
                          </select>
                        </div>
                      </div>
                      <div className={styles.dformGroup}>
                        <label className={styles.dformLabel}>Options présaisies</label>
                        <textarea className={styles.dformInput} rows={2} value={editOptions} onChange={(e) => setEditOptions(e.target.value)} placeholder="Ex: Linge de maison inclus" />
                      </div>
                      <div className={styles.dformGroup}>
                        <label className={styles.dformLabel}>Notes internes</label>
                        <textarea className={styles.dformInput} rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '8px 16px', fontSize: 13 }}
                          onClick={handleSaveEdit}
                          disabled={editSaving || !editObjet}
                        >
                          {editSaving ? 'Enregistrement...' : '✓ Enregistrer'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '8px 16px', fontSize: 13 }}
                          onClick={() => setEditing(false)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                      {detail.objetSejour && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Objet</span>
                          <span>{detail.objetSejour}</span>
                        </>
                      )}
                      {detail.nomGroupe && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Groupe</span>
                          <span>{detail.nomGroupe}</span>
                        </>
                      )}
                      {detail.telephoneLocataire && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Téléphone</span>
                          <span>{detail.telephoneLocataire}</span>
                        </>
                      )}
                      {detail.adresseLocataire && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Adresse</span>
                          <span>{detail.adresseLocataire}</span>
                        </>
                      )}
                      {detail.heureArriveePrevue && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Arrivée prévue</span>
                          <span>{detail.heureArriveePrevue}</span>
                        </>
                      )}
                      {detail.heureDepartPrevu && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Départ prévu</span>
                          <span>{detail.heureDepartPrevu}</span>
                        </>
                      )}
                      {detail.heureArriveeReelle && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Arrivée réelle</span>
                          <span>{detail.heureArriveeReelle}</span>
                        </>
                      )}
                      {detail.heureDepartReel && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Départ réel</span>
                          <span>{detail.heureDepartReel}</span>
                        </>
                      )}
                      {detail.minPersonnesTotal > 0 && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Forfait min.</span>
                          <span>{detail.minPersonnesTotal} personnes</span>
                        </>
                      )}
                      {detail.modePaiement && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Mode paiement</span>
                          <span>{detail.modePaiement === 'CHEQUE' ? 'Chèque' : 'Virement'}</span>
                        </>
                      )}
                      {detail.notesInternes && (
                        <>
                          <span style={{ color: 'var(--text-muted)' }}>Notes</span>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{detail.notesInternes}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

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
                      {detailFacture.dateEcheance && (
                        <div className={modal.factureRow}>
                          <span>Échéance</span>
                          <span>{formatDateCourt(detailFacture.dateEcheance)}</span>
                        </div>
                      )}
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
                      {isTresorier && (
                        <div className={modal.factureRow}>
                          <span>Template</span>
                          <button
                            type="button"
                            className={styles.tblEdit}
                            onClick={handleRegenerePdf}
                            style={{ fontSize: 12 }}
                          >
                            🔄 Régénérer le PDF
                          </button>
                        </div>
                      )}
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
