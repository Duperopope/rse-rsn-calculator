# Résolution de l'audit FIMO Check — v8.0.0

Date : 2026-10-02

Ce document relie les constats de l'audit historique aux corrections de la v8. Il distingue ce qui est corrigé automatiquement de ce qui reste à vérifier visuellement sur le déploiement public.

| # | Constat historique | État v8 | Traitement |
| --- | --- | --- | --- |
| 1 | Contrastes dark insuffisants | Corrigé côté tokens/fallbacks | textes secondaires renforcés, anciennes valeurs #888 supprimées du runtime principal |
| 2 | Timeline tactile trop petite | Amélioré, validation E2E ajoutée | sémantique clavier + quality journey + contrôle des cibles interactives principales |
| 3 | Capture semaine noire | À revalider sur prod | le parcours Chromium ouvre explicitement la vue Semaine et échoue en cas de crash/runtime error |
| 4 | Information portée par la couleur | Amélioré | badges, textes, compteurs et libellés ARIA accompagnent les états critiques |
| 5 | Bouton Haut inutile | Corrigé antérieurement | BottomBar = Analyser / Historique / Aide |
| 6 | Saisie trop lente | Amélioré | templates, duplication, chaînage automatique fin → début suivant |
| 7 | Onboarding trop long | Corrigé | guide 4 étapes ; composant Onboarding dupliqué supprimé |
| 8 | Hiérarchie visuelle irrégulière | Amélioré | palette et composants existants consolidés sans réécriture risquée du layout |
| 9 | Palette trop saturée / plusieurs générations | Corrigé au runtime principal | palette canonique et quality gate empêchant les couleurs legacy |
| 10 | Focus visible absent | Corrigé | `:focus-visible` global sur boutons, liens, rôles interactifs et champs |
| 11 | Design system non verrouillé | Corrigé partiellement | tokens centraux + règles documentées + quality gate ; une extraction CSS plus profonde reste possible |
| 12 | Paysage timeline absent | Corrigé | PWA `orientation: any` |
| 13 | Copier jour précédent | Corrigé | duplication de journée |
| 14 | Enchaînement auto des heures | Corrigé | modification d'une fin propage le début suivant lorsqu'il était chaîné |
| 15 | Format date | Corrigé dans les synthèses principales | affichage JJ/MM utilisé dans les résultats multi-jours |

## Correctifs hors audit visuel

La v8 traite également des problèmes découverts pendant le nouvel audit :

- validation PDF backend incorrecte ;
- Helmet et rate limiting installés mais non branchés ;
- CORS ouvert globalement ;
- versions contradictoires ;
- fichier d'erreur local et fichier parasite versionnés ;
- fixture d'intégration 56 jours absente du dépôt ;
- service worker sans vraie stratégie de cache ;
- endpoint `/api/fix` documenté alors qu'il n'existe pas ;
- composant FixEnginePanel mort avec valeurs « avant » reconstruites par approximation ;
- interactions clavier incomplètes ;
- nettoyage d'upload non garanti ;
- absence d'arrêt propre pour Render.

## Définition de terminé v8

Une release v8 n'est considérée acceptable que si les couches suivantes passent :

1. syntaxe Node ;
2. quality gate statique ;
3. suite métier/réglementaire ;
4. tests API négatifs et sécurité ;
5. génération PDF réelle ;
6. build Vite production ;
7. parcours navigateur mobile et desktop ;
8. health check du déploiement public après merge.

Le chiffre historique de 203 tests reste une mesure du moteur et de ses scénarios. Il n'est plus présenté comme une preuve de couverture totale de l'application.
