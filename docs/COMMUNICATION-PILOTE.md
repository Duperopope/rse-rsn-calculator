# Communication publique — brouillon non publié

## Matrice des affirmations

| Formulation | Statut | Preuve/condition |
| --- | --- | --- |
| « pilote open source de pré-contrôle » | Autorisée après fusion et URL stable | dépôt public + licence + parcours accessible |
| « 35 tests fonctionnels et 167 contrôles QA passent » | Autorisée avec lien vers la CI du commit | GitHub Actions verte |
| « réception chiffrée de fichiers DDD/C1B/V1B » | Autorisée avec limite immédiate | tests API ; préciser qu'ils ne sont pas décodés |
| « analyse les fichiers tachygraphe » | Interdite actuellement | parseur/signatures/comparaison absents |
| « conforme », « certifié », « inviolable », « RGPD » | Interdite | validation/organisme/preuve absents |
| « économise X € » ou « évite X amendes » | Interdite sans mesure terrain | aucune donnée économique réelle |
| « prêt pour une entreprise » | Interdite actuellement | organisation, MFA, hébergement et pilote manquants |

## Proposition d'article LinkedIn

> **FIMOCheck : transformer un prototype en outil vérifiable**
>
> J'ai repris un ancien projet consacré aux temps de conduite et de repos. Le
> premier objectif n'était pas d'ajouter des fonctions, mais d'enlever les
> ambiguïtés : distinguer un planning saisi manuellement d'un vrai fichier
> tachygraphe, sourcer les règles et faire échouer la publication lorsqu'une
> protection critique manque.
>
> La version pilote propose aujourd'hui un pré-contrôle pédagogique de journée
> conducteur. Elle explique les alertes, conserve les analyses choisies dans un
> espace chiffré et offre un centre d'exploitation fondé sur des mesures réelles.
> Sa chaîne automatisée exécute 35 tests fonctionnels, 167 contrôles QA, des
> scénarios de sécurité, puis une sauvegarde/restauration dans un conteneur
> durci.
>
> Un premier socle permet aussi de recevoir un original DDD/C1B/V1B de façon
> chiffrée. Je préfère être très clair : ces fichiers ne sont pas encore décodés
> et FIMOCheck ne revendique ni certification ni remplacement d'un outil métier
> validé. Le prochain travail porte précisément sur un corpus anonymisé, la
> vérification des signatures et la comparaison indépendante des résultats.
>
> Ce projet est développé avec une assistance IA importante. Mon travail porte
> notamment sur le besoin, la critique, les choix produit et l'obligation de
> vérifier ce qui est généré. La CI et les limites publiées comptent davantage
> qu'une promesse de « code parfait ».
>
> Je cherche quelques conducteurs, formateurs FIMO/FCO et exploitants voyageurs
> volontaires pour tester le parcours de pré-contrôle, sans données nominatives
> de production. Quelles informations vous manquent réellement avant d'affecter
> une journée à un conducteur ?

## Conditions avant publication

- pull request fusionnée et CI verte sur le commit publié ;
- URL HTTPS stable, stockage persistant et parcours testé depuis l'extérieur ;
- page sécurité et limites accessibles depuis l'application ;
- capture ordinateur/mobile réalisée sur la version publique ;
- formulaire de retour avec information de conservation ;
- relecture finale par le propriétaire avant l'action LinkedIn.

Ce fichier est un brouillon de travail. Sa présence dans Git n'autorise pas sa
publication automatique.
