# Politique de securite

FIMO Check traite des horaires et donnees de conduite qui peuvent devenir des donnees professionnelles sensibles lorsqu'elles sont associees a une personne.

## Principes

- Les API sont servies en same-origin par defaut.
- Les origines CORS supplementaires doivent etre explicitement declarees avec `CORS_ORIGINS`.
- Les endpoints API sont limites en frequence et les operations couteuses ont une limite plus stricte.
- Les corps JSON et uploads sont limites en taille.
- Les uploads n'acceptent que CSV/TXT et sont supprimes apres lecture, y compris en cas d'erreur.
- Les erreurs HTTP publiques ne doivent pas exposer les exceptions internes.
- Helmet fournit les en-tetes de securite et une CSP restrictive.
- Les outils navigateur QA (Puppeteer) sont des dependances de developpement et ne sont pas installes sur Render.
- Aucun secret ne doit etre commite. Utiliser les variables d'environnement Render.

## Donnees et outils QA

Les scripts QA faisant appel a un service IA externe ne doivent jamais etre executes sur des captures contenant des donnees reelles de conducteurs sans base legale et information adaptee. Les parcours CI standards ne transmettent pas de captures a une API tierce.

## Signaler une vulnerabilite

Ne pas publier de secret, donnee personnelle ou preuve d'exploitation dans une issue publique. Utiliser un canal prive du mainteneur du depot.

## Verification avant release

`npm run qa:release` verifie les invariants de securite et de packaging. La CI execute aussi les tests metier, les controles de syntaxe, le build et un audit des dependances critiques.
