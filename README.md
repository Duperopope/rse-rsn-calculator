# RSE/RSN Calculator

> Calculateur de conformite des temps de conduite et de repos pour le transport routier.
> Reglementation europeenne CE 561/2006 (modifie par UE 2024/1258), Code des transports francais (L3312-1/2), Decret 2010-855.

## Statut

| Element | Valeur |
|---------|--------|
| Version | **v7.6.11** |
| Tests automatises | **160/160 (100%)** |
| Couverture reglementaire | 100% (standard + transport occasionnel voyageurs) |
| Demo | [rse-rsn-calculator.onrender.com](https://rse-rsn-calculator.onrender.com/) |

## Tests QA - 5 niveaux

| Niveau | Endpoint | Tests | Description |
|--------|----------|-------|-------------|
| N1 - Reglementaire | `GET /api/qa` | 56 | Assertions CE 561/2006, L3312-1, R3315-10/11, seuils, sanctions, pays |
| N2 - Cas reels | `GET /api/qa/cas-reels` | 25 | Scenarios terrain : conduite longue, nuit, multi-jours, repos fractionnes |
| N3 - Limites | `GET /api/qa/limites` | 21 | Tests aux bornes sur 7 seuils reglementaires |
| N4 - Robustesse | `GET /api/qa/robustesse` | 29 | Edge cases, inputs malformes, CSV vides, sequences absurdes |
| N5 - Avances | `GET /api/qa/avance` | 18 | OUT, FERRY, multi-equipage, bi-hebdo 90h, repos hebdo, **transport occasionnel voyageurs** |
| CSV - Integration | `node tests/run-tests.js` | 36 | Fichiers CSV complets, scores, infractions, fix-engine |
| **Total** | | **160** | **100% de reussite** |

## Transport occasionnel de voyageurs (UE 2024/1258)

Le moteur integre les derogations du reglement UE 2024/1258 (24 avril 2024) pour les services occasionnels de transport de voyageurs (typeService = SLO / OCCASIONNEL) :

| Derogation | Article | Description |
|------------|---------|-------------|
| Regle 12 jours | Art.8 par.6a | Report du repos hebdomadaire jusqu'a 12 periodes de 24h consecutives |
| Pause fractionnee 15+15 | Art.7 al.3 | Pause de 45 min remplacable par 2 pauses de 15 min minimum (total >= 45 min) |
| Report repos 25h | Art.8 par.2a | Repos journalier etendu a 25h max si conduite <= 7h (max 2x par service >= 8x24h) |
| Conduite nuit solo | Art.8 par.6a | En service 12 jours, conduite nuit (22h-6h) limitee a 3h sans pause |
| Retour domicile | Art.8 par.8bis | Apres 12 jours : 2 repos normaux OU 1 normal + 1 reduit (avec compensation) |

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
- Repos journalier fractionne 3h + 9h (Art.8 par.2)
- Repos journalier reduit max 3x entre 2 repos hebdo (Art.8 par.4)
- Repos hebdomadaire normal 45h / reduit 24h (Art.8 par.6)
- Repos hebdomadaire max apres 6 periodes de 24h (Art.8 par.6)
- Compensation repos hebdomadaire reduit avant fin 3e semaine (Art.8 par.6b)
- **Report 12 jours en service occasionnel (Art.8 par.6a - UE 2024/1258)**
- **Report repos 25h si conduite <= 7h (Art.8 par.2a - UE 2024/1258)**

### Pauses (CE 561/2006 Art.7)
- Pause 45 min apres 4h30 de conduite continue
- Pause fractionnee 15 min + 30 min
- **Pause fractionnee 15 min + 15 min en service occasionnel (Art.7 al.3 - UE 2024/1258)**

### Sanctions (Code des transports francais)
- Classification 4e et 5e classe selon depassement
- Bareme R3315-10 et R3315-11 integre
- Amendes forfaitaires et maximales par type d infraction

## API Endpoints

| Methode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/analyze` | Analyse d un fichier CSV tachygraphe |
| `POST` | `/api/fix` | Correction automatique des infractions (fix-engine) |
| `GET` | `/api/health` | Health check + version |
| `GET` | `/api/qa` | Tests QA N1 - Reglementaire (56 tests) |
| `GET` | `/api/qa/cas-reels` | Tests QA N2 - Cas reels (25 tests) |
| `GET` | `/api/qa/limites` | Tests QA N3 - Limites (21 tests) |
| `GET` | `/api/qa/robustesse` | Tests QA N4 - Robustesse (29 tests) |
| `GET` | `/api/qa/avance` | Tests QA N5 - Avances (18 tests) |
| `GET` | `/api/regles` | Reference reglementaire complete |

## Stack technique

- **Backend** : Node.js / Express
- **Frontend** : React + Vite
- **Tests** : QA endpoints integres + tests CSV automatises
- **Deploiement** : Render.com

## Sources reglementaires

| Texte | Lien |
|-------|------|
| CE 561/2006 consolide (31/12/2024) | https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:02006R0561-20240522 |
| UE 2024/1258 (transport voyageurs) | https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32024R1258 |
| Code des transports R3315-10 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841659 |
| Code des transports R3315-11 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006841660 |
| Decret 2010-855 | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022503681 |

## Licence

Projet prive - Tous droits reserves.
