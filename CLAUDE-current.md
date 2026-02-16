# CLAUDE-current.md — Etat du projet

## Date: 2026-02-16
## Dernier commit: 7b057a0 (refonte v1 stable)
## Version: v7.25.2

## Etat actuel
- App fonctionnelle, fond AMOLED #0B0D10, jauges epaisses 8px
- Couleurs inline JSX migrees (var(--danger/warning/success))
- Score badge 44px, onglets jour avec bordure accent
- Audit WCAG 100% (7/7 OK)
- Vue Semaine fonctionnelle (2 bugs fixes: useEffect + onInfractionClick)
- ErrorBoundary sur Timeline24h
- Build: CSS 93kB, JS 376kB, 150+ modules

## LECONS CRITIQUES (NE JAMAIS OUBLIER)
1. JAMAIS reecrire un fichier CSS module entier — les noms de classes sont un CONTRAT avec le JSX
2. JAMAIS modifier plus de 3 fichiers CSS sans rebuild + screenshot entre chaque
3. JAMAIS supprimer des variables CSS anciennes (--md-*) tant que des fichiers y font reference
4. Pour refonte visuelle: modifier les VALEURS dans les classes existantes, jamais renommer/supprimer
5. Toujours grep les noms de classes JSX AVANT de toucher un CSS: grep -o "styles\.[a-zA-Z]*" fichier.jsx | sort -u
6. Regex massives sur CSS = danger — verifier parentheses apres chaque remplacement
7. Un CSS module qui passe de 596 a 50 lignes = ALERTE ROUGE (classes manquantes)
8. Verifier taille build apres chaque modif: CSS ~93kB, JS ~376kB, 150+ modules

## Fichiers CSS — JAMAIS reecrire sans grep JSX avant
- Header.module.css (294 lignes, 24 classes JSX)
- BottomBar.module.css (124 lignes, 8 classes JSX)
- HistoriquePanel.module.css (592 lignes, 30+ classes JSX)
- JourFormulaire.module.css (596 lignes, 40+ classes JSX)
- Calculator.module.css (531 lignes, 50+ classes JSX)
- Timeline24h.module.css (363 lignes)
- ResultPanel.module.css (309 lignes)
- InfractionCard.module.css (349 lignes)

## TODO
- Refonte visuelle: fichier par fichier, validation apres chaque
- P3: pinch-to-zoom, copy previous day, design-system doc
- Features: vue 2 semaines, mode exercice FIMO
