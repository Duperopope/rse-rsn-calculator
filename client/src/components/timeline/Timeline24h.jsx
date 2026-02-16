import React, { useRef, useState, useEffect } from "react";
import { TYPES_ACTIVITE } from "../../config/constants.js";
import { dureeMin } from "../../utils/time.js";
import styles from "./Timeline24h.module.css";

export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo" }) {
  var containerRef = useRef(null);
  var [tooltip, setTooltip] = useState(null);

  var totalMin = 1440;

  function getCouleur(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.couleur : "#666";
  }

  function getLabel(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.label : type;
  }

  function formatDuree(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");
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

  var heures = [];
  for (var h = 0; h <= 24; h += 3) heures.push(h);

  return (
    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>

      {/* Badge equipage */}
      <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>
        <span>{equipage === "double" ? "\u{1F465}" : "\u{1F464}"}</span>
        <span>{equipage === "double" ? "Duo" : "Solo"}</span>
      </div>

      {/* Heures */}
      <div className={styles.labels}>
        {heures.map(function(h) {
          return <span key={h} className={styles.heure} style={{ left: (h / 24 * 100) + "%" }}>{h}h</span>;
        })}
      </div>

      {/* Track */}
      <div className={styles.track}>
        {heures.map(function(h) {
          return <div key={"g" + h} className={styles.gridLine} style={{ left: (h / 24 * 100) + "%" }} />;
        })}

        {/* Bandes nuit */}
        <div className={styles.nightZone} style={{ left: "0%", width: (360 / 1440 * 100) + "%" }} />
        <div className={styles.nightZone} style={{ left: (1260 / 1440 * 100) + "%", width: (180 / 1440 * 100) + "%" }} />

        {/* Blocs */}
        {blocs.map(function(bloc, idx) {
          var left = (bloc.startMin / totalMin * 100);
          var w = ((bloc.endMin - bloc.startMin) / totalMin * 100);
          var duree = bloc.endMin - bloc.startMin;
          var showLabel = duree >= 60;
          return (
            <div
              key={idx}
              className={styles.bloc}
              style={{ left: left + "%", width: Math.max(w, 0.5) + "%", background: getCouleur(bloc.type) }}
              onTouchStart={function(e) {
                e.stopPropagation();
                if (navigator.vibrate) navigator.vibrate(8);
                var rect = e.currentTarget.getBoundingClientRect();
                setTooltip(function(prev) {
                  return prev && prev.index === idx ? null : {
                    text: getLabel(bloc.type) + " : " + bloc.debut + " \u2192 " + bloc.fin + " (" + formatDuree(duree) + ")",
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
                  text: getLabel(bloc.type) + " : " + bloc.debut + " \u2192 " + bloc.fin + " (" + formatDuree(duree) + ")",
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
