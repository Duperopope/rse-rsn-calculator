# FIMO Check v8 — Document d Architecture

## 1. Problemes actuels

### Calculator.jsx (1128 lignes) — MONOLITHE
- 19 useState, 5 useEffect, 10 fonctions internes
- Fonctions doublees solo/duo: updateJour/updateJourActif (x4 paires)
- 3 tableaux paralleles: jours, jours2, joursActifs
- Mini-jauges inline (80 lignes HTML brut) = doublon de PanneauJauges
- Navigation jours inline (70 lignes) = devrait etre un composant
- Score sticky + expand toggle = devrait etre un composant
- Animations DOM inline (querySelector + scrollIntoView)
- Variables globales: window.__nbDerogConduite, window.__amplMax

### CSS (25 fichiers, 40+ couleurs)
- Melange de 3 generations (neon #00d4ff, MD3 #60a5fa, AMOLED #3B82F6)
- Couleurs hardcodees dans le JSX inline styles
- Pas de theme unique coherent

### Orphelin
- JaugeHebdo.jsx (184 lignes) — jamais importe, a supprimer

## 2. Structure ecran cible

### Mobile (5 zones)
```
Header                    sticky top, 56px
DashboardSticky           sticky sous header
  ScoreBadge              cercle score + label
  MiniJauges              4 barres (Cont/Jour/Ampl/Pause)
  JourNav                 J1 J2 J3... + fleches + bouton +
  ExpandToggle            deployer jauges + timeline
ContentArea               scrollable
  TabBar                  Saisie | Resultats
  si saisie:
    ParametresPanel
    JourFormulaire ou CsvInput
  si resultats:
    ResultPanel
BottomBar                 fixed bottom (Analyser/Historique/Aide)
```

### Mode expanded (dashboard deploye)
```
Header
DashboardSticky
  ScoreBadge
  PanneauJauges           remplace MiniJauges
  Timeline24h             vue jour ou semaine
  JourNav
  CollapseToggle
ContentArea
  ...
BottomBar
```

## 3. Composants a creer (extraction de Calculator.jsx)

### useJours.js (hook) — fusionne gestion jours solo+duo
- Unifie jours/jours2/joursActifs en un seul etat
- updateJour(index, data)
- ajouterJour(), supprimerJour(index), dupliquerJour(index)
- Calculs derog/amplitude dans le hook (plus de window.__)
- Gere equipage solo/double en interne

### DashboardSticky.jsx (~150 lignes)
- Extrait de Calculator.jsx lignes 824-980
- Props: statsJour, resultat, expanded, onToggle
- Contient ScoreBadge + MiniJauges + slots expanded

### JourNav.jsx (~100 lignes)
- Extrait de Calculator.jsx lignes 862-935
- Props: jours, jourActifIndex, onSelect, onAdd, onDelete, onDuplicate
- Navigation horizontale scrollable + menu contextuel

### ContentTabs.jsx (~50 lignes)
- Extrait de Calculator.jsx lignes 1012-1020
- Props: activeTab, onTabChange
- Onglets Saisie | Resultats avec swipe

## 4. Composants existants (garder tels quels)

### Layout
- Header.jsx (163 lignes) — OK
- BottomBar.jsx (98 lignes) — OK
- Footer.jsx (32 lignes) — OK
- GuidedTour.jsx (211 lignes) — OK
- Onboarding.jsx (45 lignes) — OK

### Forms
- ParametresPanel.jsx (141 lignes) — OK
- JourFormulaire.jsx (525 lignes) — GROS mais fonctionnel
- CsvInput.jsx (69 lignes) — OK

### Results (chaine orchestree par ResultPanel)
- ResultPanel.jsx (258 lignes) — orchestrateur
- InfractionCard.jsx (285 lignes) — OK
- FixEnginePanel.jsx (180 lignes) — OK
- SanctionTable.jsx (132 lignes) — OK
- CalendrierSynthese.jsx (148 lignes) — OK
- RecommandationList.jsx (38 lignes) — OK
- TrackingDashboard.jsx (168 lignes) — OK

### Gauges
- PanneauJauges.jsx (280 lignes) — OK
- JaugeCirculaire.jsx (134 lignes) — OK
- JaugeLineaire.jsx (179 lignes) — OK
- JaugeHebdo.jsx (184 lignes) — SUPPRIMER (orphelin)

### Timeline
- Timeline24h.jsx (295 lignes) — OK (vue Jour + Semaine)

### Common
- Card.jsx (26 lignes) — OK
- Button.jsx (48 lignes) — OK
- Badge.jsx (11 lignes) — OK
- Loader.jsx (16 lignes) — OK
- ErrorBoundary.jsx (36 lignes) — OK

### Icons
- TachyIcons.jsx (113 lignes) — OK

## 5. Plan implementation (ordre)

### Etape 1 — Nettoyage (0 impact visuel)
1. Supprimer JaugeHebdo.jsx + JaugeHebdo.module.css
2. Creer hooks/useJours.js (extraire logique jours de Calculator)
3. Tester: build + screenshot + memes fonctionnalites

### Etape 2 — Extraction composants (0 impact visuel)
4. Creer DashboardSticky.jsx (extraire lignes 824-980)
5. Creer JourNav.jsx (extraire lignes 862-935)
6. Creer ContentTabs.jsx (extraire lignes 1012-1020)
7. Calculator.jsx passe de 1128 a ~350 lignes
8. Tester: build + screenshot + memes fonctionnalites

### Etape 3 — Theme CSS unifie (impact visuel)
9. Definir palette 12 couleurs dans global.css (deja fait)
10. Modifier les VALEURS dans chaque CSS existant (sans renommer)
11. Un fichier a la fois, rebuild + screenshot apres chaque

### Etape 4 — Polish UX
12. Animations de transition entre onglets
13. Skeleton loading
14. Vue 2 semaines
15. Mode exercice FIMO

## 6. Regles absolues
- JAMAIS reecrire un fichier CSS module entier
- JAMAIS renommer une classe CSS sans verifier le JSX
- JAMAIS modifier plus de 3 fichiers sans rebuild + screenshot
- JAMAIS supprimer une variable CSS tant que des fichiers y referent
- Calculator.jsx = orchestrateur UNIQUEMENT (imports + state + rendu)
- Toute logique metier dans hooks/ ou utils/
- Toute animation dans le CSS, pas dans le JSX