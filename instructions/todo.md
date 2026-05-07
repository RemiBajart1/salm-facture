# TODO — LocaGest

## Bugs à corriger

## changements mineurs à apporter aux features existantes (chapitre à supprimer une fois implémenté, données à reporter dans les fichiers/sections concernées)
- le tarif "Présence journée sans nuitée (par jour)" doit toujours être cochée, même si qté = 0, pour permettre au gardien de saisir les journées sans nuitée 
  - Ce tarif n'apparait pas sur la facture si qté = 0, mais elle doit être présente dans le formulaire de saisie pour permettre au gardien de l'utiliser
  - Cette présence journée ne compte pas pour la taxe de séjour, qui ne compte que les nuitées
- Le resp location doit pouvoir modifier les séjours programmés (toutes informations). 
- L'aperçu d'un séjour (resp. location) n'est pas assez détaillé et doit reprendre l'intégralité des données
- le trésorier doit pouvoir supprimer un tarif /personne
- Ajouter 2 champs à un séjour 
  - objet du séjour (ex : "Anniversaire 40 ans", "WE révisions bac") (obligatoire)
  - Nom du groupe (distinct du nom du locataire) (Facultatif)
- permettre de regénérer la facture si le template a changé (les données ne changent pas) (Trésorier uniquement)
- Supplément "Carte de membre" : le resp location doit pouvoir le décocher pour les groupes déjà membres
  - Avec la feature "adhérent", auto-détection (cf adherents.md)
- Supplément "carte de membre" : l'unité = unité (et pas séjour)
- Suppléments : le trésorier doit pouvoir modifier ou supprimer les items existants du catalogue

##  Charte graphique  
  - Revoie les couleurs du frontend pour s'adapter à la charte graphique 
  - La facture doit avoir même thème que le reste du site (logo, couleurs, typo... ) : 
  - [logo salm.svg](maquettes/charte_graphique/logo_salm.svg) : utiliser ce logo vectoriel pour la facture et le site (en remplacement du logo actuel en PNG)
  - [charte graphique YMCA.pdf](maquettes/charte_graphique/charte_graphique_YMCA.pdf) : se baser sur ce document pour les couleurs du thème du site et de la facture(bleu foncé, bleu clair, vert, orange)
  - [papier entête YMCA.docx](maquettes/charte_graphique/papier_entete_YMCA.docx) : se baser sur ce document pour la mise en page de la facture (logo, couleurs, typographie, format A4 portrait, pied de page avec coordonnées et mentions légales)
  - 

## Recette à faire par un humain
- [ ] **Taxe de séjour enfants** :  
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
- [ ] **Dashboard trésorier** : 
  - agrégats par catégorie de tarif, 
  - enfants/Adulte, stat par mois, 
  - comparer avec années précédentes

## Grosses Features futures
_Cf détail par feature_
- [Adhésions](spec_fonctionnelles/adherents.md) *(TODO)* — gestion des adhérents, cotisations, suivi
- [Checklist](spec_fonctionnelles/checklist.md) *(TODO)* — gestion des listes et saisie par le gardien
- [Compte-rendu de séjour](spec_fonctionnelles/compte_rendu_sejour.md) *(TODO)* — saisie gardien, relevés, consultation
- [Travaux](spec_fonctionnelles/travaux.md) *(TODO)* — signalement, suivi, résolution
- [Planning des gardes](spec_fonctionnelles/planning_gardes.md) *(TODO)* — demandes, auto-attribution, validation
