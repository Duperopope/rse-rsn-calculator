var fs = require('fs');

// === TIMELINE V4 - Standard tachygraphe pro ===
var newJsx = 'import React, { useRef, useState, useEffect, useMemo } from "react";\n' +
'import { TYPES_ACTIVITE } from "../../config/constants.js";\n' +
'import { dureeMin } from "../../utils/time.js";\n' +
'import styles from "./Timeline24h.module.css";\n' +
'\n' +
'// Mapper une infraction backend vers un type de severite + position temporelle\n' +
'function mapInfractionToFlag(inf, activites) {\n' +
'  var regle = (inf.regle || inf.message || "").toLowerCase();\n' +
'  var severity = "serious";\n' +
'  if (inf.classe && inf.classe.indexOf("5") !== -1) severity = "critical";\n' +
'\n' +
'  // Determiner la position temporelle approximative\n' +
'  var minute = -1;\n' +
'  var label = inf.regle || inf.message || "Infraction";\n' +
'\n' +
'  if (regle.indexOf("continue") !== -1 || regle.indexOf("4h30") !== -1) {\n' +
'    // Conduite continue : trouver le moment ou on depasse 4h30\n' +
'    var acc = 0;\n' +
'    for (var i = 0; i < activites.length; i++) {\n' +
'      var a = activites[i];\n' +
'      if (!a.debut || !a.fin) continue;\n' +
'      var s = dureeMin(a.debut);\n' +
'      var e = dureeMin(a.fin);\n' +
'      if (e <= s) e += 1440;\n' +
'      if (a.type === "C") {\n' +
'        var avant = acc;\n' +
'        acc += (e - s);\n' +
'        if (acc > 270 && avant <= 270) {\n' +
'          minute = s + (270 - avant);\n' +
'          break;\n' +
'        }\n' +
'      } else if (a.type === "P" || a.type === "R") {\n' +
'        if ((e - s) >= 45) acc = 0;\n' +
'      }\n' +
'    }\n' +
'  } else if (regle.indexOf("amplitude") !== -1) {\n' +
'    // Amplitude : debut + 13h (780 min)\n' +
'    if (activites.length > 0 && activites[0].debut) {\n' +
'      minute = dureeMin(activites[0].debut) + 780;\n' +
'    }\n' +
'  } else if (regle.indexOf("nuit") !== -1 || regle.indexOf("nocturne") !== -1) {\n' +
'    minute = 1260; // 21h\n' +
'  } else if (regle.indexOf("journali") !== -1 && regle.indexOf("conduite") !== -1) {\n' +
'    // Conduite journaliere : trouver ou on depasse 9h\n' +
'    var condTotal = 0;\n' +
'    for (var j = 0; j < activites.length; j++) {\n' +
'      var b = activites[j];\n' +
'      if (!b.debut || !b.fin || b.type !== "C") continue;\n' +
'      var s2 = dureeMin(b.debut);\n' +
'      var e2 = dureeMin(b.fin);\n' +
'      if (e2 <= s2) e2 += 1440;\n' +
'      var av = condTotal;\n' +
'      condTotal += (e2 - s2);\n' +
'      if (condTotal > 540 && av <= 540) {\n' +
'        minute = s2 + (540 - av);\n' +
'        break;\n' +
'      }\n' +
'    }\n' +
'  } else if (regle.indexOf("repos") !== -1) {\n' +
'    // Repos : fin de journee\n' +
'    if (activites.length > 0) {\n' +
'      var last = activites[activites.length - 1];\n' +
'      if (last.fin) minute = dureeMin(last.fin);\n' +
'    }\n' +
'  }\n' +
'\n' +
'  if (minute < 0 || minute > 1440) minute = -1;\n' +
'  return { minute: minute, severity: severity, label: label, infraction: inf };\n' +
'}\n' +
'\n' +
'export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo", infractions = [], onInfractionClick }) {\n' +
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
'  // Mapper les infractions backend vers des drapeaux positionnes\n' +
'  var flags = useMemo(function() {\n' +
'    if (!infractions || infractions.length === 0) return [];\n' +
'    return infractions.map(function(inf) {\n' +
'      return mapInfractionToFlag(inf, activites);\n' +
'    }).filter(function(f) { return f.minute >= 0; });\n' +
'  }, [infractions, activites]);\n' +
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
'  function formatDuree(min) {\n' +
'    var h = Math.floor(min / 60);\n' +
'    var m = min % 60;\n' +
'    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");\n' +
'  }\n' +
'\n' +
'  var heures = [];\n' +
'  for (var h = 0; h <= 24; h += 3) heures.push(h);\n' +
'\n' +
'  return (\n' +
'    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>\n' +
'\n' +
'      {/* Badge equipage */}\n' +
'      <div className={styles.topRow}>\n' +
'        <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>\n' +
'          <span>{equipage === "double" ? "\\u{1F465}" : "\\u{1F464}"}</span>\n' +
'          <span>{equipage === "double" ? "Duo" : "Solo"}</span>\n' +
'        </div>\n' +
'        {flags.length > 0 && (\n' +
'          <div className={styles.flagCount}>\n' +
'            <span className={styles.flagDot} />\n' +
'            <span>{flags.length} infraction{flags.length > 1 ? "s" : ""}</span>\n' +
'          </div>\n' +
'        )}\n' +
'      </div>\n' +
'\n' +
'      {/* Zone drapeaux infractions (au-dessus du track) */}\n' +
'      {flags.length > 0 && (\n' +
'        <div className={styles.flagsRow}>\n' +
'          {flags.map(function(flag, idx) {\n' +
'            var leftPct = (flag.minute / totalMin * 100);\n' +
'            return (\n' +
'              <div\n' +
'                key={"flag" + idx}\n' +
'                className={styles.flag + " " + (flag.severity === "critical" ? styles.flagCritical : styles.flagSerious)}\n' +
'                style={{ left: leftPct + "%" }}\n' +
'                onClick={function() {\n' +
'                  if (onInfractionClick) {\n' +
'                    onInfractionClick(idx);\n' +
'                  }\n' +
'                }}\n' +
'                onTouchStart={function(e) {\n' +
'                  e.stopPropagation();\n' +
'                  if (navigator.vibrate) navigator.vibrate(10);\n' +
'                  setTooltip(function(prev) {\n' +
'                    return prev && prev.flagIdx === idx ? null : {\n' +
'                      text: flag.label,\n' +
'                      x: e.currentTarget.getBoundingClientRect().left + 10,\n' +
'                      y: e.currentTarget.getBoundingClientRect().top - 8,\n' +
'                      flagIdx: idx\n' +
'                    };\n' +
'                  });\n' +
'                }}\n' +
'              >\n' +
'                <div className={styles.flagPole} />\n' +
'                <div className={styles.flagHead}>{"\\u26A0"}</div>\n' +
'              </div>\n' +
'            );\n' +
'          })}\n' +
'        </div>\n' +
'      )}\n' +
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
'          var duree = bloc.endMin - bloc.startMin;\n' +
'          var showLabel = duree >= 60;\n' +
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
'                    text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(duree) + ")",\n' +
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
'                  text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(duree) + ")",\n' +
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
console.log('[1/3] Timeline24h.jsx v4 - drapeaux infractions backend');

