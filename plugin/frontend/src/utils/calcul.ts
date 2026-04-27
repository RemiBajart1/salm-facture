/**
 * Utilitaires de calcul — logique métier côté client (pour affichage temps réel).
 * Les calculs officiels restent côté backend.
 * Ces fonctions reproduisent les règles des specs-fonctionnelles.md §4.
 */

import type { SejourCategorie, CalculHebergementResult } from '../types'

/**
 * Calcule le montant hébergement en temps réel (affichage G2).
 * Règle : forfait minimum si total_reel < min_personnes_total.
 * Le forfait = min_personnes_total × prixForfaitReference (catégorie choisie par le resp. location).
 * §4.1 specs-fonctionnelles.md
 */
export function calculerHebergement(
  categories: SejourCategorie[],
  nbNuits: number,
  minPersonnesTotal: number,
  prixForfaitReference: number,
): CalculHebergementResult {
  const categoriesAvecReel = categories.filter(
    (c) => c.nbReelles !== null && c.nbReelles !== undefined,
  )

  if (categoriesAvecReel.length === 0) {
    return {
      montantTotal: 0,
      forfaitApplique: false,
      totalReelParNuit: 0,
      minPersonnesTotal,
      details: [],
    }
  }

  let montantTotal = 0
  let forfaitApplique = false
  const totalReelParNuit = categoriesAvecReel.reduce(
    (sum, c) => sum + (c.nbReelles ?? 0),
    0,
  )

  const details: CalculHebergementResult['details'] = []

  for (let nuit = 1; nuit <= nbNuits; nuit++) {
    const montantReel = categoriesAvecReel.reduce(
      (sum, c) => sum + (c.nbReelles ?? 0) * c.prixNuit,
      0,
    )
    const totalReel = totalReelParNuit

    let montantFacture: number
    let forfaitCetteNuit = false

    if (totalReel >= minPersonnesTotal) {
      montantFacture = montantReel
    } else {
      // Forfait : min_personnes_total × prix de la catégorie de référence
      montantFacture = minPersonnesTotal * prixForfaitReference
      forfaitCetteNuit = true
      forfaitApplique = true
    }

    montantTotal += montantFacture
    details.push({
      nuit,
      montantReel,
      totalReel,
      montantFacture,
      forfait: forfaitCetteNuit,
    })
  }

  return { montantTotal, forfaitApplique, totalReelParNuit, minPersonnesTotal, details }
}

/**
 * Calcule la taxe de séjour adultes.
 * §4.3 : nb_adultes × nb_nuits × taxe_adulte_nuit (défaut 0,88 €)
 */
export function calculerTaxeSejour(
  nbAdultes: number,
  nbNuits: number,
  tauxAdulteNuit = 0.88,
): number {
  return nbAdultes * nbNuits * tauxAdulteNuit
}

/**
 * Calcule la taxe de séjour enfants.
 * §4.3 extension : nb_enfants × nb_nuits × taxe_enfant_nuit (défaut 0 €)
 */
export function calculerTaxeSejourEnfants(
  nbEnfants: number,
  nbNuits: number,
  tauxEnfantNuit = 0,
): number {
  return nbEnfants * nbNuits * tauxEnfantNuit
}

/**
 * Calcule le forfait énergie.
 * §4.2 : min(nb_nuits, energie_nb_nuits) × energie_prix_nuit (défaut 2 × 80 €)
 */
export function calculerEnergie(
  nbNuits: number,
  energieNbNuits = 2,
  energiePrixNuit = 80,
): number {
  return Math.min(nbNuits, energieNbNuits) * energiePrixNuit
}

/** Formate un montant en euros avec 2 décimales */
export function formatEuros(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(montant)
}
