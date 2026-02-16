var fs = require('fs');

// === TIMELINE V5 - CLEAN : blocs + tooltip, c est tout ===
var newJsx = 'import React, { useRef, useState, useEffect } from "react";\n' +
'import { TYPES_ACTIVITE } from "../../config/constants.js";\n' +
'import { dureeMin } from "../../utils/time.js";\n' +
'import styles from "./Timeline24h.module.css";\n' +
'\n' +
'export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo" }) {\n' +
'  var containerRef = useRef(null);\n' +
'  var [tooltip, setTooltip] = useState(null);\n' +
'\n' +
'  var totalMin = 1440;\n' +
'\n' +
'  function getCouleur(type) {\n' +
'    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });\n' +
'    return t ? t.couleur : "#666";\n' +
'  }\n' +
'\n' +
'  function getLabel(type) {\n' +
'    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });\n' +
'    return t ? t.label : type;\n' +
'  }\n' +
'\n' +
'  function formatDuree(min) {\n' +
'    var h = Math.floor(min / 60);\n' +
'    var m = min % 60;\n' +
'    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");\n' +
'  }\n' +
'\n' +
'  // Construire les blocs\n' +
'  var blocs = [];\n' +
'  for (var i = 0; i < activites.length; i++) {\n' +
'    var act = activites[i];\n' +
'    if (!act.debut || !act.fin) continue;\n' +
'    var startMin = dureeMin(act.debut);\n' +
'    var endMin = dureeMin(act.fin);\n' +
'    if (endMin <= startMin) endMin += 1440;\n' +
'\n' +
'    if (startMin < 1440 && endMin > 1440) {\n' +
'      blocs.push({ startMin: startMin, endMin: 1440, type: act.type, debut: act.debut, fin: "24:00", actIndex: i });\n' +
'      blocs.push({ startMin: 0, endMin: endMin - 1440, type: act.type, debut: "00:00", fin: act.fin, actIndex: i });\n' +
'    } else {\n' +
'      blocs.push({ startMin: startMin % 1440, endMin: Math.min(endMin, 1440), type: act.type, debut: act.debut, fin: act.fin, actIndex: i });\n' +
'    }\n' +
'  }\n' +
'\n' +
'  var heures = [];\n' +
'  for (var h = 0; h <= 24; h += 3) heures.push(h);\n' +
'\n' +
'  return (\n' +
'    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>\n' +
'\n' +
'      {/* Badge equipage */}\n' +
'      <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>\n' +
'        <span>{equipage === "double" ? "\\u{1F465}" : "\\u{1F464}"}</span>\n' +
'        <span>{equipage === "double" ? "Duo" : "Solo"}</span>\n' +
'      </div>\n' +
'\n' +
'      {/* Heures */}\n' +
'      <div className={styles.labels}>\n' +
'        {heures.map(function(h) {\n' +
'          return <span key={h} className={styles.heure} style={{ left: (h / 24 * 100) + "%" }}>{h}h</span>;\n' +
'        })}\n' +
'      </div>\n' +
'\n' +
'      {/* Track */}\n' +
'      <div className={styles.track}>\n' +
'        {heures.map(function(h) {\n' +
'          return <div key={"g" + h} className={styles.gridLine} style={{ left: (h / 24 * 100) + "%" }} />;\n' +
'        })}\n' +
'\n' +
'        {/* Bandes nuit */}\n' +
'        <div className={styles.nightZone} style={{ left: "0%", width: (360 / 1440 * 100) + "%" }} />\n' +
'        <div className={styles.nightZone} style={{ left: (1260 / 1440 * 100) + "%", width: (180 / 1440 * 100) + "%" }} />\n' +
'\n' +
'        {/* Blocs */}\n' +
'        {blocs.map(function(bloc, idx) {\n' +
'          var left = (bloc.startMin / totalMin * 100);\n' +
'          var w = ((bloc.endMin - bloc.startMin) / totalMin * 100);\n' +
'          var duree = bloc.endMin - bloc.startMin;\n' +
'          var showLabel = duree >= 60;\n' +
'          return (\n' +
'            <div\n' +
'              key={idx}\n' +
'              className={styles.bloc}\n' +
'              style={{ left: left + "%", width: Math.max(w, 0.5) + "%", background: getCouleur(bloc.type) }}\n' +
'              onTouchStart={function(e) {\n' +
'                e.stopPropagation();\n' +
'                if (navigator.vibrate) navigator.vibrate(8);\n' +
'                var rect = e.currentTarget.getBoundingClientRect();\n' +
'                setTooltip(function(prev) {\n' +
'                  return prev && prev.index === idx ? null : {\n' +
'                    text: getLabel(bloc.type) + " : " + bloc.debut + " \\u2192 " + bloc.fin + " (" + formatDuree(duree) + ")",\n' +
'                    x: rect.left + rect.width / 2,\n' +
'                    y: rect.top - 8,\n' +
'                    index: idx\n' +
'                  };\n' +
'                });\n' +
'              }}\n' +
'              onMouseEnter={function(e) {\n' +
'                var rect = e.currentTarget.getBoundingClientRect();\n' +
'                setTooltip({\n' +
'                  x: rect.left + rect.width / 2,\n' +
'                  y: rect.top - 8,\n' +
'                  text: getLabel(bloc.type) + " : " + bloc.debut + " \\u2192 " + bloc.fin + " (" + formatDuree(duree) + ")",\n' +
'                  index: idx\n' +
'                });\n' +
'              }}\n' +
'              onMouseLeave={function() { setTooltip(null); }}\n' +
'              onClick={function() {\n' +
'                if (onActiviteClick && bloc.actIndex >= 0) onActiviteClick(bloc.actIndex);\n' +
'              }}\n' +
'            >\n' +
'              {showLabel && <span className={styles.blocLabel}>{bloc.type}</span>}\n' +
'            </div>\n' +
'          );\n' +
'        })}\n' +
'      </div>\n' +
'\n' +
'      {/* Legende */}\n' +
'      <div className={styles.legende}>\n' +
'        {TYPES_ACTIVITE.filter(function(t) { return blocs.some(function(b) { return b.type === t.code; }); }).map(function(t) {\n' +
'          return (\n' +
'            <span key={t.code} className={styles.legendeItem}>\n' +
'              <span className={styles.legendeDot} style={{ background: t.couleur }} />\n' +
'              {t.label}\n' +
'            </span>\n' +
'          );\n' +
'        })}\n' +
'      </div>\n' +
'\n' +
'      {/* Tooltip */}\n' +
'      {tooltip && (\n' +
'        <div\n' +
'          className={styles.tooltipBubble}\n' +
'          style={{\n' +
'            position: "fixed",\n' +
'            left: Math.min(Math.max(tooltip.x, 80), window.innerWidth - 80) + "px",\n' +
'            top: (tooltip.y - 44) + "px",\n' +
'            transform: "translateX(-50%)",\n' +
'            zIndex: 9999\n' +
'          }}\n' +
'          onClick={function() { setTooltip(null); }}\n' +
'        >\n' +
'          {tooltip.text}\n' +
'        </div>\n' +
'      )}\n' +
'    </div>\n' +
'  );\n' +
'}\n';

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', newJsx, 'utf8');
console.log('[1/3] Timeline24h.jsx v5 - clean, zero drapeau, zero doublon');

