# TODO — LocaGest

## Indispensable   
- [ ] **Frontend React** : les maquettes HTML sont dans `maquettes/` — à porter en composants React + Amplify

## Important
- [ ] **Taxe de séjour enfants** : étendre la taxe de séjour aux enfants (<18 ans) — 2 lignes sur la facture (adultes + enfants).
  - DB : ajouter `sejour.nb_enfants` (int, défaut 0) + `config_site.taxe_enfant_nuit` (decimal, défaut 0,00)
  - Backend PHP : `SejourService::update_personnes()` accepte `nb_enfants` ; `FactureService::generer()` crée les 2 lignes taxe avec snapshot des taux
  - Config trésorier : UI d'édition de `taxe_enfant_nuit` (à côté de `taxe_adulte_nuit`)
  - Gardien : champ `nb_enfants` dans la saisie des effectifs réels
  - Voir specs : `facturation.md §4.3`, `configuration.md`, `sejours.md`
  - Le total enfants + adultes doit être égal au total effectif saisi, sinon message d'erreur "Le nombre total de personnes (adultes + enfants) doit être égal au nombre total saisi."
- [ ] **Carte de membre (supplément obligatoire)** : ligne toujours présente sur chaque séjour, non-supprimable par le gardien.
  - DB : ajouter flag `obligatoire` (bool) sur `config_item` + initialisation du `ConfigItem` "Carte de membre" (15 €, unité, obligatoire)
  - Backend PHP : `SejourService::creer()` auto-ajoute les items obligatoires avec qty par défaut ; `FactureService` génère la ligne même à qty=0 avec libellé spécial
  - Resp. location : case "Groupe déjà membre pour l'année civile" à la création → qty=0
  - Gardien : champ quantité non-supprimable pour les items obligatoires
  - Config trésorier : flag `obligatoire` éditable sur les items du catalogue
  - Voir specs : `supplements_catalogue.md`, `facturation.md §4.4`, `sejours.md`
- [ ] **Coordonnées & mentions légales sur la facture** : IBAN, SIRET, téléphone facturation, date d'échéance.
  - DB : ajouter `config_site.iban`, `config_site.siret`, `config_site.telephone_facturation`, `config_site.delai_reglement_jours` (défaut 7)
  - DB : colonnes snapshot sur `facture` : `iban_snapshot`, `siret_snapshot`, `telephone_snapshot`, `adresse_snapshot`, `date_echeance`
  - Backend PHP : `FactureService::generer()` copie en snapshot + calcule `date_echeance = date_facture + delai_reglement_jours`
  - Config trésorier : UI d'édition de ces 4 nouveaux champs
  - PDF : afficher IBAN, SIRET, téléphone, date d'échéance sur la facture générée
  - Voir specs : `facturation.md §4.5`, `configuration.md`
- [ ] **Upload photo chèque** : ajouter `POST /sejours/{id}/paiements/{pid}/photo` qui reçoit un `multipart/form-data`. La version sur mobile/tablette doit permettre de prendre une photo

## Nice to have
- [ ] **Template PDF** : améliorer la mise en page `PdfService` (logo SVG vectoriel, tableau aligné, numérotation de page)
- [ ] **Dashboard trésorier** : `GET /admin/stats?annee=2025` → agrégats par catégorie de tarif

## Grosses Features futures
Cf détail par feature
- [Checklist](spec_fonctionnelles/checklist.md) *(TODO)* — gestion des listes et saisie par le gardien
- [Compte-rendu de séjour](spec_fonctionnelles/compte_rendu_sejour.md) *(TODO)* — saisie gardien, relevés, consultation
- [Travaux](spec_fonctionnelles/travaux.md) *(TODO)* — signalement, suivi, résolution
- [Planning des gardes](spec_fonctionnelles/planning_gardes.md) *(TODO)* — demandes, auto-attribution, validation
