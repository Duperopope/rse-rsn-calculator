var fs = require('fs');

console.log('[1/2] Patch Timeline24h.jsx — navigation infractions...');

var jsx = fs.readFileSync('client/src/components/timeline/Timeline24h.jsx', 'utf8');

// 1. Ajouter la prop onInfractionClick au composant principal
var oldMainProps = 'var statistiques = props.statistiques;';
var newMainProps = 'var statistiques = props.statistiques;\n  var onInfractionClick = props.onInfractionClick;';

if (jsx.indexOf(oldMainProps) !== -1) {
  jsx = jsx.replace(oldMainProps, newMainProps);
  console.log('  OK - prop onInfractionClick ajoutee');
} else {
  console.log('  SKIP - prop deja presente ou pattern change');
}

// 2. Passer onInfractionClick a VueSemaine
var oldSemaineCall = "vue === 'Semaine' ? React.createElement(VueSemaine, {";
var newSemaineCall = "vue === 'Semaine' ? React.createElement(VueSemaine, {\n      onInfractionClick: onInfractionClick,";

if (jsx.indexOf(oldSemaineCall) !== -1 && jsx.indexOf('onInfractionClick: onInfractionClick') === -1) {
  jsx = jsx.replace(oldSemaineCall, newSemaineCall);
  console.log('  OK - onInfractionClick passe a VueSemaine');
}

// 3. Ajouter onInfractionClick dans VueSemaine props
var oldSemaineProps = 'var statistiques = props.statistiques;\n';
// On cible celui dans VueSemaine (2eme occurrence)
var parts = jsx.split('function VueSemaine(props)');
if (parts.length >= 2) {
  var semainePart = parts[1];
  var oldLine = '  var statistiques = props.statistiques;';
  var newLine = '  var statistiques = props.statistiques;\n  var onInfractionClick = props.onInfractionClick;';
  if (semainePart.indexOf(newLine) === -1 && semainePart.indexOf(oldLine) !== -1) {
    semainePart = semainePart.replace(oldLine, newLine);
    jsx = parts[0] + 'function VueSemaine(props)' + semainePart;
    console.log('  OK - VueSemaine recoit onInfractionClick');
  }
}

// 4. Rendre les badges cliquables — remplacer le badge infraction dans VueSemaine
var oldInfBadge = "nbInf > 0 ? React.createElement('span', { className: styles.semaineInfBadge }, nbInf)";
var newInfBadge = "nbInf > 0 ? React.createElement('span', { className: styles.semaineInfBadge, onClick: function(e) { e.stopPropagation(); if (onInfractionClick) onInfractionClick(i, 'infraction'); } }, nbInf)";

if (jsx.indexOf(oldInfBadge) !== -1) {
  jsx = jsx.replace(oldInfBadge, newInfBadge);
  console.log('  OK - badge infraction cliquable');
}

var oldAvertBadge = "nbAvert > 0 ? React.createElement('span', { className: styles.semaineAvertBadge }, nbAvert)";
var newAvertBadge = "nbAvert > 0 ? React.createElement('span', { className: styles.semaineAvertBadge, onClick: function(e) { e.stopPropagation(); if (onInfractionClick) onInfractionClick(i, 'avertissement'); } }, nbAvert)";

if (jsx.indexOf(oldAvertBadge) !== -1) {
  jsx = jsx.replace(oldAvertBadge, newAvertBadge);
  console.log('  OK - badge avertissement cliquable');
}

// 5. Ajouter highlight infraction dans VueJour
// On ajoute une prop detailJour pour savoir si le jour actif a des infractions
var oldVueJourProps = 'var onActiviteClick = props.onActiviteClick;';
var newVueJourProps = 'var onActiviteClick = props.onActiviteClick;\n  var detailJour = props.detailJour;';

// Cibler la VueJour (premiere occurrence)
var vueJourParts = jsx.split('function VueJour(props)');
if (vueJourParts.length >= 2) {
  var vueJourBody = vueJourParts[1];
  if (vueJourBody.indexOf('var detailJour = props.detailJour;') === -1) {
    vueJourBody = vueJourBody.replace(oldVueJourProps, newVueJourProps);
    jsx = vueJourParts[0] + 'function VueJour(props)' + vueJourBody;
    console.log('  OK - VueJour recoit detailJour');
  }
}

// 6. Passer detailJour a VueJour dans le render
var oldVueJourCall = "vue === 'Jour' ? React.createElement(VueJour, {";
var newVueJourCall = "vue === 'Jour' ? React.createElement(VueJour, {\n      detailJour: detailsJours && detailsJours[jourActifIndex] ? detailsJours[jourActifIndex] : null,";

if (jsx.indexOf(oldVueJourCall) !== -1 && jsx.indexOf('detailJour: detailsJours') === -1) {
  jsx = jsx.replace(oldVueJourCall, newVueJourCall);
  console.log('  OK - detailJour passe a VueJour');
}

