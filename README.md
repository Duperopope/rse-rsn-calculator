# RSE/RSN Calculator

> Calculateur de conformite des temps de conduite et de repos pour le transport routier.
> Reglementation europeenne CE 561/2006, Code des transports francais (L3312-1/2), Decret 2010-855.

## Statut

| Element | Valeur |
|---------|--------|
| Backend | v6.3.1 |
| Frontend | v6.0.0 |
| Tests automatises | **144/144 (100%)** |
| Couverture reglementaire | 100% |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Tests QA - 5 niveaux

| Niveau | Endpoint | Tests | Description |
|--------|----------|-------|-------------|
| N1 - Reglementaire | `GET /api/qa` | 56 | Assertions CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |
| N2 - Cas reels | `GET /api/qa/cas-reels` | 25 | Scenarios terrain : conduite longue, nuit, multi-jours, repos fractionnes |
| N3 - Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils reglementaires |
| N4 - Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformes, CSV vides, sequences absurdes |
| N5 - Avances | `GET /api/qa/avance` | 13 | OUT, FERRY, multi-equipage, bi-hebdo 90h, repos hebdo, scenarios combines |
| **Total** | | **144** | **100% de reussite** |

## Types d activite tachygraphe

Symboles conformes au reglement CE 3821/85 Annexe IB et reglement 165/2014.

| Code | Activite | Symbole | Reglementation |
|------|----------|---------|----------------|
| `C` | Conduite | Volant | CE 561/2006 Art.6 - temps de conduite |
| `T` | Autre tache | Marteaux croises | Directive 2002/15/CE Art.3(a) - travail hors conduite |
| `D` | Disponibilite | Carre barre (/) | Directive 2002/15/CE Art.3(b) - attente, couchette vehicule en mouvement |
| `P` | Pause | Lit | CE 561/2006 Art.7 - pause obligatoire 45 min apres 4h30 |
| `R` | Repos | Lit (plein) | CE 561/2006 Art.8 - repos journalier 11h (9h reduit) |
| `O` | Hors champ (OUT) | Cercle barre | CE 561/2006 Art.9 par.3 - vehicule hors scope, suspend le calcul |
| `F` | Ferry / Train | Bateau | CE 561/2006 Art.9 par.1 - repos interruptible 2x max (1h total), couchette requise |

## Regles implementees

### Conduite (CE 561/2006 Art.6-7)
- Conduite continue max 4h30, pause 45 min obligatoire (Art.7)
- Conduite journaliere max 9h, derogatoire 10h max 2x/semaine (Art.6 par.1)
- Conduite hebdomadaire max 56h (Art.6 par.2)
- Conduite bi-hebdomadaire max 90h sur fenetre glissante 14 jours (Art.6 par.3)

### Repos (CE 561/2006 Art.8)
- Repos journalier normal 11h / reduit 9h (Art.8 par.2)
- Repos hebdomadaire normal 45h / reduit 24h (Art.8 par.6)
- Delai max 6 periodes de 24h entre repos hebdomadaires
- Compensation repos reduit avant fin 3e semaine suivante (Art.8 par.6b)

### Multi-equipage (CE 561/2006 Art.8 par.5)
- Parametre `equipage` : `solo` (defaut) ou `double`
- En double : repos 9h dans les 30h (au lieu de 24h en solo)

### Ferry / Train (CE 561/2006 Art.9 par.1)
- Repos interruptible max 2 fois, total max 1h
- Acces couchette/cabine requis
- Ferry programme >= 8h pour repos hebdomadaire
- Temps ferry avec couchette = repos

### Hors champ / OUT (CE 561/2006 Art.9 par.3)
- Temps OUT ne compte ni en conduite, ni en travail, ni en repos
- Suspend le calcul des seuils reglementaires

### Travail de nuit (L3312-1)
- Travail total max 10h si activite entre 0h et 5h

### Amplitude (L3312-2)
- Service regulier >50km : max 13h
- Service occasionnel : max 14h

### Sanctions (R3315-10, R3315-11)
- 4e classe : 135 euros forfaitaire, max 750 euros
- 5e classe : max 1500 euros, recidive 3000 euros
- Delits : falsification, absence tachygraphe (1 an + 30 000 euros)

## Sources reglementaires

