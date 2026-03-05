# TODO — LocaGest

## Important
- [ ] **Upload photo chèque** : ajouter `POST /sejours/{id}/paiements/{pid}/photo` qui reçoit un `multipart/form-data` et appelle `S3Service.uploadCheque()`
- [ ] **Infrastructure as Code** : Lambda + Aurora Serverless v2 + RDS Proxy + API Gateway + Cognito (SAM template en cours dans `backend/template.yaml`)

## Nice to have

- [ ] **Template PDF** : améliorer la mise en page `PdfService` (logo SVG vectoriel, tableau aligné, numérotation de page)
- [ ] **Dashboard trésorier** : `GET /admin/stats?annee=2025` → agrégats par catégorie de tarif
- [ ] **Frontend React** : les maquettes HTML sont dans `maquettes/` — à porter en composants React + Amplify

## Grosses Features futures
### Checklist et Comptes-rendus de séjour
- le gardien devra saisir des comptes-rendus de séjour : 
  - travaux à prévoir, 
  - réparations urgentes, 
  - commentaire libre + photos...
  - Relevés de compteurs (eau, électricité) à l'arrivée et au départ du groupe
  - Nombre de poubelles sorties (utile au trésorier pour la gestion budgetaire)
- Checklist d'ouverture et de fermeture de la maison (liste gérée par le resp. location, à cocher par le gardien)
- Ces comptes-rendus seront visibles dans l'application par les autres gardiens, le responsable location et le trésorier, pour assurer un suivi de l'état de la maison et des travaux nécessaires.
- visibles par les autres gardiens, le resp. location, le trésorier.
  - exemples : 
    - panne lave vaisselle
    - Lit chambre 16 cassé à l'arrivée du groupe, remplacé par un matelas au sol
    - Fuite sur robinet
    - Déclenchement alarme incendie chambre 12, cause inconnue
- Le gardien ne doit pas saisir de DACP dedans, uniquement des faits matériels ou actions de travaux nécessaires dans la maison

### Planning des gardes
Actuellement le planning des gardes est géré par le resp location, sous forme d'un excel partagé en lecture seule.
Les gardiens font leur demande de garde par mail ou via un formulaire google, et le resp location les ajoute manuellement dans le planning excel.
- Déplacer dans l'application, avec une interface de gestion pour le resp location, et une interface de consultation pour les gardiens.
- La vue calendrier est indispensable.
- MIse en avant des séjours non pourvus de gardien, pour faciliter la gestion du planning.
- Notifications automatiques par email ou SMS aux gardiens concernés (ex : "vous êtes de garde pour le séjour du 15 au 17 mars, pensez à vérifier les comptes-rendus du séjour précédent")
