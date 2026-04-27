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

1. **Backend lancé** (port 8080) :
   ```bash
   cd backend
   ./gradlew runLocal
   ```

2. **Frontend lancé** (port 5173) :
   ```bash
   cd frontend
   npm run dev
   ```

3. **Base de données** (PostgreSQL sur Docker) :
   ```bash
   docker run -d --name locagest-postgres \
     -e POSTGRES_USER=locagest_app \
     -e POSTGRES_PASSWORD=password \
     -e POSTGRES_DB=locagest \
     -p 5432:5432 \
     postgres:16
   ```

OU utiliser le script tout-en-un :
```bash
./dev-full.sh
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

## Structure

### `specs/auth-and-navigation.spec.ts`

Test de l'authentification et navigation basique :
- Login Resp Location → dashboard responsable
- Login Gardien → dashboard gardien
- Validation de la navigation après authentification
- **Status** : ✅ PASSANT (12s)

### `specs/sejour-creation-full-workflow.spec.ts`

Test complet : Resp Location crée séjours + Gardien remplit données et paiement :

**Scénario 1 : Resp Location**
1. Crée un 1er séjour avec valeurs personnalisées
   - 35 personnes facturées
   - 25 personnes "Extérieurs" + 5 "Membres"
   - Week-end prochain
2. Crée un 2e séjour avec valeurs par défaut (semaine suivante)
3. Vérifie que les 2 séjours apparaissent dans la liste
4. Se déconnecte

**Scénario 2 : Gardien**
1. Se connecte
2. Saisit les personnes réelles du 1er séjour
3. Ajoute des suppléments :
   - Un élément du catalogue (existant)
   - Une ligne libre personnalisée ("Frais exceptionnels")
4. Enregistre un paiement par virement (500€)
5. Vérifie que la facture est prête

## Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Resp Location | `resp@test.fr` | `test` |
| Gardien | `gardien@test.fr` | `test` |
| Trésorier | `tresorier@test.fr` | `test` |

*(Ces comptes sont disponibles dans les mocks MSW du frontend pour le dev en mode mocké)*

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
# Backend
curl http://localhost:8080/api/v1/admin/tarifs

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

### ❌ "Login failed" (identifiants rejetés)

- Vérifier que les comptes existent dans le backend
- S'assurer que le JWT n'a pas expiré
- Vérifier que `COGNITO_DISABLED=true` ou `JWT_DISABLED=true` en local

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
