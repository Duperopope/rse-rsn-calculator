import { useState } from 'react';
import { API_URL } from '../config/constants.js';

/**
 * Hook pour lancer l'analyse CSV via POST /api/analyze
 * Supporte multi-conducteur (csv2 pour conducteur 2)
 */
export function useAnalysis() {
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);

  async function analyser(csvTexte, csv2, typeService, pays, equipage) {
    setChargement(true);
    setErreur(null);
    setResultat(null);

    try {
      const body = {
        csv: csvTexte,
        typeService: typeService || 'REGULIER',
        pays: pays || 'FR',
        equipage: equipage || 'solo'
      };
      if (csv2 && csv2.trim().length > 0) { body.csv2 = csv2; }

      const res = await fetch(API_URL + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
      });

      const data = await res.json();

      if (!res.ok) {
        setErreur(data.error || data.message || 'Erreur serveur (' + res.status + ')');
        return null;
      }

      setResultat(data);
      return data;
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        setErreur('Timeout: le serveur ne repond pas (30s).');
      } else if (e.message && e.message.includes('fetch')) {
        setErreur('Impossible de contacter le serveur.');
      } else {
        setErreur('Erreur inattendue: ' + e.message);
      }
      return null;
    } finally {
      setChargement(false);
    }
  }

  function reset() {
    setResultat(null);
    setErreur(null);
    setChargement(false);
  }

  return { analyser, resultat, erreur, chargement, reset };
}