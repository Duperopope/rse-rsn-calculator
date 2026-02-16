var fs = require('fs');
var readme = fs.readFileSync('README.md', 'utf8');

var oldTl = '- **Analyse en temps reel** — jauges circulaires, timeline 24h interactive, zones de depassement animees, bandes nuit (21h-6h), alertes orange/rouge';
var newTl = '- **Analyse en temps reel** — jauges circulaires, timeline 24h epuree (stats conduite/travail/pause/amplitude), bandes nuit, tooltips avec duree';

if (readme.indexOf(oldTl) !== -1) {
  readme = readme.replace(oldTl, newTl);
}

var oldCl = '- **Timeline v2** : track 64px mobile, fusion zones depassement, bandes nuit subtiles, pins Google Maps, navigation InfractionCard corrigee, blocs min 10px tactile';
var newCl = '- **Timeline v3** : affichage pur (suppression double moteur infractions), barre stats, tooltips duree, track 64px mobile, bandes nuit subtiles';

if (readme.indexOf(oldCl) !== -1) {
  readme = readme.replace(oldCl, newCl);
} else {
  var clPoint = '- **Timeline enrichie**';
  if (readme.indexOf(clPoint) !== -1) {
    readme = readme.replace(clPoint, '- **Timeline v3** : affichage pur, barre stats, tooltips duree, track 64px mobile\n' + clPoint);
  }
}

fs.writeFileSync('README.md', readme, 'utf8');
console.log('README mis a jour');
