import { describe, it, expect } from 'vitest'
import {
  calculerHebergement,
  calculerTaxeSejour,
  calculerEnergie,
  formatEuros,
} from '../calcul'
import type { SejourCategorie } from '../../types'

/* ── Helpers ── */
const cat = (id: string, prix: number, nbReelles: number): SejourCategorie => ({
  id,
  nom: `Cat ${id}`,
  prixNuit: prix,
  nbPrevues: nbReelles,
  nbReelles,
})

/* ── Tests hébergement §4.1 ── */
describe('calculerHebergement', () => {
  it('1 nuit, 27 présents < 40 → forfait 40 × 18 = 720 €', () => {
    const cats = [cat('1', 18, 27)]
    const result = calculerHebergement(cats, 1, 40, 18)
    expect(result.forfaitApplique).toBe(true)
    expect(result.montantTotal).toBeCloseTo(720, 1)
  })

  it('2 nuits, 48 + 55 présents >= 40 chaque nuit → (48+55) × 18 = 1854 €', () => {
    const cats = [cat('1', 18, 48)]
    const result1 = calculerHebergement(cats, 1, 40, 18)
    const cats2 = [cat('1', 18, 55)]
    const result2 = calculerHebergement(cats2, 1, 40, 18)
    // 2 nuits distinctes, on additionne
    const total = result1.montantTotal + result2.montantTotal
    expect(total).toBeCloseTo(1854, 1)
  })

  it('1 nuit, 38 présents (25 × 14€ + 13 × 12€), référence 14€ → forfait 40 × 14 = 560 €', () => {
    const cats = [cat('1', 14, 25), cat('2', 12, 13)]
    const result = calculerHebergement(cats, 1, 40, 14)
    expect(result.forfaitApplique).toBe(true)
    expect(result.totalReelParNuit).toBe(38)
    expect(result.montantTotal).toBeCloseTo(560, 1)
  })

  it('pas de catégories avec effectif → montant 0', () => {
    const cats: SejourCategorie[] = [
      { id: '1', nom: 'Test', prixNuit: 18, nbPrevues: 10 },
    ]
    const result = calculerHebergement(cats, 1, 40, 18)
    expect(result.montantTotal).toBe(0)
    expect(result.forfaitApplique).toBe(false)
  })

  it('effectif >= min → pas de forfait', () => {
    const cats = [cat('1', 18, 42)]
    const result = calculerHebergement(cats, 1, 40, 18)
    expect(result.forfaitApplique).toBe(false)
    expect(result.montantTotal).toBeCloseTo(42 * 18, 1)
  })

  it('4 nuits, forfait appliqué sur chaque nuit', () => {
    const cats = [cat('1', 18, 10)]
    const result = calculerHebergement(cats, 4, 40, 18)
    expect(result.forfaitApplique).toBe(true)
    // 4 nuits × 40 × 18 = 2880
    expect(result.montantTotal).toBeCloseTo(4 * 40 * 18, 1)
    expect(result.details).toHaveLength(4)
    expect(result.details.every((d) => d.forfait)).toBe(true)
  })

  it('3 nuits : nuit 2 > 40, autres < 40 → forfait sur 2 nuits', () => {
    const cats1 = [cat('1', 18, 35)]
    const cats2 = [cat('1', 18, 42)]
    const cats3 = [cat('1', 18, 38)]
    const r1 = calculerHebergement(cats1, 1, 40, 18)
    const r2 = calculerHebergement(cats2, 1, 40, 18)
    const r3 = calculerHebergement(cats3, 1, 40, 18)
    expect(r1.forfaitApplique).toBe(true)
    expect(r2.forfaitApplique).toBe(false)
    expect(r3.forfaitApplique).toBe(true)
    // Total nuit 1 : 40 × 18 = 720, nuit 2 : 42 × 18 = 756, nuit 3 : 40 × 18 = 720
    expect(r1.montantTotal + r2.montantTotal + r3.montantTotal).toBeCloseTo(2196, 1)
  })

  it('1 nuit, mix tarifs : 15 non-adhérents (18€) + 8 membres (15€) = 23 < 40, référence membres (15€) → forfait 40 × 15 = 600 €', () => {
    const cats = [cat('1', 18, 15), cat('2', 15, 8)]
    const result = calculerHebergement(cats, 1, 40, 15)
    expect(result.forfaitApplique).toBe(true)
    expect(result.totalReelParNuit).toBe(23)
    expect(result.montantTotal).toBeCloseTo(600, 1)
  })
})

/* ── Tests taxe de séjour §4.3 ── */
describe('calculerTaxeSejour', () => {
  it('22 adultes × 7 nuits × 0.88 = 135.52 €', () => {
    expect(calculerTaxeSejour(22, 7)).toBeCloseTo(135.52, 2)
  })

  it('0 adultes → 0 €', () => {
    expect(calculerTaxeSejour(0, 7)).toBe(0)
  })

  it('taux personnalisé', () => {
    expect(calculerTaxeSejour(10, 3, 1.0)).toBe(30)
  })
})

/* ── Tests énergie §4.2 ── */
describe('calculerEnergie', () => {
  it('7 nuits → min(7, 2) × 80 = 160 €', () => {
    expect(calculerEnergie(7)).toBe(160)
  })

  it('1 nuit → min(1, 2) × 80 = 80 €', () => {
    expect(calculerEnergie(1)).toBe(80)
  })

  it('0 nuit → 0 €', () => {
    expect(calculerEnergie(0)).toBe(0)
  })
})

/* ── Tests formatEuros ── */
describe('formatEuros', () => {
  it('formate correctement un montant entier', () => {
    const result = formatEuros(720)
    expect(result).toContain('720')
    expect(result).toContain('€')
  })

  it('formate correctement un montant décimal', () => {
    const result = formatEuros(135.52)
    expect(result).toContain('135')
    expect(result).toContain('52')
  })
})
