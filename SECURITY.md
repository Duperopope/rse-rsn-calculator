# Sécurité de FIMOCheck

## Périmètre actuel

FIMOCheck est encore un produit pilote. L’authentification, le chiffrement applicatif, la sauvegarde restaurable, les exports et la suppression sont livrés et testés. Ne pas y importer de fichiers tachygraphe de production ni de secrets d’entreprise tant que le domaine HTTPS, l’authentification forte et l’audit indépendant ne sont pas livrés.

Le pré-contrôle manuel fonctionne sans nom de conducteur. Les données sont envoyées au serveur pour le calcul puis l’analyse choisie est conservée dans le coffre chiffré du compte afin d’alimenter l’historique. Les contributions sont stockées séparément et ne contiennent pas automatiquement le planning.

## Protections livrées

- en-têtes HTTP de sécurité et politique CSP ;
- refus de l’intégration en iframe ;
- restriction CORS aux origines configurées ;
- absence de cache pour les API ;
- limitation du débit global et des contributions ;
- taille limitée pour JSON et fichiers ;
- nettoyage des fichiers temporaires après lecture ou erreur ;
- permissions privées du répertoire et du journal de contributions ;
- suppression des caractères de contrôle dans les commentaires ;
- minimisation : aucun nom de conducteur requis ;
- aucun réseau publicitaire ni traceur tiers.
- analyses chiffrées AES-256-GCM et isolées par compte ;
- phrase secrète de 15 caractères minimum tant que le MFA n’est pas disponible ;
- cookie de production `__Host-`, Secure, HttpOnly, SameSite Strict et priorité haute ;
- API de calcul, PDF et import réservées aux sessions authentifiées ;
- purge quotidienne des sessions expirées, analyses, originaux tachygraphe et retours arrivés à échéance ;
- durée par défaut de 365 jours, configurable et affichée à l’utilisateur ;
- export et suppression autonome des analyses et du compte ;
- sauvegarde chiffrée avec restauration et détection d’altération testées.
- contrôle statique local des routes sensibles, secrets accidentels, version d’upload et durcissement Docker ;
- répétition de production en conteneur non-root, racine en lecture seule, capacités Linux retirées, sauvegarde chiffrée puis restauration sur un volume vierge ;

## Interdictions de communication

Ne jamais écrire « sécurisé », « certifié », « conforme RGPD » ou « inviolable » sans préciser le périmètre, la version, l’évaluateur et la preuve. Employer « protections mises en œuvre » lorsque seule une mesure technique interne existe.

## Avant données réelles

- modèle de menaces et analyse de risques ;
- inventaire et classification des données ;
- authentification forte compatible passkeys/MFA sur le futur domaine stable ;
- organisations, rôles et moindre privilège ;
- chiffrement TLS en transit et chiffrement géré au repos ;
- coffre de secrets et rotation des clés ;
- journal d’audit inviolable et alertes ;
- stockage externe redondant et rotation des sauvegardes chiffrées ;
- registre RGPD, information, droits et contrats sous-traitants ;
- tests SAST, dépendances, secrets, DAST et pénétration externe ;
- procédure de vulnérabilité et réponse aux incidents ;
- séparation des environnements et revue obligatoire avant production.

## Signalement responsable

Ne publiez jamais de données de conducteur ou de preuve d’exploitation dans un ticket public. Utilisez le canal privé qui sera indiqué avant le pilote externe. Le futur programme de divulgation précisera le périmètre autorisé et la protection des chercheurs de bonne foi.
