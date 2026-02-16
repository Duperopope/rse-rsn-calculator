# FIMO Check

> **Driver CPC Compliance Tool**
>
> Outil de verification de conformite des temps de conduite et de repos pour le transport routier.
> Reglementation europeenne CE 561/2006 (modifie par UE 2024/1258), Code des transports francais (L3312-1/2), Decret 2010-855.
>
> **Concu pour les conducteurs et formateurs FIMO/FCO** : explications pedagogiques, scenarios d exercice, interface mobile-first.

## Statut

| Element | Valeur |
| --- | --- |
| Version | **v7.25.1** |
| Tests backend | **56/56 (100%)** |
| Tests QA complets | **203/203 (100%)** |
| URLs legales verifiees | **44/44** (15 Legifrance + 27 EUR-Lex + 2 autres) |
| Couverture reglementaire | 100% (standard + transport occasionnel voyageurs) |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Fonctionnalites

### Analyse et conformite
- **Analyse en temps reel** — jauges circulaires, timeline 24h epuree (stats conduite/travail/pause/amplitude), bandes nuit, tooltips avec duree
- **Explications pedagogiques** — chaque infraction affiche un texte clair avec la regle, la limite, le constat et la consequence (12 types couverts, zero IA generative)
- **Double reglementation** — CE 561/2006 europeen + Code des transports francais, 29 pays supportes
- **Fix engine** — correction automatique des infractions avec comparaison avant/apres

### Interface conducteur
- **Mobile first** — bottom bar WCAG 48px, chips parametres, touch feedback, swipe navigation
- **Multi-jours** — navigation J1/J2/J3... avec code couleur (vert/orange/rouge)
- **Double equipage** — bascule Solo/Duo avec calculs separes
- **Tour guide** — 10 etapes interactives via react-joyride pour decouvrir l interface
- **Mode sombre/clair** — toggle iOS-style avec persistance localStorage
- **Historique** — sauvegarde des analyses precedentes

### Export et rapports
- **Export PDF** — rapport de conformite professionnel (pdfkit 0.17.2)
- **Bouton Telecharger PDF** — generation et telechargement direct depuis les resultats
- **Bouton Retour a la saisie** — navigation fluide entre resultats et formulaire
- **Impression** — mise en page optimisee (masque sur mobile)

## Interface

- **Header** — logo tachygraphe SVG, nom FIMO Check, status serveur, theme toggle
- **Parametres** — chips retractables (Urbain/Tourisme/Poids lourd/Long trajet/Libre)
- **Dashboard** — jauges conduite continue, conduite journaliere, amplitude, pauses
- **Resultats** — score anime, infractions avec explications, synthese calendaire, bareme sanctions
- **Suivi reglementaire** — repos reduits, repos hebdo, compensation dette, conduite de nuit
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

## Pipeline QA automatise

| Outil | Fichier | Cout | Description |
| --- | --- | --- | --- |
| QA visuel DOM | `tools/analyse-qa.js` | ~0.02$ | Capture DOM + analyse Claude Sonnet |
| Verification bugs | `tools/verify-bugs.js` | 0$ | Verification DOM des corrections |
| Audit complet | `tools/audit-complet.js` | ~0.05$ | Parcours utilisateur complet Puppeteer |
| Test tour guide | `tools/test-tour.js` | 0$ | Validation 10 etapes GuidedTour |
| Verif data-tour | `tools/check-targets.js` | 0$ | Presence des cibles dans le DOM |

## Transport occasionnel de voyageurs (UE 2024/1258)

| Derogation | Article | Description |
| --- | --- | --- |
| Regle 12 jours | Art.8 par.6a | Report du repos hebdomadaire jusqu a 12 periodes de 24h consecutives |
| Pause fractionnee 15+15 | Art.7 al.3 | Pause de 45 min remplacable par 2 pauses de 15 min minimum |
| Report repos 25h | Art.8 par.2a | Repos journalier etendu a 25h max si conduite <= 7h |
| Conduite nuit solo | Art.8 par.6a | En service 12 jours, conduite nuit (22h-6h) limitee a 3h sans pause |
| Retour domicile | Art.8 par.8bis | Apres 12 jours : 2 repos normaux OU 1 normal + 1 reduit (avec compensation) |

