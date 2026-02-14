// FIMO Check - Utilitaires temporels
// Fonctions de conversion et formatage des durees

/**
 * Convertit une chaine "HH:MM" en minutes depuis minuit
 * @param {string} str - Format "HH:MM"
 * @returns {number} Minutes depuis 00:00
 */
export function dureeMin(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.split(':');
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formate un nombre de minutes en "Xh XXmin"
 * @param {number} min - Nombre de minutes
 * @returns {string} Format lisible "Xh XXmin"
 */
export function fmtMin(min) {
  if (min === null || min === undefined || isNaN(min)) return '0h 00min';
  const totalMin = Math.round(min);
  const h = Math.floor(Math.abs(totalMin) / 60);
  const m = Math.abs(totalMin) % 60;
  const sign = totalMin < 0 ? '-' : '';
  return sign + h + 'h ' + (m < 10 ? '0' : '') + m + 'min';
}

/**
 * Formate un nombre de minutes en heures decimales "X.Xh"
 * @param {number} min - Nombre de minutes
 * @returns {string} Format "X.Xh"
 */
export function fmtH(min) {
  if (!min || isNaN(min)) return '0.0h';
  return (min / 60).toFixed(1) + 'h';
}

/**
 * Incremente une heure "HH:MM" de N minutes
 * @param {string} heure - Format "HH:MM"
 * @param {number} minutes - Minutes a ajouter
 * @returns {string} Nouvelle heure "HH:MM"
 */
export function incH(heure, minutes) {
  const total = dureeMin(heure) + minutes;
  const h = Math.floor((total % 1440 + 1440) % 1440 / 60);
  const m = (total % 1440 + 1440) % 1440 % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/**
 * Calcule la duree entre deux heures (gere le passage a minuit)
 * @param {string} debut - "HH:MM"
 * @param {string} fin - "HH:MM"
 * @returns {number} Duree en minutes
 */
export function dureeEntre(debut, fin) {
  let d = dureeMin(fin) - dureeMin(debut);
  if (d < 0) d += 1440; // passage minuit
  return d;
}

/**
 * Formate une heure en "HH:MM" depuis un nombre de minutes
 * @param {number} minutes - Minutes depuis minuit
 * @returns {string} Format "HH:MM"
 */
export function minutesToHHMM(minutes) {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
