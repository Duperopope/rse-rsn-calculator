var fs = require('fs');

// === 1. PATCHER LE CSS DE LA TIMELINE ===
var css = fs.readFileSync('client/src/components/timeline/Timeline24h.module.css', 'utf8');

// Remplacer le track et les blocs pour une meilleure lisibilite
var newCss = '/* Timeline24h - v2 UX mobile */\n' +
'.container {\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'  gap: 6px;\n' +
'  padding: 12px 0;\n' +
'  user-select: none;\n' +
'}\n\n' +

'.labels {\n' +
'  position: relative;\n' +
'  height: 20px;\n' +
'  margin: 0 12px;\n' +
'}\n\n' +

'.heure {\n' +
'  position: absolute;\n' +
'  transform: translateX(-50%);\n' +
'  font-size: 0.68rem;\n' +
'  color: var(--text-secondary, #888);\n' +
'  font-variant-numeric: tabular-nums;\n' +
'  font-weight: 500;\n' +
'}\n\n' +

'.track {\n' +
'  position: relative;\n' +
'  height: 56px;\n' +
'  background: var(--bg-input, #1a1a2e);\n' +
'  border-radius: 10px;\n' +
'  margin: 0 12px;\n' +
'  overflow: visible;\n' +
'}\n\n' +

'.gridLine {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  width: 1px;\n' +
'  background: var(--border, #2a2a3e);\n' +
'  opacity: 0.3;\n' +
'  pointer-events: none;\n' +
'}\n\n' +

'.bloc {\n' +
'  position: absolute;\n' +
'  top: 4px;\n' +
'  bottom: 4px;\n' +
'  border-radius: 6px;\n' +
'  cursor: pointer;\n' +
'  transition: opacity 0.15s, transform 0.15s;\n' +
'  min-width: 6px;\n' +
'  z-index: 2;\n' +
'}\n\n' +

'@media (hover: hover) {\n' +
'  .bloc:hover {\n' +
'    opacity: 0.85;\n' +
'    transform: scaleY(1.1);\n' +
'    z-index: 3;\n' +
'  }\n' +
'}\n\n' +

'.bloc:active {\n' +
'  opacity: 0.7;\n' +
'  transform: scaleY(1.15);\n' +
'  z-index: 4;\n' +
'}\n\n' +

'/* === LEGENDE === */\n' +
'.legende {\n' +
'  display: flex;\n' +
'  gap: 12px;\n' +
'  flex-wrap: wrap;\n' +
'  margin: 6px 12px 0;\n' +
'}\n\n' +

'.legendeItem {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  gap: 5px;\n' +
'  font-size: 0.72rem;\n' +
'  color: var(--text-secondary, #888);\n' +
'}\n\n' +

'.legendeDot {\n' +
'  width: 10px;\n' +
'  height: 10px;\n' +
'  border-radius: 3px;\n' +
'  flex-shrink: 0;\n' +
'}\n\n' +

'/* === TOOLTIP === */\n' +
'.tooltipBubble {\n' +
'  background: var(--bg-card, #16213e);\n' +
'  color: var(--text, #e0e0e0);\n' +
'  padding: 8px 14px;\n' +
'  border-radius: 10px;\n' +
'  font-size: 0.8rem;\n' +
'  font-weight: 500;\n' +
'  white-space: nowrap;\n' +
'  box-shadow: 0 4px 20px rgba(0,0,0,0.5);\n' +
'  border: 1px solid var(--accent, #00d4ff);\n' +
'  pointer-events: auto;\n' +
'  animation: tooltipFadeIn 0.15s ease;\n' +
'}\n\n' +

'@keyframes tooltipFadeIn {\n' +
'  from { opacity: 0; transform: translateX(-50%) translateY(4px); }\n' +
'  to { opacity: 1; transform: translateX(-50%) translateY(0); }\n' +
'}\n\n' +

'/* === BARRE INFRACTION HAUT === */\n' +
'.infractionBar {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  gap: 6px;\n' +
'  padding: 6px 14px;\n' +
'  background: rgba(255, 59, 48, 0.1);\n' +
'  border-radius: 8px;\n' +
'  margin: 0 12px 6px;\n' +
'  border-left: 3px solid #ff3b30;\n' +
'}\n\n' +

'.infractionCount {\n' +
'  font-size: 0.75rem;\n' +
'  font-weight: 600;\n' +
'  color: #ff6b6b;\n' +
'}\n\n' +

