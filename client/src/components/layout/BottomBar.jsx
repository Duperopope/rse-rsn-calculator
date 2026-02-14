import React from 'react';
import styles from './BottomBar.module.css';

/**
 * FIMO Check — BottomBar v7.10.3
 * 3 boutons : Analyser | Historique | Haut
 * Theme deplace dans ParametresPanel
 */

function IconAnalyse() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <path d="M8 5.5 A6.5 6.5 0 0 1 16.5 8" stroke="#4CAF50" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M16.5 14 A6.5 6.5 0 0 1 14 16.5" stroke="#FF9800" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5.5 14 A6.5 6.5 0 0 1 5.5 8" stroke="#9C27B0" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="18" y1="18" x2="22.5" y2="22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconHistorique() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="12" cy="7" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7 L3 12 C3 13.9 7 15.5 12 15.5 C17 15.5 21 13.9 21 12 L21 7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12 L3 17 C3 18.9 7 20.5 12 20.5 C17 20.5 21 18.9 21 17 L21 12" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 5 L12 7 L14 8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
    </svg>
  );
}

export function BottomBar({
  onAnalyse, analyseEnCours, analyseDisabled,
  historiqueCount, onToggleHistorique, voirHistorique,
  onScrollTop
}) {
  const handleAnalyse = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    if (onAnalyse) onAnalyse();
  };

  const handleHisto = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    if (onToggleHistorique) onToggleHistorique();
  };

  const handleTop = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (onScrollTop) onScrollTop();
  };

  return (
    <nav className={styles.bottomBar} aria-label="Actions principales">
      <button
        className={styles.item + ' ' + styles.itemPrimary + (analyseEnCours ? ' ' + styles.itemLoading : '')}
        onClick={handleAnalyse}
        disabled={analyseDisabled || analyseEnCours}
        aria-label="Analyser la conformite"
      >
        <span className={styles.iconWrap}>
          <IconAnalyse />
        </span>
        <span className={styles.label}>{analyseEnCours ? 'Analyse...' : 'Analyser'}</span>
      </button>

      <button
        className={styles.item + (voirHistorique ? ' ' + styles.itemActive : '')}
        onClick={handleHisto}
        aria-label={'Historique' + (historiqueCount > 0 ? ', ' + historiqueCount + ' analyses' : '')}
      >
        <span className={styles.iconWrap}>
          <IconHistorique />
          {historiqueCount > 0 ? (
            <span className={styles.badge}>{historiqueCount > 99 ? '99+' : historiqueCount}</span>
          ) : null}
        </span>
        <span className={styles.label}>Historique</span>
      </button>

      <button
        className={styles.item}
        onClick={handleTop}
        aria-label="Remonter en haut"
      >
        <span className={styles.iconWrap}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 19 L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 12 L12 5 L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className={styles.label}>Haut</span>
      </button>
    </nav>
  );
}