- [CE 561/2006 consolide 31.12.2024 (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R0561-20241231)
- [Code des transports L3312-1 (Legifrance)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023083578)
- [Decret 2010-855 (Legifrance)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022498530)
- [Reglement 165/2014 - tachygraphe (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=celex:32014R0165)
- [CE 3821/85 Annexe IB - symboles (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:31985R3821)
- [Reglement 2020/1054 - Art.9 ferry (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=celex:32020R1054)
- [EC Guidance Note 6 - Ferry/Train](https://transport.ec.europa.eu/document/download/0084e7e3-abd9-4e0d-afc1-aa1dcd49621f_en)
- [Guide temps de travail (Ministere)](https://travail-emploi.gouv.fr/droit-du-travail/la-duree-du-travail)

## API REST

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/analyze` | Analyse de conformite (JSON/CSV, params: typeService, pays, equipage) |
| `GET` | `/api/health` | Etat du serveur et version |
| `GET` | `/api/qa` | N1 - Assertions reglementaires (56) |
| `GET` | `/api/qa/cas-reels` | N2 - Cas reels (25) |
| `GET` | `/api/qa/limites` | N3 - Tests aux limites (21) |
| `GET` | `/api/qa/robustesse` | N4 - Robustesse (29) |
| `GET` | `/api/qa/avance` | N5 - Scenarios avances (13) |
| `GET` | `/api/regles` | Regles reglementaires completes |
| `GET` | `/api/pays` | Liste des 29 pays supportes |

## Format CSV

```
DATE;HEURE_DEBUT;HEURE_FIN;TYPE_ACTIVITE
2025-01-15;06:00;08:30;C
2025-01-15;08:30;09:15;P
2025-01-15;09:15;11:45;C
2025-01-15;11:45;12:00;T
2025-01-15;12:00;15:00;O
2025-01-15;15:00;23:00;F
```

Types : `C` Conduite, `T` Autre tache, `D` Disponibilite, `P` Pause, `R` Repos, `O` OUT, `F` Ferry.

## Architecture frontend v6.0.0

```
client/src/
  App.jsx (21 lignes)        config/constants.js (7 types)
  hooks/ (4 fichiers)        utils/ (3 fichiers)
  components/common/         components/icons/TachyIcons.jsx
  components/gauges/         components/timeline/
  components/forms/          components/results/
  components/layout/         pages/Calculator.jsx (185 lignes)
  styles/global.css
```

46 fichiers modulaires, CSS Modules, React hooks natifs, Vite.
Bundle : 184 KB JS (59 KB gzip) + 28 KB CSS (5.7 KB gzip).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite 5 |
| Styles | CSS Modules |
| Icones | SVG tachygraphe (CE 3821/85) |
| Deploiement | Render (free tier) |
| Tests | QA integre (5 niveaux, 144 tests) |

## Installation locale

```bash
git clone https://github.com/Duperopope/rse-rsn-calculator.git
cd rse-rsn-calculator
npm install
cd client && npm install && npx vite build && cd ..
node server.js
# http://localhost:3001
```

## Changelog

### v6.3.1 - Multi-conducteur deux onglets (2025-02-12)

- Onglets Conducteur 1 / Conducteur 2 en mode double equipage (Art.8 par.5)
- Backend accepte csv2 : analyse independante des deux conducteurs
- useAnalysis.js : parametre csv2 conditionnel
- Icone Autre tache : marteaux croises sans cadre (Reglement 165/2014 Art.34)
- 144/144 tests QA sur 5 niveaux

### v6.2.0 - Multi-equipage + repos hebdo + N5 (2025-02-12)
- Multi-equipage Art.8 par.5 : parametre equipage solo/double
- Bi-hebdomadaire Art.6 par.3 : verification 90h fenetre glissante 14 jours
- Derogation 10h Art.6 par.1 : comptage max 2 jours/semaine
- Repos hebdomadaire Art.8 par.6 : detection 45h/24h, delai 6 jours, compensation
- Tests N5 : 13 scenarios avances (OUT, FERRY, multi, bi-hebdo, repos hebdo, combines)
- 144/144 tests QA sur 5 niveaux

### v6.1.0 - Icones tachygraphe + OUT/FERRY (2025-02-12)
- Icones SVG conformes CE 3821/85 Annexe IB
- Ajout types OUT (Art.9 par.3) et FERRY (Art.9 par.1)
- 7 types d activite (C, T, D, P, R, O, F)
- 131/131 tests QA

### v6.0.0 - Frontend modulaire (2025-02-12)
- Refonte 1182 lignes vers 46 fichiers modulaires
- App.jsx 21 lignes, CSS Modules, hooks personnalises

### v5.7.4 - Stabilisation QA
- 102/102 tests N1-N3, ajout N4 robustesse (29 tests)

## Auteur

Samir Medjaher - [GitHub](https://github.com/Duperopope)

## Licence

MIT