// === CSS v4 ===
var newCss = '/* Timeline24h - v4 standard tachygraphe */\n' +
'.container {\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'  gap: 4px;\n' +
'  padding: 10px 0;\n' +
'  user-select: none;\n' +
'}\n\n' +

'/* === TOP ROW === */\n' +
'.topRow {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  justify-content: space-between;\n' +
'  margin: 0 12px 2px;\n' +
'}\n\n' +

'.equipageBadge {\n' +
'  display: inline-flex;\n' +
'  align-items: center;\n' +
'  gap: 4px;\n' +
'  padding: 2px 8px;\n' +
'  border-radius: 10px;\n' +
'  font-size: 0.68rem;\n' +
'  font-weight: 600;\n' +
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

'.flagCount {\n' +
'  display: flex;\n' +
'  align-items: center;\n' +
'  gap: 5px;\n' +
'  font-size: 0.7rem;\n' +
'  font-weight: 600;\n' +
'  color: #ff6b6b;\n' +
'}\n\n' +

'.flagDot {\n' +
'  width: 8px;\n' +
'  height: 8px;\n' +
'  border-radius: 50%;\n' +
'  background: #ff3b30;\n' +
'  animation: flagPulse 2s infinite;\n' +
'}\n\n' +

'@keyframes flagPulse {\n' +
'  0%, 100% { opacity: 1; }\n' +
'  50% { opacity: 0.4; }\n' +
'}\n\n' +

