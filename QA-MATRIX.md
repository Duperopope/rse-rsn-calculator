# Matrice QA produit — FIMO Check

Cette matrice complete les tests reglementaires. Un taux de reussite des regles metier ne signifie pas que 100 % du produit a ete teste.

## Gates obligatoires

| Domaine | Parcours | Attendu |
| --- | --- | --- |
| Demarrage | installation neuve, refresh, stockage existant/corrompu | aucun ecran blanc, etat recuperable |
| Onboarding | terminer, passer, relancer l aide | aucun blocage, focus coherent |
| Theme | clair, sombre, reload | contraste lisible, preference conservee |
| Parametres | service, pays, solo/duo, manuel/CSV | valeur affichee = valeur envoyee |
| Saisie | vide, template, manuel, CSV | validation claire, aucune corruption |
| Activites | ajouter, modifier, supprimer, swipe, minuit | timeline et donnees synchronisees |
| Jours | ajouter, dupliquer, supprimer, navigation | jour actif et stats exacts |
| Duo | conducteur 1/2, CSV2 absent/present | aucune confusion de conducteur |
| Analyse | valide, limites, infraction, double clic | une reponse deterministe |
| Resultats | score, alertes, infractions, sources | valeurs conformes au backend |
| Timeline | jour/semaine, clavier, tactile | navigation et focus complets |
| Historique | vide, ajout, rename, reload, suppression | persistance exacte |
| PDF | succes, erreur, long rapport | fichier PDF valide et valeurs exactes |
| Impression | A4, multi-pages | aucune commande UI imprimee |
| Reseau | offline, 400, 429, 500, timeout, reprise | messages utiles et recuperation |
| Accessibilite | clavier, zoom, reduced-motion | aucune action essentielle souris-only |
| Responsive | 320, 375, 430, 768, 1024, 1440, 1920 | aucun debordement bloquant |
| Paysage | mobile/tablette | timeline exploitable |
| Stockage | quota/corruption/interdit | fallback sans crash |
| Securite | CORS, rate-limit, gros payload, mauvais upload | rejet controle |
| Regression | 203 scenarios metier documentes | resultats attendus inchanges |
| Visuel | etats canoniques clair/sombre/mobile/desktop | changement explicite et approuve |

## Couverture automatisee actuelle

La CI execute maintenant un parcours navigateur reel en plus des tests reglementaires. Il verifie notamment le mobile 375px, l absence de debordement horizontal, les 29 pays, un template de journee, une analyse complete, la persistance du resultat et de l historique, un PDF binaire valide, le clavier sur le score, le theme persistant, le dialogue historique, le desktop, les headers securite et le CORS.

Les scenarios restant manuels dans cette matrice doivent etre automatises progressivement lorsqu ils apportent une preuve deterministe utile, plutot que de fabriquer un compteur artificiel de "100 %".

## Golden Journey

1. Ouvrir l application sur un telephone vierge.
2. Passer le guide puis le relancer depuis Aide.
3. Choisir France, occasionnel, solo.
4. Charger une journee type, modifier deux horaires et ajouter une activite.
5. Dupliquer le jour, modifier J2, ajouter J3.
6. Creer volontairement une infraction.
7. Analyser puis ouvrir l infraction et sa source officielle.
8. Passer de la timeline Jour a Semaine et revenir au jour concerne.
9. Corriger la saisie puis reanalyser et verifier le delta du resultat.
10. Generer le PDF et verifier son contenu.
11. Ouvrir l historique, renommer, recharger puis supprimer l analyse.
12. Basculer le theme, recharger la page et verifier la persistance.
13. Refaire le parcours en double equipage.
14. Simuler 429, timeout et perte reseau puis verifier la recuperation.
15. Rejouer le parcours au clavier uniquement.

## Definition de "100 %"

"100 %" signifie ici : toutes les fonctionnalites et tous les etats definis dans cette matrice disposent d au moins un test ou d une verification explicite. Les combinaisons reglementaires restent couvertes par les suites de tests deterministes et non par un parcours UI exhaustif combinatoire.
