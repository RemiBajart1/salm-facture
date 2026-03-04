# LocaGest — Système de facturation UCJG Salm

> Maison de vacances YMCA · 53 rue du Haut-Fourneau, 67130 La Broque

Application serverless de gestion des séjours et de facturation pour la maison de vacances UCJG Salm.

---

## Documentation

| Fichier | Contenu |
|---|---|
| [`instructions/specs-fonctionnelles.md`](instructions/specs-fonctionnelles.md) | Rôles métier, règles de gestion (hébergement, énergies, taxes, suppléments), design decisions |
| [`instructions/specs-techniques.md`](instructions/specs-techniques.md) | Stack technique, modèle de données Aurora, structure du projet backend |
| [`instructions/api.md`](instructions/api.md) | Routes API complètes, variables d'environnement Lambda |
| [`instructions/todo.md`](instructions/todo.md) | TODO : blockers avant déploiement, améliorations importantes, nice-to-have |

## Structure du projet

```
salm-facture/
├── backend/          Java 21 + Micronaut 4.4 + Gradle (Lambda)
│   ├── template.yaml SAM — Lambda + API Gateway + S3
│   └── samconfig.toml
├── frontend/         React + Amplify
├── instructions/     Specs et documentation technique
├── maquettes/        Maquettes HTML interactives
└── specs/            Spécifications additionnelles
```

## Déploiement

- **Backend** : AWS Lambda (Java 21 SnapStart) + API Gateway + Aurora PostgreSQL Serverless v2
- **Frontend** : AWS Amplify
- **CI/CD** : GitHub Actions (`.github/workflows/`)
- **Région** : `eu-west-3` (Paris)

Voir [`instructions/api.md`](instructions/api.md) pour les variables d'environnement requises.
