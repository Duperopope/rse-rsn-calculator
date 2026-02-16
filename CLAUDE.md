# CLAUDE.md - Contexte projet pour LLM

## Projet
- Nom : FIMO Check (RSE/RSN Calculator)
- Repo : https://github.com/Duperopope/rse-rsn-calculator.git
- Auteur : Samir Medjaher
- Description : App verification conformite temps conduite/repos transport routier (CE 561/2006, Decret 2006-925)

## Stack technique
- Backend : Node.js (server.js + fix-engine.js + pdf-generator.js)
- Frontend : React 18 + Vite (client/)
- CSS : CSS Modules (*.module.css)
- PDF : pdfkit 0.17.2
- Tour guide : react-joyride
- Port : 3001

## Commandes essentielles
- cd ~/rse-rsn-calculator
- node server.js (demarrer serveur)
- cd client && npm run build && cd .. (rebuild frontend)
- curl http://localhost:3001/api/health (verifier serveur)

## Conventions OBLIGATOIRES

### Terminal / Termux
- Presse-papiers : toujours terminer par | termux-clipboard-set && echo COLLE ICI
- Pas de /tmp : ecrire scripts dans le projet (tools/ ou racine)
- Pas de placeholder : tout code doit etre complet et executable
- Pas de page.waitForTimeout : utiliser function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
- Scripts Node : creer un fichier .js separe puis executer avec node fichier.js
- Resultats dans le presse-papiers : utilisateur colle la sortie dans le chat

### Git
- Messages commit en francais, format conventionnel (feat/fix/chore)
- Toujours git add -A && git commit -m ... && git push origin main
- Ne jamais committer .env
- Mettre a jour README.md a chaque push significatif (feat/fix) : version, stats, changelog, nouvelles sections si besoin
- Le README est la vitrine publique du projet : toujours synchronise avec la realite du code

### Code
- JAMAIS coder une feature visuelle complexe sans planifier l UX AVANT (maquette, flux, donnees necessaires, references)
- JAMAIS creer un moteur de calcul cote client si le backend fait deja le calcul (source unique = backend)
- JAMAIS empiler des patches sur du code bugge : supprimer et repartir clean
- Toujours verifier si les donnees sont multi-jours ou jour unique avant de les passer en props
- Pas de code inline complexe dans bash (utiliser cat > fichier.js)
- Expliquer ce quon fait avant de le faire
- Logger chaque etape (console.log avec prefixe)
- Mettre a jour CLAUDE-current.md a chaque etape importante (debut tache, fichier modifie, build, commit)
- Format: node -e "require(fs).writeFileSync(CLAUDE-current.md, contenu)" integre dans la commande

## Lecons apprises (conventions derivees)
- Ne jamais creer de moteur de calcul doublon cote client : le backend est la source unique
- Ne pas empiler des patches sur du code bugge : repartir clean
- Toujours verifier si les donnees sont multi-jours ou jour unique avant de les passer en props
- Planifier l UX (maquette, references) AVANT de coder une feature visuelle complexe
- Reference UX tachygraphe : tachogram.com (standard industrie)


## Systeme de memoire (3 niveaux)
- CLAUDE.md : conventions permanentes, stack, regles (ne grossit pas) — charge a chaque session
- CLAUDE-current.md : etat PRESENT du projet, reecrit a chaque fin de session (max 40 lignes) — charge a chaque session
- CLAUDE-updates.md : journal condense (1 ligne/session), vieilles sessions dans archives/ — charge uniquement si besoin
- Debut de session : utilisateur colle CLAUDE.md + CLAUDE-current.md (alias clx)
- Fin de session : reecrire CLAUDE-current.md + ajouter 1 ligne dans CLAUDE-updates.md


## Pipeline QA (4 couches)
- Couche 1 (auto/chaque push) : node tools/pre-deploy.js — build, syntaxe, API health, analyze
- Couche 2 (auto/chaque feature) : node tools/test-parcours.js — 5 parcours Puppeteer (chargement, saisie, analyse, resultats, PDF)
- Couche 3 (LLM/avant deploy important) : screenshots + audit visuel via API Mammouth (~0.05$)
- Couche 4 (humain/5min) : CHECKLIST.md — 15 points a verifier sur telephone
- Regle : JAMAIS deployer une feature sans au moins couches 1+2. Couches 3+4 avant release importante.

## Outils QA (dans tools/)
- tools/analyse-qa.js : QA visuel rapide DOM + Claude Sonnet (~0.02$)
- tools/verify-bugs.js : Verification DOM des bugs IA (0$)
- tools/audit-complet.js : Audit complet parcours utilisateur (~0.05$)
- tools/test-tour.js : Test 10 etapes GuidedTour (0$)
- tools/check-targets.js : Verifie data-tour dans le DOM (0$)

## API Mammouth
- Cle : dans .env (MAMMOUTH_API_KEY)
- Endpoint : https://api.mammouth.ai/v1/chat/completions
- Modele QA : claude-sonnet-4-5
- Budget : 4$/mois
- 55 modeles disponibles

## Structure fichiers cles
- server.js : API backend + moteur de calcul
- fix-engine.js : Moteur de correction/analyse
- pdf-generator.js : Generateur rapports PDF
- client/src/pages/Calculator.jsx : Page principale
- client/src/components/forms/JourFormulaire.jsx : Formulaire jour + activites
- client/src/components/forms/ParametresPanel.jsx : Selecteurs Urbain/FR/Solo/Manuel
- client/src/components/layout/Header.jsx : En-tete
- client/src/components/layout/Footer.jsx : Pied de page
- client/src/components/layout/BottomBar.jsx : Barre mobile
- client/src/components/layout/GuidedTour.jsx : Tour guide 10 etapes
- client/src/components/results/ResultPanel.jsx : Resultats + bouton PDF
- client/src/components/results/TrackingDashboard.jsx : Dashboard suivi
- client/src/components/gauges/PanneauJauges.jsx : Jauges visuelles
- client/src/components/history/HistoriquePanel.jsx : Historique analyses
- client/src/styles/global.css : Styles globaux + min font-size mobile
- tools/ : Scripts QA et utilitaires

## data-tour disponibles
- Visibles au chargement : header, params, jour-tabs, templates, activite, ajouter, input
- Apres interaction : timeline, gauges, results, tracking, history
- Caches (taille 0) : analyser, help, bottom-tabs

## API endpoints
- GET /api/health : etat du serveur
- POST /api/analyze : body JSON {csv: "lignes CSV", typeService: "SLO", pays: "FR", equipage: "solo"}
- POST /api/rapport/pdf : generation PDF (body: {resultat, options})

## Format CSV pour /api/analyze
- date;debut;fin;type
- Types : C=conduite, P=pause, T=travail, D=disponibilite, R=repos

## Regles metier principales
- Conduite continue max : 4h30 puis pause 45min
- Repos journalier normal : 11h (reductible 9h, 3x/semaine)
- Amplitude journaliere max : 13h (SLO)
- 29 pays supportes
- Double reglementation : CE 561/2006 (europeen) + Decret 2006-925 (francais)

## Taches en attente
Aucune tache en attente - toutes completees le 2026-02-16

## Environnement
- Device : Samsung (Termux, Android)
- CPU : 5700 X3D, 32GB RAM (desktop pour dev VS Code)
- Node : v24.13.0
- Chromium : via Termux pkg
- Puppeteer : puppeteer-core