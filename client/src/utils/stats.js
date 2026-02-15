// FIMO Check - Calculs statistiques temps reel
// Utilise pour les jauges et recommandations cote client
import { dureeMin, fmtMin, fmtH } from './time.js';
import { LIMITES } from '../config/constants.js';

/**
 * Calcule les statistiques d'une journee a partir des activites
 * @param {Array} activites - [{debut:"HH:MM", fin:"HH:MM", type:"C"|"T"|"P"|"D"|"R"}]
 * @returns {Object} Stats de la journee
 */
export function calculerStatsJour(activites) {
  if (!activites || !Array.isArray(activites) || activites.length === 0) {
    return {
      conduiteTotale: 0,
      conduiteMax: 0,
    conduiteBloc: 0,
      travailTotal: 0,
      pauseTotale: 0,
      amplitude: 0,
      nbActivites: 0,
      alertes: []
    };
  }

  let conduiteTotale = 0;
  let conduiteBloc = 0;
  let conduiteMax = 0;
  // v7.5.0 : Accumulateur pause fractionnee (CE 561/2006 Art.7)
  let pausePhase1Done = false;
  let conduiteAvantPhase1 = 0;
  // v7.5.0 : Accumulateur pause fractionnee (CE 561/2006 Art.7)
  let travailTotal = 0;
  let pauseTotale = 0;
  let premierDebut = null;
  let dernierFin = null;
  const alertes = [];

  for (const act of activites) {
    if (!act.debut || !act.fin) continue;
    const duree = dureeMin(act.fin) - dureeMin(act.debut);
    const d = duree < 0 ? duree + 1440 : duree;

    if (premierDebut === null) premierDebut = dureeMin(act.debut);
    dernierFin = dureeMin(act.fin);

    switch (act.type) {
      case 'C':
        conduiteTotale += d;
        conduiteBloc += d;
        if (conduiteBloc > conduiteMax) conduiteMax = conduiteBloc;
        travailTotal += d;
        break;
      case 'T':
      case 'D':
        travailTotal += d;
        // Tache/Dispo ne coupe pas le bloc conduite selon CE 561/2006
        break;
      case 'P':
      case 'R':
        pauseTotale += d;
        // v7.5.0 : Pause fractionnee CE 561/2006 Art.7
        // 45min bloc = reset | 15min (phase1) + 30min (phase2) = reset
        if (d >= 45) {
          conduiteBloc = 0;
          pausePhase1Done = false;
          conduiteAvantPhase1 = 0;
        } else if (d >= 30 && pausePhase1Done) {
          conduiteBloc = 0;
          pausePhase1Done = false;
          conduiteAvantPhase1 = 0;
        } else if (d >= 15 && !pausePhase1Done) {
          pausePhase1Done = true;
          conduiteAvantPhase1 = conduiteBloc;
        }
        break;
      default:
        break;
    }
  }

  let amplitude = 0;
  if (premierDebut !== null && dernierFin !== null) {
    amplitude = dernierFin - premierDebut;
    if (amplitude < 0) amplitude += 1440;
  }

  // Alertes temps reel
  if (conduiteMax > LIMITES.CONDUITE_CONTINUE_MAX) {
    alertes.push({
      type: 'danger',
      message: 'Conduite continue: ' + fmtMin(conduiteMax) + ' > ' + fmtMin(LIMITES.CONDUITE_CONTINUE_MAX)
    });
  } else if (conduiteMax > LIMITES.CONDUITE_CONTINUE_MAX - 30) {
    alertes.push({
      type: 'warning',
      message: 'Conduite continue: ' + fmtMin(conduiteMax) + ' (proche limite)'
    });
  }

  if (conduiteTotale > LIMITES.CONDUITE_JOURNALIERE_MAX) {
    alertes.push({
      type: 'danger',
      message: 'Conduite journaliere: ' + fmtMin(conduiteTotale) + ' > ' + fmtMin(LIMITES.CONDUITE_JOURNALIERE_MAX)
    });
  }

  if (amplitude > LIMITES.AMPLITUDE_REGULIER_MAX) {
    alertes.push({
      type: 'danger',
      message: 'Amplitude: ' + fmtMin(amplitude) + ' > ' + fmtMin(LIMITES.AMPLITUDE_REGULIER_MAX)
    });
  }

  return {
    conduiteTotale,
    conduiteMax,
    conduiteBloc,
    travailTotal,
    pauseTotale,
    amplitude,
    nbActivites: activites.length,
    alertes
  };
}

/**
 * Genere des recommandations basees sur les stats
 * @param {Object} stats - Resultat de calculerStatsJour
 * @param {string} typeService - Code type de service
 * @returns {Array} Liste de recommandations
 */
export function genererRecommandations(stats, typeService) {
  const recs = [];
  if (!stats) return recs;

  const limiteAmplitude = (typeService === 'OCCASIONNEL')
    ? LIMITES.AMPLITUDE_OCCASIONNEL_MAX
    : LIMITES.AMPLITUDE_REGULIER_MAX;

  // Conduite continue
  const resteContinue = LIMITES.CONDUITE_CONTINUE_MAX - stats.conduiteMax;
  if (resteContinue <= 0) {
    recs.push({ niveau: 'danger', texte: 'Pause obligatoire depassee ! Arretez-vous immediatement.' });
  } else if (resteContinue <= 30) {
    recs.push({ niveau: 'warning', texte: 'Plus que ' + fmtMin(resteContinue) + ' de conduite continue possible.' });
  }

  // Conduite journaliere
  const resteJour = LIMITES.CONDUITE_JOURNALIERE_MAX - stats.conduiteTotale;
  if (resteJour <= 0) {
    recs.push({ niveau: 'danger', texte: 'Limite de conduite journaliere atteinte !' });
  } else if (resteJour <= 60) {
    recs.push({ niveau: 'warning', texte: 'Plus que ' + fmtMin(resteJour) + ' de conduite journaliere.' });
  }

  // Amplitude
  const resteAmplitude = limiteAmplitude - stats.amplitude;
  if (resteAmplitude <= 0) {
    recs.push({ niveau: 'danger', texte: 'Amplitude maximale depassee !' });
  } else if (resteAmplitude <= 60) {
    recs.push({ niveau: 'warning', texte: 'Plus que ' + fmtMin(resteAmplitude) + ' d amplitude.' });
  }

  // Pause
  if (stats.conduiteMax > 120 && stats.pauseTotale === 0) {
    recs.push({ niveau: 'info', texte: 'Pensez a planifier une pause de ' + LIMITES.PAUSE_OBLIGATOIRE + ' min.' });
  }

  if (recs.length === 0) {
    recs.push({ niveau: 'ok', texte: 'Journee conforme aux limites reglementaires.' });
  }

  return recs;
}
