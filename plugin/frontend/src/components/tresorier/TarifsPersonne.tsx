import { useState, useEffect } from 'react'
import styles from '../responsable/Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi, ApiError } from '../../services/api'
import type { TarifPersonne } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** TR1 — Gestion des tarifs par personne / nuit */
export function TarifsPersonne() {
  const [tarifs, setTarifs] = useState<TarifPersonne[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Nouveau tarif
  const [newNom, setNewNom] = useState('')
  const [newPrix, setNewPrix] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [saving, setSaving] = useState(false)

  // Édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editPrix, setEditPrix] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    adminApi
      .getTarifs()
      .then(setTarifs)
      .catch((err) => {
        console.error('Erreur chargement tarifs:', err)
        setError('Impossible de charger les tarifs')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newNom || !newPrix) return
    setSaving(true)
    setActionError(null)
    try {
      const created = await adminApi.createTarif({
        nom: newNom,
        prixNuit: parseFloat(newPrix.replace(',', '.')),
        description: newDesc || undefined,
        actif: true,
        ordre: tarifs.length + 1,
      })
      setTarifs((prev) => [...prev, created])
      setNewNom('')
      setNewPrix('')
      setNewDesc('')
    } catch (err) {
      console.error('Erreur création tarif:', err)
      setActionError('Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (t: TarifPersonne) => {
    setEditingId(t.id)
    setEditNom(t.nom)
    setEditPrix(t.prixNuit.toFixed(2).replace('.', ','))
    setEditDesc(t.description ?? '')
  }

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setActionError(null)
    setConfirmDeactivateId(null)
    try {
      await adminApi.deleteTarif(id)
      setTarifs((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConfirmDeactivateId(id)
      } else {
        console.error('Erreur suppression tarif:', err)
        setActionError('Une erreur est survenue.')
      }
    }
  }

  const handleDeactivate = async (id: string) => {
    setConfirmDeactivateId(null)
    setActionError(null)
    try {
      await adminApi.updateTarif(id, { actif: false })
      setTarifs((prev) => prev.map((t) => (t.id === id ? { ...t, actif: false } : t)))
    } catch (err) {
      console.error('Erreur désactivation tarif:', err)
      setActionError('Une erreur est survenue.')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setActionError(null)
    try {
      const updated = await adminApi.updateTarif(editingId, {
        nom: editNom,
        prixNuit: parseFloat(editPrix.replace(',', '.')),
        description: editDesc || undefined,
      })
      setTarifs((prev) => prev.map((t) => (t.id === editingId ? updated : t)))
      setEditingId(null)
    } catch (err) {
      console.error('Erreur mise à jour tarif:', err)
      setActionError('Une erreur est survenue.')
    }
  }

  if (loading) return <LoadingSpinner message="Chargement des tarifs..." />
  if (error) return <ErrorBanner message={error} />

  return (
    <div className={styles.dcard}>
      <div className={styles.dcardTitle}>
        Tarifs par personne / nuit
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'Source Sans 3, sans-serif' }}>
          Ordre d'affichage : par ordre de création
        </span>
      </div>

      <div className={styles.tealBox}>
        ⚠️ La modification d'un tarif n'affecte <strong>pas les séjours existants</strong> (les prix sont copiés au moment de la création du séjour).
      </div>

      {confirmDeactivateId && (
        <div className={styles.tealBox}>
          Ce tarif est utilisé par des séjours existants et ne peut pas être supprimé.{' '}
          <button
            type="button"
            className={styles.tblEdit}
            onClick={() => handleDeactivate(confirmDeactivateId)}
            style={{ marginLeft: 8 }}
          >
            Désactiver à la place
          </button>
          <button
            type="button"
            className={styles.tblEdit}
            onClick={() => setConfirmDeactivateId(null)}
            style={{ marginLeft: 4 }}
          >
            Annuler
          </button>
        </div>
      )}

      {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Nom de la catégorie</th>
              <th>Prix / pers / nuit</th>
              <th>Description</th>
              <th>Statut</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tarifs.map((tarif) => (
              <tr key={tarif.id}>
                <td><span className={styles.dragHandle}>⠿</span></td>
                <td>
                  {editingId === tarif.id ? (
                    <input
                      className={styles.dformInput}
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      style={{ padding: '6px 10px' }}
                    />
                  ) : (
                    <strong>{tarif.nom}</strong>
                  )}
                </td>
                <td>
                  {editingId === tarif.id ? (
                    <input
                      className={styles.dformInput}
                      value={editPrix}
                      onChange={(e) => setEditPrix(e.target.value)}
                      style={{ width: 80, padding: '6px 10px' }}
                    />
                  ) : (
                    <span className={styles.priceCell}>{formatEuros(tarif.prixNuit)}</span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {editingId === tarif.id ? (
                    <input
                      className={styles.dformInput}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      style={{ padding: '6px 10px' }}
                    />
                  ) : (
                    tarif.description ?? '—'
                  )}
                </td>
                <td>
                  <span className={`${styles.actifBadge} ${tarif.actif ? styles.actifBadgeOn : styles.actifBadgeOff}`}>
                    {tarif.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  {editingId === tarif.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={styles.btnValider} onClick={handleSaveEdit}>✓</button>
                      <button type="button" className={styles.tblEdit} onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className={styles.tblEdit}
                        onClick={() => handleStartEdit(tarif)}
                      >
                        ✎ Modifier
                      </button>
                      {tarif.actif && (
                        <button
                          type="button"
                          className={styles.tblDel}
                          onClick={() => handleDelete(tarif.id)}
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Formulaire ajout */}
      <div className={styles.tarifNewForm}>
        <div>
          <div className={styles.tnfLabel}>Nom de la catégorie</div>
          <input
            className={styles.tnfInput}
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            placeholder="Ex: Membres actifs"
          />
        </div>
        <div>
          <div className={styles.tnfLabel}>Prix / nuit (€)</div>
          <input
            className={styles.tnfInput}
            type="text"
            value={newPrix}
            onChange={(e) => setNewPrix(e.target.value)}
            placeholder="16,00"
          />
        </div>
        <div>
          <div className={styles.tnfLabel}>Description (optionnelle)</div>
          <input
            className={styles.tnfInput}
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Ex: Membres de l'union locale"
          />
        </div>
        <button
          type="button"
          className={styles.tnfBtn}
          onClick={handleCreate}
          disabled={saving || !newNom || !newPrix}
        >
          + Ajouter
        </button>
      </div>
    </div>
  )
}
