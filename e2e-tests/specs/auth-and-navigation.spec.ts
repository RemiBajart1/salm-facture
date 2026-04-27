import { test, expect } from '@playwright/test'

/**
 * Test E2E — Navigation basique LocaGest
 *
 * L'authentification est gérée par WordPress (injection de window.locagestConfig).
 * En mode dev standalone, main.tsx injecte un mock locagestConfig.
 * Il n'y a pas de formulaire de login — ces tests valident uniquement
 * que la bonne interface s'affiche en fonction du rôle injecté.
 *
 * Pour changer de rôle en dev, modifier `roles` dans plugin/frontend/src/main.tsx.
 */

test.describe('E2E: Navigation — Dashboard Gardien (rôle injecté par défaut)', () => {
  test('Le dashboard gardien affiche le séjour en cours', async ({ page }) => {
    test.setTimeout(30000)

    const baseURL = 'http://localhost:5173'

    await page.goto(baseURL)
    await page.waitForLoadState('domcontentloaded')

    // En mode dev, main.tsx injecte locagest_gardien par défaut → route /gardien
    await page.waitForURL(`${baseURL}/**gardien**`, { timeout: 10000 }).catch(() => {
      // En mode WP la route peut différer légèrement
    })

    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Le séjour mock doit apparaître (Famille Dupont est dans mockSejourCurrent)
    await expect(page.locator('text=Famille Dupont')).toBeVisible({ timeout: 10000 })
  })
})
