var fs = require('fs');
var readme = fs.readFileSync('README.md', 'utf8');

var oldTl = '- **Timeline v2** : track 64px mobile, fusion zones dépassement, bandes nuit subtiles, pins Google Maps, navigation InfractionCard corrigée, blocs min 10px tactile';
var newTl = '- **Timeline v6 multi-niveaux** : vue Jour (blocs 24h, tooltip, labels) + vue Semaine (barres empilees, stats backend, badges infractions, compteur 56h). Zero calcul client. References UX : Tachogram, Geotab, Hicron Software';

if (readme.indexOf(oldTl) !== -1) {
  readme = readme.replace(oldTl, newTl);
  console.log('README: timeline v6 mis a jour');
} else {
  // Chercher ancienne mention timeline
  var tlMatch = readme.match(/- \*\*Timeline[^*]*\*\*[^\n]*/);
  if (tlMatch) {
    readme = readme.replace(tlMatch[0], newTl);
    console.log('README: timeline remplacee (pattern alternatif)');
  } else {
    console.log('README: pattern timeline non trouve, ajout en fin de changelog');
  }
}

fs.writeFileSync('README.md', readme, 'utf8');
