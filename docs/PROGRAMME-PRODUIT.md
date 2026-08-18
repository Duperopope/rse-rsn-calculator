# Programme produit vérifiable

Ce document transforme le brainstorming produit en exigences contrôlables. Une
fonction n'est `terminée` que si son comportement, ses limites, ses preuves et
son retour arrière sont documentés.

## Niveaux de preuve

| État | Signification |
| --- | --- |
| Hypothèse | Idée utile, pas encore confrontée au terrain |
| Implémenté | Code présent, sans preuve suffisante d'usage réel |
| Testé | Tests automatisés reproductibles sur le périmètre déclaré |
| Observé | Utilisé dans un environnement pilote avec métriques |
| Validé | Revu par une personne compétente et indépendante |
| Certifié | Reconnu par un organisme habilité ; jamais auto-déclaré |

## Registre des exigences

| Domaine | Exigence | Preuve de sortie | État |
| --- | --- | --- | --- |
| Calcul | Résultats déterministes, sourcés et reproductibles | Fixtures verrouillées, cas limites, revue indépendante | Testé partiellement |
| Garde-fous | Un échec critique interdit la publication | Pipeline bloquant testé par scénarios négatifs | À renforcer |
| Comptes | Comptes individuels, rôles, sessions, récupération | Tests API, révocation, suppression, audit | Testé |
| Avatar | Initiales, import sûr, recadrage, suppression, caméra consentie | Fichiers adverses, portrait synthétique, QA mobile | Import testé ; caméra réelle non testée |
| Assets | Bibliothèque visuelle commune et traçable | Inventaire, licences, variantes, tests visuels | Registre SVG et parcours critiques testés ; migration restante |
| Localisation | Catalogue extensible sans texte métier en dur | Détection des clés manquantes, pseudo-langue, RTL | Socle compte FR/EN testé ; application restante |
| Données | Chiffrement, minimisation, export, purge et restauration | Tests de lecture croisée, purge et restauration | Testé localement |
| Exploitation | Centre de commandement comptes/santé/sécurité/coûts | Métriques mesurées, alertes actionnables | Pilote local testé |
| Tachygraphe | Import DDD/C1B/V1B avant connecteurs matériels | Corpus anonymisé, signatures et comparaison tierce | Réception chiffrée testée ; décodage à faire |
| Matériel | Lecteurs et téléchargement distant compatibles | Matrice VDO/Stoneridge/Actia sur appareils réels | Bloqué par matériel |
| Production | Déploiement persistant, sauvegardé et réversible | Test de restauration, supervision et rollback | Image et restauration testées ; hébergement public à qualifier |
| Économie | Gratuit utile, revenus non invasifs et traçables | Coûts/recettes réels, politique publique | Hypothèse |
| Communication | Aucune promesse supérieure aux preuves | Dossier de preuves relu avant publication | À faire |

## Portes obligatoires

### Avant fusion

- build reproductible ;
- tests fonctionnels, limites, robustesse et sécurité au vert ;
- aucune clé, donnée personnelle ou fichier tachygraphe réel dans Git ;
- revue visuelle ordinateur, mobile 320 px et navigation clavier ;
- changement documenté avec périmètre et limites.

### Avant pilote

- secrets de production injectés hors dépôt ;
- stockage persistant et chiffré ;
- sauvegarde automatique et restauration effectivement exécutée ;
- journal d'audit vérifiable ;
- procédure d'incident et de retour arrière ;
- information utilisateur et durée de conservation explicites.

### Avant communication publique

- URL publique stable ;
- parcours sans erreur bloquante ;
- chiffres issus de mesures datées ;
- validation indépendante clairement distinguée des tests internes ;
- aucune mention de certification non obtenue ;
- accord humain final sur le texte et les médias publiés.

## Interventions réservées au propriétaire

Les actions suivantes ne sont jamais automatisées sans intervention au moment
où elles ont lieu : création ou conservation d'une clé privée, activation d'un
paiement, autorisation caméra réelle, identité légale, acceptation contractuelle,
publication LinkedIn et validation réglementaire externe.
