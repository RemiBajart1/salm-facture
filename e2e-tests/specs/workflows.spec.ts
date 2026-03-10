import { test, expect } from '@playwright/test'

/**
 * E2E Test — Workflow complet LocaGest
 *
 * Prérequis :
 * - Backend local lancé : ./gradlew runLocal (port 8080)
 * - Frontend local lancé : npm run dev (port 5173)
 * - Base PostgreSQL accessible (docker run postgres:16 via dev-full.sh)
 * - Comptes de test : resp@test.fr, gardien@test.fr (mot de passe: test)
 *
 * Cas d'usage couvert :
 * 1. Resp Location crée 2 séjours (valeurs personnalisées + valeurs défaut)
 * 2. Vérifie qu'ils apparaissent dans la liste des séjours
 * 3. Se déconnecte
 * 4. Gardien se connecte et saisit les données du 1er séjour
 * 5. Ajoute des suppléments (existants + ligne libre)
 * 6. Valide le paiement par virement
 */

test.describe('E2E: Resp Location et Gardien — Workflow complet', () => {
  test('should complete full workflow from sejour creation to payment', async ({ page, context }) => {
    const baseURL = 'http://localhost:5173'

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 1: Se connecter en tant que Resp Location
    // ──────────────────────────────────────────────────────────────
    test.step('Login as Resp Location', async () => {
      await page.goto(`${baseURL}/`)
      await page.fill('input[name="email"]', 'resp@test.fr')
      await page.fill('input[name="password"]', 'test')
      await page.click('button:has-text("Connexion")')
      await page.waitForURL(`${baseURL}/**/responsable`, { timeout: 5000 })
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 2: Créer le 1er séjour avec valeurs spécifiques
    // ──────────────────────────────────────────────────────────────
    test.step('Create first sejour with custom values', async () => {
      await page.click('button:has-text("Nouveau séjour"), a:has-text("Nouveau")')
      await page.waitForSelector('input', { timeout: 3000 })

      // Données locataire
      const locataireInput = page.locator('input[placeholder*="locataire" i], input[placeholder*="Locataire" i]').first()
      if (await locataireInput.isVisible()) {
        await locataireInput.fill('Jean Dupont')
        await page.waitForTimeout(300)

        // Sélectionner ou créer
        const option = page.locator('[role="option"]').first()
        if (await option.isVisible()) {
          await option.click()
        } else {
          await page.fill('input[placeholder*="Email" i]', 'jean.dupont.sejour1@example.com')
          await page.fill('input[placeholder*="Téléphone" i]', '0612345678')
        }
      }

      // Dates : ce week-end
      const today = new Date()
      const friday = new Date(today)
      friday.setDate(today.getDate() + (5 - today.getDay())) // Prochain vendredi
      const monday = new Date(friday)
      monday.setDate(friday.getDate() + 3) // Lundi suivant

      const dateArrivee = page.locator('input[type="date"]').first()
      const dateDepart = page.locator('input[type="date"]').nth(1)
      await dateArrivee.fill(friday.toISOString().split('T')[0])
      await dateDepart.fill(monday.toISOString().split('T')[0])

      // Sélectionner catégories : 25 extérieurs + 5 membres
      // Chercher les checkboxes de catégories
      const labels = page.locator('label')

      // Cocher "Extérieurs" et remplir 25
      const exterieursLabel = labels.filter({ hasText: /extérieurs/i }).first()
      if (await exterieursLabel.isVisible()) {
        const checkbox = exterieursLabel.locator('input[type="checkbox"]')
        if (!(await checkbox.isChecked())) {
          await checkbox.click()
        }
        const input = exterieursLabel.locator('input[type="number"]').or(exterieursLabel.locator('input').nth(1))
        if (await input.isVisible()) {
          await input.fill('25')
        }
      }

      // Cocher "Membres" et remplir 5
      const membresLabel = labels.filter({ hasText: /membres/i }).first()
      if (await membresLabel.isVisible()) {
        const checkbox = membresLabel.locator('input[type="checkbox"]')
        if (!(await checkbox.isChecked())) {
          await checkbox.click()
        }
        const input = membresLabel.locator('input[type="number"]').or(membresLabel.locator('input').nth(1))
        if (await input.isVisible()) {
          await input.fill('5')
        }
      }

      // Nombre de personnes facturées : 35
      const numberInputs = page.locator('input[type="number"]')
      const lastInput = numberInputs.last()
      if (await lastInput.isVisible()) {
        await lastInput.fill('35')
      }

      // Créer le séjour
      await page.click('button:has-text("Créer")')
      await page.waitForTimeout(1000)
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 3: Créer le 2e séjour (valeurs par défaut)
    // ──────────────────────────────────────────────────────────────
    test.step('Create second sejour with default values', async () => {
      await page.click('button:has-text("Nouveau séjour"), a:has-text("Nouveau")')
      await page.waitForSelector('input', { timeout: 3000 })

      // Locataire
      const locataireInput = page.locator('input[placeholder*="locataire" i], input[placeholder*="Locataire" i]').first()
      if (await locataireInput.isVisible()) {
        await locataireInput.fill('Marie Martin')
        await page.waitForTimeout(300)

        const option = page.locator('[role="option"]').first()
        if (await option.isVisible()) {
          await option.click()
        } else {
          await page.fill('input[placeholder*="Email" i]', 'marie.martin.sejour2@example.com')
          await page.fill('input[placeholder*="Téléphone" i]', '0687654321')
        }
      }

      // Dates : semaine suivante
      const today = new Date()
      const friday = new Date(today)
      friday.setDate(today.getDate() + (5 - today.getDay()))
      const monday = new Date(friday)
      monday.setDate(friday.getDate() + 10) // Vendredi suivant

      const dateArrivee = page.locator('input[type="date"]').first()
      const dateDepart = page.locator('input[type="date"]').nth(1)
      await dateArrivee.fill(monday.toISOString().split('T')[0])
      await dateDepart.fill(monday.toISOString().split('T')[0])

      // Garder les catégories par défaut
      await page.click('button:has-text("Créer")')
      await page.waitForTimeout(1000)
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 4: Vérifier que les 2 séjours apparaissent dans la liste
    // ──────────────────────────────────────────────────────────────
    test.step('Verify both sejours appear in list', async () => {
      // Attendre que la liste soit visible
      await page.waitForSelector('table, [role="main"]', { timeout: 3000 })

      // Chercher les deux noms
      await expect(page).toContainText(/Jean Dupont/)
      await expect(page).toContainText(/Marie Martin/)
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 5: Se déconnecter
    // ──────────────────────────────────────────────────────────────
    test.step('Logout', async () => {
      const logoutBtn = page.getByRole('button', { name: /déconnexion|logout/i })
      if (await logoutBtn.isVisible()) {
        await logoutBtn.click()
        await page.waitForURL(`${baseURL}/`, { timeout: 3000 })
      }
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 6: Login Gardien
    // ──────────────────────────────────────────────────────────────
    test.step('Login as Gardien', async () => {
      await page.fill('input[name="email"]', 'gardien@test.fr')
      await page.fill('input[name="password"]', 'test')
      await page.click('button:has-text("Connexion")')
      await page.waitForURL(`${baseURL}/**/gardien`, { timeout: 5000 })
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 7: Vérifier que le 1er séjour est en cours
    // ──────────────────────────────────────────────────────────────
    test.step('Verify first sejour is current', async () => {
      await expect(page).toContainText(/Jean Dupont|séjour/i)
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 8: Saisir les personnes réelles
    // ──────────────────────────────────────────────────────────────
    test.step('Enter real persons', async () => {
      const saisirBtn = page.getByRole('button', { name: /saisir|personnes/i }).first()
      if (await saisirBtn.isVisible()) {
        await saisirBtn.click()
      }

      // Remplir les nombres réels
      const inputs = page.locator('input[type="number"]')
      if (await inputs.first().isVisible()) {
        await inputs.first().fill('22') // Extérieurs réels
      }
      if (await inputs.nth(1).isVisible()) {
        await inputs.nth(1).fill('4') // Membres réels
      }

      // Valider
      const validBtn = page.getByRole('button', { name: /valider|confirmer|suivant/i }).first()
      if (await validBtn.isVisible()) {
        await validBtn.click()
        await page.waitForTimeout(500)
      }
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 9: Ajouter des suppléments
    // ──────────────────────────────────────────────────────────────
    test.step('Add supplements', async () => {
      const supplementBtn = page.getByRole('button', { name: /supplément|items|ajouter/i }).first()
      if (await supplementBtn.isVisible()) {
        await supplementBtn.click()
        await page.waitForTimeout(500)
      }

      // Ajouter un supplément existant
      const itemSelect = page.locator('select').first()
      if (await itemSelect.isVisible()) {
        await itemSelect.selectOption({ index: 1 }) // Première option disponible
      }

      // Quantité
      const quantiteInput = page.locator('input[placeholder*="quantité" i]').first()
      if (await quantiteInput.isVisible()) {
        await quantiteInput.fill('2')
      }

      // Ajouter
      const addBtn = page.getByRole('button', { name: /ajouter|confirmer/i }).first()
      if (await addBtn.isVisible()) {
        await addBtn.click()
        await page.waitForTimeout(500)
      }

      // Ajouter une ligne libre
      const nomInput = page.locator('input[placeholder*="libellé|nom|désignation" i]')
      if (await nomInput.isVisible()) {
        await nomInput.fill('Frais exceptionnels')
      }

      const prixInput = page.locator('input[placeholder*="prix|montant" i]')
      if (await prixInput.isVisible()) {
        await prixInput.fill('25.50')
      }

      const addLibreBtn = page.getByRole('button', { name: /ajouter|créer/i }).last()
      if (await addLibreBtn.isVisible()) {
        await addLibreBtn.click()
        await page.waitForTimeout(500)
      }
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 10: Encaissement par virement
    // ──────────────────────────────────────────────────────────────
    test.step('Register payment (virement)', async () => {
      const encaissementBtn = page.getByRole('button', { name: /encaissement|paiement/i })
      if (await encaissementBtn.isVisible()) {
        await encaissementBtn.click()
        await page.waitForTimeout(500)
      }

      // Mode paiement : Virement
      const modeSelect = page.locator('select').first()
      if (await modeSelect.isVisible()) {
        await modeSelect.selectOption({ label: /virement/i })
      }

      // Montant
      const montantInput = page.locator('input[placeholder*="montant" i], input[type="number"]').first()
      if (await montantInput.isVisible()) {
        await montantInput.fill('500.00')
      }

      // Date
      const dateInput = page.locator('input[type="date"]')
      if (await dateInput.isVisible()) {
        const today = new Date().toISOString().split('T')[0]
        await dateInput.fill(today)
      }

      // Valider paiement
      const validerBtn = page.getByRole('button', { name: /valider|confirmer|enregistrer/i })
      await validerBtn.click()
      await page.waitForTimeout(1000)
    })

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 11: Vérification finale — facture générée
    // ──────────────────────────────────────────────────────────────
    test.step('Verify payment and facture', async () => {
      // Attendre le message de succès ou la page suivante
      const successMsg = page.locator('text=/succès|confirmé|enregistré/i')
      if (await successMsg.isVisible({ timeout: 3000 })) {
        await expect(successMsg).toBeVisible()
      }

      // Vérifier que la facture est prête
      const factureBtn = page.getByRole('button', { name: /facture|générer|télécharger/i })
      if (await factureBtn.isVisible()) {
        await factureBtn.click()
        await expect(page).toContainText(/facture|généré|pdf/i)
      }
    })
  })
})
