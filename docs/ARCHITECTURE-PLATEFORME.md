# Architecture cible — Kairos Platform

FIMOCheck reste l'application de référence. Une brique n'entre dans la
plateforme commune qu'après avoir été utilisée et testée dans au moins une
application réelle.

```text
Kairos Platform
├── identity        comptes, rôles, sessions, récupération, avatars
├── design-system   couleurs, typographie, composants et assets
├── localization    catalogues ICU, formats locaux, pseudo-langue et RTL
├── security        politiques, audit, conservation et secrets
├── observability   santé, erreurs, versions, sauvegardes et coûts
└── integrations    connecteurs explicitement versionnés
```

## Principes

1. Une source de vérité par concept ; pas de copies divergentes.
2. Interfaces stables et versionnées entre plateforme et applications.
3. Valeurs métier déterministes ; l'IA n'est jamais dans le chemin critique.
4. Données personnelles minimales et cloisonnées par produit.
5. Compatibilité descendante ou migration explicite.
6. Échec visible : aucune valeur inventée pour remplir un tableau de bord.
7. Mesuré, testé, déclaré et non vérifié sont quatre états distincts.

## Localisation

- français comme catalogue source initial ;
- clés sémantiques stables, jamais fondées sur la phrase française ;
- syntaxe ICU pour pluriels, genres et variables ;
- `Intl` pour dates, nombres, devises et unités ;
- langue, territoire et régime réglementaire restent trois réglages distincts ;
- pseudo-localisation et interface RTL dans la CI ;
- traduction réglementaire soumise à validation humaine.

## Identité et avatars

- initiales générées localement comme repli ;
- JPEG, PNG et WebP décodés puis réencodés côté serveur ;
- métadonnées supprimées, dimensions et poids limités ;
- plusieurs rendus dérivés, original non conservé par défaut ;
- caméra optionnelle avec permission et confirmation explicites ;
- aucune reconnaissance faciale ni récupération silencieuse depuis un tiers.

## Centre de commandement

Le tableau de bord ne présente que des mesures provenant d'une source connue :
santé, version, erreurs, comptes, sessions, sauvegardes, intégrité de l'audit,
tests du dernier build, conservation, coûts et revenus constatés. Chaque carte
indique son horodatage et le chemin d'action associé.