// 7. Ajouter barre infraction sous le track dans VueJour
// Chercher le badgeRow et ajouter avant
var oldBadgeRow = "// Badge equipage";
var newInfBar = "// Barre infractions jour\n    detailJour && detailJour.infractions && detailJour.infractions.length > 0 ? React.createElement('div', { className: styles.jourInfBar },\n      React.createElement('span', { className: styles.jourInfIcon }, '\\u26A0'),\n      React.createElement('span', { className: styles.jourInfText }, detailJour.infractions.length + ' infraction' + (detailJour.infractions.length > 1 ? 's' : '') + ' sur ce jour')\n    ) : null,\n    detailJour && detailJour.avertissements && detailJour.avertissements.length > 0 && (!detailJour.infractions || detailJour.infractions.length === 0) ? React.createElement('div', { className: styles.jourAvertBar },\n      React.createElement('span', { className: styles.jourAvertIcon }, '\\u24D8'),\n      React.createElement('span', { className: styles.jourAvertText }, detailJour.avertissements.length + ' alerte' + (detailJour.avertissements.length > 1 ? 's' : '') + ' sur ce jour')\n    ) : null,\n    // Badge equipage";

if (jsx.indexOf(oldBadgeRow) !== -1 && jsx.indexOf('jourInfBar') === -1) {
  jsx = jsx.replace(oldBadgeRow, newInfBar);
  console.log('  OK - barre infractions ajoutee sous le track');
}

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', jsx, 'utf8');

// 8. CSS pour les barres infractions/alertes
console.log('[1.5/2] Ajout CSS barres infractions...');
var css = fs.readFileSync('client/src/components/timeline/Timeline24h.module.css', 'utf8');

var newCss = '\n/* === BARRE INFRACTIONS VUE JOUR === */\n';
newCss += '.jourInfBar {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin: 6px 4px 0;\n  padding: 6px 10px;\n  background: rgba(255, 68, 68, 0.08);\n  border: 1px solid rgba(255, 68, 68, 0.2);\n  border-radius: 8px;\n  cursor: pointer;\n}\n';
newCss += '.jourInfIcon {\n  font-size: 14px;\n}\n';
newCss += '.jourInfText {\n  font-size: 12px;\n  font-weight: 600;\n  color: #ff4444;\n}\n';
newCss += '.jourAvertBar {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  margin: 6px 4px 0;\n  padding: 6px 10px;\n  background: rgba(255, 170, 0, 0.08);\n  border: 1px solid rgba(255, 170, 0, 0.2);\n  border-radius: 8px;\n}\n';
newCss += '.jourAvertIcon {\n  font-size: 14px;\n}\n';
newCss += '.jourAvertText {\n  font-size: 12px;\n  font-weight: 600;\n  color: #e69500;\n}\n';

if (css.indexOf('jourInfBar') === -1) {
  css += newCss;
  fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', css, 'utf8');
  console.log('  OK - CSS barres infractions ajoute');
}

// 9. Patch Calculator.jsx — ajouter onInfractionClick
console.log('[2/2] Patch Calculator.jsx — callback onInfractionClick...');

var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Chercher la Timeline24h et ajouter onInfractionClick
if (calc.indexOf('onInfractionClick=') === -1) {
  var oldOnJour = "onJourClick={function(i) { setJourActifIndex(i); }}";
  var newOnJour = "onJourClick={function(i) { setJourActifIndex(i); }} onInfractionClick={function(jourIdx, type) { setJourActifIndex(jourIdx); setBottomTab('resultats'); setTimeout(function() { var firstCard = document.querySelector('[data-infraction-index]'); if (firstCard) { firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstCard.style.transition = 'box-shadow 0.3s'; firstCard.style.boxShadow = '0 0 16px rgba(255, 68, 68, 0.6)'; setTimeout(function() { firstCard.style.boxShadow = 'none'; }, 2500); } }, 400); }}";

  if (calc.indexOf(oldOnJour) !== -1) {
    calc = calc.replace(oldOnJour, newOnJour);
    fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
    console.log('  OK - onInfractionClick callback ajoute dans Calculator');
  } else {
    console.log('  ATTENTION - pattern onJourClick non trouve');
  }
} else {
  console.log('  SKIP - onInfractionClick deja present');
}

// 10. CLAUDE-current.md
var current = '# Tache en cours\n\n## Statut: TIMELINE V6 + NAVIGATION INFRACTIONS\n\n';
current += '## Modifications\n';
current += '- Timeline24h.jsx: badges infraction/avertissement cliquables en vue Semaine\n';
current += '- Timeline24h.jsx: barre infractions/alertes sous le track en vue Jour\n';
current += '- Calculator.jsx: callback onInfractionClick bascule vers Resultats + scroll card\n';
current += '- CSS: styles barres infractions (rouge) et alertes (orange)\n\n';
current += '## Navigation bidirectionnelle\n';
current += '- Vue Semaine: tap badge rouge/orange -> onglet Resultats + highlight premiere card\n';
current += '- Vue Jour: barre sous le track indique nb infractions/alertes du jour\n';
current += '- InfractionCard -> timeline: callback onNavigateTimeline existant\n';

fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('  OK - CLAUDE-current.md mis a jour');

console.log('\n=== TERMINE ===');
