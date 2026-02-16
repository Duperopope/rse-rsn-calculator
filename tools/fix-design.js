var fs = require('fs');

console.log('=== CORRECTIONS DESIGN WCAG/MD3 ===\n');
var fixes = 0;

// ============================================================
// 1. global.css — font-size minimum + line-height + touch targets
// ============================================================
console.log('[1/3] Patch global.css...');
var css = fs.readFileSync('client/src/styles/global.css', 'utf8');

// Ajouter regles design globales si absentes
var designRules = '\n/* === DESIGN STANDARDS WCAG 2.2 + Material Design 3 === */\n';
designRules += '/* Touch targets minimum 44x44px */\n';
designRules += 'button, a, [role="button"], input[type="submit"] {\n';
designRules += '  min-height: 44px;\n';
designRules += '  min-width: 44px;\n';
designRules += '}\n\n';
designRules += '/* Font minimum 12px, line-height 1.4 */\n';
designRules += '* {\n';
designRules += '  font-size: inherit;\n';
designRules += '}\n';
designRules += 'body {\n';
designRules += '  font-size: 14px;\n';
designRules += '  line-height: 1.5;\n';
designRules += '}\n';
designRules += 'small, .small {\n';
designRules += '  font-size: 12px;\n';
designRules += '}\n\n';
designRules += '/* Chips parametres — lisibilite */\n';
designRules += '[class*="paramChip"], [class*="chip"] {\n';
designRules += '  font-size: 13px;\n';
designRules += '  line-height: 1.4;\n';
designRules += '  min-height: 44px;\n';
designRules += '  padding: 8px 12px;\n';
designRules += '}\n';

if (css.indexOf('DESIGN STANDARDS WCAG') === -1) {
  css += designRules;
  fixes++;
  console.log('  OK - regles globales ajoutees');
} else {
  console.log('  SKIP - deja present');
}

fs.writeFileSync('client/src/styles/global.css', css, 'utf8');

// ============================================================
// 2. Calculator.jsx — corriger les elements trop petits
// ============================================================
console.log('[2/3] Patch Calculator.jsx...');
var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');
var calcFixed = 0;

// Fix mini-jauges font-size (9.8px -> 12px)
if (calc.indexOf('miniJaugeLabel') !== -1) {
  // On va chercher dans le CSS module de Calculator
  var calcCssPath = 'client/src/pages/Calculator.module.css';
  if (fs.existsSync(calcCssPath)) {
    var calcCss = fs.readFileSync(calcCssPath, 'utf8');
    
    // Fix miniJaugeLabel font-size
    if (calcCss.indexOf('miniJaugeLabel') !== -1 && calcCss.indexOf('font-size') !== -1) {
      // Remplacer les font-size < 12px dans les mini-jauges
      calcCss = calcCss.replace(/\.miniJaugeLabel\s*\{[^}]*\}/g, function(match) {
        return match.replace(/font-size:\s*[0-9.]+px/g, 'font-size: 12px');
      });
      calcFixed++;
    }
    
    // Fix miniJaugeValue font-size
    calcCss = calcCss.replace(/\.miniJaugeValue\s*\{[^}]*\}/g, function(match) {
      return match.replace(/font-size:\s*[0-9.]+px/g, 'font-size: 12px');
    });

    // Fix jourNavBtn — taille minimum + contraste
    if (calcCss.indexOf('jourNavBtn') !== -1) {
      calcCss = calcCss.replace(/\.jourNavBtn\s*\{[^}]*\}/g, function(match) {
        var m = match.replace(/font-size:\s*[0-9.]+px/g, 'font-size: 12px');
        m = m.replace(/min-width:\s*[0-9.]+px/g, 'min-width: 44px');
        if (m.indexOf('min-width') === -1) {
          m = m.replace('}', '  min-width: 44px;\n}');
        }
        return m;
      });
      calcFixed++;
    }

    // Fix jourNavActive contraste
    if (calcCss.indexOf('jourNavActive') !== -1) {
      calcCss = calcCss.replace(/\.jourNavActive\s*\{[^}]*\}/g, function(match) {
        if (match.indexOf('color:') !== -1) {
          return match.replace(/color:\s*[^;]+;/, 'color: #ffffff;');
        }
        return match;
      });
      calcFixed++;
    }

    // Fix jourDateSub (10.8px -> 12px)
    calcCss = calcCss.replace(/\.jourDateSub\s*\{[^}]*\}/g, function(match) {
      return match.replace(/font-size:\s*[0-9.]+px/g, 'font-size: 12px');
    });

    // Fix fleches nav ‹ › (24px -> 44px)
    calcCss = calcCss.replace(/\.jourNavArrow\s*\{[^}]*\}/g, function(match) {
      var m = match.replace(/min-width:\s*[0-9.]+px/g, 'min-width: 44px');
      m = m.replace(/width:\s*2[0-9]px/g, 'width: 44px');
      m = m.replace(/padding:\s*[^;]+;/, 'padding: 0 8px;');
      return m;
    });

    // Fix bouton aide "?" (28px -> 44px)
    calcCss = calcCss.replace(/\.helpBtn\s*\{[^}]*\}/g, function(match) {
      var m = match.replace(/width:\s*2[0-9]px/g, 'width: 44px');
      m = m.replace(/height:\s*2[0-9]px/g, 'height: 44px');
      m = m.replace(/font-size:\s*[0-9.]+px/g, 'font-size: 14px');
      return m;
    });

    // Fix chevron contraste (3.5:1 -> meilleur)
    calcCss = calcCss.replace(/\.chevronBtn\s*\{[^}]*\}/g, function(match) {
      return match.replace(/color:\s*[^;]+;/, 'color: #555555;');
    });

    fs.writeFileSync(calcCssPath, calcCss, 'utf8');
    console.log('  OK - ' + calcFixed + ' corrections dans Calculator.module.css');
    fixes += calcFixed;
  } else {
    console.log('  Calculator.module.css non trouve');
  }
}

// ============================================================
// 3. Verifier les styles inline dans Calculator.jsx
// ============================================================
console.log('[3/3] Fix styles inline...');

// Fix mini-jauges inline font-size si present
var inlineFixes = 0;

// Chercher font-size inline < 12
var smallFontPattern = /fontSize:\s*['"]?(9|10|11)(\.\d+)?px/g;
var match;
while ((match = smallFontPattern.exec(calc)) !== null) {
  inlineFixes++;
}
if (inlineFixes > 0) {
  calc = calc.replace(/fontSize:\s*['"]?(9|10|11)(\.\d+)?px['"]?/g, "fontSize: '12px'");
  fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
  console.log('  OK - ' + inlineFixes + ' font-size inline corriges (< 12px -> 12px)');
  fixes += inlineFixes;
} else {
  console.log('  Pas de font-size inline < 12px dans Calculator.jsx');
}

// ============================================================
// CLAUDE-current.md
// ============================================================
var current = fs.readFileSync('CLAUDE-current.md', 'utf8');
current = current.replace('## Chantiers prochaine session', '## En cours\n- Audit design WCAG 2.2 + MD3 : corrections en cours\n\n## Chantiers prochaine session');
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');

console.log('\n=== ' + fixes + ' CORRECTIONS APPLIQUEES ===');
console.log('Relancer: cd client && npm run build && node tools/audit-design.js');
