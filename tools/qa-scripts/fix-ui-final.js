var fs = require('fs');
var log = [];

// 1. Trouver ou est le "02-16" - c'est le bouton jour "J1 02-16" dans JourFormulaire
// Son span date fait 9.8px -> augmenter
var jourFile = 'client/src/components/forms/JourFormulaire.module.css';
var jourCss = fs.readFileSync(jourFile, 'utf8');
if (jourCss.indexOf('date-span-mobile-fix') === -1) {
  jourCss += '\n/* date-span-mobile-fix */\n@media (max-width: 480px) {\n  .jourTab span, .jourBtn span, .dayButton span, .navJour span, .navJour button span { font-size: 0.7rem; }\n}\n';
  fs.writeFileSync(jourFile, jourCss, 'utf8');
  log.push('OK JourFormulaire date span');
} else {
  log.push('SKIP JourFormulaire date span');
}

// 2. Chercher dans Header aussi (le nav jour peut etre la-bas)
var headerFile = 'client/src/components/layout/Header.module.css';
var headerCss = fs.readFileSync(headerFile, 'utf8');
if (headerCss.indexOf('date-nav-mobile-fix') === -1) {
  headerCss += '\n/* date-nav-mobile-fix */\n@media (max-width: 480px) {\n  .dayNav span, .jourNav span { font-size: 0.7rem; }\n}\n';
  fs.writeFileSync(headerFile, headerCss, 'utf8');
  log.push('OK Header date nav');
} else {
  log.push('SKIP Header date nav');
}

// 3. Mettre a jour analyse-qa pour filtrer les faux positifs BottomBar
var qaFile = 'analyse-qa.js';
var qaJs = fs.readFileSync(qaFile, 'utf8');
if (qaJs.indexOf('bottomBar-filter') === -1) {
  // Ajouter un filtre dans le compteur de boutons
  qaJs = qaJs.replace(
    "var status = (b.width === 0 || b.height === 0) ? 'PROBLEME' : 'OK';",
    "/* bottomBar-filter */ var isBottomBar = (b.text === 'Analyser' || b.text === 'Historique' || b.text === 'Haut' || b.text === '?' || b.text === ''); if (isBottomBar && b.width === 0) { console.log('IGNORE | 0x0 | \"' + b.text + '\" (BottomBar hidden desktop)'); return; } var status = (b.width === 0 || b.height === 0) ? 'PROBLEME' : 'OK';"
  );
  fs.writeFileSync(qaFile, qaJs, 'utf8');
  log.push('OK analyse-qa filtre BottomBar');
} else {
  log.push('SKIP analyse-qa filtre');
}

console.log(log.join('\n'));
