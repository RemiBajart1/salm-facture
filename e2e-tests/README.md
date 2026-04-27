# Tests E2E — LocaGest

Tests end-to-end avec Playwright pour valider les workflows complets de LocaGest.

## Installation

```bash
cd e2e-tests
npm install
```

Cela installe Playwright et ses dépendances.

## Lancer les tests

### Prérequis

1. **Backend lancé** (WordPress + plugin) :
   Le plugin LocaGest doit être activé dans WordPress et accessible sur le port configuré.

2. **Frontend lancé** (port 5173) :
   ```bash
   cd plugin/frontend
   npm run dev
   ```

### Exécuter les tests

```bash
# Mode heading (voir le navigateur en action)
npm run test:headed

# Mode UI (interface interactive Playwright)
npm run test:ui

# Mode headless (rapide, sans affichage)
npm run test

# Debug mode (pause sur chaque action)
npm run test:debug
```

## Authentification

L'application tourne dans WordPress : l'authentification est assurée par WordPress lui-même via `window.locagestConfig` (injection de token JWT au chargement de la page WP admin).

En mode dev standalone (Vite seul), `main.tsx` injecte un mock de `locagestConfig` avec le rôle `locagest_gardien` par défaut. Pour tester un autre rôle, modifier la variable `roles` dans `main.tsx`.

Il n'y a **pas** de formulaire de login dans l'application : les tests E2E ne doivent pas chercher à se connecter via un formulaire.

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Resp Location | `resp@test.fr` | `test` |
| Gardien | `gardien@test.fr` | `test` |
| Trésorier | `tresorier@test.fr` | `test` |

*(Ces comptes sont disponibles dans les mocks MSW du frontend pour le dev en mode mocké)*

## Structure

### `specs/auth-and-navigation.spec.ts`

Test de navigation basique (sans login — géré par WP) :
- Resp Location arrive sur le dashboard responsable
- Gardien arrive sur le dashboard gardien
- **Status** : ✅ À adapter selon l'environnement de test

### `specs/sejour-creation-full-workflow.spec.ts`

Test complet : Resp Location crée séjours + Gardien remplit données et paiement :

**Scénario 1 : Resp Location**
1. Crée un 1er séjour avec valeurs personnalisées
   - 35 personnes facturées
   - 25 personnes "Extérieurs" + 5 "Membres"
   - Week-end prochain
2. Crée un 2e séjour avec valeurs par défaut (semaine suivante)
3. Vérifie que les 2 séjours apparaissent dans la liste

**Scénario 2 : Gardien**
1. Saisit les personnes réelles du 1er séjour
2. Ajoute des suppléments :
   - Un élément du catalogue (existant)
   - Une ligne libre personnalisée
3. Enregistre un paiement par virement
4. Vérifie que la facture est prête

## Rapports

Après chaque test, Playwright génère :
- **HTML Report** : `./playwright-report/index.html`
- **JUnit XML** : `./test-results/results.xml` (pour CI)
- **Videos** : vidéos des tests échoués (si activé)
- **Screenshots** : captures d'écran en cas d'erreur

Consulter le rapport HTML :
```bash
npx playwright show-report
```

## Fichiers de configuration

- **`playwright.config.ts`** : Configuration Playwright
  - Base URL : `http://localhost:5173`
  - Reporters : HTML + JUnit
  - Retries en CI
  - Screenshots/videos en cas d'erreur
  - Traces de debug activées

- **`package.json`** : Dépendances et scripts npm

## Dépannage

### ❌ "Connection refused" (backend ou frontend)

Vérifier que les serveurs tournent :
```bash
# Frontend
curl http://localhost:5173
```

### ❌ "Timeout waiting for selector"

Le test ne trouve pas un élément du DOM. Causes possibles :
- L'interface a changé (classname, placeholder, etc.)
- L'élément est caché ou rendu conditionnellement
- Le serveur est trop lent

Solution :
1. Lancer le test en mode UI : `npm run test:ui`
2. Déboguer visuellement avec Playwright Inspector
3. Mettre à jour les sélecteurs CSS

### ❌ Tests lents ou instables

- Augmenter les timeouts dans `playwright.config.ts`
- Utiliser `page.waitForLoadState('networkidle')` pour attendre que tout se charge
- Réduire le nombre de workers si saturé

## Intégration CI/CD

Les tests se lancent automatiquement en CI avec :
```bash
npm run test
```

Le rapport JUnit est généré dans `test-results/results.xml` pour l'intégration avec GitHub Actions, GitLab CI, etc.

## Maintenance

- **Mettre à jour les sélecteurs** si l'UI change
- **Ajouter des tests** pour les nouveaux workflows
- **Documenter** les cas spéciaux ou les dépendances
- **Exécuter avant chaque PR** pour valider les changements frontend/backend
