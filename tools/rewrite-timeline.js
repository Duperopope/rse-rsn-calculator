var fs = require('fs');

// === REECRITURE COMPLETE Timeline24h.jsx ===
var newJsx = 'import React, { useRef, useState, useEffect, useMemo } from "react";\n' +
'import { TYPES_ACTIVITE } from "../../config/constants.js";\n' +
'import { dureeMin } from "../../utils/time.js";\n' +
'import styles from "./Timeline24h.module.css";\n' +
'\n' +
'export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo", infractions = [] }) {\n' +
'  var containerRef = useRef(null);\n' +
'  var [tooltip, setTooltip] = useState(null);\n' +
'  var [width, setWidth] = useState(0);\n' +
'\n' +
'  useEffect(function() {\n' +
'    function updateWidth() {\n' +
'      if (containerRef.current) setWidth(containerRef.current.offsetWidth);\n' +
'    }\n' +
'    updateWidth();\n' +
'    window.addEventListener("resize", updateWidth);\n' +
'    return function() { window.removeEventListener("resize", updateWidth); };\n' +
'  }, []);\n' +
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
'  // Construire les blocs visuels\n' +
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
'  // Calculer les stats rapides\n' +
'  var stats = { conduite: 0, travail: 0, pause: 0 };\n' +
'  for (var j = 0; j < blocs.length; j++) {\n' +
'    var duree = blocs[j].endMin - blocs[j].startMin;\n' +
'    if (blocs[j].type === "C") stats.conduite += duree;\n' +
'    else if (blocs[j].type === "T" || blocs[j].type === "D") stats.travail += duree;\n' +
'    else if (blocs[j].type === "P" || blocs[j].type === "R") stats.pause += duree;\n' +
'  }\n' +
'\n' +
'  function formatDuree(min) {\n' +
'    var h = Math.floor(min / 60);\n' +
'    var m = min % 60;\n' +
'    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");\n' +
'  }\n' +
'\n' +
'  // Determiner amplitude\n' +
'  var amplitudeText = "";\n' +
'  if (blocs.length >= 2) {\n' +
'    var premiereMin = blocs[0].startMin;\n' +
'    var derniereMin = blocs[blocs.length - 1].endMin;\n' +
'    amplitudeText = formatDuree(derniereMin - premiereMin);\n' +
'  }\n' +
'\n' +
'  var heures = [];\n' +
'  for (var h = 0; h <= 24; h += 3) heures.push(h);\n' +
'\n' +
'  // Nombre d infractions\n' +
'  var nbInf = infractions ? infractions.length : 0;\n' +
'\n' +
'  return (\n' +
'    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>\n' +
'\n' +
'      {/* Resume compact */}\n' +
'      <div className={styles.statsBar}>\n' +
'        <span className={styles.statChip + " " + styles.statConduite}>{formatDuree(stats.conduite)} conduite</span>\n' +
'        <span className={styles.statChip + " " + styles.statTravail}>{formatDuree(stats.travail)} travail</span>\n' +
'        <span className={styles.statChip + " " + styles.statPause}>{formatDuree(stats.pause)} pause</span>\n' +
'        {amplitudeText ? <span className={styles.statChip + " " + styles.statAmplitude}>{amplitudeText} amplitude</span> : null}\n' +
'      </div>\n' +
'\n' +
'      {/* Badge equipage */}\n' +
'      <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>\n' +
'        <span className={styles.equipageIcon}>{equipage === "double" ? "\\u{1F465}" : "\\u{1F464}"}</span>\n' +
'        <span className={styles.equipageLabel}>{equipage === "double" ? "Double equipage" : "Solo"}</span>\n' +
'      </div>\n' +
'\n' +
'      {/* Heures */}\n' +
'      <div className={styles.labels}>\n' +
'        {heures.map(function(h) {\n' +
'          return <span key={h} className={styles.heure} style={{ left: (h / 24 * 100) + "%" }}>{h}h</span>;\n' +
'        })}\n' +
'      </div>\n' +
'\n' +
'      {/* Track principal */}\n' +
'      <div className={styles.track}>\n' +
'        {/* Grille */}\n' +
'        {heures.map(function(h) {\n' +
'          return <div key={"g" + h} className={styles.gridLine} style={{ left: (h / 24 * 100) + "%" }} />;\n' +
'        })}\n' +
'\n' +
'        {/* Bandes nuit */}\n' +
'        <div className={styles.nightZone} style={{ left: "0%", width: (360 / 1440 * 100) + "%" }} />\n' +
'        <div className={styles.nightZone} style={{ left: (1260 / 1440 * 100) + "%", width: (180 / 1440 * 100) + "%" }} />\n' +
'\n' +
'        {/* Blocs activites */}\n' +
'        {blocs.map(function(bloc, idx) {\n' +
'          var left = (bloc.startMin / totalMin * 100);\n' +
'          var w = ((bloc.endMin - bloc.startMin) / totalMin * 100);\n' +
'          return (\n' +
'            <div\n' +
'              key={idx}\n' +
'              className={styles.bloc}\n' +
'              style={{\n' +
'                left: left + "%",\n' +
'                width: Math.max(w, 0.5) + "%",\n' +
'                background: getCouleur(bloc.type)\n' +
'              }}\n' +
'              onTouchStart={function(e) {\n' +
'                e.stopPropagation();\n' +
'                var rect = e.currentTarget.getBoundingClientRect();\n' +
'                setTooltip(function(prev) {\n' +
'                  return prev && prev.index === idx ? null : {\n' +
'                    text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(bloc.endMin - bloc.startMin) + ")",\n' +
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
'                  text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(bloc.endMin - bloc.startMin) + ")",\n' +
'                  index: idx\n' +
'                });\n' +
'              }}\n' +
'              onMouseLeave={function() { setTooltip(null); }}\n' +
'              onClick={function() {\n' +
'                if (onActiviteClick && bloc.actIndex >= 0) onActiviteClick(bloc.actIndex);\n' +
'              }}\n' +
'            />\n' +
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
'            top: (tooltip.y - 40) + "px",\n' +
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
console.log('[1/2] Timeline24h.jsx reecrit - mode affichage pur');