'/* === FLAGS ROW === */\n' +
'.flagsRow {\n' +
'  position: relative;\n' +
'  height: 28px;\n' +
'  margin: 0 12px;\n' +
'}\n\n' +

'.flag {\n' +
'  position: absolute;\n' +
'  bottom: 0;\n' +
'  transform: translateX(-50%);\n' +
'  cursor: pointer;\n' +
'  display: flex;\n' +
'  flex-direction: column;\n' +
'  align-items: center;\n' +
'}\n\n' +

'.flagPole {\n' +
'  width: 2px;\n' +
'  height: 12px;\n' +
'  background: currentColor;\n' +
'}\n\n' +

'.flagHead {\n' +
'  font-size: 0.85rem;\n' +
'  line-height: 1;\n' +
'}\n\n' +

'.flagSerious {\n' +
'  color: #ff9500;\n' +
'}\n\n' +

'.flagCritical {\n' +
'  color: #ff3b30;\n' +
'}\n\n' +

'@media (pointer: coarse) {\n' +
'  .flag {\n' +
'    min-width: 32px;\n' +
'    min-height: 32px;\n' +
'    padding: 4px;\n' +
'  }\n' +
'}\n\n' +

'/* === LABELS === */\n' +
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

'/* === TRACK === */\n' +
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

'/* === BLOCS === */\n' +
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

'/* === LEGENDE === */\n' +
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

'/* === TOOLTIP === */\n' +
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

'/* === BANDES NUIT === */\n' +
'.nightZone {\n' +
'  position: absolute;\n' +
'  top: 0;\n' +
'  bottom: 0;\n' +
'  background: rgba(99, 102, 241, 0.04);\n' +
'  pointer-events: none;\n' +
'  z-index: 0;\n' +
'}\n\n' +

'/* === MOBILE === */\n' +
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
console.log('[2/3] CSS v4 ecrit');

// === 3. PATCHER Calculator.jsx pour passer infractions + onInfractionClick a Timeline24h ===
var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Trouver la ligne Timeline24h et ajouter les props
var oldTimeline = calc.match(/<Timeline24h[^/]*\/>/);
if (oldTimeline) {
  var oldLine = oldTimeline[0];
  // Ajouter infractions={resultat ? resultat.infractions : []} et onInfractionClick
  if (oldLine.indexOf('infractions=') === -1) {
    var newLine = oldLine.replace('/>', ' infractions={resultat && resultat.infractions ? resultat.infractions : []} onInfractionClick={function(idx) { setBottomTab("resultats"); setTimeout(function() { var cards = document.querySelectorAll("[class*=\\"card\\"]"); if (cards[idx]) { cards[idx].scrollIntoView({ behavior: "smooth", block: "center" }); cards[idx].style.transition = "box-shadow 0.3s"; cards[idx].style.boxShadow = "0 0 20px rgba(255, 59, 48, 0.6)"; setTimeout(function() { cards[idx].style.boxShadow = "none"; }, 2500); } }, 400); }} />');
    calc = calc.replace(oldLine, newLine);
    fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
    console.log('[3/3] Calculator.jsx - infractions + onInfractionClick passes a Timeline24h');
  } else {
    console.log('[3/3] SKIP - infractions deja passe');
  }
} else {
  console.log('[3/3] ERREUR - Timeline24h non trouve dans Calculator.jsx');
}

// === MAJ CLAUDE-current.md ===
var current = '# Tache en cours\n\n## Statut: TIMELINE V4 - STANDARD TACHYGRAPHE\n\n## Details\n- Timeline v4 : drapeaux infractions alimentes par le backend (zero moteur client)\n- Drapeaux positionnes temporellement via mapping regle -> minute\n- Tap drapeau -> bascule onglet Resultats + scroll vers InfractionCard\n- Tap bloc -> tooltip avec type + heures + duree\n- Labels sur blocs larges (>1h)\n- Suppression chips stats (doublon jauges)\n- CSS : flagsRow au-dessus du track, style Tachogram\n- Source UX : tachogram.com standard industrie\n';
fs.writeFileSync('CLAUDE-current.md', current, 'utf8');
console.log('CLAUDE-current.md mis a jour');
