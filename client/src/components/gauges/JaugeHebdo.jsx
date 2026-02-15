import React, { useState, useMemo } from "react";
import { fmtMin } from "../../utils/time.js";
import { calculerStatsJour } from "../../utils/stats.js";
import styles from "./JaugeHebdo.module.css";

/**
 * Jauge hebdomadaire dynamique multi-vues (clic pour basculer)
 * Sources: Code du travail (35h), Decret 2000-118 (46h/42h), CE 561/2006 Art.6 (56h/90h)
 * @param {Array} jours - [{date, activites}]
 * @param {string} typeService
 * @param {number} jourActifIndex
 */
export function JaugeHebdo({ jours = [], typeService = "REGULIER", jourActifIndex = 0 }) {
  var vuesCount = (typeService === "REGULIER") ? 2 : 3;
  var ref0 = React.useRef(0);
  var forceRender = React.useState(0);
  function cycleVue() { ref0.current = (ref0.current + 1) % vuesCount; forceRender[1](function(x) { return x + 1; }); }
  var vue = ref0.current;

  var isRegulier = typeService === "REGULIER";
  // Seuils en minutes
  var LEGAL = 35 * 60;                                     // 35h - duree legale
  var TRAVAIL_HEBDO_MAX = isRegulier ? 46 * 60 : 48 * 60; // max absolu/semaine
  var TRAVAIL_HEBDO_MOY = isRegulier ? 42 * 60 : 44 * 60; // moyenne max 12 semaines
  var CONDUITE_HEBDO_MAX = 56 * 60;                        // CE 561/2006 Art.6§2
  var CONDUITE_BIHEBDO_MAX = 90 * 60;                      // CE 561/2006 Art.6§3
  var NB_SEMAINES_MOY = 12;

  var statsHebdo = useMemo(function() {
    if (!jours || jours.length === 0) return null;
    var joursStats = jours.map(function(j) {
      var s = calculerStatsJour(j.activites);
      return {
        date: j.date || "",
        conduite: s ? s.conduiteTotale : 0,
        travail: s ? (s.conduiteTotale + s.travailTotal) : 0
      };
    });
    // Grouper par semaine ISO
    var semaines = {};
    joursStats.forEach(function(js) {
      if (!js.date) return;
      var d = new Date(js.date + "T12:00:00");
      if (isNaN(d.getTime())) return;
      var jan1 = new Date(d.getFullYear(), 0, 1);
      var dayOfYear = Math.floor((d - jan1) / 86400000) + 1;
      var weekNum = Math.ceil((dayOfYear + jan1.getDay()) / 7);
      var key = d.getFullYear() + "-W" + String(weekNum).padStart(2, "0");
      if (!semaines[key]) semaines[key] = { key: key, jours: [], conduite: 0, travail: 0 };
      semaines[key].jours.push(js);
      semaines[key].conduite += js.conduite;
      semaines[key].travail += js.travail;
    });
    var arr = Object.values(semaines).sort(function(a, b) { return a.key < b.key ? -1 : 1; });
    // Semaine du jour actif
    var sa = joursStats[jourActifIndex] || joursStats[0];
    var semActuelle = null;
    if (sa && sa.date) {
      var da = new Date(sa.date + "T12:00:00");
      if (!isNaN(da.getTime())) {
        var j1 = new Date(da.getFullYear(), 0, 1);
        var doy = Math.floor((da - j1) / 86400000) + 1;
        var wn = Math.ceil((doy + j1.getDay()) / 7);
        var k = da.getFullYear() + "-W" + String(wn).padStart(2, "0");
        semActuelle = semaines[k] || null;
      }
    }
    // Moyenne glissante
    var moyTrav = 0;
    var nbSem = Math.min(arr.length, NB_SEMAINES_MOY);
    if (nbSem > 0) {
      var tot = 0;
      for (var i = arr.length - nbSem; i < arr.length; i++) tot += arr[i].travail;
      moyTrav = tot / nbSem;
    }
    // Bi-hebdo conduite
    var biHebdo = 0;
    if (arr.length >= 2) biHebdo = arr[arr.length - 1].conduite + arr[arr.length - 2].conduite;
    else if (arr.length === 1) biHebdo = arr[0].conduite;
    return { sem: semActuelle, arr: arr, moy: moyTrav, biHebdo: biHebdo, nbSem: nbSem };
  }, [jours, jourActifIndex, typeService]);

  if (!statsHebdo || !statsHebdo.sem) return null;
  var sem = statsHebdo.sem;

  // === Construction des vues ===
  var vues = [];

  // Vue 1 : Travail hebdomadaire (tous profils)
  vues.push({
    label: "Travail hebdo",
    valeur: sem.travail,
    zones: [
      { max: LEGAL, color: "#00ff88", label: "Legal 35h" },
      { max: TRAVAIL_HEBDO_MOY, color: "#ffaa00", label: "Moy. max " + (isRegulier ? "42h" : "44h") },
      { max: TRAVAIL_HEBDO_MAX, color: "#ff6600", label: "Max " + (isRegulier ? "46h" : "48h") }
    ],
    max: TRAVAIL_HEBDO_MAX,
    detail: sem.jours.length + "j saisis - " + (isRegulier ? "Decret 2000-118" : "Code du travail"),
    info: "35h = legal | " + (isRegulier ? "42h moy/12sem | 46h max" : "44h moy/12sem | 48h max")
  });

  // Vue 2 : Conduite hebdomadaire (SLO/MARCHANDISES/OCCASIONNEL/INTERURBAIN uniquement)
  if (!isRegulier) {
    vues.push({
      label: "Conduite hebdo",
      valeur: sem.conduite,
      zones: [
        { max: CONDUITE_HEBDO_MAX, color: "#00ff88", label: "Max 56h" }
      ],
      max: CONDUITE_HEBDO_MAX,
      detail: "Bi-hebdo: " + fmtMin(statsHebdo.biHebdo) + " / " + fmtMin(CONDUITE_BIHEBDO_MAX),
      info: "CE 561/2006 Art.6§2-3 | 56h/sem, 90h/2sem"
    });
  }

  // Vue 3 : Moyenne glissante
  vues.push({
    label: "Moyenne " + statsHebdo.nbSem + " sem.",
    valeur: statsHebdo.moy,
    zones: [
      { max: LEGAL, color: "#00ff88", label: "Legal 35h" },
      { max: TRAVAIL_HEBDO_MOY, color: "#ffaa00", label: "Moy. max " + (isRegulier ? "42h" : "44h") }
    ],
    max: TRAVAIL_HEBDO_MOY,
    detail: statsHebdo.nbSem + "/" + NB_SEMAINES_MOY + " semaines - " + (isRegulier ? "Decret 2000-118" : "Code du travail"),
    info: "Moyenne glissante | max " + (isRegulier ? "42h" : "44h") + " sur 12 semaines"
  });

  var v = vues[vue % vues.length];
  var ratio = v.max > 0 ? v.valeur / v.max : 0;
  var pctFill = Math.min(Math.round(ratio * 100), 100);

  // Couleur de la barre principale selon les zones
  var barColor = "#00ff88";
  for (var zi = v.zones.length - 1; zi >= 0; zi--) {
    if (v.valeur <= v.zones[zi].max) barColor = v.zones[zi].color;
  }
  if (v.valeur > v.max) barColor = "#ff4444";

  var status = "ok";
  if (v.valeur > v.max) status = "danger";
  else if (v.valeur > LEGAL && v.valeur <= (v.zones[1] ? v.zones[1].max : v.max)) status = "warning";
  else if (v.valeur > (v.zones[1] ? v.zones[1].max : v.max)) status = "alert";

  return (
    <div className={styles.wrap} onClick={cycleVue} role="button" tabIndex={0} title="Cliquez pour changer de vue">
      <div className={styles.header}>
        <span className={styles.label}>{v.label}</span>
        <span className={styles.valText} style={{ color: barColor }}>
          {fmtMin(Math.round(v.valeur))} / {fmtMin(v.max)}
        </span>
      </div>
      <div className={styles.barWrap}>
        {/* Marqueurs de zone */}
        {v.zones.map(function(z, i) {
          var pct = Math.round((z.max / v.max) * 100);
          if (pct >= 100) return null;
          return <div key={i} className={styles.marker} style={{ left: pct + "%" }} title={z.label} />;
        })}
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: Math.min(pctFill, 100) + "%", background: barColor }} />
          {v.valeur > v.max && <div className={styles.overflow} style={{ width: Math.min((ratio - 1) * 100, 20) + "%" }} />}
        </div>
        {/* Labels sous la barre */}
        <div className={styles.zoneLabels}>
          {v.zones.map(function(z, i) {
            var pct = Math.round((z.max / v.max) * 100);
            return <span key={i} className={styles.zoneLabel} style={{ left: Math.min(pct, 98) + "%" }}>{z.label}</span>;
          })}
        </div>
      </div>
      <div className={styles.footer}>
        <span className={styles.detail}>{v.detail}</span>
        <span className={styles.info}>{v.info}</span>
      </div>
      <div className={styles.dots}>
        {vues.map(function(_, i) {
          return <span key={i} className={i === (vue % vues.length) ? styles.dotActive : styles.dot} />;
        })}
      </div>
    </div>
  );
}
