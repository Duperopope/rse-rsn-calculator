var fs = require('fs');
var results = [];

function fixFile(path, label, replacements) {
  try {
    var css = fs.readFileSync(path, 'utf8');
    var original = css;
    replacements.forEach(function(r) {
      css = css.replace(r.find, r.replace);
    });
    if (css !== original) {
      fs.writeFileSync(path, css, 'utf8');
      results.push('OK ' + label);
    } else {
      results.push('SKIP ' + label + ' (deja applique ou pattern non trouve)');
    }
  } catch(e) {
    results.push('ERREUR ' + label + ': ' + e.message);
  }
}

// FIX 1 : BottomBar - labels mobile trop petits
fixFile('client/src/components/layout/BottomBar.module.css', 'BottomBar labels', [
  { find: /\.label\s*\{[^}]*font-size:\s*0\.65rem;/g, replace: function(m) { return m.replace('font-size: 0.65rem;', 'font-size: 0.75rem;'); } },
  { find: /\.label\s*\{\s*font-size:\s*0\.58rem;\s*\}/g, replace: '.label { font-size: 0.68rem; }' },
  { find: /\.badge\s*\{[^}]*font-size:\s*0\.6rem;/g, replace: function(m) { return m.replace('font-size: 0.6rem;', 'font-size: 0.68rem;'); } }
]);

// FIX 2 : ParametresPanel - chips mobile
var paramsFile = 'client/src/components/forms/ParametresPanel.module.css';
try {
  var paramsCss = fs.readFileSync(paramsFile, 'utf8');
  // Augmenter les chips de base
  paramsCss = paramsCss.replace(/\.chip\s*\{[^}]*font-size:\s*0\.75rem;/g, function(m) { return m.replace('font-size: 0.75rem;', 'font-size: 0.8rem;'); });
  paramsCss = paramsCss.replace(/\.chipService\s*\{[^}]*font-size:\s*0\.75rem;/g, function(m) { return m.replace('font-size: 0.75rem;', 'font-size: 0.8rem;'); });
  paramsCss = paramsCss.replace(/\.chipMode\s*\{[^}]*font-size:\s*0\.75rem;/g, function(m) { return m.replace('font-size: 0.75rem;', 'font-size: 0.8rem;'); });
  paramsCss = paramsCss.replace(/\.label\s*\{[^}]*font-size:\s*0\.7rem;/g, function(m) { return m.replace('font-size: 0.7rem;', 'font-size: 0.78rem;'); });
  if (paramsCss.indexOf('min-font-mobile-fix') === -1) {
    paramsCss += '\n/* min-font-mobile-fix */\n@media (max-width: 375px) {\n  .chip, .chipService, .chipMode { font-size: 0.75rem; }\n  .chipIcon { font-size: 0.8rem; }\n  .label { font-size: 0.72rem; }\n}\n';
  }
  fs.writeFileSync(paramsFile, paramsCss, 'utf8');
  results.push('OK ParametresPanel chips');
} catch(e) {
  results.push('ERREUR ParametresPanel: ' + e.message);
}

// FIX 3 : JourFormulaire - headers tableau mobile
var jourFile = 'client/src/components/forms/JourFormulaire.module.css';
try {
  var jourCss = fs.readFileSync(jourFile, 'utf8');
  if (jourCss.indexOf('min-font-mobile-fix') === -1) {
    jourCss += '\n/* min-font-mobile-fix */\n@media (max-width: 375px) {\n  .activiteTypeName { font-size: 0.72rem; }\n}\n';
  }
  fs.writeFileSync(jourFile, jourCss, 'utf8');
  results.push('OK JourFormulaire headers');
} catch(e) {
  results.push('ERREUR JourFormulaire: ' + e.message);
}

// FIX 4 : Footer - FIMO Check | Samir Medjaher trop petit
var footerFile = 'client/src/components/layout/Footer.module.css';
try {
  var footerCss = fs.readFileSync(footerFile, 'utf8');
  if (footerCss.indexOf('min-font-mobile-fix') === -1) {
    footerCss += '\n/* min-font-mobile-fix */\n@media (max-width: 375px) {\n  .footer, .footer span, .footer div { font-size: 0.65rem; }\n}\n';
  }
  fs.writeFileSync(footerFile, footerCss, 'utf8');
  results.push('OK Footer taille mobile');
} catch(e) {
  results.push('ERREUR Footer: ' + e.message);
}

console.log(results.join('\n'));
