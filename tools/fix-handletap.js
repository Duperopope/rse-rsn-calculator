var fs = require('fs');
var ic = fs.readFileSync('client/src/components/results/InfractionCard.jsx', 'utf8');

// Trouver et remplacer le handleTap casse
var oldHandleTap = '    if (onNavigate) {\n      onNavigate(zoneType);\n    }\n      }\n    }';
var newHandleTap = '    if (onNavigate) {\n      onNavigate(zoneType);\n    }';

if (ic.indexOf(oldHandleTap) !== -1) {
  ic = ic.replace(oldHandleTap, newHandleTap);
  fs.writeFileSync('client/src/components/results/InfractionCard.jsx', ic, 'utf8');
  console.log('OK - accolades orphelines supprimees dans handleTap');
} else {
  // Afficher le contexte autour de onNavigate pour debug
  var idx = ic.indexOf('onNavigate(zoneType)');
  if (idx !== -1) {
    console.log('Contexte actuel:');
    console.log(ic.substring(idx - 50, idx + 100));
  } else {
    console.log('ERREUR - onNavigate(zoneType) introuvable');
  }
}
