import { test, expect } from '@playwright/test'

/**
 * E2E — Création de séjour par le Resp Location + saisie par le Gardien
 *
 * Scénario complet :
 * 1. Resp Location se connecte, crée 2 séjours (un avec valeurs personnalisées,
 *    un avec valeurs par défaut), vérifie qu'ils apparaissent dans la liste.
 * 2. Resp Location se déconnecte.
 * 3. Gardien se connecte, saisit les personnes réelles, ajoute un supplément
 *    existant et une ligne libre, puis valide le paiement par virement.
 *
 * Prérequis : backend sur :8080 + frontend sur :5173 (ou MSW actif en mode dev)
 *
 * Tarifs disponibles (backend) :
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
  test('Resp crée 2 séjours — Gardien saisit les données — paiement par virement', async ({ page }) => {
    test.setTimeout(120_000)

    const friday1 = nextFriday()
    const monday1 = addDays(friday1, 3)
    const friday2 = addDays(friday1, 7)
    const monday2 = addDays(friday1, 10)

    // ──────────────────────────────────────────────────────────────
    // Étape 1 : Login Resp Location
    // ──────────────────────────────────────────────────────────────
    await page.goto(BASE)
    await page.fill('#login-email', 'resp@test.fr')
    await page.fill('#login-password', 'test')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/responsable`)
    await expect(page.locator('text=Responsable Location')).toBeVisible()

    // ──────────────────────────────────────────────────────────────
    // Étape 2 : Créer le 1er séjour (valeurs personnalisées)
    // ──────────────────────────────────────────────────────────────
    // L'onglet "Nouveau séjour" est actif par défaut
    await page.fill('#locataire-nom', 'Jean Dupont')
    await page.fill('#locataire-email', 'jean.dupont@ucjgsalm.org')
    await page.fill('#locataire-tel', '06 12 34 56 78')

    await page.fill('#date-arrivee', friday1)
    await page.fill('#date-depart', monday1)

    // Cocher catégorie "Extérieur" + effectif 25
    await page.check('input[aria-label="Activer Extérieur"]')
    await page.fill('input[aria-label="Effectif Extérieur"]', '25')

    // Cocher catégorie "Membre de l'union" + effectif 5
    await page.check('input[aria-label="Activer Membre de l\'union"]')
    await page.fill('input[aria-label="Effectif Membre de l\'union"]', '5')

    // Minimum facturé : 35
    await page.fill('#min-personnes', '35')

    await page.click('button:has-text("Enregistrer le séjour")')
    await expect(page.locator('text=Séjour enregistré')).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────────────────────
    // Étape 3 : Créer le 2e séjour (valeurs par défaut)
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Créer un autre séjour")')

    await page.fill('#locataire-nom', 'Marie Martin')
    await page.fill('#locataire-email', 'marie.martin@ucjgsalm.org')

    await page.fill('#date-arrivee', friday2)
    await page.fill('#date-depart', monday2)

    // Catégories et minimum par défaut (pas de modification)
    await page.click('button:has-text("Enregistrer le séjour")')
    await expect(page.locator('text=Séjour enregistré')).toBeVisible({ timeout: 10_000 })

    // ──────────────────────────────────────────────────────────────
    // Étape 4 : Vérifier les séjours dans la liste
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Séjours")')
    await expect(page.locator('text=Jean Dupont')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Marie Martin')).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────────────────────
    // Étape 5 : Déconnexion
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Déconnexion")')
    await page.waitForURL(BASE)

    // ──────────────────────────────────────────────────────────────
    // Étape 6 : Login Gardien
    // ──────────────────────────────────────────────────────────────
    await page.fill('#login-email', 'gardien@test.fr')
    await page.fill('#login-password', 'test')
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE}/gardien`)
    await expect(page.locator('text=En cours')).toBeVisible()

    // ──────────────────────────────────────────────────────────────
    // Étape 7 : Saisir les personnes réelles
    // ──────────────────────────────────────────────────────────────
    await page.click('button:has-text("Saisir le séjour")')
    await expect(page.locator('text=Personnes')).toBeVisible()

    // Les catégories du séjour mock contiennent "Membre de l'union" et "Extérieur"
    // NumberInput expose un <input> via aria-label="Nombre de {cat.nomSnapshot}"
    const inputMembre = page.locator('input[aria-label*="Membre"]')
    const inputExterieur = page.locator('input[aria-label*="Extérieur"]')

    if (await inputMembre.isVisible()) await inputMembre.fill('5')
    if (await inputExterieur.isVisible()) await inputExterieur.fill('22')

    const inputAdultes = page.locator('input[aria-label*="adultes"]')
    if (await inputAdultes.isVisible()) await inputAdultes.fill('18')

    await page.click('button:has-text("Suivant — Suppléments")')
    await expect(page.locator('text=Suppléments')).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────────────────────
    // Étape 8 : Supplément catalogue + ligne libre
    // ──────────────────────────────────────────────────────────────
    // Incrémenter "Assiette cassée" deux fois (quantité = 2)
    const btnAssiette = page.locator('button[aria-label="Augmenter Assiette cassée"]')
    if (await btnAssiette.isVisible()) {
      await btnAssiette.click()
      await btnAssiette.click()
    }

    // Ajouter une ligne libre
    await page.click('button:has-text("Ajouter un autre élément")')
    await page.fill('#libre-desc-0', 'Nettoyage supplémentaire')
    await page.fill('#libre-montant-0', '50')

    await page.click('button:has-text("Suivant — Récapitulatif")')
    await expect(page.locator('text=Récapitulatif')).toBeVisible({ timeout: 5_000 })

    // ──────────────────────────────────────────────────────────────
    // Étape 9 : Encaissement par virement
    // ──────────────────────────────────────────────────────────────
    // Retour à l'accueil gardien pour cliquer sur le bouton "Encaisser"
    await page.goto(`${BASE}/gardien`)
    await expect(page.locator('text=En cours')).toBeVisible()
    await page.click('button:has-text("Encaisser")')
    await expect(page.locator('text=Encaissement')).toBeVisible({ timeout: 5_000 })

    await page.click('button:has-text("Virement")')
    await page.click('button:has-text("Confirmer l\'encaissement")')
    await expect(page.locator('text=Succès')).toBeVisible({ timeout: 10_000 })
  })
})
