import { useState, useEffect } from 'react'
import styles from '../responsable/Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi } from '../../services/api'
import type { ConfigSiteEntry } from '../../types'

/** TR3 — Configuration du site (édition inline) */
export function ConfigSite() {
  const [config, setConfig] = useState<ConfigSiteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCle, setEditingCle] = useState<string | null>(null)
  const [editingValeur, setEditingValeur] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  useEffect(() => {
    adminApi
      .getConfig()
      .then(setConfig)
      .catch((err) => {
        console.error('Erreur chargement config:', err)
        setError('Impossible de charger la configuration')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleEdit = (entry: ConfigSiteEntry) => {
    setEditingCle(entry.cle)
    setEditingValeur(entry.valeur)
    setSaveError(null)
    setSaveSuccess(null)
  }

  const handleSave = async () => {
    if (!editingCle) return
    setSaving(true)
    setSaveError(null)
    try {
      await adminApi.patchConfig([{ cle: editingCle, valeur: editingValeur }])
      setConfig((prev) =>
        prev.map((e) => (e.cle === editingCle ? { ...e, valeur: editingValeur } : e)),
      )
      setSaveSuccess(`Paramètre "${editingCle}" mis à jour.`)
      setEditingCle(null)
    } catch (err) {
      console.error('Erreur mise à jour config:', err)
      setSaveError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Chargement de la configuration..." />
  if (error) return <ErrorBanner message={error} />

  return (
    <div className={styles.dcard}>
      <div className={styles.dcardTitle}>Configuration du site</div>

      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}
      {saveSuccess && (
        <div className={styles.infoBox} style={{ marginBottom: 12 }}>
          ✓ {saveSuccess}
        </div>
      )}

      <table className={styles.configTable}>
        <tbody>
          {config.map((entry) => (
            <tr key={entry.cle}>
              <td>
                {entry.description ?? entry.cle}
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {entry.cle}
                </div>
              </td>
              <td>
                {editingCle === entry.cle ? (
                  <input
                    className={styles.dformInput}
                    value={editingValeur}
                    onChange={(e) => setEditingValeur(e.target.value)}
                    style={{ padding: '6px 10px' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave()
                      if (e.key === 'Escape') setEditingCle(null)
                    }}
                    aria-label={`Valeur de ${entry.cle}`}
                  />
                ) : (
                  entry.valeur
                )}
              </td>
              <td>
                {editingCle === entry.cle ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className={styles.btnValider}
                      onClick={handleSave}
                      disabled={saving}
                      style={{ fontSize: 11 }}
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={styles.tblEdit}
                      onClick={() => setEditingCle(null)}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.tblEdit}
                    onClick={() => handleEdit(entry)}
                  >
                    ✎
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
