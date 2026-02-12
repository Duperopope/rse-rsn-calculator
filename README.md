# RSE/RSN Calculator

> Calculateur de conformite des temps de conduite et de repos pour le transport routier.
> Reglementation europeenne CE 561/2006, Code des transports francais (L3312-1/2), Decret 2010-855.

## Statut

| Element | Valeur |
|---------|--------|
| Backend | v6.1.0 |
| Frontend | v6.0.0 |
| Tests automatises | **131/131 (100%)** |
| Couverture reglementaire | 100% |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Tests QA - 4 niveaux

| Niveau | Endpoint | Tests | Description |
|--------|----------|-------|-------------|
| N1 - Reglementaire | `GET /api/qa` | 56 | Assertions sur CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |
| N2 - Cas reels | `GET /api/qa/cas-reels` | 25 | Scenarios terrain : conduite longue, nuit, multi-jours, repos fractionnes |
| N3 - Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils reglementaires |
| N4 - Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformes, CSV vides, sequences absurdes |
| **Total** | | **131** | **100% de reussite** |

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

## Sources reglementaires

- [CE 561/2006 (EUR-Lex, version consolidee 31.12.2024)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006R0561-20241231)
- [Code des transports L3312-1 (Legifrance)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023083578)
- [Decret 2010-855 (Legifrance)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022498530)
- [Reglement 165/2014 - tachygraphe (EUR-Lex)](https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=celex:32014R0165)
- [CE 3821/85 Annexe IB - symboles tachygraphe](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:31985R3821)
- [Guide du temps de travail (Ministere)](https://travail-emploi.gouv.fr/droit-du-travail/la-duree-du-travail)
- [EC Guidance Note 6 - Ferry/Train (Commission)](https://transport.ec.europa.eu/document/download/0084e7e3-abd9-4e0d-afc1-aa1dcd49621f_en)

## API REST

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/analyze` | Analyse de conformite (JSON ou CSV) |
| `GET` | `/api/health` | Etat du serveur et version |
| `GET` | `/api/qa` | Tests N1 - Assertions reglementaires (56) |
| `GET` | `/api/qa/cas-reels` | Tests N2 - Cas reels (25) |
| `GET` | `/api/qa/limites` | Tests N3 - Tests aux limites (21) |
| `GET` | `/api/qa/robustesse` | Tests N4 - Robustesse (29) |
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

Types : `C` (Conduite), `T` (Autre tache), `D` (Disponibilite), `P` (Pause), `R` (Repos), `O` (Hors champ/OUT), `F` (Ferry/Train).

## Regles Ferry/Train (CE 561/2006 Art.9)

Le moteur applique les regles suivantes pour les traversees ferry/train :

- Le repos journalier normal ou le repos hebdomadaire reduit peut etre interrompu max **2 fois**
- Le total des interruptions ne doit pas exceder **1 heure**
- Le conducteur doit avoir acces a une **couchette/cabine**
- Pour le repos hebdomadaire : ferry programme **>= 8 heures** + acces couchette
- Le temps ferry avec couchette est comptabilise comme **repos** (pas travail/disponibilite)
- Source : [Reglement 2020/1054 modifiant Art.9](https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=celex:32020R1054)

## Regles Hors champ / OUT (CE 561/2006 Art.9 par.3)

- Le temps OUT ne compte **ni en conduite, ni en travail, ni en repos**
- Conduire un vehicule hors scope pour rejoindre un vehicule soumis = **autre tache** (Art.9 par.3)
- Le calcul des seuils reglementaires est **suspendu** pendant les periodes OUT

## Architecture frontend v6.0.0

Le frontend a ete refactore d un monolithe de 1182 lignes (App.jsx) vers 46 fichiers modulaires :

```
client/src/
  App.jsx                          # Shell minimal (21 lignes)
  main.jsx                         # Point d entree React
  config/constants.js              # Configuration centralisee (7 types activite)
  hooks/
    useServerHealth.js             # Polling sante serveur
    useAnalysis.js                 # Appel API /analyze
    useLocalStorage.js             # Persistance historique
    useTheme.js                    # Theme clair/sombre
  utils/
    time.js                        # Conversion horaires
    stats.js                       # Calculs statistiques
    csv.js                         # Parsing et validation CSV (7 types)
  components/
    common/                        # Button, Card, Badge, Loader + CSS Modules
    icons/TachyIcons.jsx           # Icones SVG tachygraphe officielles
    gauges/                        # JaugeCirculaire, JaugeLineaire, PanneauJauges
    timeline/Timeline24h.jsx       # Frise chronologique 24h
    forms/                         # ParametresPanel, JourFormulaire, CsvInput
    results/                       # ResultPanel, InfractionCard, RecommandationList, SanctionTable
    layout/                        # Header, Footer, Onboarding
  styles/
    global.css                     # Reset, animations, responsive
  pages/Calculator.jsx             # Page principale (185 lignes)
```

Choix techniques : pas de librairie UI externe, CSS Modules, React hooks natifs, Vite comme bundler.
Bundle : 184 KB JS (59 KB gzip) + 28 KB CSS (5.7 KB gzip).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite 5 |
| Styles | CSS Modules |
| Icones | SVG tachygraphe (CE 3821/85) |
| Deploiement | Render (free tier) |
| Tests | QA integre (4 niveaux, 131 tests) |

## Installation locale

```bash
git clone https://github.com/Duperopope/rse-rsn-calculator.git
cd rse-rsn-calculator
npm install
cd client && npm install && npx vite build && cd ..
node server.js
# Ouvrir http://localhost:3001
```

## Changelog

### v6.1.0 - Icones tachygraphe + OUT/FERRY (2025-02-12)
- Icones SVG conformes aux symboles officiels du chronotachygraphe
- Sources : CE 3821/85 Annexe IB, Reglement 165/2014
- Volant (conduite), marteaux croises (autre tache), barre oblique (disponibilite), lit (repos)
- Ajout type OUT (O) - hors champ CE 561/2006 Art.9 par.3
- Ajout type FERRY (F) - traversee ferry/train CE 561/2006 Art.9 par.1
- Moteur : logique Art.9 (interruption repos max 2x/1h, couchette)
- 7 types d activite supportes (C, T, D, P, R, O, F)
- 131/131 tests QA (0 regression)

### v6.0.0 - Frontend modulaire (2025-02-12)
- Refonte complete du frontend : 1182 lignes vers 46 fichiers modulaires
- App.jsx reduit a 21 lignes (shell minimal)
- CSS Modules pour tous les composants
- Hooks personnalises : useServerHealth, useAnalysis, useLocalStorage, useTheme
- Bundle optimise : 182 KB JS + 28 KB CSS
- Onboarding interactif avec 3 etapes

### v5.7.4 - Stabilisation QA
- Correction generation CSV (newlines)
- 102/102 tests N1-N3 passent
- Ajout niveau N4 robustesse (29 tests)

### v5.7.3 - Detection nuit et service
- Correction detection service de nuit
- Ajustements seuils repos reduit

### v5.7.0 - QA Niveau 1
- Premiere batterie de 56 assertions reglementaires
- Moteur de calcul initial CE 561/2006

## Auteur

Samir Medjaher - [GitHub](https://github.com/Duperopope)

## Licence

MIT