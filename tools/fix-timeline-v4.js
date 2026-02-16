var fs = require('fs');

// === 1. CORRIGER LE CRASH dans Calculator.jsx ===
var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Remplacer le callback onInfractionClick avec un selecteur precis
var oldCallback = 'onInfractionClick={function(idx) { setBottomTab("resultats"); setTimeout(function() { var cards = document.querySelectorAll("[class*=\\"card\\"]"); if (cards[idx]) { cards[idx].scrollIntoView({ behavior: "smooth", block: "center" }); cards[idx].style.transition = "box-shadow 0.3s"; cards[idx].style.boxShadow = "0 0 20px rgba(255, 59, 48, 0.6)"; setTimeout(function() { cards[idx].style.boxShadow = "none"; }, 2500); } }, 400); }}';

var newCallback = 'onInfractionClick={function(idx) { setBottomTab("resultats"); setTimeout(function() { var cards = document.querySelectorAll("[data-infraction-index]"); if (cards[idx]) { cards[idx].scrollIntoView({ behavior: "smooth", block: "center" }); cards[idx].style.transition = "box-shadow 0.3s"; cards[idx].style.boxShadow = "0 0 20px rgba(255, 59, 48, 0.6)"; setTimeout(function() { cards[idx].style.boxShadow = "none"; }, 2500); } }, 400); }}';

if (calc.indexOf(oldCallback) !== -1) {
  calc = calc.replace(oldCallback, newCallback);
  fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
  console.log('[1/3] Calculator.jsx - selecteur corrige: data-infraction-index');
} else {
  console.log('[1/3] SKIP Calculator.jsx - pattern non trouve');
}

// === 2. AJOUTER data-infraction-index dans InfractionCard ===
var ic = fs.readFileSync('client/src/components/results/InfractionCard.jsx', 'utf8');

var oldCardDiv = '<div className={styles.card} onClick={handleTap} role="button" tabIndex={0}>';
var newCardDiv = '<div className={styles.card} onClick={handleTap} role="button" tabIndex={0} data-infraction-index={index}>';

if (ic.indexOf(oldCardDiv) !== -1) {
  ic = ic.replace(oldCardDiv, newCardDiv);
  fs.writeFileSync('client/src/components/results/InfractionCard.jsx', ic, 'utf8');
  console.log('[2/3] InfractionCard.jsx - data-infraction-index ajoute');
} else {
  console.log('[2/3] SKIP InfractionCard.jsx - pattern non trouve');
}

// === 3. CORRIGER LE MAPPING des drapeaux : filtrer par jour actif ===
var tj = fs.readFileSync('client/src/components/timeline/Timeline24h.jsx', 'utf8');

// Le probleme : resultat.infractions contient TOUTES les infractions de tous les jours
// La timeline ne montre que le jour actif
// Solution : la timeline ne filtre plus, elle affiche tous les drapeaux qui trouvent une position
// Mais le mapping doit etre plus permissif pour les regles sans position precise

// Remplacer la fin de mapInfractionToFlag pour donner une position par defaut
var oldReturn = '  if (minute < 0 || minute > 1440) minute = -1;\n  return { minute: minute, severity: severity, label: label, infraction: inf };';
var newReturn = '  // Si aucune position trouvee, placer au milieu de la journee comme indicateur\n  if (minute < 0 || minute > 1440) {\n    // Essayer de deduire une position a partir du constate\n    var constMatch = (inf.constate || "").match(/(\\d+\\.?\\d*)h/);\n    if (constMatch) {\n      // Position proportionnelle basee sur le ratio constate/limite\n      var limMatch = (inf.limite || "").match(/(\\d+\\.?\\d*)h?/);\n      if (limMatch && activites.length > 0) {\n        var first = dureeMin(activites[0].debut || "06:00");\n        var limVal = parseFloat(limMatch[1]) * 60;\n        minute = Math.min(first + limVal, 1439);\n      }\n    }\n  }\n  if (minute < 0 || minute > 1440) minute = -1;\n  return { minute: minute, severity: severity, label: label, infraction: inf, index: idx };';

// On doit aussi ajouter idx au parametre de mapInfractionToFlag
var oldMapSig = 'function mapInfractionToFlag(inf, activites) {';
var newMapSig = 'function mapInfractionToFlag(inf, activites, idx) {';

if (tj.indexOf(oldMapSig) !== -1) {
  tj = tj.replace(oldMapSig, newMapSig);
  console.log('[3a/3] mapInfractionToFlag: idx ajoute');
}

if (tj.indexOf(oldReturn) !== -1) {
  tj = tj.replace(oldReturn, newReturn);
  console.log('[3b/3] mapInfractionToFlag: fallback position ameliore');
}

// Mettre a jour l appel dans le useMemo
var oldMap = 'return mapInfractionToFlag(inf, activites);';
var newMap = 'return mapInfractionToFlag(inf, activites, i);';
var oldMapFn = '.map(function(inf) {';
var newMapFn = '.map(function(inf, i) {';

if (tj.indexOf(oldMap) !== -1) {
  tj = tj.replace(oldMap, newMap);
  tj = tj.replace(oldMapFn, newMapFn);
  console.log('[3c/3] useMemo: index passe au mapping');
}

// Aussi corriger le onInfractionClick pour passer l index original
var oldFlagClick = 'if (onInfractionClick) {\n                    onInfractionClick(idx);\n                  }';
var newFlagClick = 'if (onInfractionClick) {\n                    onInfractionClick(flag.index !== undefined ? flag.index : idx);\n                  }';

if (tj.indexOf(oldFlagClick) !== -1) {
  tj = tj.replace(oldFlagClick, newFlagClick);
  console.log('[3d/3] Flag click: utilise index original');
}

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', tj, 'utf8');

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: FIX TIMELINE V4\n\n## Corrections\n- Crash ecran noir : selecteur [class*=card] remplace par [data-infraction-index]\n- InfractionCard : data-infraction-index ajoute au div racine\n- Mapping drapeaux : fallback position pour infractions sans heure precise\n- Index original passe au click handler pour cibler la bonne InfractionCard\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
