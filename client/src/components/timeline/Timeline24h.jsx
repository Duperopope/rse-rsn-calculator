import React, { useRef, useState, useEffect, useMemo } from "react";
import { TYPES_ACTIVITE } from "../../config/constants.js";
import { dureeMin } from "../../utils/time.js";
import styles from "./Timeline24h.module.css";

export function Timeline24h({ activites = [], theme = "dark", onActiviteClick, equipage = "solo", infractions = [] }) {
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

  var totalMin = 1440;

  function getCouleur(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.couleur : "#666";
  }

  function getLabel(type) {
    var t = TYPES_ACTIVITE.find(function(a) { return a.code === type; });
    return t ? t.label : type;
  }

  // Construire les blocs visuels
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

  // Calculer les stats rapides
  var stats = { conduite: 0, travail: 0, pause: 0 };
  for (var j = 0; j < blocs.length; j++) {
    var duree = blocs[j].endMin - blocs[j].startMin;
    if (blocs[j].type === "C") stats.conduite += duree;
    else if (blocs[j].type === "T" || blocs[j].type === "D") stats.travail += duree;
    else if (blocs[j].type === "P" || blocs[j].type === "R") stats.pause += duree;
  }

  function formatDuree(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + "h" + (m > 0 ? (m < 10 ? "0" : "") + m : "");
  }

  // Determiner amplitude
  var amplitudeText = "";
  if (blocs.length >= 2) {
    var premiereMin = blocs[0].startMin;
    var derniereMin = blocs[blocs.length - 1].endMin;
    amplitudeText = formatDuree(derniereMin - premiereMin);
  }

  var heures = [];
  for (var h = 0; h <= 24; h += 3) heures.push(h);

  // Nombre d infractions
  var nbInf = infractions ? infractions.length : 0;

  return (
    <div className={styles.container} ref={containerRef} onTouchStart={function(e) { if (e.target === e.currentTarget) setTooltip(null); }}>

      {/* Resume compact */}
      <div className={styles.statsBar}>
        <span className={styles.statChip + " " + styles.statConduite}>{formatDuree(stats.conduite)} conduite</span>
        <span className={styles.statChip + " " + styles.statTravail}>{formatDuree(stats.travail)} travail</span>
        <span className={styles.statChip + " " + styles.statPause}>{formatDuree(stats.pause)} pause</span>
        {amplitudeText ? <span className={styles.statChip + " " + styles.statAmplitude}>{amplitudeText} amplitude</span> : null}
      </div>

      {/* Badge equipage */}
      <div className={styles.equipageBadge + " " + (equipage === "double" ? styles.equipageDuo : styles.equipageSolo)}>
        <span className={styles.equipageIcon}>{equipage === "double" ? "\u{1F465}" : "\u{1F464}"}</span>
        <span className={styles.equipageLabel}>{equipage === "double" ? "Double equipage" : "Solo"}</span>
      </div>

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
                    text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(bloc.endMin - bloc.startMin) + ")",
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
                  text: getLabel(bloc.type) + " : " + bloc.debut + " - " + bloc.fin + " (" + formatDuree(bloc.endMin - bloc.startMin) + ")",
                  index: idx
                });
              }}
              onMouseLeave={function() { setTooltip(null); }}
              onClick={function() {
                if (onActiviteClick && bloc.actIndex >= 0) onActiviteClick(bloc.actIndex);
              }}
            />
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
            top: (tooltip.y - 40) + "px",
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
