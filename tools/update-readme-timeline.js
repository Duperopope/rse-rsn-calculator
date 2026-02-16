var fs = require('fs');
var readme = fs.readFileSync('README.md', 'utf8');

// Ajouter mention timeline dans les fonctionnalites
var oldAnalyse = '- **Analyse en temps reel** — jauges circulaires, timeline 24h, alertes orange/rouge';
var newAnalyse = '- **Analyse en temps reel** — jauges circulaires, timeline 24h interactive, zones de depassement animees, bandes nuit (21h-6h), alertes orange/rouge';

if (readme.indexOf(oldAnalyse) !== -1) {
  readme = readme.replace(oldAnalyse, newAnalyse);
  console.log('README: fonctionnalites timeline mises a jour');
}

// Ajouter dans le changelog v7.25.1
var oldChangelog = '- **Format API corrige** : /api/analyze accepte JSON {csv, typeService, pays, equipage}';
var newChangelog = '- **Format API corrige** : /api/analyze accepte JSON {csv, typeService, pays, equipage}\n- **Timeline enrichie** : detection travail de nuit (21h-6h), bandes visuelles nocturnes, navigation InfractionCard vers timeline corrigee sur mobile';

if (readme.indexOf(oldChangelog) !== -1) {
  readme = readme.replace(oldChangelog, newChangelog);
  console.log('README: changelog timeline ajoute');
}

fs.writeFileSync('README.md', readme, 'utf8');
