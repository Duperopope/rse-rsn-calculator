# Tache en cours

## Statut: TIMELINE V6 + NAVIGATION INFRACTIONS

## Modifications
- Timeline24h.jsx: badges infraction/avertissement cliquables en vue Semaine
- Timeline24h.jsx: barre infractions/alertes sous le track en vue Jour
- Calculator.jsx: callback onInfractionClick bascule vers Resultats + scroll card
- CSS: styles barres infractions (rouge) et alertes (orange)

## Navigation bidirectionnelle
- Vue Semaine: tap badge rouge/orange -> onglet Resultats + highlight premiere card
- Vue Jour: barre sous le track indique nb infractions/alertes du jour
- InfractionCard -> timeline: callback onNavigateTimeline existant
