# Tache en cours

## Statut: FIX TIMELINE NAVIGATION

## Etape 1/2 : Navigation InfractionCard -> Timeline
- Calculator.jsx : callback onNavigateTimeline passe a ResultPanel
- ResultPanel.jsx : prop transmise a InfractionCard
- InfractionCard.jsx : utilise onNavigate callback au lieu de DOM direct
- Le callback bascule bottomTab vers saisie, attend 400ms, puis scroll + highlight

## Prochaine etape
- Etape 2/2 : Alimenter timeline avec infractions backend
