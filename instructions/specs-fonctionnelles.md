# Specs fonctionnelles — LocaGest

## Contexte métier

UCJG Salm loue une maison de vacances à la semaine.
> 53 rue du Haut-Fourneau, 67130 La Broque

### Rôles

Les rôles sont gérés par **AWS Cognito** (groupes : `tresorier`, `resp_location`, `gardien`).

Un utilisateur peut avoir plusieurs rôles (ex : un trésorier peut aussi être gardien).
Les écrans, routes et API accessibles s'adaptent en fonction des rôles de l'utilisateur connecté. Le détail est donné dans chaque module ci-dessous.

Les rôles sont positifs ("ALLOW_FIRST") : ils donnent accès à des fonctionnalités, mais il n'y a pas de rôle "interdit" ou "restreint". Par exemple, un utilisateur sans rôle "gardien" n'a simplement pas accès aux fonctionnalités réservées aux gardiens, mais il n'est pas explicitement interdit d'accéder à ces fonctionnalités si un autre rôle lui accorde ces permissions.

#### Matrice rôle / fonctionnalité

| Fonctionnalité | Gardien | Resp. location | Trésorier | Administrateur |
|---|---|---|---|---|
| **Facturation — séjour en cours** | ✏️ Saisie (effectifs réels, suppléments, paiement) | 👁️ Lecture | 👁️ Lecture | ❌ |
| **Liste des séjours** | 👁️ Lecture (tous) | ✏️ Lecture + création/modification | 📊 Dashboard | ❌ |
| **Nouveau séjour** | ❌ | ✏️ Création | ❌ | ❌ |
| **Configuration** (tarifs hébergement, config globale) | ❌ | ❌ | ✏️ Écriture complète | ❌ |
| **Suppléments catalogue** | 👁️ Voir le catalogue · ✏️ Saisie (items catalogue + saisies libres) | 👁️ Lecture saisies libres | ✏️ Gestion catalogue + promotion | ✏️ Gestion catalogue + promotion |
| **Checklist** *(TODO)* | 👁️ Séjours passés · ✏️ Saisie séjour en cours | ❌ | ❌ | ✏️ Gestion des listes (ajout/modif/suppression/ordre) |
| **Compte-rendu de séjour** *(TODO)* | 👁️ Séjours passés · ✏️ Saisie séjour en cours | 👁️ Lecture | ❌ | ❌ |
| **Travaux** *(TODO)* | 👁️ Voir les signalements · ✏️ Signaler + modifier (avant changement statut/réponse) · ✏️ Répondre/changer statut | ❌ | ❌ | ❌ |
| **Planning des gardes** *(TODO)* | 👁️ Liste séjours · ✏️ Demande de garde + auto-attribution (en cours/prochain) | ✏️ Validation + gestion complète | ❌ | ❌ |

> **Légende :** ✏️ Lecture + écriture · 👁️ Lecture seule · ❌ Pas d'accès

## Modules

- [Facturation](spec_fonctionnelles/facturation.md) — règles de calcul, immuabilité, suppléments
- [Séjours](spec_fonctionnelles/sejours.md) — liste, création, saisie gardien, facturation séjour en cours
- [Configuration](spec_fonctionnelles/configuration.md) — tarifs hébergement, config globale *(trésorier)*
- [Suppléments catalogue](spec_fonctionnelles/supplements_catalogue.md) — catalogue, saisies libres, promotion, snapshot
- [Checklist](spec_fonctionnelles/checklist.md) *(TODO)* — gestion des listes et saisie par le gardien
- [Compte-rendu de séjour](spec_fonctionnelles/compte_rendu_sejour.md) *(TODO)* — saisie gardien, relevés, consultation
- [Travaux](spec_fonctionnelles/travaux.md) *(TODO)* — signalement, suivi, résolution
- [Planning des gardes](spec_fonctionnelles/planning_gardes.md) *(TODO)* — demandes, auto-attribution, validation