'/* === ZONES DE DEPASSEMENT === */\n' +
'.zoneDepassement {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  z-index: 5;\n' +
'  cursor: pointer;\n' +
'  border-radius: 6px;\n' +
'  overflow: hidden;\n' +
'  min-width: 8px;\n' +
'  border-top: 2px solid #ff3b30;\n' +
'  border-bottom: 2px solid #ff3b30;\n' +
'}\n\n' +

'.zoneHachures {\n' +
'  width: 100%;\n' +
'  height: 100%;\n' +
'  background: rgba(255, 59, 48, 0.15);\n' +
'}\n\n' +

'.zoneDepassement:active {\n' +
'  transform: scaleY(1.1);\n' +
'}\n\n' +

'.legendeDepassement {\n' +
'  background: #ff3b30 !important;\n' +
'  opacity: 0.6;\n' +
'  border-radius: 3px !important;\n' +
'}\n\n' +

'/* === MARQUEURS INFRACTION === */\n' +
'.marqueurInfraction {\n' +
'  position: absolute;\n' +
'  top: -10px;\n' +
'  width: 20px;\n' +
'  height: 20px;\n' +
'  transform: translateX(-50%);\n' +
'  z-index: 10;\n' +
'  cursor: pointer;\n' +
'}\n\n' +

'.marqueurDanger .marqueurPin {\n' +
'  background: #ff3b30;\n' +
'}\n\n' +

'.marqueurWarning .marqueurPin {\n' +
'  background: #ff9500;\n' +
'}\n\n' +

'.marqueurPin {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  left: 50%;\n' +
'  transform: translateX(-50%);\n' +
'  width: 12px;\n' +
'  height: 12px;\n' +
'  border-radius: 50% 50% 50% 0;\n' +
'  transform: translateX(-50%) rotate(-45deg);\n' +
'  border: 2px solid #fff;\n' +
'  z-index: 11;\n' +
'  box-shadow: 0 2px 6px rgba(0,0,0,0.3);\n' +
'}\n\n' +

'.marqueurPulse {\n' +
'  display: none;\n' +
'}\n\n' +

'/* === DETAIL INFRACTION === */\n' +
'.infractionDetail {\n' +
'  margin: 8px 12px 0;\n' +
'  padding: 12px 16px;\n' +
'  background: rgba(255, 59, 48, 0.06);\n' +
'  border: 1px solid rgba(255, 59, 48, 0.2);\n' +
'  border-radius: 12px;\n' +
'  animation: slideInfraction 0.2s ease;\n' +
'}\n\n' +

'@keyframes slideInfraction {\n' +
'  from { opacity: 0; transform: translateY(-4px); }\n' +
'  to { opacity: 1; transform: translateY(0); }\n' +
'}\n\n' +

'.infractionHeader {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  gap: 8px;\n' +
'  margin-bottom: 4px;\n' +
'}\n\n' +

'.infractionIcon {\n' +
'  font-size: 1rem;\n' +
'}\n\n' +

'.infractionLabel {\n' +
'  font-size: 0.82rem;\n' +
'  font-weight: 600;\n' +
'  color: #ff6b6b;\n' +
'}\n\n' +

'.infractionTime {\n' +
'  margin-left: auto;\n' +
'  font-size: 0.78rem;\n' +
'  font-weight: 700;\n' +
'  color: #ff4757;\n' +
'  font-variant-numeric: tabular-nums;\n' +
'}\n\n' +

'.infractionBody {\n' +
'  font-size: 0.75rem;\n' +
'  color: var(--text-secondary, #888);\n' +
'  line-height: 1.5;\n' +
'}\n\n' +

'/* === BADGE EQUIPAGE === */\n' +
'.equipageBadge {\n' +
'  display: inline-flex;\n' +
'  align-items: center;\n' +
'  gap: 5px;\n' +
'  padding: 3px 10px;\n' +
'  border-radius: 12px;\n' +
'  font-size: 0.7rem;\n' +
'  font-weight: 600;\n' +
'  margin: 0 12px 4px;\n' +
'  width: fit-content;\n' +
'}\n\n' +

'.equipageSolo {\n' +
'  background: rgba(0, 212, 255, 0.08);\n' +
'  border: 1px solid rgba(0, 212, 255, 0.25);\n' +
'  color: #00d4ff;\n' +
'}\n\n' +

'.equipageDuo {\n' +
'  background: rgba(170, 68, 255, 0.08);\n' +
'  border: 1px solid rgba(170, 68, 255, 0.25);\n' +
'  color: #aa44ff;\n' +
'}\n\n' +

'.equipageIcon {\n' +
'  font-size: 0.85rem;\n' +
'}\n\n' +