// === CSS v5 : minimal et propre ===
var newCss = '/* Timeline24h v5 - clean */\n' +
'.container {\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'  gap: 4px;\n' +
'  padding: 10px 0;\n' +
'  user-select: none;\n' +
'}\n\n' +

'.equipageBadge {\n' +
'  display: inline-flex;\n' +
'  align-items: center;\n' +
'  gap: 4px;\n' +
'  padding: 2px 8px;\n' +
'  border-radius: 10px;\n' +
'  font-size: 0.68rem;\n' +
'  font-weight: 600;\n' +
'  margin: 0 12px 2px;\n' +
'  width: fit-content;\n' +
'}\n\n' +

'.equipageSolo {\n' +
'  background: rgba(0, 212, 255, 0.08);\n' +
'  border: 1px solid rgba(0, 212, 255, 0.2);\n' +
'  color: #00d4ff;\n' +
'}\n\n' +

'.equipageDuo {\n' +
'  background: rgba(170, 68, 255, 0.08);\n' +
'  border: 1px solid rgba(170, 68, 255, 0.2);\n' +
'  color: #aa44ff;\n' +
'}\n\n' +

'.labels {\n' +
'  position: relative;\n' +
'  height: 18px;\n' +
'  margin: 0 12px;\n' +
'}\n\n' +

'.heure {\n' +
'  position: absolute;\n' +
'  transform: translateX(-50%);\n' +
'  font-size: 0.65rem;\n' +
'  color: var(--text-secondary, #888);\n' +
'  font-variant-numeric: tabular-nums;\n' +
'  font-weight: 500;\n' +
'}\n\n' +

