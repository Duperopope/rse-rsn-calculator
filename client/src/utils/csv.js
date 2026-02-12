// RSE/RSN Calculator - Utilitaires CSV
// Parsing, validation et export des donnees CSV tachygraphe

/**
 * Parse une chaine CSV en tableau d'activites
 * Format attendu: DATE;HEURE_DEBUT;HEURE_FIN;TYPE_ACTIVITE
 * @param {string} csvText - Contenu CSV brut
 * @returns {Object} { lignes: Array, erreurs: Array, jours: Array }
 */
export function parseCSV(csvText) {
  const erreurs = [];
  const lignes = [];

  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    return { lignes: [], erreurs: ['CSV vide'], jours: [] };
  }

  const rawLines = csvText.trim().split('\n');
  const typesValides = ['C', 'T', 'P', 'D', 'R'];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line || line.startsWith('#') || line.startsWith('DATE')) continue;

    const parts = line.split(';');
    if (parts.length < 4) {
      erreurs.push('Ligne ' + (i + 1) + ': format invalide (attendu 4 champs separes par ;)');
      continue;
    }

    const [date, debut, fin, type] = parts.map(p => p.trim());

    // Validation date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      erreurs.push('Ligne ' + (i + 1) + ': date invalide "' + date + '" (format YYYY-MM-DD)');
      continue;
    }

    // Validation heures
    if (!/^\d{2}:\d{2}$/.test(debut) || !/^\d{2}:\d{2}$/.test(fin)) {
      erreurs.push('Ligne ' + (i + 1) + ': heure invalide (format HH:MM)');
      continue;
    }

    // Validation type
    const typeUpper = type.toUpperCase();
    if (!typesValides.includes(typeUpper)) {
      erreurs.push('Ligne ' + (i + 1) + ': type "' + type + '" invalide (C, T, P, D, R)');
      continue;
    }

    lignes.push({ date, debut, fin, type: typeUpper, ligneSrc: i + 1 });
  }

  // Regrouper par jour
  const joursMap = {};
  for (const l of lignes) {
    if (!joursMap[l.date]) joursMap[l.date] = [];
    joursMap[l.date].push(l);
  }
  const jours = Object.keys(joursMap).sort().map(date => ({
    date,
    activites: joursMap[date]
  }));

  return { lignes, erreurs, jours };
}

/**
 * Convertit des activites formulaire en texte CSV
 * @param {Array} jours - [{date, activites: [{debut, fin, type}]}]
 * @returns {string} Texte CSV
 */
export function activitesToCSV(jours) {
  const lines = [];
  for (const jour of jours) {
    for (const act of jour.activites) {
      if (act.debut && act.fin && act.type) {
        lines.push(jour.date + ';' + act.debut + ';' + act.fin + ';' + act.type);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Valide un texte CSV et retourne un resume
 * @param {string} csvText
 * @returns {Object} { valide: boolean, nbLignes, nbJours, nbErreurs, erreurs }
 */
export function validerCSV(csvText) {
  const result = parseCSV(csvText);
  return {
    valide: result.erreurs.length === 0 && result.lignes.length > 0,
    nbLignes: result.lignes.length,
    nbJours: result.jours.length,
    nbErreurs: result.erreurs.length,
    erreurs: result.erreurs
  };
}

/**
 * Genere un CSV d'exemple
 * @returns {string} CSV d'exemple
 */
export function exempleCSV() {
  return [
    '2025-06-15;06:00;06:15;T',
    '2025-06-15;06:15;10:45;C',
    '2025-06-15;10:45;11:30;P',
    '2025-06-15;11:30;14:30;C',
    '2025-06-15;14:30;14:45;T'
  ].join('\n');
}
