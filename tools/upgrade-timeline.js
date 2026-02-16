var fs = require('fs');
var tj = fs.readFileSync('client/src/components/timeline/Timeline24h.jsx', 'utf8');

// === 1. Ajouter la detection travail de nuit dans analyserInfractions ===
var insertPoint = '  return { zones, marqueurs };';
var nightCode = '\n  // --- Travail de nuit (21h-6h) : limite 10h total ---\n' +
'  var travailNuit = 0;\n' +
'  for (var ni = 0; ni < sorted.length; ni++) {\n' +
'    var nAct = sorted[ni];\n' +
'    if (nAct.type === "C" || nAct.type === "T") {\n' +
'      var nStart = dureeMin(nAct.debut);\n' +
'      var nEnd = dureeMin(nAct.fin) <= nStart ? dureeMin(nAct.fin) + 1440 : dureeMin(nAct.fin);\n' +
'      // Plage nuit : 0-360 (0h-6h) et 1260-1440 (21h-24h)\n' +
'      if (nStart < 360) {\n' +
'        travailNuit += Math.min(nEnd, 360) - nStart;\n' +
'        if (nEnd > 360) { /* depasse 6h, partie hors nuit */ }\n' +
'      }\n' +
'      if (nEnd > 1260) {\n' +
'        travailNuit += nEnd - Math.max(nStart, 1260);\n' +
'      }\n' +
'      if (nStart >= 1260 && nEnd <= 1440) {\n' +
'        travailNuit += nEnd - nStart;\n' +
'      }\n' +
'    }\n' +
'  }\n' +
'  if (travailNuit > 600) {\n' +
'    // Zone nuit soir (21h-24h)\n' +
'    zones.push({\n' +
'      startMin: 1260,\n' +
'      endMin: 1440,\n' +
'      type: "nuit",\n' +
'      label: "Travail de nuit > 10h"\n' +
'    });\n' +
'    // Zone nuit matin (0h-6h)\n' +
'    zones.push({\n' +
'      startMin: 0,\n' +
'      endMin: 360,\n' +
'      type: "nuit",\n' +
'      label: "Travail de nuit > 10h"\n' +
'    });\n' +
'    marqueurs.push({\n' +
'      minute: 1260,\n' +
'      type: "nuit",\n' +
'      label: "Travail de nuit > 10h",\n' +
'      detail: "Limite 10h de travail total entre 21h et 6h (L3312-1). Constate : " + Math.round(travailNuit / 60 * 10) / 10 + "h",\n' +
'      severity: "danger"\n' +
'    });\n' +
'  }\n\n';

if (tj.indexOf(insertPoint) !== -1 && tj.indexOf('Travail de nuit') === -1) {
  tj = tj.replace(insertPoint, nightCode + insertPoint);
  console.log('[1/4] Ajout detection travail de nuit OK');
} else if (tj.indexOf('Travail de nuit') !== -1) {
  console.log('[1/4] SKIP - travail de nuit deja present');
} else {
  console.log('[1/4] ERREUR - point insertion non trouve');
}

// === 2. Ajouter les bandes visuelles nuit (fond subtil 21h-6h) ===
var trackEnd = '{/* Blocs normaux */}';
var nightBands = '        {/* Bandes nuit 21h-6h */}\n' +
'        <div className={styles.nightZone} style={{ left: "0%", width: (360/1440*100) + "%" }} />\n' +
'        <div className={styles.nightZone} style={{ left: (1260/1440*100) + "%", width: (180/1440*100) + "%" }} />\n\n        ';

if (tj.indexOf(trackEnd) !== -1 && tj.indexOf('nightZone') === -1) {
  tj = tj.replace(trackEnd, nightBands + trackEnd);
  console.log('[2/4] Ajout bandes visuelles nuit OK');
} else if (tj.indexOf('nightZone') !== -1) {
  console.log('[2/4] SKIP - bandes nuit deja presentes');
} else {
  console.log('[2/4] ERREUR - point insertion blocs non trouve');
}

// === 3. Ajouter data-zone-type="nuit" au mapping des zones ===
// Deja gere : les zones utilisent data-zone-type={zone.type} et on a type: "nuit"
console.log('[3/4] data-zone-type=nuit automatique via zone.type');

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', tj, 'utf8');

// === 4. Ajouter CSS pour les bandes nuit ===
var css = fs.readFileSync('client/src/components/timeline/Timeline24h.module.css', 'utf8');

if (css.indexOf('nightZone') === -1) {
  var nightCss = '\n/* === BANDES VISUELLES NUIT 21h-6h === */\n' +
'.nightZone {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  background: rgba(99, 102, 241, 0.08);\n' +
'  border-left: 1px dashed rgba(99, 102, 241, 0.25);\n' +
'  border-right: 1px dashed rgba(99, 102, 241, 0.25);\n' +
'  pointer-events: none;\n' +
'  z-index: 0;\n' +
'}\n';
  css += nightCss;
  fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', css, 'utf8');
  console.log('[4/4] CSS bandes nuit ajoutees');
} else {
  console.log('[4/4] SKIP - CSS nuit deja present');
}

// === MAJ InfractionCard pour supporter zoneType nuit ===
var ic = fs.readFileSync('client/src/components/results/InfractionCard.jsx', 'utf8');
if (ic.indexOf('"nuit"') === -1) {
  var oldZoneLogic = 'else if (msg.indexOf("amplitude") !== -1 || msg.indexOf("13h") !== -1) zoneType = "amplitude";';
  var newZoneLogic = 'else if (msg.indexOf("amplitude") !== -1 || msg.indexOf("13h") !== -1) zoneType = "amplitude";\n    else if (msg.indexOf("nuit") !== -1 || msg.indexOf("21h") !== -1 || msg.indexOf("nocturne") !== -1) zoneType = "nuit";';
  if (ic.indexOf(oldZoneLogic) !== -1) {
    ic = ic.replace(oldZoneLogic, newZoneLogic);
    fs.writeFileSync('client/src/components/results/InfractionCard.jsx', ic, 'utf8');
    console.log('[+] InfractionCard: zoneType nuit ajoute');
  }
}

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: UPGRADE TIMELINE EN COURS\n\n## Etape 2/2 : Enrichissement timeline\n- Detection travail de nuit (21h-6h) ajoutee dans analyserInfractions\n- Bandes visuelles nuit (fond indigo subtil) sur la track\n- Zones de depassement nuit avec hachures rouges\n- InfractionCard: zoneType nuit ajoute pour navigation\n- Build en cours\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