'.track {\n' +
'  position: relative;\n' +
'  height: 48px;\n' +
'  background: var(--bg-input, #1a1a2e);\n' +
'  border-radius: 10px;\n' +
'  margin: 0 12px;\n' +
'  overflow: hidden;\n' +
'}\n\n' +

'.gridLine {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  width: 1px;\n' +
'  background: var(--border, #2a2a3e);\n' +
'  opacity: 0.2;\n' +
'  pointer-events: none;\n' +
'}\n\n' +

'.bloc {\n' +
'  position: absolute;\n' +
'  top: 4px;\n' +
'  bottom: 4px;\n' +
'  border-radius: 6px;\n' +
'  cursor: pointer;\n' +
'  transition: opacity 0.15s;\n' +
'  min-width: 6px;\n' +
'  z-index: 2;\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: center;\n' +
'  overflow: hidden;\n' +
'}\n\n' +

'.blocLabel {\n' +
'  font-size: 0.6rem;\n' +
'  font-weight: 700;\n' +
'  color: rgba(255,255,255,0.85);\n' +
'  text-shadow: 0 1px 2px rgba(0,0,0,0.4);\n' +
'  pointer-events: none;\n' +
'}\n\n' +

'.bloc:active {\n' +
'  opacity: 0.7;\n' +
'}\n\n' +

'.legende {\n' +
'  display: flex;\n' +
'  gap: 10px;\n' +
'  flex-wrap: wrap;\n' +
'  margin: 6px 12px 0;\n' +
'}\n\n' +

'.legendeItem {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  gap: 4px;\n' +
'  font-size: 0.68rem;\n' +
'  color: var(--text-secondary, #888);\n' +
'}\n\n' +

'.legendeDot {\n' +
'  width: 8px;\n' +
'  height: 8px;\n' +
'  border-radius: 2px;\n' +
'}\n\n' +

'.tooltipBubble {\n' +
'  background: var(--bg-card, #16213e);\n' +
'  color: var(--text, #e0e0e0);\n' +
'  padding: 8px 14px;\n' +
'  border-radius: 10px;\n' +
'  font-size: 0.78rem;\n' +
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

'.nightZone {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  background: rgba(99, 102, 241, 0.04);\n' +
'  pointer-events: none;\n' +
'  z-index: 0;\n' +
'}\n\n' +

'@media (pointer: coarse) {\n' +
'  .track {\n' +
'    height: 56px;\n' +
'  }\n' +
'  .bloc {\n' +
'    top: 6px;\n' +
'    bottom: 6px;\n' +
'    min-width: 10px;\n' +
'  }\n' +
'  .blocLabel {\n' +
'    font-size: 0.65rem;\n' +
'  }\n' +
'}\n';

fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', newCss, 'utf8');
console.log('[2/3] CSS v5 ecrit');

// === 3. NETTOYER Calculator.jsx : virer les props infractions et onInfractionClick ===
var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Trouver la ligne Timeline24h et supprimer les props infractions + onInfractionClick
var timelineMatch = calc.match(/<Card><Timeline24h[^]*?\/><\/Card>/);
if (timelineMatch) {
  var oldLine = timelineMatch[0];
  // Reconstruire proprement avec seulement les props utiles
  var newLine = '<Card><Timeline24h equipage={equipage} activites={jours[jourActifIndex].activites} theme={theme} onActiviteClick={function(idx) { setBottomTab(\'saisie\'); setTimeout(function() { var el = document.getElementById(\'activite-\' + idx); if (el) { el.scrollIntoView({ behavior: \'smooth\', block: \'center\' }); el.style.transition = \'box-shadow 0.3s\'; el.style.boxShadow = \'0 0 20px rgba(0, 212, 255, 0.5)\'; setTimeout(function() { el.style.boxShadow = \'none\'; }, 2000); } }, 100); }} /></Card>';
  calc = calc.replace(oldLine, newLine);
  fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
  console.log('[3/3] Calculator.jsx - props infractions et onInfractionClick supprimees');
} else {
  console.log('[3/3] SKIP - Timeline24h non trouve');
}

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: TIMELINE V5 CLEAN\n\n## Details\n- Timeline nettoyee : zero drapeau, zero moteur infraction, zero crash\n- Affiche uniquement les blocs du jour actif + tooltip + labels\n- Props supprimees : infractions, onInfractionClick\n- Preparation pour future timeline multi-jours intelligente (session dediee)\n- Les infractions restent 100% dans InfractionCards (onglet Resultats)\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
