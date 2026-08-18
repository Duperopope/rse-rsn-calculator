# Intégration tachygraphe — dossier de vérité

## État au 18 août 2026

FIMOCheck sait **recevoir**, dédupliquer, chiffrer, restituer et supprimer un
original portant l'extension DDD, C1B ou V1B. Le fichier reste associé au seul
compte qui l'a déposé et il est purgé après 90 jours par défaut.

FIMOCheck ne sait pas encore :

- identifier de façon probante la génération et la structure du fichier ;
- décoder les fichiers élémentaires obligatoires ;
- vérifier leurs signatures numériques ;
- convertir les activités en saisie FIMOCheck ;
- télécharger une carte ou une unité véhicule depuis un lecteur physique ;
- déclarer une compatibilité fabricant, une conformité ou une certification.

L'interface et l'API exposent ces limites. Un import n'alimente donc jamais le
calcul actuel.

## Pourquoi l'extension ne suffit pas

Le règlement d'exécution (UE) 2021/1228 impose des ensembles de fichiers
élémentaires différents selon la génération et la version. Il prévoit aussi le
téléchargement de certificats et la signature des données applicatives avec les
mécanismes de sécurité de l'appendice 11. Renommer un CSV en `.ddd` ne fournit
aucune de ces garanties.

Sources primaires :

- [Règlement d'exécution (UE) 2021/1228 — prescriptions de migration et téléchargement](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32021R1228)
- [Centre commun de recherche — autorité racine ERCA du tachygraphe intelligent](https://dtc.jrc.ec.europa.eu/dtc_erca_st.php.html)
- [ERCA — documentation, certificats racine et jeux d'essai officiels](https://dtc.jrc.ec.europa.eu/dtc_erca_official_documentation_st.php.html)
- [JRC — certificats publics délivrés par l'ERCA](https://dtc.jrc.ec.europa.eu/dtc_public_key_certificates_dt.php.html)
- [JRC — demandes de tests d'interopérabilité](https://dtc.jrc.ec.europa.eu/dtc_test_requests.php.html)

## Pipeline de qualification

| Étape | Sortie exigée | Porte de validation | État |
| --- | --- | --- | --- |
| 1. Réception | Original chiffré, SHA-256, isolation compte, purge | Tests API adverses et lecture croisée | Testé localement |
| 2. Classification | Génération, version, carte/unité, fabricant | Corpus anonymisé de référence | À faire |
| 3. Décodage | Modèle canonique sans perte + erreurs localisées | Comparaison octet/objet sur corpus | À faire |
| 4. Authentification | Chaîne de certificats et signature de chaque bloc | Certificats ERCA officiels + vecteurs négatifs | À faire |
| 5. Conversion | Activités canoniques vers le moteur FIMOCheck | Comparaison avec logiciel tiers reconnu | À faire |
| 6. Matériel | Lecteur carte et connecteur unité véhicule | Matrice appareils/OS/fabricants réelle | Bloqué par matériel |
| 7. Terrain | Résultats et ergonomie exploitables | Pilote transport + responsable compétent | À organiser |
| 8. Certification | Dossier conforme au dispositif applicable | Organisme habilité/JRC selon périmètre | Non engagée |

## Architecture cible

Le parseur sera un adaptateur isolé du moteur réglementaire :

1. `intake` conserve l'original et son empreinte ;
2. `classifier` sélectionne explicitement un profil de format ;
3. `parser` produit un objet versionné avec la provenance de chaque champ ;
4. `signature-verifier` vérifie les blocs avant toute interprétation ;
5. `normalizer` transforme les activités en modèle canonique ;
6. `comparison` confronte ce modèle à un résultat tiers de référence ;
7. le moteur FIMOCheck n'accepte que les données dont l'état de confiance est
   compatible avec le calcul demandé.

Chaque couche doit pouvoir refuser un fichier sans perdre l'original ni le
faire passer pour valide. L'ajout d'une bibliothèque open source ne constitue
pas, à lui seul, une preuve de compatibilité.

## Matériel et accès nécessaires à la suite

- un petit corpus anonymisé et légalement partageable couvrant carte conducteur
  et unité véhicule, générations 1, 2 v1 et 2 v2 ;
- les résultats correspondants exportés par un outil tiers reconnu ;
- au moins un lecteur de carte compatible PC/SC ;
- des fichiers provenant de plusieurs fabricants et versions ;
- un responsable transport ou expert tachygraphe pour la revue indépendante ;
- une procédure documentée pour anonymiser, transférer puis détruire le corpus.

Ces éléments ne doivent jamais être ajoutés au dépôt Git.
