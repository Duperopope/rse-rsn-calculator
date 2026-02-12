# RSE/RSN Calculator v5.6.1

**Calculateur de conformite RSE/RSN** - Reglementation Sociale Europeenne et Nationale du transport routier de personnes

> Application web educative pour l'apprentissage et la verification des temps de conduite, repos et pauses des conducteurs de transport en commun, conforme au reglement CE 561/2006 et au Code des transports francais.

![Version](https://img.shields.io/badge/version-5.6.1-blue) ![Tests](https://img.shields.io/badge/QA-25%2F25%20(100%25)-brightgreen) ![Licence](https://img.shields.io/badge/licence-usage%20educatif-orange)

---

## Demo en ligne

**https://rse-rsn-calculator.onrender.com/**

---

## Fonctionnalites

### Analyse de conformite
- Analyse des temps de conduite (continue, journaliere, hebdomadaire) selon CE 561/2006 Art.6-7
- Verification des pauses obligatoires (45min ou fractionnee 15min + 30min) selon CE 561/2006 Art.7
- Controle des repos journaliers (11h normal, 9h reduit) selon CE 561/2006 Art.8
- Detection du travail de nuit (21h-6h, max 10h) selon L3312-1 Code des transports
- Verification de l'amplitude journaliere (13h regulier, 14h occasionnel) selon R3312-9/R3312-11
- Classification automatique des infractions en 4eme et 5eme classe avec seuils reglementaires
- Estimation des amendes forfaitaires (135E classe 4, 1500E classe 5, 3000E recidive)

### Interface utilisateur
- Saisie manuelle des activites avec pictogrammes conformes CE 3821/85 Annexe IB
- Import de fichiers CSV depuis chronotachygraphe
- Jauges temps reel (conduite continue, journaliere, amplitude)
- Timeline interactive avec zones horaires et seuils visuels
- Modeles de journees predefinis (conduite, mixte)
- Historique des analyses en localStorage
- Theme clair / sombre
- Responsive mobile
- Bareme complet des sanctions (classes 4, 5, delits)

### Support multi-pays
29 pays supportes avec gestion automatique des fuseaux horaires (heure ete/hiver) : France, Allemagne, Espagne, Italie, Belgique, Pays-Bas, Portugal, Royaume-Uni, Suisse, Autriche, Pologne, Roumanie, Grece, Bulgarie, Tchequie, Hongrie, Suede, Danemark, Finlande, Irlande, Luxembourg, Croatie, Slovaquie, Slovenie, Norvege, Maroc, Tunisie, Algerie, Turquie.

---

## Sources reglementaires

| Source | Reference |
|--------|-----------|
| Reglement europeen | CE 561/2006 Art.6, 7, 8 - Temps de conduite, pauses, repos |
| Code des transports | R3312-9, R3312-11, R3312-28 - Amplitude, conduite journaliere |
| Code des transports | L3312-1, L3312-2 - Travail de nuit, amplitude |
| Pictogrammes | CE 3821/85 Annexe IB, UE 165/2014 - Symboles chronotachygraphe |
| Sanctions | Decret 2010-855, Decret 2020-1088 - Bareme des amendes |
| EUR-Lex | [Reglement 561/2006](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32006R0561) |
| Legifrance | [Code des transports](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/) |
| Ecologie.gouv.fr | [Temps de travail conducteurs](https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes) |

---

## Pictogrammes chronotachygraphe

Les 4 pictogrammes officiels du chronotachygraphe numerique (UE 165/2014) :

| Symbole | Activite | Code CSV | Description |
|---------|----------|----------|-------------|
| Volant | Conduite | C | Conduite du vehicule |
| Marteaux croises | Autre tache | T | Travail autre que la conduite |
| Carre barre | Disponibilite | D | Temps d'attente |
| Lit | Repos / Pause | P | Pause reglementaire ou repos |

---

## Format CSV

Format attendu : `date;heure_debut;heure_fin;type`

Types : `C` (Conduite), `T` (Autre tache), `D` (Disponibilite), `P` (Pause/Repos)

Exemple :
```csv
2025-03-10;06:00;06:15;T
2025-03-10;06:15;10:30;C
2025-03-10;10:30;11:15;P
2025-03-10;11:15;15:00;C
2025-03-10;15:00;15:15;T
```

---

## API REST

| Methode | Route | Description |
|---------|-------|-------------|
| GET | /api/health | Etat du serveur, version, nombre de pays |
| GET | /api/pays | Liste des 29 pays avec fuseaux horaires |
| GET | /api/regles | Toutes les regles RSE et bareme sanctions |
| GET | /api/example-csv | Exemple de CSV multi-jours |
| POST | /api/analyze | Analyse un CSV (body: csv, type_service, pays) |
| POST | /api/upload | Upload d'un fichier CSV |
| GET | /api/qa | Tests automatises du moteur (43 checks) |
| GET | /api/qa/cas-reels | 25 scenarios QA avances (7 categories) |

---

## Tests QA - 25 scenarios (7 categories)

| Categorie | Cas | Ce qui est teste |
|-----------|-----|-----------------|
| CAT-A | 1-4 | Conformite parfaite (FR regulier, FR occasionnel, semaine 5j, Espagne UTC+2) |
| CAT-B | 5-8 | Conduite continue - seuils 270min OK, 300min 4e, 360min seuil, 390min 5e |
| CAT-C | 9-12 | Conduite journaliere - 9h30 avert, 9h45 derog, 11h 4e, 12h 5e |
| CAT-D | 13-15 | Repos journalier - conforme, 8h (4e classe), 5h30 (5e classe) |
| CAT-E | 16-19 | Amplitude - 12h50 OK, 14h30 infr, 13h30 occ OK, 15h occ infr |
| CAT-F | 20-22 | Travail de nuit - 4h OK, 8h OK, plus de 10h infraction |
| CAT-G | 23-25 | Edge cases - pause 30min reset, 25min no-reset, cumul 18h |

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Frontend | React (JSX) + Vite |
| Deploiement | Render (free tier, auto-deploy) |
| Tests | Systeme QA integre (25 cas, 100+ assertions) |
| Versioning | Git + GitHub |

---

## Installation locale

```bash
git clone https://github.com/Duperopope/rse-rsn-calculator.git
cd rse-rsn-calculator
npm install
cd client && npm install && npx vite build && cd ..
node server.js
# Ouvrir http://localhost:3001
```

---

## Structure du projet

```text
rse-rsn-calculator/
-- server.js              # Serveur Express + moteur analyse RSE + routes API + QA
-- package.json           # Dependances serveur (express, multer, cors)
-- render.yaml            # Configuration deploiement Render
-- README.md              # Cette documentation
-- client/
   -- index.html          # Shell HTML
   -- package.json        # Dependances frontend (react, vite)
   -- src/
      -- main.jsx         # Point entree React
      -- App.jsx          # Application complete (1083 lignes)
```

---

## Contexte

Ce projet a ete cree dans le cadre de la preparation du **Titre Professionnel Conducteur Transport en Commun sur Route** (Permis D + FIMO Voyageurs). Il vise a faciliter l'apprentissage de la Reglementation Sociale Europeenne (RSE) et Nationale (RSN) pour les conducteurs de transport de personnes.

---

## Auteur

**Samir Medjaher**

---

## Licence

Usage educatif. Tous droits reserves.
