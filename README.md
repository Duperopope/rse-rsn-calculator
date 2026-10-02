# FIMO Check

**Assistant de conformité des temps de conduite, pauses et repos routiers**

FIMO Check analyse des journées et périodes de conduite à partir d'une saisie manuelle ou d'un CSV. Le moteur applique les règles prises en charge du règlement CE 561/2006, de ses évolutions intégrées au projet et du Code des transports français, puis restitue les alertes, infractions, statistiques, chronologies et rapports PDF.

Le nom historique « FIMO Check » est conservé pour la version 8, mais le produit est présenté explicitement comme un outil de **conformité conduite/repos** afin d'éviter de le confondre avec un outil de validation de formation FIMO/FCO.

## État du projet

| Élément | État |
| --- | --- |
| Version application | **v8.0.0** |
| Déploiement | Render, health check `/api/health` |
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Tests métier/réglementaires historiques | **203 assertions** (N1-N6 + intégration CSV) |
| Contrôles de release v8 | syntaxe + quality gate + tests API/PDF + build + parcours navigateur |
| Démo | https://rse-rsn-calculator.onrender.com/ |
| Licence | MIT |

> Le nombre « 203 » décrit la suite de tests métier/réglementaires historique. Il ne signifie pas que 100 % de toutes les combinaisons d'interface, navigateurs et environnements possibles sont couvertes. La v8 ajoute donc des contrôles produit et navigateur distincts.

## Parcours utilisateur

1. Choisir le type de service, le pays, l'équipage et le mode de saisie.
2. Saisir une journée manuellement, appliquer un modèle ou utiliser un CSV.
3. Ajouter, dupliquer ou modifier plusieurs jours.
4. Lancer l'analyse.
5. Consulter le score, les jauges, la timeline jour/semaine, les infractions et leurs références.
6. Revenir à la saisie, corriger, réanalyser, consulter l'historique ou exporter le rapport PDF.

L'interface est mobile-first, mais la v8 autorise également l'orientation paysage, utile pour les timelines.

## Fonctionnalités

### Analyse et conformité
- analyse des temps de conduite, travail, disponibilité, pause et repos ;
- conduite continue et journalière ;
- suivi hebdomadaire et bi-hebdomadaire ;
- amplitude et travail de nuit ;
- solo et double équipage ;
- suivi multi-jours / multi-semaines ;
- règles spécifiques prises en charge pour le transport occasionnel de voyageurs ;
- enrichissement des infractions avec références légales ;
- post-traitement Fix Engine intégré à `/api/analyze` pour réduire les faux positifs.

### Interface
- jauges temps réel ;
- timeline 24 h et vue semaine ;
- modèles de journée ;
- chaînage automatique des heures lorsque les activités sont contiguës ;
- duplication et suppression de journée ;
- historique local ;
- thème sombre/clair ;
- guide interactif court en 4 étapes ;
- interactions clavier et focus visible ;
- libellés accessibles sur paramètres, dates, horaires, timeline et cartes d'infraction ;
- cibles tactiles normalisées.

### Export
- rapport PDF via pdfkit ;
- impression navigateur ;
- validation serveur des données PDF ;
- tests automatisés vérifiant qu'un vrai fichier PDF est généré.

## Design system v8

La v8 utilise une palette fonctionnelle limitée :

| Usage | Couleur |
| --- | --- |
| Action / accent | `#3B82F6` |
| Conforme / succès | `#10B981` |
| Attention | `#F59E0B` |
| Danger / infraction | `#EF4444` |
| Accent secondaire exceptionnel | `#8B5CF6` |
| Texte secondaire sombre | `#94A3B8` |

Les anciennes couleurs néon et fallbacks incohérents sont interdits par le quality gate. Les valeurs numériques utilisent des chiffres tabulaires et le focus clavier est visible.

## API publique de l'application

| Méthode | Route | Description |
| --- | --- | --- |
| `POST` | `/api/analyze` | Analyse un CSV et applique le post-traitement de conformité |
| `POST` | `/api/rapport/pdf` | Génère un rapport PDF depuis un résultat d'analyse |
| `POST` | `/api/upload` | Charge un fichier CSV/TXT, 5 Mo maximum |
| `GET` | `/api/example-csv` | Fournit un exemple CSV |
| `GET` | `/api/health` | Santé et version de l'application |
| `GET` | `/api/regles` | Référence des règles exposées par le moteur |
| `GET` | `/api/qa` | QA N1 |
| `GET` | `/api/qa/cas-reels` | QA N2 |
| `GET` | `/api/qa/limites` | QA N3 |
| `GET` | `/api/qa/robustesse` | QA N4 |
| `GET` | `/api/qa/avance` | QA N5 |
| `GET` | `/api/qa/multi-semaines` | QA N6 |

