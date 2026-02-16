import React, { useRef, useState, useEffect, useMemo } from "react";
import { TYPES_ACTIVITE } from "../../config/constants.js";
import { dureeMin } from "../../utils/time.js";
import styles from "./Timeline24h.module.css";

// Mapper une infraction backend vers un type de severite + position temporelle
function mapInfractionToFlag(inf, activites, idx) {
  var regle = (inf.regle || inf.message || "").toLowerCase();
  var severity = "serious";
  if (inf.classe && inf.classe.indexOf("5") !== -1) severity = "critical";

  // Determiner la position temporelle approximative
  var minute = -1;
  var label = inf.regle || inf.message || "Infraction";

  if (regle.indexOf("continue") !== -1 || regle.indexOf("4h30") !== -1) {
    // Conduite continue : trouver le moment ou on depasse 4h30
    var acc = 0;
    for (var i = 0; i < activites.length; i++) {
      var a = activites[i];
      if (!a.debut || !a.fin) continue;
      var s = dureeMin(a.debut);
      var e = dureeMin(a.fin);
      if (e <= s) e += 1440;
      if (a.type === "C") {
        var avant = acc;
        acc += (e - s);
        if (acc > 270 && avant <= 270) {
          minute = s + (270 - avant);
          break;
        }
      } else if (a.type === "P" || a.type === "R") {
        if ((e - s) >= 45) acc = 0;
      }
    }
  } else if (regle.indexOf("amplitude") !== -1) {
    // Amplitude : debut + 13h (780 min)
    if (activites.length > 0 && activites[0].debut) {
      minute = dureeMin(activites[0].debut) + 780;
    }
  } else if (regle.indexOf("nuit") !== -1 || regle.indexOf("nocturne") !== -1) {
    minute = 1260; // 21h
  } else if (regle.indexOf("journali") !== -1 && regle.indexOf("conduite") !== -1) {
    // Conduite journaliere : trouver ou on depasse 9h
    var condTotal = 0;
    for (var j = 0; j < activites.length; j++) {
      var b = activites[j];
      if (!b.debut || !b.fin || b.type !== "C") continue;
      var s2 = dureeMin(b.debut);
      var e2 = dureeMin(b.fin);
      if (e2 <= s2) e2 += 1440;
      var av = condTotal;
      condTotal += (e2 - s2);
      if (condTotal > 540 && av <= 540) {
        minute = s2 + (540 - av);
        break;
      }
    }
  } else if (regle.indexOf("repos") !== -1) {
    // Repos : fin de journee
    if (activites.length > 0) {
      var last = activites[activites.length - 1];
      if (last.fin) minute = dureeMin(last.fin);
    }
  }

  // Si aucune position trouvee, placer au milieu de la journee comme indicateur
  if (minute < 0 || minute > 1440) {
    // Essayer de deduire une position a partir du constate
    var constMatch = (inf.constate || "").match(/(\d+\.?\d*)h/);
    if (constMatch) {
      // Position proportionnelle basee sur le ratio constate/limite
      var limMatch = (inf.limite || "").match(/(\d+\.?\d*)h?/);
      if (limMatch && activites.length > 0) {
        var first = dureeMin(activites[0].debut || "06:00");
        var limVal = parseFloat(limMatch[1]) * 60;
        minute = Math.min(first + limVal, 1439);
      }
    }
  }
  if (minute < 0 || minute > 1440) minute = -1;
  return { minute: minute, severity: severity, label: label, infraction: inf, index: idx };
}

