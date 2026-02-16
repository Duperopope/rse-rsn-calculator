# Checklist Test Manuel — FIMO Check

## Quand utiliser cette checklist ?
- Avant chaque deploiement important (nouvelle feature)
- Apres une session de dev longue
- Duree : 5 minutes sur telephone

## Tests (cocher avec [x])

### Chargement
- [ ] L app se charge sans ecran blanc
- [ ] Le tour guide apparait (ou le bouton aide)
- [ ] Le theme dark/light fonctionne

### Saisie
- [ ] Charger "Journee type" → les champs se remplissent
- [ ] Ajouter une activite → elle apparait dans la liste
- [ ] Ajouter un 2e jour → onglet J2 apparait

### Analyse
- [ ] Bouton Analyser → score affiche (pas d erreur)
- [ ] Infractions affichees si score < 100
- [ ] Jauges coherentes avec les donnees saisies

### Timeline
- [ ] Vue Jour : blocs visibles et colores
- [ ] Vue Semaine (si multi-jours) : barres empilees, stats visibles
- [ ] Tap sur un bloc → tooltip avec heures

### Export
- [ ] Bouton Telecharger PDF → fichier telecharge
- [ ] Bouton Retour a la saisie → revient au formulaire

### Navigation mobile
- [ ] Swipe gauche/droite entre Saisie et Resultats
- [ ] Barre du bas : onglets Saisie / Resultats fonctionnent
- [ ] Pas de scroll horizontal parasite

## Resultat
- Total OK : ___/15
- Bugs trouves : ___
- Notes : ___