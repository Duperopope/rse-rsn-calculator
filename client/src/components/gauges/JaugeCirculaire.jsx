import React, { useState } from 'react';
import styles from './JaugeCirculaire.module.css';

/**
 * Jauge circulaire SVG
 * unite="hm" : affiche la valeur (en minutes) au format Xh MM
 * unite="h"  : affiche la valeur (en heures decimales) avec "h"
 * unite="min": affiche la valeur brute avec "min"
 * inverseColor=true : vert quand valeur >= max (pour repos)
 * onClick : handler externe (desactive toggle %)
 * switchable : indicateur visuel cliquable
 */
export function JaugeCirculaire({
  valeur = 0,
  max = 100,
  label = '',
  unite = '',
  size = 120,
  strokeWidth = 8,
  couleurOk = 'var(--accent-green, #00ff88)',
  couleurWarning = 'var(--accent-orange, #ffaa00)',
  couleurDanger = 'var(--accent-red, #ff4444)',
  seuilWarning = 0.8,
  onClick = null,
  switchable = false,
  inverseColor = false
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(valeur / max, 1.5) : 0;
  const displayRatio = Math.min(ratio, 1);
  const offset = circumference - displayRatio * circumference;

  // Calcul couleur
  let couleur = couleurOk;
  let status = 'ok';
  if (inverseColor) {
    // Logique inversee : vert si valeur >= max, orange si entre warning et max, rouge sinon
    if (valeur >= max) {
      couleur = couleurOk;
      status = 'ok';
    } else if (ratio >= seuilWarning) {
      couleur = couleurWarning;
      status = 'warning';
    } else {
      couleur = couleurDanger;
      status = 'danger';
    }
  } else {
    // Logique normale
    if (ratio >= 1) {
      couleur = couleurDanger;
      status = 'danger';
    } else if (ratio >= seuilWarning) {
      couleur = couleurWarning;
      status = 'warning';
    }
  }

  const center = size / 2;
  const [showDetail, setShowDetail] = useState(false);
  const pourcent = Math.round(displayRatio * 100);

  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (onClick) {
      onClick();
    } else {
      setShowDetail(p => !p);
    }
  };

  // Formatage de la valeur selon l'unite
  let displayValue;
  let displayUnite = unite;
  if (unite === 'hm') {
    // Valeur en minutes -> afficher Xh MM
    const totalMin = Math.round(valeur);
    const heures = Math.floor(totalMin / 60);
    const minutes = String(totalMin % 60).padStart(2, '0');
    displayValue = heures + 'h' + minutes;
    displayUnite = '';
  } else {
    displayValue = String(Math.round(valeur));
  }

  const displayLabel = (!onClick && showDetail) ? pourcent + '%' : label;

  return (
    <div
      className={`${styles.container}${switchable ? ' ' + styles.switchable : ''}`}
      style={{ width: size, minHeight: size, cursor: 'pointer' }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <svg width={size} height={size} className={styles.svg}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--border, #2a2a3e)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={couleur}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={styles.progress}
          transform={"rotate(-90 " + center + " " + center + ")"}
        />
      </svg>
      <div className={styles.content}>
        <span className={styles.valeur} style={{ color: couleur, fontSize: unite === 'hm' ? '1.1em' : undefined }}>
          {displayValue}
        </span>
        {displayUnite ? <span className={styles.unite}>{displayUnite}</span> : null}
      </div>
      {label ? (
        <span className={styles.label} data-status={status}>{displayLabel}</span>
      ) : null}
      {switchable ? (
        <span className={styles.switchHint}>&#x21C4;</span>
      ) : null}
    </div>
  );
}
