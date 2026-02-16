var fs = require('fs');
var rp = fs.readFileSync('client/src/components/results/ResultPanel.jsx', 'utf8');

var oldProps = 'export function ResultPanel({ resultat, compact = false, onBack = null })';
var newProps = 'export function ResultPanel({ resultat, compact = false, onBack = null, onNavigateTimeline = null })';

if (rp.indexOf(oldProps) !== -1) {
  rp = rp.replace(oldProps, newProps);
  fs.writeFileSync('client/src/components/results/ResultPanel.jsx', rp, 'utf8');
  console.log('OK - onNavigateTimeline ajoute aux props de ResultPanel');
} else {
  console.log('ERREUR - pattern non trouve');
  var match = rp.match(/export function ResultPanel\([^)]+\)/);
  if (match) console.log('Actuel: ' + match[0]);
}
