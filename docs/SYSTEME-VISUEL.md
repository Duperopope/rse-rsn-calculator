# Système visuel commun

## Principes

- une icône décrit une action ou un état, elle ne remplace jamais son libellé ;
- les contrôles critiques n'utilisent pas d'emoji dépendant du système ;
- traits, angles et terminaisons viennent du même composant SVG ;
- une icône décorative est masquée aux technologies d'assistance ;
- une icône informative reçoit un titre accessible ;
- les couleurs d'état viennent des variables `--success`, `--warning` et
  `--danger`, jamais d'une couleur inscrite dans le dessin commun ;
- les pictogrammes tachygraphe réglementaires restent dans leur famille dédiée,
  avec leurs sources et leur sens métier documentés.

## Registre

`client/src/platform/assets/Icon.jsx` est la source commune des pictogrammes
d'interface. Il refuse les noms inconnus au lieu d'afficher un substitut
silencieux. Le compte, le centre d'exploitation, l'import tachygraphe et les
états des jauges utilisent désormais ce registre.

Les trois SVG publics (favicon et icônes PWA) sont autonomes, disposent d'un
`viewBox` et ne chargent ni script ni ressource distante.

## Extension

Pour ajouter une icône :

1. vérifier qu'aucun symbole existant ne convient ;
2. dessiner sur la grille 24 × 24 avec `currentColor` ;
3. conserver un trait de 1,8, des extrémités et jointures arrondies ;
4. donner un nom fonctionnel stable, sans marque ni contexte de page ;
5. ajouter le cas d'usage à la recette visuelle ordinateur/mobile ;
6. documenter séparément toute source ou licence externe.

Le contrôle `node tests/run-assets.js` vérifie le registre, l'accessibilité,
l'absence d'emoji fonctionnel dans les parcours migrés et l'autonomie des SVG
publics.
