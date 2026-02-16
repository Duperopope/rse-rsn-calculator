var fs = require('fs');
var readme = fs.readFileSync('README.md', 'utf8');

// Mettre a jour la description timeline dans le changelog
var oldTl = '- **Timeline enrichie** : detection travail de nuit (21h-6h), bandes visuelles nocturnes, navigation InfractionCard vers timeline corrigee sur mobile';
var newTl = '- **Timeline v2** : track 64px mobile, fusion zones depassement, bandes nuit subtiles, pins Google Maps, navigation InfractionCard corrigee, blocs min 10px tactile';

if (readme.indexOf(oldTl) !== -1) {
  readme = readme.replace(oldTl, newTl);
  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README mis a jour');
} else {
  console.log('README: pattern non trouve, ajout en fin de changelog');
  var changelogPoint = '- **Format API corrige**';
  if (readme.indexOf(changelogPoint) !== -1) {
    readme = readme.replace(changelogPoint, '- **Timeline v2** : track 64px mobile, fusion zones depassement, bandes nuit, pins style map, navigation InfractionCard corrigee\n' + changelogPoint);
    fs.writeFileSync('README.md', readme, 'utf8');
    console.log('README mis a jour (insertion)');
  }
}