// === CSS v3 : clean, lisible, zero doublon ===
var newCss = '/* Timeline24h - v3 affichage pur */\n' +
'.container {\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'  gap: 8px;\n' +
'  padding: 12px 0;\n' +
'  user-select: none;\n' +
'}\n\n' +

'/* === STATS BAR === */\n' +
'.statsBar {\n' +
'  display: flex;\n' +
'  gap: 6px;\n' +
'  flex-wrap: wrap;\n' +
'  margin: 0 12px;\n' +
'}\n\n' +

'.statChip {\n' +
'  padding: 3px 10px;\n' +
'  border-radius: 20px;\n' +
'  font-size: 0.7rem;\n' +
'  font-weight: 600;\n' +
'  letter-spacing: 0.02em;\n' +
'}\n\n' +

'.statConduite {\n' +
'  background: rgba(76, 175, 80, 0.12);\n' +
'  color: #4caf50;\n' +
'  border: 1px solid rgba(76, 175, 80, 0.25);\n' +
'}\n\n' +

'.statTravail {\n' +
'  background: rgba(33, 150, 243, 0.12);\n' +
'  color: #2196f3;\n' +
'  border: 1px solid rgba(33, 150, 243, 0.25);\n' +
'}\n\n' +

'.statPause {\n' +
'  background: rgba(156, 39, 176, 0.12);\n' +
'  color: #9c27b0;\n' +
'  border: 1px solid rgba(156, 39, 176, 0.25);\n' +
'}\n\n' +

'.statAmplitude {\n' +
'  background: rgba(255, 152, 0, 0.12);\n' +
'  color: #ff9800;\n' +
'  border: 1px solid rgba(255, 152, 0, 0.25);\n' +
'}\n\n' +

'/* === LABELS HEURES === */\n' +
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

'/* === TRACK === */\n' +
'.track {\n' +
'  position: relative;\n' +
'  height: 52px;\n' +
'  background: var(--bg-input, #1a1a2e);\n' +
'  border-radius: 12px;\n' +
'  margin: 0 12px;\n' +
'  overflow: hidden;\n' +
'}\n\n' +

'.gridLine {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  width: 1px;\n' +
'  background: var(--border, #2a2a3e);\n' +
'  opacity: 0.25;\n' +
'  pointer-events: none;\n' +
'}\n\n' +

'/* === BLOCS === */\n' +
'.bloc {\n' +
'  position: absolute;\n' +
'  top: 6px;\n' +
'  bottom: 6px;\n' +
'  border-radius: 8px;\n' +
'  cursor: pointer;\n' +
'  transition: opacity 0.15s, transform 0.15s;\n' +
'  min-width: 6px;\n' +
'  z-index: 2;\n' +
'  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15);\n' +
'}\n\n' +

'@media (hover: hover) {\n' +
'  .bloc:hover {\n' +
'    opacity: 0.85;\n' +
'    transform: scaleY(1.08);\n' +
'    z-index: 3;\n' +
'  }\n' +
'}\n\n' +

'.bloc:active {\n' +
'  opacity: 0.75;\n' +
'  transform: scaleY(1.12);\n' +
'  z-index: 4;\n' +
'}\n\n' +

'/* === LEGENDE === */\n' +
'.legende {\n' +
'  display: flex;\n' +
'  gap: 12px;\n' +
'  flex-wrap: wrap;\n' +
'  margin: 4px 12px 0;\n' +
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

'/* === BADGE EQUIPAGE === */\n' +
'.equipageBadge {\n' +
'  display: inline-flex;\n' +
'  align-items: center;\n' +
'  gap: 5px;\n' +
'  padding: 3px 10px;\n' +
'  border-radius: 12px;\n' +
'  font-size: 0.7rem;\n' +
'  font-weight: 600;\n' +
'  margin: 0 12px;\n' +
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

'.equipageIcon { font-size: 0.85rem; }\n' +
'.equipageLabel { letter-spacing: 0.03em; }\n\n' +

'/* === BANDES NUIT === */\n' +
'.nightZone {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  background: rgba(99, 102, 241, 0.05);\n' +
'  pointer-events: none;\n' +
'  z-index: 0;\n' +
'}\n\n' +

'/* === MOBILE === */\n' +
'@media (pointer: coarse) {\n' +
'  .track {\n' +
'    height: 64px;\n' +
'    min-height: 64px;\n' +
'  }\n' +
'  .bloc {\n' +
'    top: 8px;\n' +
'    bottom: 8px;\n' +
'    min-width: 12px;\n' +
'  }\n' +
'}\n\n' +

'@media (max-width: 480px) {\n' +
'  .statsBar { gap: 4px; }\n' +
'  .statChip { font-size: 0.65rem; padding: 2px 8px; }\n' +
'}\n';

fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', newCss, 'utf8');
console.log('[2/2] CSS timeline v3 ecrit');

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: TIMELINE V3 - AFFICHAGE PUR\n\n## Details\n- Timeline reecrite : suppression mini-moteur analyserInfractions\n- Plus de zones de depassement, marqueurs, ou details infraction dans la timeline\n- Ajout barre de stats (conduite, travail, pause, amplitude)\n- Tooltip avec duree\n- Les infractions restent 100% gerees par le backend + InfractionCards\n- Build en cours\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
