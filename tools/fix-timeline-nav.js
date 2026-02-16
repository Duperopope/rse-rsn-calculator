var fs = require('fs');

// === 1. PATCHER Calculator.jsx : passer onNavigateTimeline a ResultPanel ===
var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Remplacer la ligne ResultPanel pour ajouter onNavigateTimeline
var oldResultPanel = 'ResultPanel resultat={resultat} compact onBack={function() { setBottomTab("saisie"); window.scrollTo(0, 0); }}';
var newResultPanel = 'ResultPanel resultat={resultat} compact onBack={function() { setBottomTab("saisie"); window.scrollTo(0, 0); }} onNavigateTimeline={function(zoneType) { setBottomTab("saisie"); setTimeout(function() { var timeline = document.querySelector("[class*=\'Timeline\']") || document.querySelector("[class*=\'timeline\']"); if (timeline) { timeline.scrollIntoView({ behavior: "smooth", block: "center" }); if (zoneType) { var target = timeline.querySelector("[data-zone-type=\'" + zoneType + "\']"); if (target) { target.style.transition = "box-shadow 0.3s, transform 0.3s"; target.style.boxShadow = "0 0 16px 4px rgba(255, 59, 48, 0.8)"; target.style.transform = "scaleY(1.5)"; target.style.zIndex = "50"; setTimeout(function() { target.style.boxShadow = "none"; target.style.transform = "scaleY(1)"; target.style.zIndex = ""; }, 2500); } } timeline.style.transition = "box-shadow 0.3s"; timeline.style.boxShadow = "0 0 20px rgba(255, 59, 48, 0.5)"; setTimeout(function() { timeline.style.boxShadow = "none"; }, 2000); } }, 400); }}';

if (calc.indexOf(oldResultPanel) !== -1) {
  calc = calc.replace(oldResultPanel, newResultPanel);
  fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
  console.log('[1/3] Calculator.jsx - onNavigateTimeline ajoute a ResultPanel');
} else {
  console.log('[1/3] SKIP Calculator.jsx - pattern non trouve');
  console.log('  Recherche: ' + oldResultPanel.substring(0, 60));
}

// === 2. PATCHER ResultPanel.jsx : recevoir et transmettre onNavigateTimeline ===
var rp = fs.readFileSync('client/src/components/results/ResultPanel.jsx', 'utf8');

// Ajouter onNavigateTimeline dans les props destructurees
var oldProps = 'export function ResultPanel({ resultat, compact, onBack })';
var newProps = 'export function ResultPanel({ resultat, compact, onBack, onNavigateTimeline })';

if (rp.indexOf(oldProps) !== -1) {
  rp = rp.replace(oldProps, newProps);
  console.log('[2a/3] ResultPanel.jsx - prop onNavigateTimeline ajoutee');
} else {
  console.log('[2a/3] SKIP ResultPanel.jsx - props pattern non trouve');
}

// Ajouter onNavigate a InfractionCard
var oldCard = '<InfractionCard key={i} infraction={inf} index={i} grouped={inf.count > 1} count={inf.count} jours={inf.jours} />';
var newCard = '<InfractionCard key={i} infraction={inf} index={i} grouped={inf.count > 1} count={inf.count} jours={inf.jours} onNavigate={onNavigateTimeline} />';

if (rp.indexOf(oldCard) !== -1) {
  rp = rp.replace(oldCard, newCard);
  console.log('[2b/3] ResultPanel.jsx - onNavigate passe a InfractionCard');
} else {
  console.log('[2b/3] SKIP ResultPanel.jsx - InfractionCard pattern non trouve');
}

fs.writeFileSync('client/src/components/results/ResultPanel.jsx', rp, 'utf8');

// === 3. PATCHER InfractionCard.jsx : utiliser onNavigate au lieu du DOM direct ===
var ic = fs.readFileSync('client/src/components/results/InfractionCard.jsx', 'utf8');

// Remplacer le bloc de navigation directe par un appel a onNavigate
var oldNavBlock = '    var timeline = document.querySelector("[class*=\'Timeline\']") || document.querySelector("[class*=\'timeline\']");\n' +
'    if (timeline) {\n' +
'      timeline.scrollIntoView({ behavior: "smooth", block: "center" });\n' +
'      var targetZone = zoneType ? timeline.querySelector("[data-zone-type=\'" + zoneType + "\']") : null;\n' +
'      if (targetZone) {\n' +
'        targetZone.style.transition = "box-shadow 0.3s, transform 0.3s";\n' +
'        targetZone.style.boxShadow = "0 0 16px 4px rgba(255, 59, 48, 0.8)";\n' +
'        targetZone.style.transform = "scaleY(1.5)";\n' +
'        targetZone.style.zIndex = "50";\n' +
'        setTimeout(function() { targetZone.style.boxShadow = "none"; targetZone.style.transform = "scaleY(1)"; targetZone.style.zIndex = ""; }, 2000);';

// Approche plus souple : chercher le pattern simplifie
var navStart = 'var timeline = document.querySelector("[class*=\'Timeline\']")';
var navEnd = 'setTimeout(function() { timeline.style.boxShadow = "none"; }, 1500);';

if (ic.indexOf(navStart) !== -1 && ic.indexOf(navEnd) !== -1) {
  var startIdx = ic.indexOf(navStart);
  var endIdx = ic.indexOf(navEnd) + navEnd.length;
  
  // Trouver le debut de la ligne (remonter au debut du if/var)
  var lineStart = ic.lastIndexOf('\n', startIdx) + 1;
  
  var oldCode = ic.substring(lineStart, endIdx);
  var newCode = '    if (onNavigate) {\n' +
'      onNavigate(zoneType);\n' +
'    }';
  
  ic = ic.substring(0, lineStart) + newCode + ic.substring(endIdx);
  fs.writeFileSync('client/src/components/results/InfractionCard.jsx', ic, 'utf8');
  console.log('[3/3] InfractionCard.jsx - navigation via callback onNavigate');
} else {
  console.log('[3/3] SKIP InfractionCard.jsx - bloc navigation non trouve');
  console.log('  navStart trouve: ' + (ic.indexOf(navStart) !== -1));
  console.log('  navEnd trouve: ' + (ic.indexOf(navEnd) !== -1));
  // Afficher ce qui existe autour de timeline
  var idx = ic.indexOf('timeline');
  if (idx !== -1) {
    console.log('  Contexte: ' + ic.substring(idx, idx + 200));
  }
}

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: FIX TIMELINE NAVIGATION\n\n## Etape 1/2 : Navigation InfractionCard -> Timeline\n- Calculator.jsx : callback onNavigateTimeline passe a ResultPanel\n- ResultPanel.jsx : prop transmise a InfractionCard\n- InfractionCard.jsx : utilise onNavigate callback au lieu de DOM direct\n- Le callback bascule bottomTab vers saisie, attend 400ms, puis scroll + highlight\n\n## Prochaine etape\n- Etape 2/2 : Alimenter timeline avec infractions backend\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
