# API Reference — LocaGest

## Routes API

### Séjours (`/api/v1/sejours`)

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `GET` | `/api/v1/sejours/current` | tous | Séjour EN_COURS — accueil gardien |
| `GET` | `/api/v1/sejours?statut=PLANIFIE&page=0&size=20` | resp, trésorier | Liste paginée par statut → `PagedResponse<SejourResponse>` |
| `POST` | `/api/v1/sejours` | resp, trésorier | Créer un séjour avec catégories |
| `GET` | `/api/v1/sejours/{id}` | tous | Détail complet + catégories |
| `PATCH` | `/api/v1/sejours/{id}/horaires` | gardien, resp | Saisir horaires réels |
| `PATCH` | `/api/v1/sejours/{id}/personnes` | gardien, resp | Saisir nb réels par catégorie |
| `POST` | `/api/v1/sejours/{id}/supplements` | gardien, resp | Ajouter un supplément ou saisie libre |
| `GET` | `/api/v1/sejours/{id}/lignes` | tous | Toutes les lignes du séjour |
| `POST` | `/api/v1/sejours/{id}/facture` | tous | Générer (+ envoyer) la facture |
| `GET` | `/api/v1/sejours/{id}/facture` | tous | Lire la facture |
| `POST` | `/api/v1/sejours/{id}/facture/renvoyer` | resp, trésorier | Renvoyer la facture par email (réutilise le PDF S3 si disponible) |
| `POST` | `/api/v1/sejours/{id}/paiements` | gardien, resp | Enregistrer un paiement |
| `GET` | `/api/v1/sejours/{id}/paiements` | tous | Lister les paiements |

### Locataires (`/api/v1/locataires`)

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `GET` | `/api/v1/locataires?q=dupont` | resp, trésorier | Recherche par nom ou email (ILIKE, max 20 résultats) |

### Administration (`/api/v1/admin`)

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `GET` | `/api/v1/admin/tarifs` | resp, trésorier | Lister les tarifs/personne |
| `POST` | `/api/v1/admin/tarifs` | trésorier | Créer un tarif |
| `PUT` | `/api/v1/admin/tarifs/{id}` | trésorier | Modifier un tarif |
| `GET` | `/api/v1/admin/items` | resp, trésorier | Lister les items catalogue |
| `POST` | `/api/v1/admin/items` | resp, trésorier | Créer un item |
| `PUT` | `/api/v1/admin/items/{id}` | resp, trésorier | Modifier un item |
| `DELETE` | `/api/v1/admin/items/{id}` | resp, trésorier | Désactiver un item |
| `GET` | `/api/v1/admin/lignes-libres` | resp, trésorier | Saisies libres en attente |
| `POST` | `/api/v1/admin/lignes-libres/{id}/promouvoir` | resp, trésorier | Promouvoir → catalogue |
| `GET` | `/api/v1/admin/config` | trésorier | Lire la config site |
| `PATCH` | `/api/v1/admin/config` | trésorier | Modifier des clés de config |

---

## Variables d'environnement Lambda

```bash
DB_URL=jdbc:postgresql://<rds-proxy-endpoint>:5432/locagest
DB_USER=locagest_app
DB_PASSWORD=<secret manager>
COGNITO_JWKS_URL=https://cognito-idp.eu-west-3.amazonaws.com/<pool-id>/.well-known/jwks.json
AWS_REGION=eu-west-3
S3_BUCKET=locagest-docs
SES_FROM=noreply@ucjgsalm.org
```

---

## Codes d'erreur notables

| Code | Situation |
|---|---|
| `409 CONFLICT` | Tentative de recalcul d'une facture `EMISE` ou `PAYEE` |
