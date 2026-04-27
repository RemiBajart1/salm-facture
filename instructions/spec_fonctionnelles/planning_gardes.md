# Module — Planning des gardes *(TODO)*

| Rôle | Accès                                                               |
|---|---------------------------------------------------------------------|
| **Gardien** | ✏️ Demande de garde + auto-attribution (séjour en cours / prochain) |
|**Gardien**| 👁 Voir les la liste des séjours passés, en cours et futurs         |
| **Resp. location** | ✏️ Validation, modification, gestion complète du planning           |

## Description

Gestion du planning des gardiens pour chaque séjour.

Actuellement géré par le resp. location sous forme d'un **excel partagé en lecture seule** — les gardiens font leur demande par mail ou via un formulaire Google, et le resp. location les ajoute manuellement.

Objectif : déplacer entièrement ce processus dans l'application.

---

## Demande de garde (gardien)

Un gardien peut demander à assurer la garde d'un séjour donné.

### Cas général
- Le gardien soumet une demande de garde pour un séjour à venir
- La demande est en attente de validation par le resp. location

### Auto-attribution — séjour en cours ou prochain séjour à venir
- Pour le séjour **en cours** ou le **prochain séjour à venir**, le gardien peut s'attribuer directement le séjour **sans validation** du resp. location
- Cas d'usage : un gardien de dernière minute, ou un remplacement urgent

---

## Gestion du planning (resp. location)

- Valider ou refuser les demandes de garde des gardiens
- Modifier les affectations (réaffecter un séjour à un autre gardien)
- Saisir directement une affectation sans passer par une demande
- **Vue calendrier** indispensable : visualisation de tous les séjours avec leur gardien affecté
- Mise en avant des séjours **sans gardien affecté** pour faciliter la gestion

---

## Notifications 

Notifications automatiques par email ou SMS aux gardiens concernés, par exemple :
> *"Vous êtes de garde pour le séjour du 15 au 17 mars, pensez à vérifier les comptes-rendus du séjour précédent."*

---

## Statuts d'une affectation

| Statut | Description |
|---|---|
| `EN_ATTENTE` | Demande soumise par un gardien, en attente de validation |
| `VALIDEE` | Affectation validée par le resp. location (ou auto-attribuée) |
| `REFUSEE` | Demande refusée par le resp. location |
                                                             

## Changements apportés aux autres features (chapitre à supprimer une fois implémenté, données à reporter dans les fichiers/sections concernées)
Le compte-rendu de séjour et checklist associées sont accessibles en écriture uniquement au gardien affecté au séjour en cours ou au prochain séjour à venir. 
Les autres gardiens ont un accès en lecture seule.
Préciser cela dans la section "Compte-rendu de séjour" du module "Compte-rendu de séjour" (compte_rendu_sejour.md).
Lorsqu'un gardien émet une facture, la facture doit mentionner "vous avez été accueilli par [nom du gardien]" pour les séjours à venir, ou "vous avez été accueilli par [nom du gardien]" pour les séjours passés. Préciser cela dans la section "Facturation" du module "Facturation" (facturation.md).
