import { useState } from 'react';
import { API_URL } from '../config/constants.js';

/**
 * Hook pour lancer l'analyse CSV via POST /api/analyze
 * @returns {{ analyser: Function, resultat: Object|null, erreur: string|null, chargement: boolean }}
 */
export function useAnalysis() {
  const [resultat, setResultat] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fimo_resultat');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [erreur, setErreur] = useState(null);

  function setResultatPersist(data) {
    setResultat(data);
    try {
      if (data) sessionStorage.setItem('fimo_resultat', JSON.stringify(data));
      else sessionStorage.removeItem('fimo_resultat');
    } catch (e) { /* quota depasse */ }
  }
  const [chargement, setChargement] = useState(false);

  async function analyser(csvTexte, csv2, typeService, pays, equipage) {
    setChargement(true);
    setErreur(null);
    setResultatPersist(null);

    try {
      const res = await fetch(API_URL + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ csv: csvTexte, typeService: typeService || "REGULIER", pays: pays || "FR", equipage: equipage || "solo" }, csv2 && csv2.trim().length > 0 ? { csv2: csv2 } : {})),
        signal: AbortSignal.timeout(30000)
      });

      const data = await res.json();

      if (!res.ok) {
        setErreur(data.error || data.message || 'Erreur serveur (' + res.status + ')');
        return null;
      }

      setResultatPersist(data);
      // QOL 3: Auto-scroll vers resultats apres analyse
      setTimeout(() => { const el = document.getElementById("resultats"); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
      return data;
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        setErreur('Timeout: le serveur ne repond pas (30s). Verifiez la connexion.');
      } else if (e.message && e.message.includes('fetch')) {
        setErreur('Impossible de contacter le serveur. Est-il demarre ?');
      } else {
        setErreur('Erreur inattendue: ' + e.message);
      }
      return null;
    } finally {
      setChargement(false);
    }
  }

  function reset() {
    setResultatPersist(null);
    setErreur(null);
    setChargement(false);
  }

  return { analyser, resultat, setResultat: setResultatPersist, erreur, chargement, reset };
}
