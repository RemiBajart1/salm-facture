# TODO — LocaGest

## Indispensable   
- [ ] **Frontend React** : les maquettes HTML sont dans `maquettes/` — à porter en composants React + Amplify

## Important
- [ ] **Upload photo chèque** : ajouter `POST /sejours/{id}/paiements/{pid}/photo` qui reçoit un `multipart/form-data` et appelle `S3Service.uploadCheque()`
- [ ] **Infrastructure as Code** : Lambda + Aurora Serverless v2 + RDS Proxy + API Gateway + Cognito (SAM template en cours dans `backend/template.yaml`)

## Nice to have
- [ ] **Template PDF** : améliorer la mise en page `PdfService` (logo SVG vectoriel, tableau aligné, numérotation de page)
- [ ] **Dashboard trésorier** : `GET /admin/stats?annee=2025` → agrégats par catégorie de tarif

## Grosses Features futures
Cf détail par feature
- [Checklist](spec_fonctionnelles/checklist.md) *(TODO)* — gestion des listes et saisie par le gardien
- [Compte-rendu de séjour](spec_fonctionnelles/compte_rendu_sejour.md) *(TODO)* — saisie gardien, relevés, consultation
- [Travaux](spec_fonctionnelles/travaux.md) *(TODO)* — signalement, suivi, résolution
- [Planning des gardes](spec_fonctionnelles/planning_gardes.md) *(TODO)* — demandes, auto-attribution, validation