## API Endpoints

| Methode | Route | Body | Description |
| --- | --- | --- | --- |
| `POST` | `/api/analyze` | `{csv, typeService, pays, equipage}` | Analyse CSV tachygraphe (JSON) |
| `POST` | `/api/fix` | `{csv, typeService, pays, equipage}` | Correction automatique infractions |
| `POST` | `/api/rapport/pdf` | `{resultat, options}` | Generation rapport PDF |
| `GET` | `/api/health` | — | Health check + version |
| `GET` | `/api/qa` | — | Tests QA N1 (56 tests) |
| `GET` | `/api/qa/cas-reels` | — | Tests QA N2 (25 tests) |
| `GET` | `/api/qa/limites` | — | Tests QA N3 (21 tests) |
| `GET` | `/api/qa/robustesse` | — | Tests QA N4 (29 tests) |
| `GET` | `/api/qa/avance` | — | Tests QA N5 (18 tests) |
| `GET` | `/api/qa/multi-semaines` | — | Tests QA N6 (18 tests) |
| `GET` | `/api/regles` | — | Reference reglementaire complete |

### Format CSV pour /api/analyze

```
date;debut;fin;type
2026-02-16;06:00;10:30;C
2026-02-16;10:30;11:15;P
2026-02-16;11:15;14:30;C
```

Types : `C` = Conduite, `P` = Pause, `T` = Travail, `D` = Disponibilite, `R` = Repos

## Stack technique

| Composant | Technologie |
| --- | --- |
| Backend | Node.js / Express |
| Frontend | React 18 + Vite |
| Styles | CSS Modules (*.module.css) |
| PDF | pdfkit 0.17.2 |
| Tour guide | react-joyride |
| Tests | QA endpoints integres + tests CSV + Puppeteer |
| Deploiement | Render.com |

## Sources reglementaires

| Texte | Lien | Statut |
| --- | --- | --- |
| CE 561/2006 consolide | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522) | Verifie |
| UE 2024/1258 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1258) | Verifie |
| Code des transports R3315-10 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841659) | Verifie |
| Code des transports R3315-11 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841660) | Verifie |
| Decret 2010-855 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022503681) | Verifie |
| Code des transports Art. R3312-9 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522) | Verifie |
| Decret 83-40 du 26 janv 1983 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000423284/) | Verifie |
| Decret 2006-925 Art.1 | [Legifrance](https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000002439868) | Verifie |
| Code des transports Art. L3312-2 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232) | Verifie |
| Decret 2010-541 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022512271) | Verifie |
| Code des transports Art. L3312-1 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651204) | Verifie |
| Code des transports Art. R3312-13 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033450503) | Verifie |

> Les 15 URLs Legifrance ont ete verifiees par identifiant LEGIARTI/JORFTEXT. Les reponses HTTP 403 sont dues a la protection anti-bot de Legifrance ; les pages sont accessibles en navigateur.

## Changelog

### v7.25.1 (2026-02-16) — Explications pedagogiques + boutons export
- **Explications pedagogiques** : chaque infraction affiche un bloc explicatif (12 types couverts)
- **Bouton Telecharger PDF** : branche dans ResultPanel (etait code mais absent du JSX)
- **Bouton Retour a la saisie** : navigation resultats vers formulaire avec callback onBack
- **44 URLs legales verifiees** : 15 Legifrance (par ID), 27 EUR-Lex (HTTP 200)
- **Documentation projet** : CLAUDE.md, CLAUDE-updates.md, CLAUDE-current.md
- **Pipeline QA** : 5 outils automatises (analyse-qa, verify-bugs, audit-complet, test-tour, check-targets)
- **Format API corrige** : /api/analyze accepte JSON {csv, typeService, pays, equipage}
- **Timeline v3** : affichage pur (suppression double moteur infractions), barre stats, tooltips duree, track 64px mobile, bandes nuit subtiles

### v7.11.0 (2025-02-14) — FIMO Check: UX Conducteur
- Rebrand complet: RSE/RSN Calculator -> FIMO Check
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

---

*Developpe par Samir Medjaher — 2025-2026*
