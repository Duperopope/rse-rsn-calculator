import React, { useMemo } from "react";
import { JaugeCirculaire } from "./JaugeCirculaire.jsx";
import { JaugeLineaire } from "./JaugeLineaire.jsx";
import { LIMITES } from "../../config/constants.js";
import { fmtMin } from "../../utils/time.js";
import { calculerStatsJour } from "../../utils/stats.js";
import styles from "./PanneauJauges.module.css";

/**
 * Panneau de jauges temps reel - 3 cercles switchables
 * Cercle 1: Conduite continue <-> Conduite journaliere
 * Cercle 2: Amplitude <-> Repos journalier
 * Cercle 3: Travail hebdo <-> Moyenne glissante
 * Sources: CE 561/2006, Decret 2000-118, Code du travail L3121-20 a L3121-22
 */
export function PanneauJauges({ stats, typeService = "REGULIER", nbDerogConduite = 0, jours = [], jourActifIndex = 0 }) {
  if (!stats || stats.nbActivites === 0) return null;

  // === Refs pour vues switchables (persistent entre renders) ===
  var refVue1 = React.useRef(0); // 0=Continue, 1=Journee
  var refVue2 = React.useRef(0); // 0=Amplitude, 1=Repos journalier
  var refVue3 = React.useRef(0); // 0=Travail hebdo, 1=Moyenne glissante
  var forceRender = React.useState(0);

  function cycleVue1() { refVue1.current = (refVue1.current + 1) % 2; forceRender[1](function(x) { return x+1; }); }
  function cycleVue2() { refVue2.current = (refVue2.current + 1) % 2; forceRender[1](function(x) { return x+1; }); }
  function cycleVue3() { refVue3.current = (refVue3.current + 1) % 2; forceRender[1](function(x) { return x+1; }); }

  // === Constantes dynamiques ===
  var isRegulier = (typeService === "REGULIER" || typeService === "URBAIN");
  var isSLO = !isRegulier;

  // Conduite journaliere : 9h normal, 10h derog (2x/sem)
  var derogDisponible = nbDerogConduite < 2;
  var enModeDerogConduite = stats.conduiteTotale > LIMITES.CONDUITE_JOURNALIERE_MAX && derogDisponible;
  var limiteConduite = enModeDerogConduite ? LIMITES.CONDUITE_JOURNALIERE_DEROG : LIMITES.CONDUITE_JOURNALIERE_MAX;
  var labelConduite = enModeDerogConduite
    ? "Cond. jour (derog " + (nbDerogConduite + 1) + "/2)"
    : "Cond. journaliere";

  // Amplitude : REGULIER 11h/13h, SLO 12h/14h
  var amplNormal = isSLO ? LIMITES.AMPLITUDE_OCCASIONNEL_NORMAL : LIMITES.AMPLITUDE_REGULIER_NORMAL;
  var amplDerog = isSLO ? LIMITES.AMPLITUDE_OCCASIONNEL_DEROG : LIMITES.AMPLITUDE_REGULIER_DEROG;
  var enModeDerogAmpl = stats.amplitude > amplNormal;
  var limiteAmplitude = enModeDerogAmpl ? amplDerog : amplNormal;
  var labelAmplitude = enModeDerogAmpl
    ? "Amplitude (derog " + Math.round(amplDerog / 60) + "h)"
    : "Amplitude";

  // Repos journalier : 11h normal, 9h reduit (CE 561/2006 Art.8)
  var reposJournalier = stats.reposJournalier || Math.max(0, 1440 - stats.amplitude);
  var limiteReposNormal = LIMITES.REPOS_JOURNALIER_NORMAL; // 660 = 11h
  var limiteReposMin = LIMITES.REPOS_JOURNALIER_MIN; // 540 = 9h
  var reposOk = reposJournalier >= limiteReposNormal;
  var reposReduit = reposJournalier >= limiteReposMin && reposJournalier < limiteReposNormal;
  var labelRepos = reposOk ? "✓ Repos (11h+)" : reposReduit ? "⚠ Repos (reduit)" : "✗ Repos insuf.";

  // === Stats hebdomadaires ===
  var hebdoStats = useMemo(function() {
    if (!jours || jours.length === 0) return { travailSemaine: 0, nbSemaines: 1, moyenneGlissante: 0 };

    var totalTravailSemaine = 0;
    var semainesMap = {};

    for (var j = 0; j < jours.length; j++) {
      var jour = jours[j];
      if (!jour || !jour.activites || jour.activites.length === 0) continue;
      var jourStats = calculerStatsJour(jour.activites);
      totalTravailSemaine += jourStats.travailTotal;

      // Grouper par semaine ISO si date dispo
      var weekKey = jour.date ? jour.date.substring(0, 10) : "sem-" + Math.floor(j / 7);
      // Simplification : on utilise l index du jour / 7 comme semaine
      var semIdx = Math.floor(j / 7);
      if (!semainesMap[semIdx]) semainesMap[semIdx] = 0;
      semainesMap[semIdx] += jourStats.travailTotal;
    }

    var semKeys = Object.keys(semainesMap);
    var nbSemaines = Math.max(1, semKeys.length);
    var totalAllSemaines = 0;
    for (var k = 0; k < semKeys.length; k++) totalAllSemaines += semainesMap[semKeys[k]];
    var moyenneGlissante = totalAllSemaines / nbSemaines;

    return {
      travailSemaine: totalTravailSemaine,
      nbSemaines: nbSemaines,
      moyenneGlissante: moyenneGlissante
    };
  }, [jours]);

  // Limites travail hebdo
  var travailHebdoMax = isRegulier ? 46 * 60 : 48 * 60;   // 2760 ou 2880 min
  var travailHebdoLegal = 35 * 60;                          // 2100 min
  var moyenneMax = isRegulier ? 42 * 60 : 44 * 60;          // 2520 ou 2640 min

  // === Valeurs des cercles selon la vue active ===
  var vue1 = refVue1.current;
  var vue2 = refVue2.current;
  var vue3 = refVue3.current;

  // Cercle 1 : Continue / Journee
  var c1valeur, c1max, c1label, c1unite, c1warning;
  if (vue1 === 0) {
    c1valeur = stats.conduiteBloc;
    c1max = LIMITES.CONDUITE_CONTINUE_MAX;
    c1label = "Continue";
    c1unite = "hm";
    c1warning = 0.93;
  } else {
    c1valeur = stats.conduiteTotale;
    c1max = limiteConduite;
    c1label = labelConduite;
    c1unite = "hm";
    c1warning = enModeDerogConduite ? 0.9 : 0.95;
  }

  // Cercle 2 : Amplitude / Repos
  var c2valeur, c2max, c2label, c2unite, c2warning;
  if (vue2 === 0) {
    c2valeur = stats.amplitude;
    c2max = limiteAmplitude;
    c2label = labelAmplitude;
    c2unite = "hm";
    c2warning = enModeDerogAmpl ? 0.86 : 0.92;
  } else {
    // Repos : la jauge est "inversee" - plus c est haut mieux c est
    // On affiche valeur/objectif avec vert quand >= objectif
    c2valeur = reposJournalier;
    c2max = limiteReposNormal;
    c2label = labelRepos;
    c2unite = "hm";
    c2warning = 0.82; // 540/660 = seuil repos reduit
  }

  // Cercle 3 : Travail hebdo / Moyenne
  var c3valeur, c3max, c3label, c3unite, c3warning;
  if (vue3 === 0) {
    c3valeur = hebdoStats.travailSemaine;
    c3max = travailHebdoMax;
    c3label = "Travail hebdo";
    c3unite = "hm";
    c3warning = travailHebdoLegal / travailHebdoMax; // ~0.76 pour 35/46
  } else {
    c3valeur = Math.round(hebdoStats.moyenneGlissante);
    c3max = moyenneMax;
    c3label = "Moy. " + hebdoStats.nbSemaines + " sem.";
    c3unite = "hm";
    c3warning = travailHebdoLegal / moyenneMax; // ~0.83 pour 35/42
  }

  // Couleurs repos (logique inversee : vert si >= seuil, rouge si < seuil min)
  var reposCouleurOk, reposCouleurWarning, reposCouleurDanger;
  if (vue2 === 1) {
    // Repos : danger = pas assez, ok = assez
    reposCouleurOk = reposOk ? "var(--accent-green, #00ff88)" : reposReduit ? "var(--accent-orange, #ffaa00)" : "var(--accent-red, #ff4444)";
    reposCouleurWarning = "var(--accent-orange, #ffaa00)";
    reposCouleurDanger = "var(--accent-red, #ff4444)";
  }

  // Petit composant Dots
  function Dots(props) {
    var dots = [];
    for (var d = 0; d < props.count; d++) {
      dots.push(React.createElement("span", {
        key: d,
        className: styles.dot + (d === props.active ? " " + styles.dotActive : "")
      }));
    }
    return React.createElement("div", { className: styles.dots }, dots);
  }

  // === Pause dynamique ===
  var seuilPause = (stats.conduiteMax >= LIMITES.CONDUITE_CONTINUE_MAX || stats.conduiteTotale >= 120)
    ? LIMITES.PAUSE_OBLIGATOIRE : 0;
  var pauseLabel = seuilPause > 0 ? "Pause cumulee" : "Pause";

  return (
    <div data-tour="gauges" className={styles.panneau}>
      <div className={styles.circular}>

        {/* Cercle 1 : Continue <-> Journee */}
        <div className={styles.circleWrap}>
          <JaugeCirculaire
            valeur={c1valeur}
            max={c1max}
            label={c1label}
            unite={c1unite}
            size={100}
            seuilWarning={c1warning}
            onClick={cycleVue1}
            switchable={true}
          />
          <Dots count={2} active={vue1} />
        </div>

        {/* Cercle 2 : Amplitude <-> Repos */}
        <div className={styles.circleWrap}>
          <JaugeCirculaire
            valeur={c2valeur}
            max={c2max}
            label={c2label}
            unite={c2unite}
            size={100}
            seuilWarning={c2warning}
            onClick={cycleVue2}
            switchable={true}
            inverseColor={vue2 === 1}
          />
          <Dots count={2} active={vue2} />
        </div>

        {/* Cercle 3 : Travail hebdo <-> Moyenne */}
        <div className={styles.circleWrap}>
          <JaugeCirculaire
            valeur={c3valeur}
            max={c3max}
            label={c3label}
            unite={c3unite}
            size={100}
            seuilWarning={c3warning}
            onClick={cycleVue3}
            switchable={true}
          />
          <Dots count={2} active={vue3} />
        </div>

      </div>

      {/* Barres lineaires : conduite continue, conduite jour, amplitude, pause */}
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
          seuilWarning={enModeDerogConduite ? 0.9 : 0.95}
        />
        <JaugeLineaire
          valeur={stats.amplitude}
          max={limiteAmplitude}
          label={labelAmplitude}
          texteValeur={fmtMin(stats.amplitude) + " / " + fmtMin(limiteAmplitude)}
          seuilWarning={enModeDerogAmpl ? 0.86 : 0.92}
        />
        {seuilPause > 0 ? (
          <JaugeLineaire
            valeur={stats.pauseTotale}
            max={seuilPause}
            label={pauseLabel}
            texteValeur={fmtMin(stats.pauseTotale) + " / " + fmtMin(seuilPause)}
            seuilWarning={0.5}
          />
        ) : null}

        {/* Barre hebdo mobile-only */}
        <div className={styles.hebdoMobileOnly}>
          <JaugeLineaire
            valeur={vue3 === 0 ? hebdoStats.travailSemaine : hebdoStats.moyenneGlissante}
            max={vue3 === 0 ? travailHebdoMax : moyenneMax}
            label={vue3 === 0 ? "Travail hebdo" : ("Moy. " + hebdoStats.nbSemaines + " sem.")}
            texteValeur={
              vue3 === 0
                ? fmtMin(hebdoStats.travailSemaine) + " / " + fmtMin(travailHebdoMax)
                : fmtMin(Math.round(hebdoStats.moyenneGlissante)) + " / " + fmtMin(moyenneMax)
            }
            seuilWarning={vue3 === 0 ? travailHebdoLegal / travailHebdoMax : travailHebdoLegal / moyenneMax}
          />
        </div>
      </div>
    </div>
  );
}