export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo", infractions = [], onInfractionClick }) {
  var containerRef = useRef(null);
  var [tooltip, setTooltip] = useState(null);
  var [width, setWidth] = useState(0);

  useEffect(function() {
    function updateWidth() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    }
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return function() { window.removeEventListener("resize", updateWidth); };
  }, []);

  // Mapper les infractions backend vers des drapeaux positionnes
  var flags = useMemo(function() {
    if (!infractions || infractions.length === 0) return [];
    return infractions.map(function(inf, i) {
      return mapInfractionToFlag(inf, activites, i);
    }).filter(function(f) { return f.minute >= 0; });
  }, [infractions, activites]);

  var totalMin = 1440;

  function getCouleur(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.couleur : "#666";
  }

  function getLabel(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.label : type;
  }

  // Construire les blocs
  var blocs = [];
  for (var i = 0; i < activites.length; i++) {
    var act = activites[i];
    if (!act.debut || !act.fin) continue;
    var startMin = dureeMin(act.debut);
    var endMin = dureeMin(act.fin);
    if (endMin <= startMin) endMin += 1440;

    if (startMin < 1440 && endMin > 1440) {
      blocs.push({ startMin: startMin, endMin: 1440, type: act.type, debut: act.debut, fin: "24:00", actIndex: i });
      blocs.push({ startMin: 0, endMin: endMin - 1440, type: act.type, debut: "00:00", fin: act.fin, actIndex: i });
    } else {
      blocs.push({ startMin: startMin % 1440, endMin: Math.min(endMin, 1440), type: act.type, debut: act.debut, fin: act.fin, actIndex: i });
    }
  }

  function formatDuree(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");
  }

  var heures = [];
  for (var h = 0; h <= 24; h += 3) heures.push(h);

  return (
    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>

      {/* Badge equipage */}
      <div className={styles.topRow}>
        <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>
          <span>{equipage === "double" ? "\u{1F465}" : "\u{1F464}"}</span>
          <span>{equipage === "double" ? "Duo" : "Solo"}</span>
        </div>
        {flags.length > 0 && (
          <div className={styles.flagCount}>
            <span className={styles.flagDot} />
            <span>{flags.length} infraction{flags.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Zone drapeaux infractions (au-dessus du track) */}
      {flags.length > 0 && (
        <div className={styles.flagsRow}>
          {flags.map(function(flag, idx) {
            var leftPct = (flag.minute / totalMin * 100);
            return (
              <div
                key={"flag" + idx}
                className={styles.flag + " " + (flag.severity === "critical" ? styles.flagCritical : styles.flagSerious)}
                style={{ left: leftPct + "%" }}
                onClick={function() {
                  if (onInfractionClick) {
                    onInfractionClick(flag.index !== undefined ? flag.index : idx);
                  }
                }}
                onTouchStart={function(e) {
                  e.stopPropagation();
                  if (navigator.vibrate) navigator.vibrate(10);
                  setTooltip(function(prev) {
                    return prev && prev.flagIdx === idx ? null : {
                      text: flag.label,
                      x: e.currentTarget.getBoundingClientRect().left + 10,
                      y: e.currentTarget.getBoundingClientRect().top - 8,
                      flagIdx: idx
                    };
                  });
                }}
              >
                <div className={styles.flagPole} />
                <div className={styles.flagHead}>{"\u26A0"}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Heures */}
      <div className={styles.labels}>
        {heures.map(function(h) {
          return <span key={h} className={styles.heure} style={{ left: (h / 24 * 100) + "%" }}>{h}h</span>;
        })}
      </div>

      {/* Track principal */}
      <div className={styles.track}>
        {/* Grille */}
        {heures.map(function(h) {
          return <div key={"g" + h} className={styles.gridLine} style={{ left: (h / 24 * 100) + "%" }} />;
        })}

        {/* Bandes nuit */}
        <div className={styles.nightZone} style={{ left: "0%", width: (360 / 1440 * 100) + "%" }} />
        <div className={styles.nightZone} style={{ left: (1260 / 1440 * 100) + "%", width: (180 / 1440 * 100) + "%" }} />

        {/* Blocs activites */}
        {blocs.map(function(bloc, idx) {
          var left = (bloc.startMin / totalMin * 100);
          var w = ((bloc.endMin - bloc.startMin) / totalMin * 100);
          var duree = bloc.endMin - bloc.startMin;
          var showLabel = duree >= 60;
          return (
            <div
              key={idx}
              className={styles.bloc}
              style={{
                left: left + "%",
                width: Math.max(w, 0.5) + "%",
                background: getCouleur(bloc.type)
              }}
              onTouchStart={function(e) {
                e.stopPropagation();
                var rect = e.currentTarget.getBoundingClientRect();
                setTooltip(function(prev) {
                  return prev && prev.index === idx ? null : {
                    text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(duree) + ")",
                    x: rect.left + rect.width / 2,
                    y: rect.top - 8,
                    index: idx
                  };
                });
              }}
              onMouseEnter={function(e) {
                var rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(duree) + ")",
                  index: idx
                });
              }}
              onMouseLeave={function() { setTooltip(null); }}
              onClick={function() {
                if (onActiviteClick && bloc.actIndex >= 0) onActiviteClick(bloc.actIndex);
              }}
            >
              {showLabel && <span className={styles.blocLabel}>{bloc.type}</span>}
            </div>
          );
        })}
      </div>

      {/* Legende */}
      <div className={styles.legende}>
        {TYPES_ACTIVITE.filter(function(t) { return blocs.some(function(b) { return b.type === t.code; }); }).map(function(t) {
          return (
            <span key={t.code} className={styles.legendeItem}>
              <span className={styles.legendeDot} style={{ background: t.couleur }} />
              {t.label}
            </span>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className={styles.tooltipBubble}
          style={{
            position: "fixed",
            left: Math.min(Math.max(tooltip.x, 80), window.innerWidth - 80) + "px",
            top: (tooltip.y - 44) + "px",
            transform: "translateX(-50%)",
            zIndex: 9999
          }}
          onClick={function() { setTooltip(null); }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