Il n'existe plus d'endpoint public `/api/fix` séparé : le Fix Engine fait partie du chemin d'analyse.

### Format CSV minimal

```text
date;debut;fin;type
2026-02-16;06:00;10:30;C
2026-02-16;10:30;11:15;P
2026-02-16;11:15;14:30;C
```

Types : `C` conduite, `P` pause, `T` travail/autre tâche, `D` disponibilité, `R` repos.

## Sécurité v8

- Helmet activé ;
- suppression de `X-Powered-By` ;
- rate limiting global API et spécifique à l'analyse ;
- CORS fermé par défaut et configurable avec `CORS_ORIGIN` ;
- limite JSON à 2 Mo ;
- upload CSV/TXT à 5 Mo avec filtre extension/MIME ;
- nettoyage des fichiers temporaires dans un `finally` ;
- erreurs API centralisées avec réponses JSON ;
- arrêt propre sur `SIGTERM` / `SIGINT` pour Render ;
- aucune clé d'API ou fichier `.env` versionné.

## QA et CI

La CI GitHub exécute à chaque push/PR :

```text
npm ci
npm run pretest
npm run quality
npm test
cd client && npm run build
npm run test:e2e
```

### 1. Tests métier et réglementaires

| Niveau | Tests historiques | Objet |
| --- | ---: | --- |
| N1 | 56 | règles principales, sanctions, pays |
| N2 | 25 | cas terrain |
| N3 | 21 | valeurs limites |
| N4 | 29 | entrées anormales / robustesse |
| N5 | 18 | cas avancés |
| N6 | 18 | multi-semaines / tracking |
| Intégration CSV | 36 | fixture canonique 56 jours + cohérence Fix Engine |
| **Total** | **203** | suite métier historique |

La fixture `tests/fixtures/test_56jours.csv` est versionnée afin que les tests soient reproductibles depuis un clone propre.

### 2. Quality gate statique

`tests/static-quality.js` bloque notamment :
- versions incohérentes ;
- disparition de la fixture ;
- fichiers parasites connus ;
- retour de `window.__*` dans le frontend ;
- retour des anciennes couleurs legacy ;
- retour de `outline: none` ;
- sécurité Express désactivée ;
- ancienne validation PDF défectueuse.

### 3. Tests API et PDF

La suite vérifie aussi :
- headers de sécurité ;
- rejet d'une analyse vide ;
- rejet d'un PDF sans score ;
- génération d'un vrai flux `application/pdf` commençant par `%PDF-`.

### 4. Parcours navigateur

`tools/test-parcours.js` démarre l'application et contrôle sur Chromium :
- mobile 390 × 844 ;
- paramètres et états ARIA ;
- modèle de journée ;
- chaînage des heures ;
- duplication / multi-jours ;
- analyse et affichage du score ;
- activation clavier ;
- timeline semaine ;
- export PDF disponible ;
- historique ;
- thème ;
- cibles interactives principales ;
- absence de débordement horizontal ;
- absence d'erreurs runtime critiques ;
- desktop 1280 × 900.

## PWA

Le service worker v8 :
- pré-cache l'app shell ;
- met en cache les ressources GET same-origin réellement récupérées ;
- exclut les API du cache ;
- nettoie les anciens caches ;
- fournit un fallback de navigation hors ligne lorsque l'app shell existe.

Le manifeste utilise `standalone` et n'impose plus le portrait.

## Déploiement Render

`render.yaml` utilise des installations reproductibles :

```text
npm ci
cd client && npm ci && npm run build
```

Render démarre `node server.js` et contrôle `/api/health`.

## Sources réglementaires documentées dans le projet

- CE 561/2006 consolidé ;
- UE 2024/1258 ;
- Code des transports, notamment L3312-1, L3312-2, R3312-9, R3312-13, R3315-10 et R3315-11 ;
- décrets référencés par le moteur et les explications.

Les URL détaillées et leur mapping vers les règles sont conservés dans le moteur. Toute évolution réglementaire doit être traitée comme une modification métier : source officielle, test de borne, test de non-régression et mise à jour de la documentation.

## Licence

MIT. Voir [LICENSE](LICENSE).

---

Développé par Samir Medjaher — 2025-2026.
