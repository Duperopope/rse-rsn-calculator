import React, { useState, useMemo } from "react";
import { JaugeCirculaire } from "./JaugeCirculaire.jsx";
import { JaugeLineaire } from "./JaugeLineaire.jsx";
import { LIMITES } from "../../config/constants.js";
import { fmtMin } from "../../utils/time.js";
import { calculerStatsJour } from "../../utils/stats.js";
import styles from "./PanneauJauges.module.css";

/**
 * Panneau complet de jauges temps reel
 * Cercle 1: Continue (fixe)
 * Cercle 2: Journee <-> Amplitude (clic pour switcher)
 * Cercle 3: Travail hebdo <-> Conduite hebdo <-> Moyenne glissante (clic)
 * Sources: CE 561/2006, Decret 2000-118, Code du travail
 */
export function PanneauJauges({ stats, typeService = "REGULIER", nbDerogConduite = 0, jours = [], jourActifIndex = 0 }) {
  if (!stats || stats.nbActivites === 0) return null;

  // === Etats des vues switchables ===
  var refVue2 = React.useRef(0); // 0=Journee, 1=Amplitude
  var refVue3 = React.useRef(0); // 0=Travail hebdo, 1=Conduite hebdo (SLO), 2=Moyenne
  var forceRender = useState(0);
  function cycleVue2(e) { e.stopPropagation(); refVue2.current = (refVue2.current + 1) % 2; forceRender[1](function(x) { return x+1; }); }

  var isRegulier = typeService === "REGULIER";
  var vue3Count = isRegulier ? 2 : 3;
  function cycleVue3(e) { e.stopPropagation(); refVue3.current = (refVue3.current + 1) % vue3Count; forceRender[1](function(x) { return x+1; }); }

  // === Seuils dynamiques conduite journaliere ===
  var derogDisponible = nbDerogConduite < 2;
  var enModeDerog = derogDisponible && stats.conduiteTotale > LIMITES.CONDUITE_JOURNALIERE_MAX;
  var limiteConduite = enModeDerog ? LIMITES.CONDUITE_JOURNALIERE_DEROG : LIMITES.CONDUITE_JOURNALIERE_MAX;
  var labelConduite = enModeDerog
    ? "Journee (derog " + (nbDerogConduite + 1) + "/2)"
    : (derogDisponible ? "Journee" : "Journee (2/2)");

  // === Seuils dynamiques amplitude ===
  var isSLO = (typeService === "OCCASIONNEL" || typeService === "SLO" || typeService === "INTERURBAIN" || typeService === "MARCHANDISES");
  var amplNormal = isSLO ? LIMITES.AMPLITUDE_OCCASIONNEL_NORMAL : LIMITES.AMPLITUDE_REGULIER_NORMAL;
  var amplDerog = isSLO ? LIMITES.AMPLITUDE_OCCASIONNEL_DEROG : LIMITES.AMPLITUDE_REGULIER_DEROG;
  var enModeDerogAmpl = stats.amplitude > amplNormal;
  var limiteAmplitude = enModeDerogAmpl ? amplDerog : amplNormal;
  var labelAmplitude = enModeDerogAmpl
    ? "Amplitude (derog)"
    : "Amplitude";

  // === Stats hebdomadaires (pour cercle 3) ===
  var LEGAL = 35 * 60;
  var TRAVAIL_HEBDO_MAX = isRegulier ? 46 * 60 : 48 * 60;
  var TRAVAIL_HEBDO_MOY = isRegulier ? 42 * 60 : 44 * 60;
  var CONDUITE_HEBDO_MAX = 56 * 60;
  var CONDUITE_BIHEBDO_MAX = 90 * 60;

  var hebdo = useMemo(function() {
    if (!jours || jours.length === 0) return null;
    var joursStats = jours.map(function(j) {
      var s = calculerStatsJour(j.activites);
      return { date: j.date || "", conduite: s ? s.conduiteTotale : 0, travail: s ? (s.conduiteTotale + s.travailTotal) : 0 };
    });
    var semaines = {};
    joursStats.forEach(function(js) {
      if (!js.date) return;
      var d = new Date(js.date + "T12:00:00");
      if (isNaN(d.getTime())) return;
      var jan1 = new Date(d.getFullYear(), 0, 1);
      var doy = Math.floor((d - jan1) / 86400000) + 1;
      var wn = Math.ceil((doy + jan1.getDay()) / 7);
      var key = d.getFullYear() + "-W" + String(wn).padStart(2, "0");
      if (!semaines[key]) semaines[key] = { key: key, jours: [], conduite: 0, travail: 0 };
      semaines[key].jours.push(js);
      semaines[key].conduite += js.conduite;
      semaines[key].travail += js.travail;
    });
    var arr = Object.values(semaines).sort(function(a, b) { return a.key < b.key ? -1 : 1; });
    var sa = joursStats[jourActifIndex] || joursStats[0];
    var semActuelle = null;
    if (sa && sa.date) {
      var da = new Date(sa.date + "T12:00:00");
      if (!isNaN(da.getTime())) {
        var j1 = new Date(da.getFullYear(), 0, 1);
        var dy = Math.floor((da - j1) / 86400000) + 1;
        var w = Math.ceil((dy + j1.getDay()) / 7);
        var k = da.getFullYear() + "-W" + String(w).padStart(2, "0");
        semActuelle = semaines[k] || null;
      }
    }
    var moyTrav = 0; var nbSem = Math.min(arr.length, 12);
    if (nbSem > 0) { var tot = 0; for (var i = arr.length - nbSem; i < arr.length; i++) tot += arr[i].travail; moyTrav = tot / nbSem; }
    var biH = 0;
    if (arr.length >= 2) biH = arr[arr.length-1].conduite + arr[arr.length-2].conduite;
    else if (arr.length === 1) biH = arr[0].conduite;
    return { sem: semActuelle, moy: moyTrav, biH: biH, nbSem: nbSem };
  }, [jours, jourActifIndex, typeService]);

  // === Cercle 2 : Journee / Amplitude ===
  var vue2 = refVue2.current;
  var c2valeur = vue2 === 0 ? stats.conduiteTotale : stats.amplitude;
  var c2max = vue2 === 0 ? limiteConduite : limiteAmplitude;
  var c2label = vue2 === 0 ? labelConduite : labelAmplitude;
  var c2unite = "min";

  // === Cercle 3 : Hebdo ===
  var vue3 = refVue3.current % vue3Count;
  var c3valeur = 0; var c3max = TRAVAIL_HEBDO_MAX; var c3label = "Hebdo"; var c3unite = "min";
  if (hebdo && hebdo.sem) {
    if (vue3 === 0) {
      c3valeur = hebdo.sem.travail; c3max = TRAVAIL_HEBDO_MAX;
      c3label = "Trav. hebdo"; c3unite = "h";
    } else if (vue3 === 1 && !isRegulier) {
      c3valeur = hebdo.sem.conduite; c3max = CONDUITE_HEBDO_MAX;
      c3label = "Cond. hebdo"; c3unite = "h";
    } else {
      c3valeur = hebdo.moy; c3max = TRAVAIL_HEBDO_MOY;
      c3label = "Moy. " + hebdo.nbSem + "s"; c3unite = "h";
    }
  }
  // Afficher en heures pour hebdo
  var c3valH = Math.round(c3valeur / 60 * 10) / 10;
  var c3maxH = Math.round(c3max / 60);

  // === Dots indicateurs ===
  function Dots({ count, active }) {
    return React.createElement("div", { className: styles.dots },
      Array.from({ length: count }, function(_, i) {
        return React.createElement("span", { key: i, className: i === active ? styles.dotActive : styles.dot });
      })
    );
  }

  return (
    <div className={styles.panneau}>
      <div className={styles.circular}>
        {/* Cercle 1 : Continue (fixe) */}
        <div className={styles.circleWrap}>
          <JaugeCirculaire
            valeur={stats.conduiteBloc}
            max={LIMITES.CONDUITE_CONTINUE_MAX}
            label="Continue"
            unite="min"
            size={100}
          />
        </div>

        {/* Cercle 2 : Journee <-> Amplitude (clic) */}
        <div className={styles.circleWrap + " " + styles.clickable} onClick={cycleVue2}>
          <JaugeCirculaire
            valeur={c2valeur}
            max={c2max}
            label={c2label}
            unite={c2unite}
            size={100}
          />
          <Dots count={2} active={vue2} />
        </div>

        {/* Cercle 3 : Hebdo (clic) */}
        <div className={styles.circleWrap + " " + styles.clickable} onClick={cycleVue3}>
          <JaugeCirculaire
            valeur={c3unite === "h" ? c3valH : c3valeur}
            max={c3unite === "h" ? c3maxH : c3max}
            label={c3label}
            unite={c3unite}
            size={100}
          />
          <Dots count={vue3Count} active={vue3} />
        </div>
      </div>

      <div className={styles.linear}>
        <JaugeLineaire
          valeur={stats.conduiteBloc}
          max={LIMITES.CONDUITE_CONTINUE_MAX}
          label="Conduite continue"
          texteValeur={fmtMin(stats.conduiteBloc) + " / " + fmtMin(LIMITES.CONDUITE_CONTINUE_MAX)}
          seuilWarning={0.93}
        />
        <JaugeLineaire
          valeur={stats.conduiteTotale}
          max={limiteConduite}
          label={labelConduite}
          texteValeur={fmtMin(stats.conduiteTotale) + " / " + fmtMin(limiteConduite)}
          seuilWarning={enModeDerog ? 0.9 : 0.95}
        />
        <JaugeLineaire
          valeur={stats.amplitude}
          max={limiteAmplitude}
          label={labelAmplitude}
          texteValeur={fmtMin(stats.amplitude) + " / " + fmtMin(limiteAmplitude)}
          seuilWarning={enModeDerogAmpl ? 0.86 : 0.92}
        />
        {/* Pause cumulee */}
        {stats.travailTotal > 0 && (function() {
          var seuilAtteint = stats.conduiteMax >= LIMITES.CONDUITE_CONTINUE_MAX || stats.conduiteTotale >= 120;
          var pauseMax = seuilAtteint ? LIMITES.PAUSE_OBLIGATOIRE : 0;
          var txt = seuilAtteint
            ? fmtMin(stats.pauseTotale) + " / " + fmtMin(LIMITES.PAUSE_OBLIGATOIRE)
            : fmtMin(stats.pauseTotale) + " (pas encore requise)";
          return React.createElement(JaugeLineaire, {
            valeur: stats.pauseTotale,
            max: pauseMax || 1,
            label: "Pause cumulee",
            texteValeur: txt
          });
        })()}
        {/* Jauge lineaire hebdo avec zones */}
        {hebdo && hebdo.sem ? (function() {
          var trav = hebdo.sem.travail;
          var pctLegal = Math.round((LEGAL / TRAVAIL_HEBDO_MAX) * 100);
          var pctMoy = Math.round((TRAVAIL_HEBDO_MOY / TRAVAIL_HEBDO_MAX) * 100);
          var barColor = trav > TRAVAIL_HEBDO_MAX ? "#ff4444" : trav > TRAVAIL_HEBDO_MOY ? "#ff6600" : trav > LEGAL ? "#ffaa00" : "#00ff88";
          return React.createElement("div", { className: styles.hebdoBar },
            React.createElement("div", { className: styles.hebdoHeader },
              React.createElement("span", { className: styles.hebdoLabel }, "Travail hebdo (" + hebdo.sem.jours.length + "j)"),
              React.createElement("span", { className: styles.hebdoVal, style: { color: barColor } },
                fmtMin(Math.round(trav)) + " / " + fmtMin(TRAVAIL_HEBDO_MAX)
              )
            ),
            React.createElement("div", { className: styles.hebdoTrack },
              React.createElement("div", { className: styles.hebdoFill, style: { width: Math.min(Math.round(trav / TRAVAIL_HEBDO_MAX * 100), 100) + "%", background: barColor } }),
              React.createElement("div", { className: styles.hebdoMarker, style: { left: pctLegal + "%" }, title: "Legal 35h" }),
              React.createElement("div", { className: styles.hebdoMarker, style: { left: pctMoy + "%" }, title: "Moy. max " + (isRegulier ? "42h" : "44h") })
            ),
            React.createElement("div", { className: styles.hebdoZones },
              React.createElement("span", { style: { left: pctLegal + "%", position: "absolute", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", transform: "translateX(-50%)" } }, "35h"),
              React.createElement("span", { style: { left: pctMoy + "%", position: "absolute", fontSize: "0.6rem", color: "rgba(255,255,255,0.35)", transform: "translateX(-50%)" } }, isRegulier ? "42h" : "44h")
            )
          );
        })() : null}
      </div>
    </div>
  );
}
