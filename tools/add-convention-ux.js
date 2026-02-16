var fs = require('fs');
var claude = fs.readFileSync('CLAUDE.md', 'utf8');

var anchor = '### Code';
if (claude.indexOf('JAMAIS coder une feature visuelle') !== -1) {
  console.log('SKIP - convention UX deja presente');
  process.exit(0);
}

var oldSection = '### Code\n- Pas de code inline complexe dans bash';
var newSection = '### Code\n- JAMAIS coder une feature visuelle complexe sans planifier l UX AVANT (maquette, flux, donnees necessaires, references)\n- JAMAIS creer un moteur de calcul cote client si le backend fait deja le calcul (source unique = backend)\n- JAMAIS empiler des patches sur du code bugge : supprimer et repartir clean\n- Toujours verifier si les donnees sont multi-jours ou jour unique avant de les passer en props\n- Pas de code inline complexe dans bash';

if (claude.indexOf(oldSection) !== -1) {
  claude = claude.replace(oldSection, newSection);
  fs.writeFileSync('CLAUDE.md', claude, 'utf8');
  console.log('OK - 4 conventions critiques ajoutees dans section Code');
} else {
  console.log('ERREUR - ancre non trouvee');
}
