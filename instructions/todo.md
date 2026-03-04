# TODO — LocaGest

## Important

- [ ] **Tests d'intégration** : tester `SejourService.creer()` + `FactureService.generer()` sur H2 ou Testcontainers PostgreSQL
- [ ] **Upload photo chèque** : ajouter `POST /sejours/{id}/paiements/{pid}/photo` qui reçoit un `multipart/form-data` et appelle `S3Service.uploadCheque()`
- [ ] **Endpoint recherche locataire** : `GET /locataires?q=dupont` → `LocataireRepository.search()` (déjà implémenté, pas encore exposé)
- [ ] **Pagination** sur `GET /sejours` pour l'historique
- [ ] **Infrastructure as Code** : Lambda + Aurora Serverless v2 + RDS Proxy + API Gateway + Cognito (SAM template en cours dans `backend/template.yaml`)

## Nice to have

- [ ] **Template PDF** : améliorer la mise en page `PdfService` (logo SVG vectoriel, tableau aligné, numérotation de page)
- [ ] **Re-envoi email** : `POST /sejours/{id}/facture/renvoyer` sans régénérer le PDF
- [ ] **Dashboard trésorier** : `GET /admin/stats?annee=2025` → agrégats par catégorie de tarif
- [ ] **Frontend React** : les maquettes HTML sont dans `maquettes/` — à porter en composants React + Amplify
