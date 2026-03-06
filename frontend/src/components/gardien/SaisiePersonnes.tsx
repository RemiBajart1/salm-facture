import { useState, useMemo, useCallback } from 'react'
import styles from './Gardien.module.css'
import { NumberInput } from '../common/NumberInput'
import { ErrorBanner } from '../common/ErrorBanner'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { useCurrentSejour } from '../../hooks/useSejour'
import { sejourApi } from '../../services/api'
import { calculerHebergement, calculerTaxeSejour, calculerEnergie, formatEuros } from '../../utils/calcul'
import type { GardienStep } from '../../pages/GardienPage'

interface SaisiePersonnesProps {
  onNavigate: (step: GardienStep) => void
}

/** G2 — Saisie des effectifs réels par catégorie + calcul temps réel */
export function SaisiePersonnes({ onNavigate }: SaisiePersonnesProps) {
  const { sejour, loading, error, refresh } = useCurrentSejour()
  const [effectifs, setEffectifs] = useState<Record<number, number>>({})
  const [nbAdultes, setNbAdultes] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Initialise les effectifs avec les valeurs prévues (si pas encore saisis)
  const getEffectif = useCallback(
    (catId: number, effectifPrevu: number) => {
      if (effectifs[catId] !== undefined) return effectifs[catId]
      return effectifPrevu
    },
    [effectifs],
  )

  const prixForfaitReference = useMemo(() => {
    if (!sejour) return 0
    const catRef = sejour.tarifForfaitCategorieId
      ? sejour.categories.find((c) => c.id === sejour.tarifForfaitCategorieId)
      : sejour.categories[0]
    return catRef?.prixNuitSnapshot ?? sejour.categories[0]?.prixNuitSnapshot ?? 0
  }, [sejour])

  const calcul = useMemo(() => {
    if (!sejour) return null
    const catsAvecReel = sejour.categories.map((c) => ({
      ...c,
      effectifReel: getEffectif(c.id, c.effectifPrevu),
    }))
    return calculerHebergement(catsAvecReel, sejour.nbNuits, sejour.minPersonnesTotal, prixForfaitReference)
  }, [sejour, getEffectif, prixForfaitReference])

  const taxeSejour = useMemo(() => {
    if (!sejour) return 0
    return calculerTaxeSejour(nbAdultes, sejour.nbNuits)
  }, [nbAdultes, sejour])

  const energie = useMemo(() => {
    if (!sejour) return 0
    return calculerEnergie(sejour.nbNuits)
  }, [sejour])

  if (loading) return <LoadingSpinner message="Chargement du séjour..." />
  if (error) return <ErrorBanner message={error} />
  if (!sejour) return null

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const categories = sejour.categories.map((c) => ({
        sejourCategorieId: c.id,
        effectifReel: getEffectif(c.id, c.effectifPrevu),
      }))
      await sejourApi.patchPersonnes(sejour.id, { categories, nbAdultes })
      refresh()
      onNavigate('supplements')
    } catch (err) {
      console.error('Erreur sauvegarde personnes:', err)
      setSaveError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  const catColors = ['var(--forest)', 'var(--teal)', 'var(--blue)', 'var(--warm)']

  return (
    <>
      <div className={styles.scrollArea}>
        <div className={styles.tealBox}>
          <span>ℹ️</span>
          <span>
            Saisissez le nombre réel par catégorie. Le minimum total est de{' '}
            <strong>{sejour.minPersonnesTotal} personnes</strong> facturées.
          </span>
        </div>

        {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

        {/* Catégories */}
        <div className={styles.categorieBlock}>
          {sejour.categories.map((cat, idx) => (
            <div key={cat.id} className={styles.catEntry}>
              <div
                className={styles.catHeader}
                style={{ background: catColors[idx % catColors.length] }}
              >
                <div>
                  <div className={styles.catHeaderName}>{cat.nomSnapshot}</div>
                  <div className={styles.catHeaderPrice}>
                    {formatEuros(cat.prixNuitSnapshot)} / personne / nuit
                  </div>
                </div>
              </div>
              <div className={styles.catBody}>
                <div className={styles.catPrevue}>
                  Prévu par le responsable : <strong>{cat.effectifPrevu} personnes</strong>
                </div>
                <div className={styles.formLabel}>Présents réels</div>
                <NumberInput
                  value={getEffectif(cat.id, cat.effectifPrevu)}
                  onChange={(v) => setEffectifs((prev) => ({ ...prev, [cat.id]: v }))}
                  min={0}
                  max={200}
                  aria-label={`Nombre de ${cat.nomSnapshot}`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Taxe de séjour */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Taxe de séjour</div>
          <div className={styles.formGroup}>
            <div className={styles.formLabel}>Dont adultes (+18 ans) · toutes catégories</div>
            <NumberInput
              value={nbAdultes}
              onChange={setNbAdultes}
              min={0}
              max={200}
              aria-label="Nombre d'adultes"
            />
          </div>
        </div>

        {/* Calcul automatique */}
        {calcul && (
          <div className={styles.calcCard}>
            <div className={styles.cardTitle}>Calcul automatique</div>

            {sejour.categories.map((cat) => {
              const eff = getEffectif(cat.id, cat.effectifPrevu)
              const montant = eff * cat.prixNuitSnapshot * sejour.nbNuits
              return (
                <div key={cat.id} className={styles.recapLine}>
                  <span className={styles.recapLbl}>
                    {cat.nomSnapshot} ({eff})
                  </span>
                  <span className={styles.recapVal}>
                    {eff} × {cat.prixNuitSnapshot} × {sejour.nbNuits} = {formatEuros(montant)}
                  </span>
                </div>
              )
            })}

            {calcul.forfaitApplique && (
              <>
                <div className={`${styles.recapLine} ${styles.recapLineForfait}`}>
                  <span className={styles.recapLbl}>
                    Total présents : {calcul.totalReelParNuit} &lt; min {calcul.minPersonnesTotal}
                  </span>
                </div>
                <div className={`${styles.recapLine} ${styles.recapLineForfait}`}>
                  <span className={styles.recapLbl}>
                    Forfait min. {calcul.minPersonnesTotal} × {formatEuros(prixForfaitReference)} × {sejour.nbNuits} nuits
                  </span>
                  <span className={styles.recapVal}>
                    {formatEuros(calcul.montantTotal - sejour.categories.reduce(
                      (s, c) => s + getEffectif(c.id, c.effectifPrevu) * c.prixNuitSnapshot * sejour.nbNuits,
                      0,
                    ))}
                  </span>
                </div>
              </>
            )}

            <div className={styles.recapLine}>
              <span className={styles.recapLbl}>
                Taxe séjour ({nbAdultes} × {sejour.nbNuits} × 0,88 €)
              </span>
              <span className={styles.recapVal}>{formatEuros(taxeSejour)}</span>
            </div>
            <div className={styles.recapLine}>
              <span className={styles.recapLbl}>
                Forfait énergies ({Math.min(sejour.nbNuits, 2)} × 80 €)
              </span>
              <span className={styles.recapVal}>{formatEuros(energie)}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.bottomBar}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Suivant — Suppléments →'}
        </button>
      </div>
    </>
  )
}
