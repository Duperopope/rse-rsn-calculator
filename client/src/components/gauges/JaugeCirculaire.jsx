import React, { useState } from 'react';
import styles from './JaugeCirculaire.module.css';

/**
 * Jauge circulaire SVG pour afficher une valeur en pourcentage
 * Supporte un onClick externe pour switcher les vues (PanneauJauges)
 * Si onClick est fourni : le clic appelle onClick (pas de toggle %)
 * Si onClick est absent : le clic toggle l'affichage pourcentage (comportement legacy)
 * @param {number} valeur - Valeur actuelle
 * @param {number} max - Valeur maximale
 * @param {string} label - Texte sous la jauge
 * @param {string} unite - Unite affichee (min, h, %)
 * @param {number} size - Taille en pixels (defaut 120)
 * @param {number} strokeWidth - Epaisseur du trait (defaut 8)
 * @param {string} couleurOk - Couleur quand < seuil warning
 * @param {string} couleurWarning - Couleur quand proche du max
 * @param {string} couleurDanger - Couleur quand depasse le max
 * @param {number} seuilWarning - Pourcentage declenchant le warning (defaut 0.8)
 * @param {Function} onClick - Handler externe optionnel (desactive le toggle %)
 * @param {boolean} switchable - Affiche un indicateur visuel "cliquable" (defaut false)
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
  switchable = false
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(valeur / max, 1.5) : 0;
  const displayRatio = Math.min(ratio, 1);
  const offset = circumference - displayRatio * circumference;

  let couleur = couleurOk;
  let status = 'ok';
  if (ratio >= 1) {
    couleur = couleurDanger;
    status = 'danger';
  } else if (ratio >= seuilWarning) {
    couleur = couleurWarning;
    status = 'warning';
  }

  const center = size / 2;
  const [showDetail, setShowDetail] = useState(false);
  const pourcent = Math.round(displayRatio * 100);

  // Handler : si onClick externe fourni, l'utiliser. Sinon toggle %
  const handleClick = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (onClick) {
      onClick();
    } else {
      setShowDetail(p => !p);
    }
  };

  // Label affiche : si pas de onClick externe ET showDetail, afficher %
  // Si onClick externe, toujours afficher le label tel quel
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
        <span className={styles.valeur} style={{ color: couleur }}>
          {Math.round(valeur)}
        </span>
        {unite ? <span className={styles.unite}>{unite}</span> : null}
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
