import React from 'react';
import styles from './JaugeLineaire.module.css';

/**
 * Jauge lineaire (barre de progression) avec seuils colores
 * @param {number} valeur - Valeur actuelle en minutes
 * @param {number} max - Valeur maximale
 * @param {string} label - Texte a gauche
 * @param {string} texteValeur - Texte a droite (ex: "4h30 / 4h30")
 * @param {number} seuilWarning - Ratio declenchant le warning (defaut 0.8)
 * @param {boolean} compact - Mode compact (hauteur reduite)
 */
export function JaugeLineaire({
  valeur = 0,
  max = 100,
  label = '',
  texteValeur = '',
  seuilWarning = 0.8,
  compact = false
}) {
  const ratio = max > 0 ? Math.min(valeur / max, 1) : 0;
  const pourcent = Math.round(ratio * 100);

  let status = 'ok';
  if (ratio >= 1) status = 'danger';
  else if (ratio >= seuilWarning) status = 'warning';

  return (
    <div className={[styles.container, compact ? styles.compact : ''].join(' ')}>
      {label || texteValeur ? (
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.texteValeur} data-status={status}>{texteValeur}</span>
        </div>
      ) : null}
      <div className={styles.track}>
        <div
          className={styles.fill}
          data-status={status}
          style={{ width: pourcent + '%' }}
        />
      </div>
    </div>
  );
}
