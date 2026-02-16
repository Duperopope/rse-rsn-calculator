# CLAUDE-updates.md - Journal des mises a jour

## Format
- Chaque entree est ajoutee EN BAS du fichier
- On ne modifie JAMAIS les entrees precedentes
- On ne supprime JAMAIS de contenu
- Date obligatoire pour chaque entree

## 2026-02-16
- Session initiale : 9 commits pousses
- QA visuel : 31 bugs fixes, 0 restant
- GuidedTour : v3.1, 10 etapes, teste OK
- PDF : fonctionnel (pdfkit 0.17.2)
- Pipeline QA : analyse-qa.js + verify-bugs.js + audit-complet.js
- API Mammouth : claude-sonnet-4-5 pour QA visuel
- CLAUDE.md cree et pousse (e2ea934)

## 2026-02-16 - Session 2
- Bouton Telecharger PDF branche dans ResultPanel (etait code mais pas dans JSX)
- Bouton Retour a la saisie ajoute avec callback onBack
- Erreurs Rollup react-joyride : resolues (build clean, 0 warning)
- URLs legales : 44 testees, 27 EUR-Lex OK, 16 Legifrance 403 (anti-bot, OK en navigateur)
- Toutes taches en attente completees
- Prochaines taches : a definir

## 2026-02-16 - Session 3
- Boutons Telecharger PDF + Retour a la saisie ajoutes dans ResultPanel
- Explications pedagogiques dans InfractionCard (12 types, zero LLM)
- Format API /api/analyze corrige dans CLAUDE.md (JSON avec cle csv)
- Convention CLAUDE-current.md auto-update dans workflow
- Alias cls = clear, clx = contexte presse-papiers
- Commits: 9813316, 6e47723, 196d632, eddef05

## 2026-02-16 - Session 4
- README.md reecrit et pousse (v7.25.1, 56 tests, 44 URLs, explications pedagogiques)
- Convention README auto-update ajoutee dans CLAUDE.md section Git
- Timeline : 5 iterations (v1 -> v5), conclusion = timeline clean sans moteur infraction
  - v2: track 64px, fusion zones, bandes nuit
  - v3: suppression double moteur, ajout stats chips
  - v4: drapeaux backend style Tachogram (bugge: crash ecran noir, mauvais positionnement)
  - v5: retour a l essentiel, zero drapeau, zero crash
- Fix navigation InfractionCard -> Timeline (callback onNavigateTimeline via Calculator)
- Lecon apprise: ne pas empiler des patches, repartir clean quand ca diverge
- Lecon apprise: ne pas creer de moteur doublon cote client quand le backend fait deja le calcul
- Lecon apprise: verifier les props multi-jours vs jour actif avant de passer des donnees
- Prochaine session: timeline multi-jours intelligente (planifier UX avant de coder)
- Source UX reference: tachogram.com (drapeaux au-dessus du track, couleurs par severite)
- Commits: 2962c9b, 7a9135d, d449ae4, 2749746, 7b92795, 09bfda5, 32c8d1a, 8c33af6, 4567b97
