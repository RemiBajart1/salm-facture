import { useState, useEffect, useMemo } from 'react'
import styles from './Gardien.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { adminApi, sejourApi } from '../../services/api'
import type { ConfigItem } from '../../types'
import type { GardienStep } from '../../pages/GardienPage'
import { useCurrentSejour } from '../../hooks/useSejour'
import { formatEuros } from '../../utils/calcul'

interface SaisieSupplementsProps {
  onNavigate: (step: GardienStep) => void
}

interface LigneLibre {
  description: string
  montant: string
}

/** G3 — Saisie des suppléments (catalogue + saisie libre) */
export function SaisieSupplements({ onNavigate }: SaisieSupplementsProps) {
  const { sejour } = useCurrentSejour()
  const [items, setItems] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [quantites, setQuantites] = useState<Record<string, number>>({})
  const [dejaMembreIds, setDejaMembreIds] = useState<Set<string>>(new Set())
  const [lignesLibres, setLignesLibres] = useState<LigneLibre[]>([
    { description: '', montant: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!sejour) return
    Promise.all([
      adminApi.getItems(),
      sejourApi.getLignes(sejour.id),
    ])
      .then(([data, existingLignes]) => {
        const actifs = data.filter((i) => i.actif)
        setItems(actifs)

        const initial: Record<string, number> = {}
        actifs.filter((i) => !i.obligatoire).forEach((i) => { initial[i.id] = 0 })
        setQuantites(initial)

        // Détecter l'état "déjà membre" depuis les lignes existantes
        const dejaM = new Set<string>()
        actifs.filter((i) => i.obligatoire).forEach((item) => {
          const ligne = existingLignes.find((l) => l.configItemId === item.id)
          if (ligne && ligne.quantite === 0) dejaM.add(item.id)
        })
        setDejaMembreIds(dejaM)
      })
      .catch((err) => {
        console.error('Erreur chargement items:', err)
        setLoadError('Impossible de charger les suppléments')
      })
      .finally(() => setLoading(false))
  }, [sejour])

  const adhesionItems = useMemo(() => items.filter((i) => i.obligatoire), [items])
  const regularItems  = useMemo(() => items.filter((i) => !i.obligatoire), [items])

  const groupedItems = useMemo(() =>
    regularItems.reduce<Record<string, ConfigItem[]>>((acc, item) => {
      const cat = item.categorie
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {}),
  [regularItems])

  const categoryLabels: Record<string, string> = {
    CASSE: 'Casse & dégradations',
    LOCATION: 'Locations & options',
    SERVICE: 'Services',
    LINGE: 'Linge',
  }

  const handleQuantite = (itemId: string, delta: number) => {
    setQuantites((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta),
    }))
  }

  const toggleDejaM = (itemId: string) => {
    setDejaMembreIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const handleAddLigneLibre = () => {
    setLignesLibres((prev) => [...prev, { description: '', montant: '' }])
  }

  const handleLigneLibreChange = (idx: number, field: 'description' | 'montant', value: string) => {
    setLignesLibres((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)),
    )
  }

  const handleSubmit = async () => {
    if (!sejour) return
    setSaving(true)
    setSaveError(null)
    try {
      const promises: Promise<unknown>[] = []

      // Suppléments catalogue (qty > 0 uniquement)
      regularItems
        .filter((item) => (quantites[item.id] ?? 0) > 0)
        .forEach((item) =>
          promises.push(
            sejourApi.addSupplement(sejour.id, {
              configItemId: item.id,
              designation: item.designation,
              quantite: quantites[item.id],
              prixUnitaire: item.prixUnitaire,
            }),
          ),
        )

      // Items obligatoires — toujours soumis (qty=0 si déjà membre)
      adhesionItems.forEach((item) => {
        const estDejaM = dejaMembreIds.has(item.id)
        promises.push(
          sejourApi.addSupplement(sejour.id, {
            configItemId: item.id,
            designation: item.designation,
            quantite: estDejaM ? 0 : 1,
            prixUnitaire: item.prixUnitaire,
          }),
        )
      })

      // Saisies libres
      lignesLibres
        .filter((l) => l.description.trim() && l.montant.trim())
        .forEach((l) =>
          promises.push(
            sejourApi.addSupplement(sejour.id, {
              designation: l.description.trim(),
              quantite: 1,
              prixUnitaire: parseFloat(l.montant.replace(',', '.')),
            }),
          ),
        )

      await Promise.all(promises)
      onNavigate('recapitulatif')
    } catch (err) {
      console.error('Erreur sauvegarde suppléments:', err)
      setSaveError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Chargement des suppléments..." />
  if (loadError) return <ErrorBanner message={loadError} />

  return (
    <>
      <div className={styles.scrollArea}>
        {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

        {/* Items obligatoires (adhésion) */}
        {adhesionItems.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardTitle}>Adhésion obligatoire</div>
            {adhesionItems.map((item) => {
              const estDejaM = dejaMembreIds.has(item.id)
              return (
                <div key={item.id} className={styles.supplementItem}>
                  <div style={{ flex: 1 }}>
                    <div className={styles.supplName}>{item.designation}</div>
                    <div className={styles.supplPrice}>
                      {estDejaM ? (
                        <span style={{ color: 'var(--forest)' }}>Déjà membre — 0,00 €</span>
                      ) : (
                        <span>{formatEuros(item.prixUnitaire)} / séjour</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.payChip} ${estDejaM ? styles.payChipSelected : ''}`}
                    style={{ minWidth: 120, fontSize: 13 }}
                    onClick={() => toggleDejaM(item.id)}
                    aria-pressed={estDejaM}
                  >
                    {estDejaM ? '✓ Déjà membre' : 'Déjà membre ?'}
                  </button>
                </div>
              )
            })}
            <div
              className={styles.infoBox}
              style={{ marginTop: 8 }}
            >
              <span>ℹ️</span>
              <span>
                La carte de membre est obligatoire. Cocher "Déjà membre" si le locataire
                possède déjà une carte valide pour l'année civile en cours.
              </span>
            </div>
          </div>
        )}

        {/* Catalogue par catégorie */}
        {Object.entries(groupedItems).map(([cat, catItems]) => (
          <div key={cat} className={styles.card}>
            <div className={styles.cardTitle}>{categoryLabels[cat] ?? cat}</div>
            {catItems.map((item) => (
              <div key={item.id} className={styles.supplementItem}>
                <div>
                  <div className={styles.supplName}>{item.designation}</div>
                  <div className={styles.supplPrice}>
                    {formatEuros(item.prixUnitaire)} / {item.unite}
                  </div>
                </div>
                <div className={styles.supplControls}>
                  <button
                    type="button"
                    className={styles.supplBtn}
                    onClick={() => handleQuantite(item.id, -1)}
                    disabled={(quantites[item.id] ?? 0) === 0}
                    aria-label={`Diminuer ${item.designation}`}
                  >
                    −
                  </button>
                  <div
                    className={`${styles.supplCount} ${(quantites[item.id] ?? 0) === 0 ? styles.supplCountZero : ''}`}
                  >
                    {quantites[item.id] ?? 0}
                  </div>
                  <button
                    type="button"
                    className={styles.supplBtn}
                    onClick={() => handleQuantite(item.id, 1)}
                    aria-label={`Augmenter ${item.designation}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Saisies libres */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className={styles.warnBox}>
            <span>⚠️</span>
            <span>
              Saisie libre → marquée <strong>« À confirmer »</strong> par le trésorier ou resp.
            </span>
          </div>
          {lignesLibres.map((ligne, idx) => (
            <div key={idx} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`libre-desc-${idx}`}>
                  Description
                </label>
                <input
                  id={`libre-desc-${idx}`}
                  className={styles.formInput}
                  type="text"
                  value={ligne.description}
                  onChange={(e) => handleLigneLibreChange(idx, 'description', e.target.value)}
                  placeholder="Ex: Drap taché (1)"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`libre-montant-${idx}`}>
                  Montant estimé (€)
                </label>
                <input
                  id={`libre-montant-${idx}`}
                  className={styles.formInput}
                  type="text"
                  inputMode="decimal"
                  value={ligne.montant}
                  onChange={(e) => handleLigneLibreChange(idx, 'montant', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>
          ))}
          <button type="button" className={styles.libreBtn} onClick={handleAddLigneLibre}>
            ＋ Ajouter un autre élément
          </button>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Suivant — Récapitulatif →'}
        </button>
      </div>
    </>
  )
}
