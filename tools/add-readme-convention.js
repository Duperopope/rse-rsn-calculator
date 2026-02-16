var fs = require('fs');
var claude = fs.readFileSync('CLAUDE.md', 'utf8');

if (claude.indexOf('README.md') !== -1 && claude.indexOf('mettre a jour README') !== -1) {
  console.log('SKIP - convention README deja presente');
  process.exit(0);
}

var ancienneRegle = '- Ne jamais committer .env';
var nouvelleRegle = '- Ne jamais committer .env\n- Mettre a jour README.md a chaque push significatif (feat/fix) : version, stats, changelog, nouvelles sections si besoin\n- Le README est la vitrine publique du projet : toujours synchronise avec la realite du code';

if (claude.indexOf(ancienneRegle) === -1) {
  console.log('ERREUR - point ancrage introuvable dans CLAUDE.md');
  process.exit(1);
}

claude = claude.replace(ancienneRegle, nouvelleRegle);
fs.writeFileSync('CLAUDE.md', claude, 'utf8');
console.log('OK - convention README ajoutee dans CLAUDE.md');

var current = '# Tache en cours\n\n## Statut: CONVENTION AJOUTEE\n\n## Details\n- Convention README auto-update ajoutee dans CLAUDE.md section Git\n- Chaque push feat/fix doit mettre a jour le README (version, changelog, stats)\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
