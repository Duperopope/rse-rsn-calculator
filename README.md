# FIMO Check

> **Driver CPC Compliance Tool**
>
> Outil de conformite des temps de conduite et de repos pour le transport routier.
> Reglementation europeenne CE 561/2006 (modifie par UE 2024/1258), Code des transports francais (L3312-1/2), Decret 2010-855.

## Statut

| Element | Valeur |
| --- | --- |
| Version | **v7.11.0** |
| Tests backend | **36/36 (100%)** |
| Tests QA complets | **203/203 (100%)** |
| Couverture reglementaire | 100% (standard + transport occasionnel voyageurs) |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Fonctionnalites

- **Analyse en temps reel** — jauges circulaires, timeline 24h, alertes orange/rouge
- **Multi-jours** — navigation J1/J2/J3... avec code couleur (vert/orange/rouge)
- **Double equipage** — bascule Solo/Duo avec calculs separes
- **Historique** — sauvegarde des analyses precedentes
- **Mode sombre/clair** — toggle iOS-style avec persistance localStorage
- **Mobile first** — bottom bar WCAG, chips parametres, touch feedback
- **Export PDF** — rapport de conformite professionnel (pdfkit)
- **Fix engine** — correction automatique des infractions

## Interface

- **Header** — logo tachygraphe SVG, nom FIMO Check, status serveur, theme toggle
- **Parametres** — chips retractables (Urbain/Tourisme/Poids lourd/Long trajet/Libre)
- **Dashboard** — jauges conduite continue, conduite journaliere, amplitude, pauses
- **Bottom bar mobile** — Analyser, Historique (badge count), Haut

## Tests QA — 6 niveaux

| Niveau | Endpoint | Tests | Description |
| --- | --- | --- | --- |
| N1 - Reglementaire | `GET /api/qa` | 56 | Assertions CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |
| N2 - Cas reels | `GET /api/qa/cas-reels` | 25 | Scenarios terrain : conduite longue, nuit, multi-jours, repos fractionnes |
| N3 - Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils reglementaires |
| N4 - Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformes, CSV vides, sequences absurdes |
| N5 - Avances | `GET /api/qa/avance` | 18 | OUT, FERRY, multi-equipage, bi-hebdo 90h, repos hebdo, transport occasionnel |
| N6 - Multi-semaines | `GET /api/qa/multi-semaines` | 18 | Tracking multi-semaines, compensation repos, retour domicile, derogations |
| CSV - Integration | `node tests/run-tests.js` | 36 | Fichiers CSV complets, scores, infractions, fix-engine |
| **Total** | | **203** | **100% de reussite** |

## Transport occasionnel de voyageurs (UE 2024/1258)

| Derogation | Article | Description |
| --- | --- | --- |
| Regle 12 jours | Art.8 par.6a | Report du repos hebdomadaire jusqu'a 12 periodes de 24h consecutives |
| Pause fractionnee 15+15 | Art.7 al.3 | Pause de 45 min remplacable par 2 pauses de 15 min minimum |
| Report repos 25h | Art.8 par.2a | Repos journalier etendu a 25h max si conduite <= 7h |
| Conduite nuit solo | Art.8 par.6a | En service 12 jours, conduite nuit (22h-6h) limitee a 3h sans pause |
| Retour domicile | Art.8 par.8bis | Apres 12 jours : 2 repos normaux OU 1 normal + 1 reduit (avec compensation) |

## API Endpoints

| Methode | Route | Description |
| --- | --- | --- |
| `POST` | `/api/analyze` | Analyse d'un fichier CSV tachygraphe |
| `POST` | `/api/fix` | Correction automatique des infractions (fix-engine) |
| `GET` | `/api/health` | Health check + version |
| `GET` | `/api/qa` | Tests QA N1 (56 tests) |
| `GET` | `/api/qa/cas-reels` | Tests QA N2 (25 tests) |
| `GET` | `/api/qa/limites` | Tests QA N3 (21 tests) |
| `GET` | `/api/qa/robustesse` | Tests QA N4 (29 tests) |
| `GET` | `/api/qa/avance` | Tests QA N5 (18 tests) |
| `GET` | `/api/qa/multi-semaines` | Tests QA N6 (18 tests) |
| `GET` | `/api/regles` | Reference reglementaire complete |

## Stack technique

- **Backend** : Node.js / Express
- **Frontend** : React + Vite
- **Tests** : QA endpoints integres + tests CSV automatises
- **Deploiement** : Render.com
- **PDF** : pdfkit

## Sources reglementaires

| Texte | Lien |
| --- | --- |
| CE 561/2006 consolide | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522) |
| UE 2024/1258 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1258) |
| Code des transports R3315-10 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841659) |
| Code des transports R3315-11 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841660) |
| Decret 2010-855 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022503681) |

## Changelog

### v7.11.0 (2025-02-14) — FIMO Check: UX Conducteur
- Rebrand complet: RSE/RSN Calculator → FIMO Check
- Header: logo tachygraphe SVG, toggle theme iOS-style, ResizeObserver
- BottomBar mobile: 3 boutons (Analyser, Historique, Haut), zones WCAG 48px
- ParametresPanel: chips cliquables avec emojis, labels humains, panneau retractable
- Labels: Urbain, Tourisme, Poids lourd, Long trajet, Libre
- Theme: mini interrupteur iOS (lune/soleil) dans le header

### v7.8.0 — Export PDF professionnel
- Generation de rapports PDF via pdfkit

### v7.7.0 — FixEnginePanel
- Comparaison avant/apres fix-engine

### v7.6.12 — Documentation QA
- 203 tests (N1-N6 + CSV), 6 niveaux QA

## Licence

Projet prive — Tous droits reserves.