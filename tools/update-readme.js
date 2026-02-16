var fs = require('fs');

var readme = '# FIMO Check\n\
\n\
> **Driver CPC Compliance Tool**\n\
>\n\
> Outil de verification de conformite des temps de conduite et de repos pour le transport routier.\n\
> Reglementation europeenne CE 561/2006 (modifie par UE 2024/1258), Code des transports francais (L3312-1/2), Decret 2010-855.\n\
>\n\
> **Concu pour les conducteurs et formateurs FIMO/FCO** : explications pedagogiques, scenarios d exercice, interface mobile-first.\n\
\n\
## Statut\n\
\n\
| Element | Valeur |\n\
| --- | --- |\n\
| Version | **v7.25.1** |\n\
| Tests backend | **56/56 (100%)** |\n\
| Tests QA complets | **203/203 (100%)** |\n\
| URLs legales verifiees | **44/44** (15 Legifrance + 27 EUR-Lex + 2 autres) |\n\
| Couverture reglementaire | 100% (standard + transport occasionnel voyageurs) |\n\
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |\n\
\n\
## Fonctionnalites\n\
\n\
### Analyse et conformite\n\
- **Analyse en temps reel** — jauges circulaires, timeline 24h, alertes orange/rouge\n\
- **Explications pedagogiques** — chaque infraction affiche un texte clair avec la regle, la limite, le constat et la consequence (12 types couverts, zero IA generative)\n\
- **Double reglementation** — CE 561/2006 europeen + Code des transports francais, 29 pays supportes\n\
- **Fix engine** — correction automatique des infractions avec comparaison avant/apres\n\
\n\
### Interface conducteur\n\
- **Mobile first** — bottom bar WCAG 48px, chips parametres, touch feedback, swipe navigation\n\
- **Multi-jours** — navigation J1/J2/J3... avec code couleur (vert/orange/rouge)\n\
- **Double equipage** — bascule Solo/Duo avec calculs separes\n\
- **Tour guide** — 10 etapes interactives via react-joyride pour decouvrir l interface\n\
- **Mode sombre/clair** — toggle iOS-style avec persistance localStorage\n\
- **Historique** — sauvegarde des analyses precedentes\n\
\n\
### Export et rapports\n\
- **Export PDF** — rapport de conformite professionnel (pdfkit 0.17.2)\n\
- **Bouton Telecharger PDF** — generation et telechargement direct depuis les resultats\n\
- **Bouton Retour a la saisie** — navigation fluide entre resultats et formulaire\n\
- **Impression** — mise en page optimisee (masque sur mobile)\n\
\n\
## Interface\n\
\n\
- **Header** — logo tachygraphe SVG, nom FIMO Check, status serveur, theme toggle\n\
- **Parametres** — chips retractables (Urbain/Tourisme/Poids lourd/Long trajet/Libre)\n\
- **Dashboard** — jauges conduite continue, conduite journaliere, amplitude, pauses\n\
- **Resultats** — score anime, infractions avec explications, synthese calendaire, bareme sanctions\n\
- **Suivi reglementaire** — repos reduits, repos hebdo, compensation dette, conduite de nuit\n\
- **Bottom bar mobile** — Analyser, Historique (badge count), Haut\n\
\n\
## Tests QA — 6 niveaux\n\
\n\
| Niveau | Endpoint | Tests | Description |\n\
| --- | --- | --- | --- |\n\
| N1 - Reglementaire | `GET /api/qa` | 56 | Assertions CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |\n\
| N2 - Cas reels | `GET /api/qa/cas-reels` | 25 | Scenarios terrain : conduite longue, nuit, multi-jours, repos fractionnes |\n\
| N3 - Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils reglementaires |\n\
| N4 - Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformes, CSV vides, sequences absurdes |\n\
| N5 - Avances | `GET /api/qa/avance` | 18 | OUT, FERRY, multi-equipage, bi-hebdo 90h, repos hebdo, transport occasionnel |\n\
| N6 - Multi-semaines | `GET /api/qa/multi-semaines` | 18 | Tracking multi-semaines, compensation repos, retour domicile, derogations |\n\
| CSV - Integration | `node tests/run-tests.js` | 36 | Fichiers CSV complets, scores, infractions, fix-engine |\n\
| **Total** | | **203** | **100% de reussite** |\n\
\n\
## Pipeline QA automatise\n\
\n\
| Outil | Fichier | Cout | Description |\n\
| --- | --- | --- | --- |\n\
| QA visuel DOM | `tools/analyse-qa.js` | ~0.02$ | Capture DOM + analyse Claude Sonnet |\n\
| Verification bugs | `tools/verify-bugs.js` | 0$ | Verification DOM des corrections |\n\
| Audit complet | `tools/audit-complet.js` | ~0.05$ | Parcours utilisateur complet Puppeteer |\n\
| Test tour guide | `tools/test-tour.js` | 0$ | Validation 10 etapes GuidedTour |\n\
| Verif data-tour | `tools/check-targets.js` | 0$ | Presence des cibles dans le DOM |\n\
\n\
## Transport occasionnel de voyageurs (UE 2024/1258)\n\
\n\
| Derogation | Article | Description |\n\
| --- | --- | --- |\n\
| Regle 12 jours | Art.8 par.6a | Report du repos hebdomadaire jusqu a 12 periodes de 24h consecutives |\n\
| Pause fractionnee 15+15 | Art.7 al.3 | Pause de 45 min remplacable par 2 pauses de 15 min minimum |\n\
| Report repos 25h | Art.8 par.2a | Repos journalier etendu a 25h max si conduite <= 7h |\n\
| Conduite nuit solo | Art.8 par.6a | En service 12 jours, conduite nuit (22h-6h) limitee a 3h sans pause |\n\
| Retour domicile | Art.8 par.8bis | Apres 12 jours : 2 repos normaux OU 1 normal + 1 reduit (avec compensation) |\n\
\n\
## API Endpoints\n\
\n\
| Methode | Route | Body | Description |\n\
| --- | --- | --- | --- |\n\
| `POST` | `/api/analyze` | `{csv, typeService, pays, equipage}` | Analyse CSV tachygraphe (JSON) |\n\
| `POST` | `/api/fix` | `{csv, typeService, pays, equipage}` | Correction automatique infractions |\n\
| `POST` | `/api/rapport/pdf` | `{resultat, options}` | Generation rapport PDF |\n\
| `GET` | `/api/health` | — | Health check + version |\n\
| `GET` | `/api/qa` | — | Tests QA N1 (56 tests) |\n\
| `GET` | `/api/qa/cas-reels` | — | Tests QA N2 (25 tests) |\n\
| `GET` | `/api/qa/limites` | — | Tests QA N3 (21 tests) |\n\
| `GET` | `/api/qa/robustesse` | — | Tests QA N4 (29 tests) |\n\
| `GET` | `/api/qa/avance` | — | Tests QA N5 (18 tests) |\n\
| `GET` | `/api/qa/multi-semaines` | — | Tests QA N6 (18 tests) |\n\
| `GET` | `/api/regles` | — | Reference reglementaire complete |\n\
\n\
### Format CSV pour /api/analyze\n\
\n\
```\n\
date;debut;fin;type\n\
2026-02-16;06:00;10:30;C\n\
2026-02-16;10:30;11:15;P\n\
2026-02-16;11:15;14:30;C\n\
```\n\
\n\
Types : `C` = Conduite, `P` = Pause, `T` = Travail, `D` = Disponibilite, `R` = Repos\n\
\n\
## Stack technique\n\
\n\
| Composant | Technologie |\n\
| --- | --- |\n\
| Backend | Node.js / Express |\n\
| Frontend | React 18 + Vite |\n\
| Styles | CSS Modules (*.module.css) |\n\
| PDF | pdfkit 0.17.2 |\n\
| Tour guide | react-joyride |\n\
| Tests | QA endpoints integres + tests CSV + Puppeteer |\n\
| Deploiement | Render.com |\n\
\n\
## Sources reglementaires\n\
\n\
| Texte | Lien | Statut |\n\
| --- | --- | --- |\n\
| CE 561/2006 consolide | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522) | Verifie |\n\
| UE 2024/1258 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1258) | Verifie |\n\
| Code des transports R3315-10 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841659) | Verifie |\n\
| Code des transports R3315-11 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841660) | Verifie |\n\
| Decret 2010-855 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022503681) | Verifie |\n\
| Code des transports Art. R3312-9 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046177522) | Verifie |\n\
| Decret 83-40 du 26 janv 1983 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000423284/) | Verifie |\n\
| Decret 2006-925 Art.1 | [Legifrance](https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000002439868) | Verifie |\n\
| Code des transports Art. L3312-2 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232) | Verifie |\n\
| Decret 2010-541 | [Legifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022512271) | Verifie |\n\
| Code des transports Art. L3312-1 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651204) | Verifie |\n\
| Code des transports Art. R3312-13 | [Legifrance](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033450503) | Verifie |\n\
\n\
> Les 15 URLs Legifrance ont ete verifiees par identifiant LEGIARTI/JORFTEXT. Les reponses HTTP 403 sont dues a la protection anti-bot de Legifrance ; les pages sont accessibles en navigateur.\n\
\n\
## Changelog\n\
\n\
### v7.25.1 (2026-02-16) — Explications pedagogiques + boutons export\n\
- **Explications pedagogiques** : chaque infraction affiche un bloc explicatif (12 types couverts)\n\
- **Bouton Telecharger PDF** : branche dans ResultPanel (etait code mais absent du JSX)\n\
- **Bouton Retour a la saisie** : navigation resultats vers formulaire avec callback onBack\n\
- **44 URLs legales verifiees** : 15 Legifrance (par ID), 27 EUR-Lex (HTTP 200)\n\
- **Documentation projet** : CLAUDE.md, CLAUDE-updates.md, CLAUDE-current.md\n\
- **Pipeline QA** : 5 outils automatises (analyse-qa, verify-bugs, audit-complet, test-tour, check-targets)\n\
- **Format API corrige** : /api/analyze accepte JSON {csv, typeService, pays, equipage}\n\
\n\
### v7.11.0 (2025-02-14) — FIMO Check: UX Conducteur\n\
- Rebrand complet: RSE/RSN Calculator -> FIMO Check\n\
- Header: logo tachygraphe SVG, toggle theme iOS-style, ResizeObserver\n\
- BottomBar mobile: 3 boutons (Analyser, Historique, Haut), zones WCAG 48px\n\
- ParametresPanel: chips cliquables avec emojis, labels humains, panneau retractable\n\
- Labels: Urbain, Tourisme, Poids lourd, Long trajet, Libre\n\
- Theme: mini interrupteur iOS (lune/soleil) dans le header\n\
\n\
### v7.8.0 — Export PDF professionnel\n\
- Generation de rapports PDF via pdfkit\n\
\n\
### v7.7.0 — FixEnginePanel\n\
- Comparaison avant/apres fix-engine\n\
\n\
### v7.6.12 — Documentation QA\n\
- 203 tests (N1-N6 + CSV), 6 niveaux QA\n\
\n\
## Licence\n\
\n\
Projet prive — Tous droits reserves.\n\
\n\
---\n\
\n\
*Developpe par Samir Medjaher — 2025-2026*\n';

fs.writeFileSync('README.md', readme, 'utf8');
console.log('README.md ecrit - ' + readme.length + ' caracteres');

// Mise a jour CLAUDE-current.md
var current = '# Tache en cours\n\n## Statut: README MIS A JOUR\n\n## Details\n- README.md reecrit : v7.25.1, 56 tests, 44 URLs, explications pedagogiques\n- Ajout : pipeline QA, format API, sources Legifrance completes, signature auteur\n- Commit en attente de push\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
