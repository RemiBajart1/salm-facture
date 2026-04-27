import { useState, useEffect } from 'react'
import styles from '../responsable/Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi } from '../../services/api'
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
  const [newUnite, setNewUnite] = useState<'UNITE' | 'SEJOUR' | 'INTERVENTION'>('UNITE')
  const [newCategorie, setNewCategorie] = useState('CASSE')
  const [saving, setSaving] = useState(false)

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

  const handleDelete = async (id: string) => {
    setActionError(null)
    try {
      await adminApi.deleteItem(id)
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, actif: false } : i)))
    } catch (err) {
      console.error('Erreur désactivation item:', err)
      setActionError('Une erreur est survenue.')
    }
  }

  const categoryLabels: Record<string, string> = {
    CASSE: 'Casse',
    LOCATION: 'Location',
    SERVICE: 'Service',
    LINGE: 'Linge',
  }

  if (loading) return <LoadingSpinner message="Chargement des items..." />
  if (error) return <ErrorBanner message={error} />

  return (
    <div className={styles.dcard}>
      <div className={styles.dcardTitle}>Catalogue d'items facturables</div>

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
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.designation}</strong></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {categoryLabels[item.categorie] ?? item.categorie}
                </td>
                <td><span className={styles.priceCell}>{formatEuros(item.prixUnitaire)}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.unite}</td>
                <td>
                  <span className={`${styles.actifBadge} ${item.actif ? styles.actifBadgeOn : styles.actifBadgeOff}`}>
                    {item.actif ? 'Actif' : 'Inactif'}
                  </span>
                </td>
                <td>
                  {item.actif && (
                    <button
                      type="button"
                      className={styles.tblDel}
                      onClick={() => handleDelete(item.id)}
                    >
                      Désactiver
                    </button>
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
            onChange={(e) => setNewUnite(e.target.value as 'UNITE' | 'SEJOUR' | 'INTERVENTION')}
          >
            <option value="UNITE">Unité</option>
            <option value="SEJOUR">Séjour</option>
            <option value="INTERVENTION">Intervention</option>
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
            <option value="SERVICE">Service</option>
            <option value="LINGE">Linge</option>
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
