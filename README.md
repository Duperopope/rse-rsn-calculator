# RSE/RSN Calculator v5.7.3

> Calculateur educatif de conformite RSE/RSN pour conducteurs de transport routier de personnes.

[![Version](https://img.shields.io/badge/version-5.7.3-blue)]()
[![Tests](https://img.shields.io/badge/tests-81%2F81-brightgreen)]()
[![Conformite](https://img.shields.io/badge/CE%20561%2F2006-conforme-brightgreen)]()
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)]()

## Demo

**https://rse-rsn-calculator.onrender.com/**

## Description

Application web educative qui analyse les temps de conduite, pauses, repos, amplitude et travail de nuit des conducteurs routiers, conformement au reglement europeen CE 561/2006 et au Code des transports francais. Elle classifie automatiquement les infractions (4e/5e classe) et estime les amendes.

## Sources reglementaires

| Source | Reference | URL |
|--------|-----------|-----|
| Reglement europeen | CE 561/2006 Art. 6, 7, 8 | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32006R0561 |
| Code des transports | L3312-1, L3312-2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033453099/ |
| Decret sanctions | 2010-855 / R3315-10, R3315-11 | https://www.legifrance.gouv.fr/codes/id/LEGISCTA000033450375/ |
| Ministere Ecologie | Temps de travail conducteurs | https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-marchandises |
| Sanctions | dan-dis-scan.fr | https://www.dan-dis-scan.fr/les-sanctions |
| Heure ete/hiver | Directive 2000/84/CE | https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32000L0084 |

## Fonctionnalites

- Analyse complete : conduite continue, journaliere, hebdomadaire, bi-hebdomadaire
- Pauses : verification CE 561/2006 Art.7 (45min apres 4h30)
- Repos : journalier normal 11h / reduit 9h, hebdomadaire normal 45h / reduit 24h
- Amplitude : regulier 13h (R3312-9), occasionnel 14h (R3312-11)
- Travail de nuit : L3312-1 conforme ecologie.gouv.fr (travail total > 10h si activite entre 0h-5h)
- Services de nuit : detection par traversee de minuit, tri chronologique correct
- Classification infractions : 4e classe (135 EUR) / 5e classe (1500 EUR)
- 29 pays avec fuseaux horaires et heure ete/hiver (Directive 2000/84/CE)
- Import CSV : format date;heure_debut;heure_fin;type (C, T, D, P)
- Interface : jauges temps-reel, timeline, modeles, historique, theme sombre/clair, responsive

## QA : 81 tests sources (100%)

### Niveau 1 - Assertions reglementaires (56 tests)

| Categorie | Tests | Source |
|-----------|-------|--------|
| R1-CONDUITE | 4 | CE 561/2006 Art.6 |
| R2-PAUSES | 2 | CE 561/2006 Art.7 |
| R3-REPOS | 4 | CE 561/2006 Art.8 |
| R4-AMPLITUDE | 8 | L3312-1, L3312-2 |
| R5-SANCTIONS | 7 | Decret 2010-855 |
| R6-SEUILS | 6 | Seuils 4e/5e classe |
| R7-PAYS | 11 | 29 pays, Dir. 2000/84/CE |
| R8-MOTEUR | 12 | Scenarios CSV |
| R9-INFRA | 2 | Build + port |

### Niveau 2 - Scenarios cas reels (25 tests)

| Categorie | Cas | Description |
|-----------|-----|-------------|
| CAT-A | 1-4 | Journees conformes (FR regulier/occasionnel, DE, ES) |
| CAT-B | 5-8 | Conduite continue (conformes + infractions 4e/5e) |
| CAT-C | 9-12 | Conduite journaliere (avertissement, derogatoire, 4e/5e) |
| CAT-D | 13-15 | Repos journalier (conforme, insuffisant 4e, tres insuffisant 5e) |
| CAT-E | 16-19 | Amplitude (conforme/infraction regulier + occasionnel) |
| CAT-F | 20-22 | Travail de nuit (conforme 4h/9h, infraction >10h L3312-1) |
| CAT-G | 23-25 | Edge cases (pause 30min, cumul multi-infractions, marathon 18h) |

### Verification

```bash
curl https://rse-rsn-calculator.onrender.com/api/qa
curl https://rse-rsn-calculator.onrender.com/api/qa/cas-reels
```

## API REST

| Methode | Route | Description |
|---------|-------|-------------|
| GET | /api/health | Version, status, nombre de pays |
| GET | /api/pays | Liste des 29 pays |
| GET | /api/regles | Constantes + sanctions |
| GET | /api/exemple-csv | Exemple CSV valide |
| POST | /api/analyze | Analyse CSV (body: csv, type_service, pays) |
| POST | /api/upload | Upload fichier CSV |
| GET | /api/qa | QA Niveau 1 : 56 assertions |
| GET | /api/qa/cas-reels | QA Niveau 2 : 25 scenarios |

## Format CSV

```
date;heure_debut;heure_fin;type
2026-02-12;06:45;11:00;C
2026-02-12;11:00;11:45;P
2026-02-12;11:45;15:30;C
2026-02-12;15:30;16:00;T
```

Types : C = Conduite, T = Autre tache, D = Disponibilite, P = Pause

## Stack technique

- Backend : Node.js + Express
- Frontend : React + Vite
- Deploiement : Render (auto-deploy GitHub)
- Tests : QA integre (81 tests, 0 dependance externe)

## Installation locale

```bash
git clone https://github.com/Duperopope/rse-rsn-calculator.git
cd rse-rsn-calculator
npm install
cd client && npm install && npx vite build && cd ..
node server.js
```

## Changelog

### v5.7.3 (2026-02-12)
- Fix detection service de nuit par traversee de minuit
- Fix amplitude = 0 sur journees normales (faux positif service nuit)
- Fix travail de nuit L3312-1 conforme ecologie.gouv.fr
- QA 81/81 tests (100%) en production

### v5.7.0 (2026-02-12)
- QA Niveau 1 : 56 assertions reglementaires sourcees

### v5.6.0
- Moteur RSE/RSN avec 25 scenarios, 29 pays, interface React responsive

## Auteur

**Samir Medjaher** - Projet educatif, licence educative.
