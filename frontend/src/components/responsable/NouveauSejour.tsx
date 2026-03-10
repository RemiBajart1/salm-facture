import { useState, useEffect, useMemo } from 'react'
import styles from './Desktop.module.css'
import { ErrorBanner } from '../common/ErrorBanner'
import { adminApi, locataireApi, sejourApi } from '../../services/api'
import type { TarifPersonne, Locataire, ModePaiement } from '../../types'
import { formatEuros } from '../../utils/calcul'

interface CategorieSelectionnee {
  tarifId: string
  active: boolean
  nbPrevues: number
}

/** RL1 — Formulaire de création d'un nouveau séjour */
export function NouveauSejour() {
  const [tarifs, setTarifs] = useState<TarifPersonne[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Locataire
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Locataire[]>([])
  const [locataireNom, setLocataireNom] = useState('')
  const [locataireEmail, setLocataireEmail] = useState('')
  const [locataireTel, setLocataireTel] = useState('')
  const [locataireAdresse, setLocataireAdresse] = useState('')

  // Dates
  const [dateArrivee, setDateArrivee] = useState('')
  const [dateDepart, setDateDepart] = useState('')
  const [heureArrivee, setHeureArrivee] = useState('15:00')
  const [heureDepart, setHeureDepart] = useState('10:00')

  // Catégories
  const [categories, setCategories] = useState<CategorieSelectionnee[]>([])
  const [minPersonnes, setMinPersonnes] = useState(40)
  const [tarifForfaitCategorieId, setTarifForfaitCategorieId] = useState<string | null>(null)

  // Paiement
  const [modePaiement, setModePaiement] = useState<ModePaiement>('CHEQUE')
  const [dateLimitePaiement, setDateLimitePaiement] = useState('')
  const [options, setOptions] = useState('')

  // Submit
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    adminApi
      .getTarifs()
      .then((data) => {
        const actifs = data.filter((t) => t.actif)
        setTarifs(actifs)
        setCategories(
          actifs.map((t) => ({ tarifId: t.id, active: false, nbPrevues: 0 })),
        )
      })
      .catch((err) => {
        console.error('Erreur chargement tarifs:', err)
        setLoadError('Impossible de charger les tarifs')
      })
  }, [])

  // Autocomplete locataire
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      locataireApi
        .search(searchQuery)
        .then(setSearchResults)
        .catch(() => {})
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const nbNuits = useMemo(() => {
    if (!dateArrivee || !dateDepart) return 0
    const diff = new Date(dateDepart).getTime() - new Date(dateArrivee).getTime()
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
  }, [dateArrivee, dateDepart])

  const totalEffectif = categories
    .filter((c) => c.active)
    .reduce((s, c) => s + c.nbPrevues, 0)

  const estimHeberg = useMemo(() => {
    if (nbNuits === 0) return 0
    const montantReel = categories
      .filter((c) => c.active)
      .reduce((s, c) => {
        const tarif = tarifs.find((t) => t.id === c.tarifId)
        if (!tarif) return s
        return s + c.nbPrevues * tarif.prixNuit * nbNuits
      }, 0)
    // Application du forfait minimum
    if (totalEffectif < minPersonnes && tarifForfaitCategorieId) {
      const tarifRef = tarifs.find((t) => t.id === tarifForfaitCategorieId)
      if (tarifRef) return minPersonnes * tarifRef.prixNuit * nbNuits
    }
    return montantReel
  }, [categories, tarifs, nbNuits, totalEffectif, minPersonnes, tarifForfaitCategorieId])

  const handleSelectLocataire = (l: Locataire) => {
    setLocataireNom(l.nom)
    setLocataireEmail(l.email)
    setLocataireTel(l.telephone ?? '')
    setLocataireAdresse(l.adresse ?? '')
    setSearchQuery('')
    setSearchResults([])
  }

  const handleCategorieToggle = (idx: number) => {
    setCategories((prev) => {
      const next = prev.map((c, i) =>
        i === idx
          ? { ...c, active: !c.active, nbPrevues: !c.active ? c.nbPrevues : 0 }
          : c,
      )
      // Si la catégorie de référence est désactivée, on la réinitialise
      const activeTarifIds = next
        .filter((c) => c.active)
        .map((c) => c.tarifId)
      setTarifForfaitCategorieId((prev) =>
        prev && activeTarifIds.includes(prev) ? prev : activeTarifIds[0] ?? null,
      )
      return next
    })
  }

  const handleEffectifChange = (idx: number, value: string) => {
    const n = parseInt(value, 10)
    setCategories((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, nbPrevues: isNaN(n) ? 0 : n } : c)),
    )
  }

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const catsActives = categories
        .filter((c) => c.active && c.nbPrevues > 0)
        .map((c) => ({ tarifId: c.tarifId, nbPrevues: c.nbPrevues }))

      await sejourApi.create({
        nomLocataire: locataireNom,
        emailLocataire: locataireEmail,
        telephoneLocataire: locataireTel || undefined,
        adresseLocataire: locataireAdresse || undefined,
        dateArrivee,
        dateDepart,
        heureArriveePrevue: heureArrivee || undefined,
        heureDepartPrevu: heureDepart || undefined,
        minPersonnesTotal: minPersonnes,
        modePaiement,
        optionsPresaisies: options || undefined,
        categories: catsActives,
      })
      setSaveSuccess(true)
    } catch (err) {
      console.error('Erreur création séjour:', err)
      setSaveError('Une erreur est survenue lors de la création du séjour.')
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <ErrorBanner message={loadError} />

  if (saveSuccess) {
    return (
      <div className={styles.dcard} style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--forest)',
          }}
        >
          Séjour enregistré !
        </div>
        <button
          className={styles.tnfBtn}
          style={{ marginTop: 20 }}
          onClick={() => setSaveSuccess(false)}
        >
          Créer un autre séjour
        </button>
      </div>
    )
  }

  return (
    <>
      {saveError && <ErrorBanner message={saveError} onDismiss={() => setSaveError(null)} />}

      {/* Locataire & dates */}
      <div className={styles.dcard}>
        <div className={styles.dcardTitle}>Locataire &amp; dates</div>

        {/* Autocomplete */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="search-locataire">
              Rechercher un locataire existant
            </label>
            <input
              id="search-locataire"
              className={styles.dformInput}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom ou email..."
            />
          </div>
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                zIndex: 10,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {searchResults.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 14,
                  }}
                  onClick={() => handleSelectLocataire(l)}
                >
                  <strong>{l.nom}</strong> — {l.email}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.formGrid}>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="locataire-nom">Nom / organisation</label>
            <input id="locataire-nom" className={styles.dformInput} type="text" value={locataireNom} onChange={(e) => setLocataireNom(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="locataire-email">Email</label>
            <input id="locataire-email" className={styles.dformInput} type="email" value={locataireEmail} onChange={(e) => setLocataireEmail(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="locataire-tel">Téléphone</label>
            <input id="locataire-tel" className={styles.dformInput} type="tel" value={locataireTel} onChange={(e) => setLocataireTel(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="locataire-adresse">Adresse facturation</label>
            <input id="locataire-adresse" className={styles.dformInput} type="text" value={locataireAdresse} onChange={(e) => setLocataireAdresse(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="date-arrivee">Arrivée</label>
            <input id="date-arrivee" className={styles.dformInput} type="date" value={dateArrivee} onChange={(e) => setDateArrivee(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="date-depart">Départ</label>
            <input id="date-depart" className={styles.dformInput} type="date" value={dateDepart} onChange={(e) => setDateDepart(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="heure-arrivee">🕐 Heure arrivée prévue</label>
            <input id="heure-arrivee" className={styles.dformInput} type="time" value={heureArrivee} onChange={(e) => setHeureArrivee(e.target.value)} />
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="heure-depart">🕐 Heure départ prévu</label>
            <input id="heure-depart" className={styles.dformInput} type="time" value={heureDepart} onChange={(e) => setHeureDepart(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Catégories */}
      <div className={styles.dcard}>
        <div className={styles.dcardTitle}>
          Catégories de personnes &amp; tarifs
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'Source Sans 3, sans-serif' }}>
            (définis par le Trésorier)
          </span>
        </div>

        <div className={styles.tealBox}>
          ℹ️ Cochez les catégories qui s'appliquent à ce séjour et indiquez les effectifs prévus.
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>✓</th>
                <th>Catégorie</th>
                <th>Prix / pers / nuit</th>
                <th>Effectif prévu</th>
                <th>Sous-total estimé ({nbNuits} nuits)</th>
                <th title="Catégorie utilisée comme tarif de référence pour le forfait minimum">Réf. forfait</th>
              </tr>
            </thead>
            <tbody>
              {tarifs.map((tarif, idx) => {
                const cat = categories[idx]
                if (!cat) return null
                const sousTot = cat.active && nbNuits > 0
                  ? cat.nbPrevues * tarif.prixNuit * nbNuits
                  : null
                return (
                  <tr key={tarif.id} style={{ opacity: cat.active ? 1 : 0.5 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={cat.active}
                        onChange={() => handleCategorieToggle(idx)}
                        style={{ width: 16, height: 16, accentColor: 'var(--forest)' }}
                        aria-label={`Activer ${tarif.nom}`}
                      />
                    </td>
                    <td><strong>{tarif.nom}</strong></td>
                    <td><span className={styles.priceCell}>{formatEuros(tarif.prixNuit)}</span></td>
                    <td>
                      <input
                        className={styles.dformInput}
                        type="number"
                        min={0}
                        value={cat.nbPrevues}
                        onChange={(e) => handleEffectifChange(idx, e.target.value)}
                        disabled={!cat.active}
                        style={{ width: 100, padding: '7px 10px' }}
                        aria-label={`Effectif ${tarif.nom}`}
                      />
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--forest)' }}>
                      {sousTot !== null && cat.nbPrevues > 0
                        ? `${cat.nbPrevues} × ${tarif.prixNuit} × ${nbNuits} = ${formatEuros(sousTot)}`
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="radio"
                        name="tarifForfaitRef"
                        checked={tarifForfaitCategorieId === tarif.id}
                        onChange={() => setTarifForfaitCategorieId(tarif.id)}
                        disabled={!cat.active}
                        style={{ accentColor: 'var(--teal)', width: 16, height: 16 }}
                        aria-label={`Référence forfait ${tarif.nom}`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.summaryRow}>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="min-personnes">Minimum total facturé</label>
            <input
              id="min-personnes"
              className={styles.dformInput}
              type="number"
              min={1}
              value={minPersonnes}
              onChange={(e) => setMinPersonnes(parseInt(e.target.value, 10) || 40)}
            />
          </div>
          <div className={styles.summaryChip}>
            <div className={styles.summaryChipLabel}>Effectif total prévu</div>
            <div className={styles.summaryChipValue}>{totalEffectif}</div>
            <div className={styles.summaryChipSub}>
              {totalEffectif >= minPersonnes ? '≥ minimum ✓' : `< minimum (${minPersonnes})`}
            </div>
          </div>
          <div className={styles.summaryChip}>
            <div className={styles.summaryChipLabel}>Hébergement estimé</div>
            <div className={styles.summaryChipValue}>{formatEuros(estimHeberg)}</div>
            <div className={styles.summaryChipSub}>hors taxes &amp; énergies</div>
          </div>
        </div>
      </div>

      {/* Paiement */}
      <div className={styles.dcard}>
        <div className={styles.dcardTitle}>Conditions de paiement</div>
        <div className={`${styles.formGrid} ${styles.cols3}`}>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="mode-paiement">Mode de paiement</label>
            <select
              id="mode-paiement"
              className={styles.dformInput}
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value as ModePaiement)}
            >
              <option value="CHEQUE">Chèque</option>
              <option value="VIREMENT">Virement bancaire</option>
            </select>
          </div>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="date-limite">Date limite paiement</label>
            <input
              id="date-limite"
              className={styles.dformInput}
              type="date"
              value={dateLimitePaiement}
              onChange={(e) => setDateLimitePaiement(e.target.value)}
            />
          </div>
          <div className={styles.dformGroup}>
            <div className={styles.dformLabel}>IBAN (si virement)</div>
            <div className={styles.ibanBox}>
              <span className={styles.ibanVal}>FR76 3000…</span>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div className={styles.dformGroup}>
            <label className={styles.dformLabel} htmlFor="options">Options présaisies</label>
            <textarea
              id="options"
              className={styles.dformInput}
              rows={2}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Ex: Linge de maison inclus, animaux autorisés"
            />
          </div>
        </div>
        <div className={styles.formActions}>
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '10px 20px' }}
            onClick={() => {
              setLocataireNom('')
              setLocataireEmail('')
              setDateArrivee('')
              setDateDepart('')
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px' }}
            onClick={handleSubmit}
            disabled={saving || !locataireNom || !locataireEmail || !dateArrivee || !dateDepart}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer le séjour'}
          </button>
        </div>
      </div>
    </>
  )
}
