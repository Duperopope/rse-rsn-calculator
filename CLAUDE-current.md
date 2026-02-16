# CLAUDE-current.md — Etat du projet

## Date: 2026-02-16
## Dernier commit: b3ae73a (memoire session 8)
## Commit stable: 7b057a0 (refonte v1)
## Version: v7.25.2

## Etat actuel
- App fonctionnelle sur 7b057a0 (fond AMOLED, jauges epaisses, couleurs migrees)
- Build: CSS ~93kB, JS ~376kB, 150+ modules
- Audit WCAG 100% (7/7)
- Vue Semaine OK, ErrorBoundary OK

## ARCHITECTURE — AUDIT (session 8)
- Calculator.jsx = 1128 lignes MONOLITHIQUE (25+ useState, logique metier inline)
- Mini-jauges (L941-960) = DOUBLON de PanneauJauges (80 lignes HTML brut)
- Fonctions doublees solo/duo: updateJour/updateJourActif, ajouterJour/ajouterJourActif (x4)
- Variables globales bricolees: window.__nbDerogConduite, window.__amplMax
- JaugeHebdo.jsx = ORPHELIN (184 lignes, jamais importe)
- 3 tableaux paralleles: jours, jours2, joursActifs
- Animations DOM inline dans le JSX (querySelector + scrollIntoView + boxShadow)
- 29 composants, 25 fichiers CSS, 40+ couleurs uniques

## PLAN SESSION 9 — Architecture v8
Phase 1: Document architecture cible (composants, flux, conventions)
Phase 2: References visuelles + maquette textuelle
Phase 3: Implementation composant par composant avec screenshot apres chaque

## LECONS CRITIQUES
1. JAMAIS reecrire un CSS module entier — noms de classes = CONTRAT avec JSX
2. JAMAIS modifier plus de 3 fichiers sans rebuild + screenshot
3. JAMAIS supprimer variables CSS tant que des fichiers y font reference
4. Grep classes JSX AVANT de toucher un CSS
5. Verifier taille build: CSS ~93kB, JS ~376kB, 150+ modules
6. Un CSS qui perd 500 lignes = ALERTE ROUGE
7. Pour refonte: modifier VALEURS, jamais renommer classes
8. Architecture AVANT design — impossible de styler un monolithe

## Fichiers CSS — tailles de reference
- JourFormulaire: 596 lignes
- HistoriquePanel: 592 lignes  
- Calculator: 531 lignes
- Timeline24h: 363 lignes
- InfractionCard: 349 lignes
- ResultPanel: 309 lignes
- Header: 294 lignes
- ParametresPanel: 254 lignes
- FixEnginePanel: 226 lignes

## TODO prioritaire
- Architecture v8 (restructuration Calculator.jsx)
- Refonte visuelle (apres architecture)
- Features: vue 2 semaines, mode exercice FIMO
