import React from 'react';
import { JaugeCirculaire } from './JaugeCirculaire.jsx';
import { JaugeLineaire } from './JaugeLineaire.jsx';
import { LIMITES } from '../../config/constants.js';
import { fmtMin } from '../../utils/time.js';
import styles from './PanneauJauges.module.css';

/**
 * Panneau complet de jauges temps reel
 * Affiche conduite continue, conduite journaliere, amplitude, pause
 * @param {Object} stats - Resultat de calculerStatsJour
 * @param {string} typeService - Code type de service
 */
export function PanneauJauges({ stats, typeService = 'REGULIER' }) {
  if (!stats || stats.nbActivites === 0) return null;

  const limiteAmplitude = (typeService === 'OCCASIONNEL' || typeService === 'SLO' || typeService === 'INTERURBAIN' || typeService === 'MARCHANDISES')
    ? LIMITES.AMPLITUDE_OCCASIONNEL_MAX
    : LIMITES.AMPLITUDE_REGULIER_MAX;

  return (
    <div className={styles.panneau}>
      <div className={styles.circular}>
        <JaugeCirculaire
          valeur={stats.conduiteBloc}
          max={LIMITES.CONDUITE_CONTINUE_MAX}
          label="Continue"
          unite="min"
          size={100}
        />
        <JaugeCirculaire
          valeur={stats.conduiteTotale}
          max={LIMITES.CONDUITE_JOURNALIERE_MAX}
          label="Journee"
          unite="min"
          size={100}
        />
        <JaugeCirculaire
          valeur={stats.amplitude}
          max={limiteAmplitude}
          label="Amplitude"
          unite="min"
          size={100}
        />
      </div>
      <div className={styles.linear}>
        <JaugeLineaire
          valeur={stats.conduiteBloc}
          max={LIMITES.CONDUITE_CONTINUE_MAX}
          label="Conduite continue"
          texteValeur={fmtMin(stats.conduiteBloc) + ' / ' + fmtMin(LIMITES.CONDUITE_CONTINUE_MAX)}
        />
        <JaugeLineaire
          valeur={stats.conduiteTotale}
          max={LIMITES.CONDUITE_JOURNALIERE_MAX}
          label="Conduite journaliere"
          texteValeur={fmtMin(stats.conduiteTotale) + ' / ' + fmtMin(LIMITES.CONDUITE_JOURNALIERE_MAX)}
        />
        <JaugeLineaire
          valeur={stats.amplitude}
          max={limiteAmplitude}
          label="Amplitude"
          texteValeur={fmtMin(stats.amplitude) + ' / ' + fmtMin(limiteAmplitude)}
        />
        {/* Pause cumulee : seuil dynamique selon conduite (CE 561 Art.7) */}
        {stats.travailTotal > 0 && (() => {
          /* Pause requise si conduite continue >= 4h30 OU conduite totale >= 2h */
          const seuilAtteint = stats.conduiteMax >= LIMITES.CONDUITE_CONTINUE_MAX || stats.conduiteTotale >= 120;
          const pauseMax = seuilAtteint ? LIMITES.PAUSE_OBLIGATOIRE : 0;
          const txt = seuilAtteint
            ? fmtMin(stats.pauseTotale) + ' / ' + fmtMin(LIMITES.PAUSE_OBLIGATOIRE)
            : fmtMin(stats.pauseTotale) + ' (pas encore requise)';
          return (
            <JaugeLineaire
              valeur={stats.pauseTotale}
              max={pauseMax || 1}
              label="Pause cumulee"
              texteValeur={txt}
            />
          );
        })()}
      </div>
    </div>
  );
}
