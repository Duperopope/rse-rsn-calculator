# Etat actuel du projet

## Version: v7.25.1 (commit 7e0ba75)

## Composants existants
- Timeline24h v6 : vue Jour (blocs 24h, tooltip, labels, bandes nuit) + vue Semaine (barres empilees, stats backend, badges cliquables)
- ResultPanel : affichage resultats + bouton PDF + bouton Retour
- InfractionCard : 12 types explications pedagogiques, navigation vers timeline
- PanneauJauges : jauges circulaires conduite/amplitude/repos
- GuidedTour v3.1 : 10 etapes react-joyride
- FixEngine : moteur correction automatique
- PDF : generation via pdfkit 0.17.2

## Structure donnees backend (POST /api/analyze)
- resultat.score, resultat.infractions[], resultat.avertissements[]
- resultat.details_jours[] : {date, conduite_min, conduite_h, travail_min, pause_min, amplitude_estimee_h, conduite_continue_max_min, repos_estime_h, travail_nuit_min, infractions[], avertissements[]}
- resultat.statistiques : {conduite_totale_h, moyenne_conduite_jour_h, ...}
- resultat.tracking : {repos_reduits_journaliers, conduite_nuit_21h_6h, derogations, ...}

## Tests valides
- Backend : 56/56
- QA : 203/203
- URLs legales : 44/44 (15 Legifrance, 27 EUR-Lex)

## Navigation timeline <-> infractions
- Vue Semaine badge tap -> onglet Resultats + scroll InfractionCard
- Vue Jour barre rouge/orange sous track si infractions/alertes
- InfractionCard -> onNavigateTimeline -> onglet Saisie + scroll timeline

## Deploiement
- Render.com : https://rse-rsn-calculator.onrender.com/
- Push sur main = deploiement auto
- Render free tier : cold start 15min inactivite

## Chantiers identifies
1. Audit code mort (vestiges timeline v1-v5, scripts tools/ obsoletes)
2. Script pre-deploiement (build + tests + endpoints avant push)
3. Vue 2 Semaines dans timeline (phase 2)
4. Mode exercice FIMO