'.equipageLabel {\n' +
'  letter-spacing: 0.03em;\n' +
'}\n\n' +

'/* === BANDES NUIT 21h-6h === */\n' +
'.nightZone {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  background: rgba(99, 102, 241, 0.06);\n' +
'  border-left: 1px dashed rgba(99, 102, 241, 0.2);\n' +
'  border-right: 1px dashed rgba(99, 102, 241, 0.2);\n' +
'  pointer-events: none;\n' +
'  z-index: 0;\n' +
'}\n\n' +

'/* === MOBILE === */\n' +
'@media (pointer: coarse) {\n' +
'  .track {\n' +
'    height: 64px;\n' +
'    min-height: 64px;\n' +
'    border-radius: 12px;\n' +
'  }\n' +
'  .bloc {\n' +
'    top: 6px;\n' +
'    bottom: 6px;\n' +
'    min-width: 10px;\n' +
'    border-radius: 8px;\n' +
'  }\n' +
'  .zoneDepassement {\n' +
'    min-width: 14px;\n' +
'  }\n' +
'  .marqueurInfraction {\n' +
'    width: 28px;\n' +
'    height: 28px;\n' +
'    top: -14px;\n' +
'  }\n' +
'  .marqueurPin {\n' +
'    width: 16px;\n' +
'    height: 16px;\n' +
'  }\n' +
'}\n\n' +

'@media (max-width: 480px) {\n' +
'  .legende {\n' +
'    gap: 8px;\n' +
'  }\n' +
'  .labels {\n' +
'    margin: 0 8px;\n' +
'  }\n' +
'  .track {\n' +
'    margin: 0 8px;\n' +
'  }\n' +
'}\n';

fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', newCss, 'utf8');
console.log('[1/2] CSS timeline reecrit - v2 UX mobile');

// === 2. PATCHER LE JSX : fusionner les zones qui se chevauchent ===
var tj = fs.readFileSync('client/src/components/timeline/Timeline24h.jsx', 'utf8');

// Ajouter une fonction de fusion des zones apres analyserInfractions
var fuseCode = '\n/**\n * Fusionne les zones de depassement qui se chevauchent\n * pour eviter les empilements visuels\n */\nfunction fusionnerZones(zones) {\n' +
'  if (zones.length <= 1) return zones;\n' +
'  var sorted = zones.slice().sort(function(a, b) { return a.startMin - b.startMin; });\n' +
'  var merged = [sorted[0]];\n' +
'  for (var i = 1; i < sorted.length; i++) {\n' +
'    var last = merged[merged.length - 1];\n' +
'    if (sorted[i].startMin <= last.endMin) {\n' +
'      last.endMin = Math.max(last.endMin, sorted[i].endMin);\n' +
'      last.label = last.label + " + " + sorted[i].label;\n' +
'      last.type = "multiple";\n' +
'    } else {\n' +
'      merged.push(sorted[i]);\n' +
'    }\n' +
'  }\n' +
'  return merged;\n' +
'}\n';

var insertAfter = 'function analyserInfractions(activites) {';
if (tj.indexOf('fusionnerZones') === -1 && tj.indexOf(insertAfter) !== -1) {
  var insertIdx = tj.indexOf(insertAfter);
  tj = tj.substring(0, insertIdx) + fuseCode + '\n' + tj.substring(insertIdx);
  console.log('[2a/2] Fonction fusionnerZones ajoutee');
}

// Utiliser fusionnerZones dans le useMemo
var oldMemo = 'const { zones, marqueurs: infractions } = useMemo(() => analyserInfractions(activites), [activites]);';
var newMemo = 'const { zones: rawZones, marqueurs: infractions } = useMemo(() => analyserInfractions(activites), [activites]);\n  const zones = useMemo(() => fusionnerZones(rawZones), [rawZones]);';

if (tj.indexOf(oldMemo) !== -1) {
  tj = tj.replace(oldMemo, newMemo);
  console.log('[2b/2] useMemo avec fusionnerZones');
} else {
  console.log('[2b/2] SKIP - useMemo pattern non trouve');
}

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', tj, 'utf8');

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: TIMELINE UX V2\n\n## Details\n- CSS reecrit : track 56px desktop / 64px mobile, blocs arrondis, zones subtiles\n- Zones depassement : bordure rouge top/bottom au lieu de hachures pleines\n- Marqueurs : pin style Google Maps, pulse desactive\n- Fusion zones chevauchantes (fusionnerZones)\n- Bandes nuit plus subtiles (opacite reduite)\n- Min-width blocs augmente pour tactile\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
