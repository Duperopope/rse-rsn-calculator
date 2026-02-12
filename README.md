# RSE/RSN Calculator v5.7.4

Calculateur de conformite RSE (Regle Sociale Europeenne) et RSN (Regle Sociale Nationale) pour le transport routier.

> **102 tests automatises - 100% de couverture reglementaire**

[![Version](https://img.shields.io/badge/version-5.7.4-blue)]()
[![Tests](https://img.shields.io/badge/tests-102%2F102-brightgreen)]()
[![CE 561/2006](https://img.shields.io/badge/CE-561%2F2006-blue)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)]()

## Demo

**https://rse-rsn-calculator.onrender.com/**

## Sources reglementaires

| Reglement | Source | URL |
|---|---|---|
| CE 561/2006 Art.6-8 | EUR-Lex | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561 |
| L3312-1 / L3312-2 | Legifrance | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297 |
| Decret 2010-855 | Legifrance | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022497278 |
| Guide temps de travail | ecologie.gouv.fr | https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers |

## QA - 3 niveaux de tests (102/102)

### Niveau 1 - Assertions reglementaires (56/56)
Verification des constantes, seuils, sanctions et parametres moteur.
- Endpoint: `GET /api/qa`

### Niveau 2 - Cas reels (25/25)
Scenarios terrain couvrant 7 categories (CAT-A a CAT-G): journees conformes, depassements conduite continue, depassements conduite journaliere, repos insuffisants, multi-infractions, service de nuit (L3312-1), edge cases et cumuls.
- Endpoint: `GET /api/qa/cas-reels`

### Niveau 3 - Tests aux limites (21/21)
7 seuils reglementaires testes a -1, pile, +1: conduite continue (270 min), conduite journaliere (540/600 min), amplitude regulier (780 min), amplitude occasionnel (840 min), travail de nuit (600 min), repos journalier (540 min), travail journalier total (720 min).
- Endpoint: `GET /api/qa/limites`

## API REST

| Methode | Endpoint | Description |
|---|---|---|
| POST | `/api/analyze` | Analyse CSV conducteur |
| GET | `/api/health` | Version et statut |
| GET | `/api/qa` | QA Niveau 1 (56 assertions) |
| GET | `/api/qa/cas-reels` | QA Niveau 2 (25 cas) |
| GET | `/api/qa/limites` | QA Niveau 3 (21 limites) |
| GET | `/api/regles` | Regles applicables |
| GET | `/api/pays` | Pays supportes |

## Format CSV

```
DATE;HEURE_DEBUT;HEURE_FIN;TYPE_ACTIVITE
2025-06-15;06:00;06:15;T
2025-06-15;06:15;10:45;C
2025-06-15;10:45;11:30;P
```

Types: C=Conduite, T=Tache, P=Pause, D=Disponibilite, R=Repos

## Stack technique

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Deploiement**: Render (free tier)
- **CI/QA**: 102 tests integres dans le serveur

## Installation locale

```bash
git clone https://github.com/Duperopope/rse-rsn-calculator.git
cd rse-rsn-calculator
npm install
cd client && npm install && npx vite build && cd ..
node server.js
```

## Changelog

### v5.7.4 (2026-02-12)
- QA Niveau 3: 21 tests aux limites (7 seuils x 3 valeurs)
- Fix generateurs CSV (join newline)
- Total: 102/102 tests (100%)

### v5.7.3 (2026-02-12)
- Fix service de nuit (detection traversee minuit)
- Fix amplitude = 0 sur journees normales
- Fix L3312-1 (travail total si activite 0-5h)

### v5.7.0 (2026-02-12)
- QA Niveau 1: 56 assertions reglementaires

### v5.6.0
- Moteur d analyse RSE/RSN initial
- Interface React

## Auteur

**Samir Medjaher** - Chef d orchestre / Product Owner
