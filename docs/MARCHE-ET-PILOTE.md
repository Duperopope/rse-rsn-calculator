# Marché, usage réel et périmètre pilote

## Constat concurrentiel au 18 août 2026

Les acteurs établis couvrent une chaîne beaucoup plus large que FIMOCheck :

| Solution | Proposition constatée | Dépendances et modèle constatés |
| --- | --- | --- |
| [Webfleet Tachograph Manager](https://media.webfleet.com/fl_attachment/media/doc/datasheets/tacho-manager/wf-tacho-manager.en.pdf) | téléchargement automatique ou manuel, archive, rapports d'infraction, temps restants, alertes | matériel LINK/câble et tachygraphe compatible pour le téléchargement distant ; abonnement/partenaire |
| [FleetGO Tachograph Analysis](https://fleetgo.com/tachograph-analysis/) | fichiers carte et véhicule, complétude, intégrité, infractions, tableaux de bord et archive | offre cloud et devis/essai ; téléchargement distant dans l'offre élargie |
| [Tachomaster](https://www.tachomaster.co.uk/pricing/) | analyse et rapports en ligne, stockage et utilisateurs illimités | tarification annoncée à l'usage par conducteur et véhicule, essai de 28 jours |

FIMOCheck ne doit donc pas se présenter aujourd'hui comme leur remplaçant. Il
ne dispose ni du corpus, ni du matériel, ni de l'historique terrain, ni des
validations nécessaires à cette promesse.

## Besoin utile défendable maintenant

Le premier produit utile est un **pré-contrôle pédagogique de planning** :

- un conducteur prépare ou relit une journée avant le départ ;
- un formateur FIMO/FCO explique les seuils à partir de scénarios ;
- une petite exploitation vérifie manuellement une affectation avant de
  l'envoyer au conducteur ;
- chaque alerte expose le constat, la règle utilisée et une piste de correction ;
- aucune identité conducteur n'est nécessaire pour une simulation.

Ce périmètre intervient **avant** l'enregistrement tachygraphe et complète les
outils d'archive/analyse. Il ne remplace ni le tachygraphe, ni un logiciel
certifié, ni la décision d'un responsable transport.

## Segment pilote prioritaire

Le pilote doit viser 5 à 10 personnes volontaires : formateur transport,
conducteur récent et exploitant d'une petite flotte voyageurs. Il ne doit pas
commencer par une flotte complète ni par des données nominatives de production.

Trois tâches seront observées :

1. reproduire une journée connue en moins de cinq minutes ;
2. comprendre pourquoi un seuil est signalé sans aide du concepteur ;
3. corriger le planning et expliquer ce qui a changé.

Mesures minimales : taux de tâche terminée, temps, erreurs de saisie, alertes
comprises, corrections pertinentes et intention de réutilisation. Aucun revenu
prévisionnel ne sera présenté comme un revenu réalisé.

## Écart vers un outil d'entreprise

Avant une utilisation opérationnelle, il manque au minimum :

- import DDD authentifié et comparé à un logiciel tiers reconnu ;
- organisations, établissements et séparation stricte des flottes ;
- rôles exploitant, formateur, conducteur et auditeur ;
- règles de conservation configurées selon le pays et le contrat ;
- calendrier des téléchargements manquants et alertes ;
- export d'audit, API de planning et intégration au logiciel d'exploitation ;
- MFA/passkeys, journal externalisé, supervision et support incident ;
- validation réglementaire indépendante et pilote documenté.

Le téléchargement distant ajoute en plus des contraintes matérielles réelles.
Webfleet documente par exemple la nécessité d'un tachygraphe compatible, d'un
boîtier LINK et d'un câble/forfait activé : ce n'est pas une simple fonction web.

## Économie compatible avec les valeurs du projet

Le cœur de pré-contrôle peut rester gratuit et sans publicité comportementale.
Les revenus plausibles, à vérifier et non à annoncer comme acquis, portent sur :

- déploiement d'équipe et gestion d'organisation ;
- intégrations et marque blanche pour centres de formation ;
- support, paramétrage, hébergement et conservation contractuelle ;
- rapports consolidés et API, sans vendre les données des conducteurs.

Les retours utiles peuvent ouvrir temporairement des fonctions avancées, mais
jamais acheter un résultat réglementaire plus favorable. La récompense doit
être plafonnée, transparente et soumise à modération pour éviter la chasse aux
points et les faux signalements.

## Critères d'arrêt

Le pilote est suspendu si une règle critique diverge de la revue indépendante,
si une donnée d'un compte est visible par un autre, si une restauration échoue,
ou si l'interface pousse l'utilisateur à croire qu'un planning simulé vaut
preuve tachygraphe.
