# Changelog

## v7.7.0 (2026-02-14)
### Nouveau composant : FixEnginePanel
- **Comparaison avant/apres** : affiche le delta infractions, score et amende
- **Detail des corrections** : faux positifs retires groupes par raison
- **Economie estimee** : calcul automatique de l'amende evitee
- **Design responsive** : s'adapte au theme dark/light et mobile
- **Integration** : insere entre les statistiques et les infractions dans ResultPanel

### Donnees fix-engine affichees
- Infractions originales vs finales
- Score avant vs apres correction
- Repos corriges et repos hebdomadaires detectes
- Detail par categorie (faux positif 0h, estimation imprecise, doublon, etc.)

### Technique
- FixEnginePanel.jsx (7.3 KB) + FixEnginePanel.module.css (3.6 KB)
- ResultPanel.jsx mis a jour (import + variable fixEngine + JSX)
- Build frontend: 83 modules, 222 KB JS + 53 KB CSS
- Tests backend: 36/36 (203/203 total avec QA)
 - RSE/RSN Calculator

## [7.6.12] - 2026-02-14

### Documentation
- Compteur de tests mis a jour: 160 -> **203 tests** (100%)
- Ajout N2 Cas reels (25 tests) et N6 Multi-semaines (18 tests) au decompte officiel
- README: 6 niveaux QA documentes (N1-N6 + CSV)
- Endpoint /api/qa/multi-semaines documente

### Tests decouverts (existants mais non documentes)
- N2 Cas reels: 25/25 OK
- N6 Multi-semaines: 18/18 OK (tracking, compensation, retour domicile)

---
## [7.6.11] - 2026-02-14

### Ajouts
- **5 nouveaux tests QA N5** pour le transport occasionnel de voyageurs (UE 2024/1258)
  - N5-12JOURS-01 : Regle des 12 jours consecutifs en service occasionnel (Art.8 par.6a)
  - N5-PAUSE1515-01 : Pause fractionnee 15+15 min legale (Art.7 al.3)
  - N5-PAUSE1515-02 : Pause fractionnee 10+35 min illegale (seuil 15 min non atteint)
  - N5-REPORT25H-01 : Report repos journalier 25h legal si conduite <= 7h (Art.8 par.2a)
  - N5-REPORT25H-02 : Report repos journalier 25h illegal si conduite > 7h
- Total tests : **160/160 (100%)** (anciennement 144)

### Corrections moteur de calcul
- Ajout derogation 12 jours pour services occasionnels (SLO/OCCASIONNEL) dans :
  - verifierReposHebdomadaire() : seuil dynamique 6/12 jours (L336)
  - Second generateur repos hebdo : seuilMaxHebdo dynamique (L1803)
  - Retard repos hebdo : seuilReposHebdo1006 dynamique (L1006)
  - Regle 2 repos en 2 semaines : exclusion SLO (L1780)
- Ajout detection pause fractionnee 15+15 min pour service occasionnel
  - Suppression faux positifs conduite continue en mode SLO
  - Verification seuil minimum 15 min par pause
- Toutes les modifications sont conditionnees par typeService (pas d'impact sur le mode standard)

### Sources reglementaires
- CE 561/2006 consolide au 31/12/2024 : https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522
- UE 2024/1258 (24 avril 2024) : https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1258
- Articles modifies : Art.7 al.3 (pause), Art.8 par.2a (repos 25h), Art.8 par.6a (12 jours)

### Technique
- Zero regression sur les 155 tests existants (N1:56 + N3:21 + N4:29 + N5:13 + CSV:36)
- 8 patches chirurgicaux dans server.js (+160 lignes, -13 lignes)
- Aucune modification de fix-engine.js

---

## [7.6.10.2] - 2026-02-13

### Ajouts
- Couche 2 : Validations internes fix-engine

---

## [7.6.10.1] - 2026-02-13

### Ajouts
- Couche 1 : Tests automatises (36/36 OK)
- Fix-engine production release
- Ajout @vitejs/plugin-react + nettoyage repo
- Mise a jour version server.js (7.6.9 -> 7.6.10.1)

---

## [7.6.7] - 2026-02-12

### Corrections
- Fix parser CSV : accepter noms complets (Conduite/Pause/Autre tache/Pause Repos)
- Guards multi-jours L1358+L1511-1515+L1449
- Corrige crash heure_debut undefined sur 17+ jours

---

## [7.6.6] - 2026-02-12

### Corrections
- Fix URLs QA sources (R3315-10/11 -> Legifrance officiel)
- Audit complet LIENS_LEGAUX : 23 URLs verifiees EUR-Lex/Legifrance
- Remplacement references textuelles chronocaraibes.com par R3315-10/11 Legifrance

---

## [7.6.5] - 2026-02-11

### Ajouts
- Liens legaux cliquables sur infractions et avertissements
- 21 URLs Legifrance/EUR-Lex
- Enrichissement auto backend
- ResultPanel.jsx cliquable

