import { useState, useEffect } from 'react'
import styles from '../responsable/Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi, ApiError } from '../../services/api'
import type { ConfigItem } from '../../types'
import { formatEuros } from '../../utils/calcul'

/** TR2 — Gestion du catalogue d'items suppléments */
export function ItemsSupplements() {
  const [items, setItems] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [newNom, setNewNom] = useState('')
  const [newPrix, setNewPrix] = useState('')
  const [newUnite, setNewUnite] = useState<'UNITE' | 'SEJOUR'>('UNITE')
  const [newCategorie, setNewCategorie] = useState('CASSE')
  const [saving, setSaving] = useState(false)

  // Édition en ligne
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNom, setEditNom] = useState('')
  const [editPrix, setEditPrix] = useState('')
  const [editUnite, setEditUnite] = useState<'UNITE' | 'SEJOUR'>('UNITE')
  const [editCategorie, setEditCategorie] = useState('')

  useEffect(() => {
    adminApi
      .getItems()
      .then(setItems)
      .catch((err) => {
        console.error('Erreur chargement items:', err)
        setError('Impossible de charger les items')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!newNom || !newPrix) return
    setSaving(true)
    setActionError(null)
    try {
      const created = await adminApi.createItem({
        designation: newNom,
        prixUnitaire: parseFloat(newPrix.replace(',', '.')),
        unite: newUnite,
        categorie: newCategorie,
        actif: true,
      })
      setItems((prev) => [...prev, created])
      setNewNom('')
      setNewPrix('')
    } catch (err) {
      console.error('Erreur création item:', err)
      setActionError('Une erreur est survenue.')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (item: ConfigItem) => {
    setEditingId(item.id)
    setEditNom(item.designation)
    setEditPrix(item.prixUnitaire.toFixed(2).replace('.', ','))
    setEditUnite(item.unite)
    setEditCategorie(item.categorie)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setActionError(null)
    try {
      const updated = await adminApi.updateItem(editingId, {
        designation: editNom,
        prixUnitaire: parseFloat(editPrix.replace(',', '.')),
        unite: editUnite,
        categorie: editCategorie,
      })
      setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
      setEditingId(null)
    } catch (err) {
      console.error('Erreur mise à jour item:', err)
      setActionError('Une erreur est survenue.')
    }
  }

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setActionError(null)
    setConfirmDeactivateId(null)
    try {
      await adminApi.deleteItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConfirmDeactivateId(id)
      } else {
        console.error('Erreur suppression item:', err)
        setActionError('Une erreur est survenue.')
      }
    }
  }

  const handleDeactivate = async (id: string) => {
    setConfirmDeactivateId(null)
    setActionError(null)
    try {
      await adminApi.updateItem(id, { actif: false })
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, actif: false } : i)))
    } catch (err) {
      console.error('Erreur désactivation item:', err)
      setActionError('Une erreur est survenue.')
    }
  }

  const categoryLabels: Record<string, string> = {
    CASSE: 'Casse',
    LOCATION: 'Location',
    INTERVENTION: 'Intervention',
    ADHESION: 'Adhésion',
  }

  if (loading) return <LoadingSpinner message="Chargement des items..." />
  if (error) return <ErrorBanner message={error} />

  return (
    <div className={styles.dcard}>
      <div className={styles.dcardTitle}>Catalogue d'items facturables</div>

      {confirmDeactivateId && (
        <div className={styles.tealBox}>
          Cet item est utilisé par des séjours existants et ne peut pas être supprimé.{' '}
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
              <th>Nom</th>
              <th>Catégorie</th>
              <th>Prix unitaire</th>
              <th>Unité</th>
              <th>Statut</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {editingId === item.id ? (
                    <input
                      className={styles.dformInput}
                      value={editNom}
                      onChange={(e) => setEditNom(e.target.value)}
                      style={{ padding: '6px 10px' }}
                    />
                  ) : (
                    <strong>{item.designation}</strong>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {editingId === item.id ? (
                    <select
                      className={styles.dformInput}
                      value={editCategorie}
                      onChange={(e) => setEditCategorie(e.target.value)}
                      style={{ padding: '6px 10px' }}
                    >
                      <option value="CASSE">Casse</option>
                      <option value="LOCATION">Location</option>
                      <option value="INTERVENTION">Intervention</option>
                      <option value="ADHESION">Adhésion</option>
                    </select>
                  ) : (
                    categoryLabels[item.categorie] ?? item.categorie
                  )}
                </td>
                <td>
                  {editingId === item.id ? (
                    <input
                      className={styles.dformInput}
                      value={editPrix}
                      onChange={(e) => setEditPrix(e.target.value)}
                      style={{ width: 80, padding: '6px 10px' }}
                    />
                  ) : (
                    <span className={styles.priceCell}>{formatEuros(item.prixUnitaire)}</span>
                  )}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {editingId === item.id ? (
                    <select
                      className={styles.dformInput}
                      value={editUnite}
                      onChange={(e) => setEditUnite(e.target.value as 'UNITE' | 'SEJOUR')}
                      style={{ padding: '6px 10px' }}
                    >
                      <option value="UNITE">Unité</option>
                      <option value="SEJOUR">Séjour</option>
                    </select>
                  ) : (
                    item.unite === 'UNITE' ? 'Unité' : 'Séjour'
                  )}
                </td>
                <td>
                  <span className={`${styles.actifBadge} ${item.actif ? styles.actifBadgeOn : styles.actifBadgeOff}`}>
                    {item.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  {editingId === item.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className={styles.btnValider} onClick={handleSaveEdit}>✓</button>
                      <button type="button" className={styles.tblEdit} onClick={() => setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    item.actif && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!item.obligatoire && (
                          <button
                            type="button"
                            className={styles.tblEdit}
                            onClick={() => handleStartEdit(item)}
                          >
                            ✎ Modifier
                          </button>
                        )}
                        {!item.obligatoire && (
                          <button
                            type="button"
                            className={styles.tblDel}
                            onClick={() => handleDelete(item.id)}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${styles.tarifNewForm} ${styles.tarifNewFormItems}`}>
        <div>
          <div className={styles.tnfLabel}>Nom de l'item</div>
          <input
            className={styles.tnfInput}
            type="text"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            placeholder="Ex: Tasse cassée"
          />
        </div>
        <div>
          <div className={styles.tnfLabel}>Prix (€)</div>
          <input
            className={styles.tnfInput}
            type="text"
            value={newPrix}
            onChange={(e) => setNewPrix(e.target.value)}
            placeholder="3,00"
          />
        </div>
        <div>
          <div className={styles.tnfLabel}>Unité</div>
          <select
            className={styles.tnfInput}
            value={newUnite}
            onChange={(e) => setNewUnite(e.target.value as 'UNITE' | 'SEJOUR')}
          >
            <option value="UNITE">Unité</option>
            <option value="SEJOUR">Séjour</option>
          </select>
        </div>
        <div>
          <div className={styles.tnfLabel}>Catégorie</div>
          <select
            className={styles.tnfInput}
            value={newCategorie}
            onChange={(e) => setNewCategorie(e.target.value)}
          >
            <option value="CASSE">Casse</option>
            <option value="LOCATION">Location</option>
            <option value="INTERVENTION">Intervention</option>
          </select>
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
