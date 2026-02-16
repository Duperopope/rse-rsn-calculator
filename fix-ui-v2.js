var fs = require('fs');
var log = [];

function patch(file, label, fn) {
  try {
    var css = fs.readFileSync(file, 'utf8');
    var result = fn(css);
    if (result !== css) {
      fs.writeFileSync(file, result, 'utf8');
      log.push('OK ' + label);
    } else {
      log.push('SKIP ' + label);
    }
  } catch(e) { log.push('ERR ' + label + ': ' + e.message.substring(0,80)); }
}

// 1. Global CSS - forcer font-size minimum sur html/body mobile
patch('client/src/styles/global.css', 'global min-font', function(css) {
  if (css.indexOf('mobile-root-font-fix') !== -1) return css;
  return css + '\n/* mobile-root-font-fix */\n@media (max-width: 480px) {\n  html { font-size: 16px; }\n}\n@media (max-width: 375px) {\n  html { font-size: 15px; }\n}\n';
});

// 2. BottomBar - labels a 0.75rem minimum
patch('client/src/components/layout/BottomBar.module.css', 'BottomBar labels v2', function(css) {
  // La base .label est deja a 0.75rem du fix precedent
  // Le media 380px descend a 0.68rem -> monter a 0.75rem
  css = css.replace(/\.label\s*\{\s*font-size:\s*0\.68rem;\s*\}/g, '.label { font-size: 0.75rem; }');
  css = css.replace(/\.label\s*\{\s*font-size:\s*0\.58rem;\s*\}/g, '.label { font-size: 0.75rem; }');
  return css;
});

// 3. ParametresPanel - chips encore plus gros sur mobile
patch('client/src/components/forms/ParametresPanel.module.css', 'Params chips v2', function(css) {
  // Remplacer le media query 375px existant par des valeurs plus grandes
  css = css.replace(/\/\* min-font-mobile-fix \*\/[\s\S]*?@media[^{]*\{[^}]*\{[^}]*\}[^}]*\{[^}]*\}[^}]*\{[^}]*\}[^}]*\}/g, '');
  if (css.indexOf('min-font-mobile-fix-v2') === -1) {
    css += '\n/* min-font-mobile-fix-v2 */\n@media (max-width: 480px) {\n  .chip, .chipService, .chipMode { font-size: 0.85rem; min-height: 34px; }\n  .chipIcon { font-size: 0.9rem; }\n  .label { font-size: 0.8rem; }\n}\n';
  }
  return css;
});

// 4. JourFormulaire - Type/Debut/Fin headers mobile
patch('client/src/components/forms/JourFormulaire.module.css', 'Jour headers v2', function(css) {
  css = css.replace(/\/\* min-font-mobile-fix \*\/[\s\S]*$/g, '');
  if (css.indexOf('min-font-mobile-fix-v2') === -1) {
    css += '\n/* min-font-mobile-fix-v2 */\n@media (max-width: 480px) {\n  .activiteTypeName { font-size: 0.78rem; }\n}\n';
  }
  return css;
});

// 5. Footer - Sources + FIMO Check | Samir Medjaher
patch('client/src/components/layout/Footer.module.css', 'Footer v2', function(css) {
  css = css.replace(/\/\* min-font-mobile-fix \*\/[\s\S]*$/g, '');
  if (css.indexOf('min-font-mobile-fix-v2') === -1) {
    css += '\n/* min-font-mobile-fix-v2 */\n@media (max-width: 480px) {\n  .footer, .footer span, .footer div, .footer a { font-size: 0.7rem; }\n}\n';
  }
  return css;
});

// 6. Header - bouton ? et version trop petits
patch('client/src/components/layout/Header.module.css', 'Header mobile v2', function(css) {
  if (css.indexOf('min-font-mobile-fix-v2') !== -1) return css;
  css += '\n/* min-font-mobile-fix-v2 */\n@media (max-width: 480px) {\n  .header button { min-width: 28px; min-height: 28px; font-size: 0.75rem; }\n  .version { font-size: 0.65rem; }\n}\n';
  return css;
});

console.log(log.join('\n'));
