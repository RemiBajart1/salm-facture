import { defineConfig, devices } from '@playwright/test'

/**
 * Configuration Playwright pour les tests E2E LocaGest
 *
 * À exécuter avec le backend et frontend lancés :
 * - Backend : http://localhost:8080 (./gradlew runLocal)
 * - Frontend : http://localhost:5173 (npm run dev)
 *
 * Ou lancer les deux automatiquement avec ./dev-full.sh à la racine du projet
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: './playwright-report' }],
    ['junit', { outputFile: './test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Le test ne démarre pas le serveur : on suppose qu'il tourne déjà (dev-full.sh) */
  /* ou les développeurs lancent manuellement backend et frontend */
})
