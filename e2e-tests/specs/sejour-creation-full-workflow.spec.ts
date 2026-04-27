import { test, expect } from '@playwright/test'

/**
 * E2E — Création de séjour par le Resp Location + saisie par le Gardien
 *
 * L'authentification est assurée par WordPress (window.locagestConfig).
 * Ces tests supposent que le frontend est lancé avec le bon rôle injecté
 * dans main.tsx (ou via l'environnement WP).
 *
 * Scénario complet (à exécuter en deux sessions distinctes, ou avec
 * un backend WP réel permettant de changer de rôle entre les étapes) :
 *
 * Partie 1 — Resp Location :
 *   Crée 2 séjours (un avec valeurs personnalisées, un avec valeurs par défaut),
 *   vérifie qu'ils apparaissent dans la liste.
 *
 * Partie 2 — Gardien :
 *   Saisit les personnes réelles, ajoute un supplément existant et une ligne
 *   libre, puis valide le paiement par virement.
 *
 * Tarifs disponibles (mocks MSW) :
 *   - "Membre de l'union"  → 14 €/pers/nuit
 *   - "Groupe de jeunes"   → 12 €/pers/nuit
 *   - "Extérieur"          → 18 €/pers/nuit
 */

const BASE = 'http://localhost:5173'

// Dates flottantes – week-end prochain
function nextFriday(): string {
  const d = new Date()
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7))
  return d.toISOString().split('T')[0]
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

test.describe('Séjour : création par resp et saisie par gardien', () => {
  test('Resp crée 2 séjours (rôle resp_location requis dans main.tsx)', async ({ page }) => {
    test.setTimeout(60_000)

    const friday1 = nextFriday()
    const monday1 = addDays(friday1, 3)
    const friday2 = addDays(friday1, 7)
    const monday2 = addDays(friday1, 10)

    await page.goto(BASE)
    await page.waitForURL(`${BASE}/**responsable**`, { timeout: 10000 })
    await expect(page.locator('text=Responsable Location')).toBeVisible()

    // ──────────────────────────────────────────────────────────────
    // Créer le 1er séjour (valeurs personnalisées)
    // ──────────────────────────────────────────────────────────────
    await page.fill('#locataire-nom', 'Jean Dupont')
    await page.fill('#locataire-email', 'jean.dupont@ucjgsalm.org')
    await page.fill('#locataire-tel', '06 12 34 56 78')

    await page.fill('#date-arrivee', friday1)
    await page.fill('#date-depart', monday1)

    await page.check('input[aria-label="Activer Extérieur"]')
    await page.fill('input[aria-label="Effectif Extérieur"]', '25')

    await page.check('input[aria-label="Activer Membre de l\'union"]')
    await page.fill('input[aria-label="Effectif Membre de l\'union"]', '5')

    await page.fill('#min-personnes', '35')

    await page.click('button:has-text("Enregistrer le séjour")')
    await expect(page.locator('text=Séjour enregistré')).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────────────────────
    // Créer le 2e séjour (valeurs par défaut)
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Créer un autre séjour")')

    await page.fill('#locataire-nom', 'Marie Martin')
    await page.fill('#locataire-email', 'marie.martin@ucjgsalm.org')

    await page.fill('#date-arrivee', friday2)
    await page.fill('#date-depart', monday2)

    await page.click('button:has-text("Enregistrer le séjour")')
    await expect(page.locator('text=Séjour enregistré')).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────────────────────
    // Vérifier les séjours dans la liste
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Séjours")')
    await expect(page.locator('text=Jean Dupont')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Marie Martin')).toBeVisible({ timeout: 5_000 })
  })

  test('Gardien saisit les données et encaisse (rôle gardien requis dans main.tsx)', async ({ page }) => {
    test.setTimeout(60_000)

    await page.goto(BASE)
    await page.waitForURL(`${BASE}/**gardien**`, { timeout: 10000 })
    await expect(page.locator('text=En cours')).toBeVisible()

    // ──────────────────────────────────────────────────────────────
    // Saisir les personnes réelles
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Saisir le séjour")')
    await expect(page.locator('text=Personnes')).toBeVisible()

    const inputMembre = page.locator('input[aria-label*="Membre"]')
    const inputExterieur = page.locator('input[aria-label*="Extérieur"]')

    if (await inputMembre.isVisible()) await inputMembre.fill('5')
    if (await inputExterieur.isVisible()) await inputExterieur.fill('22')

    const inputAdultes = page.locator('input[aria-label*="adultes"]')
    if (await inputAdultes.isVisible()) await inputAdultes.fill('18')

    await page.click('button:has-text("Suivant — Suppléments")')
    await expect(page.locator('text=Suppléments')).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────────────────────
    // Supplément catalogue + ligne libre
    // ──────────────────────────────────────────────────────────────
    const btnAssiette = page.locator('button[aria-label="Augmenter Assiette cassée"]')
    if (await btnAssiette.isVisible()) {
      await btnAssiette.click()
      await btnAssiette.click()
    }

    await page.click('button:has-text("Ajouter un autre élément")')
    await page.fill('#libre-desc-0', 'Nettoyage supplémentaire')
    await page.fill('#libre-montant-0', '50')

    await page.click('button:has-text("Suivant — Récapitulatif")')
    await expect(page.locator('text=Récapitulatif')).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────────────────────
    // Encaissement par virement
    // ──────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/gardien`)
    await expect(page.locator('text=En cours')).toBeVisible()
    await page.click('button:has-text("Encaisser")')
    await expect(page.locator('text=Encaissement')).toBeVisible({ timeout: 5_000 })

    await page.click('button:has-text("Virement")')
    await page.click('button:has-text("Confirmer l\'encaissement")')
    await expect(page.locator('text=Succès')).toBeVisible({ timeout: 10_000 })
  })
})
