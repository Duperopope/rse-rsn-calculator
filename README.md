# RSE/RSN Calculator

> Calculateur de conformité des temps de conduite et de repos pour le transport routier.
> Réglementation européenne CE 561/2006, Code des transports français (L3312-1/2), Décret 2010-855.

## Statut

| Élément | Valeur |
|---------|--------|
| Backend | v5.7.4 |
| Frontend | v6.0.0 |
| Tests automatisés | **131/131 (100%)** |
| Couverture réglementaire | 100% |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Tests QA — 4 niveaux

| Niveau | Endpoint | Tests | Description |
|--------|----------|-------|-------------|
| N1 — Réglementaire | `GET /api/qa` | 56 | Assertions sur CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |
| N2 — Cas réels | `GET /api/qa/cas-reels` | 25 | Scénarios terrain : conduite longue, nuit, multi-jours, repos fractionnés |
| N3 — Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils réglementaires |
| N4 — Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformés, CSV vides, séquences absurdes |
| **Total** | | **131** | **100% de réussite** |

## Sources réglementaires

- [CE 561/2006 (EUR-Lex)](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561)
- [Code des transports L3312-1 (Légifrance)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023083578)
- [Décret 2010-855 (Légifrance)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022498530)
- [Guide du temps de travail (Ministère)](https://travail-emploi.gouv.fr/droit-du-travail/la-duree-du-travail)

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/analyze` | Analyse de conformité (JSON ou CSV) |
| `GET` | `/api/health` | État du serveur et version |
| `GET` | `/api/qa` | Tests N1 — Assertions réglementaires (56) |
| `GET` | `/api/qa/cas-reels` | Tests N2 — Cas réels (25) |
| `GET` | `/api/qa/limites` | Tests N3 — Tests aux limites (21) |
| `GET` | `/api/qa/robustesse` | Tests N4 — Robustesse (29) |
| `GET` | `/api/regles` | Règles réglementaires complètes |
| `GET` | `/api/pays` | Liste des 29 pays supportés |

## Format CSV

```
DATE;HEURE_DEBUT;HEURE_FIN;TYPE_ACTIVITE
2025-01-15;06:00;08:30;C
2025-01-15;08:30;09:15;P
2025-01-15;09:15;11:45;C
```

Types d'activité : `C` (Conduite), `T` (Autre tâche), `P` (Pause), `D` (Disponibilité), `R` (Repos).

## Architecture frontend v6.0.0

Le frontend a été refactoré d'un monolithe de 1182 lignes (App.jsx) vers 46 fichiers modulaires :

```
client/src/
├── App.jsx                          # Shell minimal (21 lignes)
├── main.jsx                         # Point d'entrée React
├── config/constants.js              # Configuration centralisée
├── hooks/
│   ├── useServerHealth.js           # Polling santé serveur
│   ├── useAnalysis.js               # Appel API /analyze
│   ├── useLocalStorage.js           # Persistance historique
│   └── useTheme.js                  # Thème clair/sombre
├── utils/
│   ├── time.js                      # Conversion horaires
│   ├── stats.js                     # Calculs statistiques
│   └── csv.js                       # Parsing et validation CSV
├── components/
│   ├── common/                      # Button, Card, Badge, Loader + CSS Modules
│   ├── icons/TachyIcons.jsx         # Icônes SVG activités
│   ├── gauges/                      # JaugeCirculaire, JaugeLineaire, PanneauJauges
│   ├── timeline/Timeline24h.jsx     # Frise chronologique 24h
│   ├── forms/                       # ParametresPanel, JourFormulaire, CsvInput
│   ├── results/                     # ResultPanel, InfractionCard, RecommandationList, SanctionTable
│   └── layout/                      # Header, Footer, Onboarding
├── styles/
│   └── global.css                   # Reset, animations, responsive
└── pages/Calculator.jsx             # Page principale (185 lignes)
```

Choix techniques : pas de librairie UI externe, CSS Modules, React hooks natifs, Vite comme bundler.
Bundle : 182 KB JS (59 KB gzip) + 28 KB CSS (5.7 KB gzip).

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Frontend | React 18 + Vite 5 |
| Styles | CSS Modules |
| Déploiement | Render (free tier) |
| Tests | QA intégré (4 niveaux, 131 tests) |

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

### v6.0.0 — Frontend modulaire (2025-02-12)
- Refonte complète du frontend : 1182 lignes → 46 fichiers modulaires
- App.jsx réduit à 21 lignes (shell minimal)
- CSS Modules pour tous les composants
- Composants réutilisables : jauges, timeline, formulaires, résultats
- Hooks personnalisés : useServerHealth, useAnalysis, useLocalStorage, useTheme
- Bundle optimisé : 182 KB JS + 28 KB CSS
- Onboarding interactif avec 3 étapes
- 131/131 tests QA passent (0 régression)

### v5.7.4 — Stabilisation QA
- Correction génération CSV (newlines)
- 102/102 tests N1-N3 passent
- Ajout niveau N4 robustesse (29 tests)

### v5.7.3 — Détection nuit et service
- Correction détection service de nuit
- Ajustements seuils repos réduit

### v5.7.0 — QA Niveau 1
- Première batterie de 56 assertions réglementaires
- Moteur de calcul initial CE 561/2006

## Auteur

Samir Medjaher — [GitHub](https://github.com/Duperopope)

## Licence

MIT