# TODO — LocaGest

## Important

- [x] **Tests d'intégration** : `SejourServiceIT` + `FactureServiceIT` avec Testcontainers PostgreSQL (8 tests)
- [x] **Endpoint recherche locataire** : `GET /api/v1/locataires?q=dupont` → `LocataireController` (roles : resp, trésorier)
- [x] **Pagination** sur `GET /api/v1/sejours?statut=PLANIFIE&page=0&size=20` → `PagedResponse<SejourResponse>`
- [x] **Re-envoi email** : `POST /api/v1/sejours/{id}/facture/renvoyer` (réutilise le PDF S3 si disponible, sinon régénère)
- [ ] **Upload photo chèque** : ajouter `POST /sejours/{id}/paiements/{pid}/photo` qui reçoit un `multipart/form-data` et appelle `S3Service.uploadCheque()`
- [ ] **Infrastructure as Code** : Lambda + Aurora Serverless v2 + RDS Proxy + API Gateway + Cognito (SAM template en cours dans `backend/template.yaml`)

## Nice to have

- [ ] **Template PDF** : améliorer la mise en page `PdfService` (logo SVG vectoriel, tableau aligné, numérotation de page)
- [ ] **Dashboard trésorier** : `GET /admin/stats?annee=2025` → agrégats par catégorie de tarif
- [ ] **Frontend React** : les maquettes HTML sont dans `maquettes/` — à porter en composants React + Amplify
