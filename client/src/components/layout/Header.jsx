import React, { useRef, useEffect } from 'react';
import { APP_NAME, APP_SUBTITLE } from '../../config/constants.js';
import styles from './Header.module.css';

/**
 * FIMO Check — Header v7.11.0
 * Mobile: logo + nom + status + theme
 * Desktop: logo + nom + actions + status + theme
 * Theme = petit toggle propre, pas un emoji brut
 */

function IconLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="18" cy="18" r="16" stroke="url(#logoGrad)" strokeWidth="2" />
      <circle cx="18" cy="18" r="12.5" stroke="url(#logoGrad)" strokeWidth="0.5" opacity="0.3" />
      <line x1="18" y1="6" x2="18" y2="8" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="28" x2="18" y2="30" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="18" x2="8" y2="18" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="28" y1="18" x2="30" y2="18" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 10 L18 18 L24 21" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27" cy="27" r="7" fill="var(--bg-card, #12121a)" />
      <circle cx="27" cy="27" r="6.5" stroke="#00ff88" strokeWidth="1.5" />
      <path d="M24 27 L26 29 L30.5 24.5" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36">
          <stop offset="0%" stopColor="var(--gradient-start, #667eea)" />
          <stop offset="100%" stopColor="var(--gradient-end, #764ba2)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function IconAnalyseDesktop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 5.5 A6.5 6.5 0 0 1 16.5 8" stroke="#4CAF50" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16.5 14 A6.5 6.5 0 0 1 14 16.5" stroke="#FF9800" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5.5 14 A6.5 6.5 0 0 1 5.5 8" stroke="#9C27B0" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="18" y1="18" x2="22.5" y2="22.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconHistoDesktop() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="12" cy="7" rx="9" ry="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7 L3 12 C3 13.9 7 15.5 12 15.5 C17 15.5 21 13.9 21 12 L21 7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12 L3 17 C3 18.9 7 20.5 12 20.5 C17 20.5 21 18.9 21 17 L21 12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/* Theme toggle = mini interrupteur SVG, pas un emoji */
function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      className={styles.themeToggle}
      onClick={() => { if (navigator.vibrate) navigator.vibrate(5); if (onToggle) onToggle(); }}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      aria-label={isDark ? 'Mode clair' : 'Mode sombre'}
    >
      <span className={`${styles.themeTrack} ${isDark ? styles.themeTrackDark : styles.themeTrackLight}`}>
        <span className={`${styles.themeThumb} ${isDark ? styles.themeThumbDark : styles.themeThumbLight}`}>
          {isDark ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5" fill="currentColor"/>
              <line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="20" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}

export function Header({
  online, serverVersion, theme, onToggleTheme,
  onAnalyse, analyseEnCours, analyseDisabled,
  historiqueCount, onToggleHistorique, voirHistorique
}) {
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const updateHeight = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-height', h + 'px');
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={headerRef} className={styles.header}>
      {/* Logo + Titre */}
      <div className={styles.brand}>
        <div className={styles.logo}><IconLogo /></div>
        <div className={styles.titles}>
          <h1 className={styles.title}>{APP_NAME}</h1>
          <span className={styles.subtitle}>{APP_SUBTITLE}</span>
        </div>
      </div>

      {/* === Mobile: status + theme === */}
      <div className={styles.mobileRight}>
        <span className={online ? styles.statusOn : styles.statusOff} />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>

      {/* === Desktop: actions === */}
      <div className={styles.desktopActions}>
        <button
          className={`${styles.analyseBtn} ${analyseEnCours ? styles.analyseBtnLoading : ''}`}
          onClick={() => { if (navigator.vibrate) navigator.vibrate(15); if (onAnalyse) onAnalyse(); }}
          disabled={analyseDisabled || analyseEnCours}
        >
          <IconAnalyseDesktop />
          <span>{analyseEnCours ? 'Analyse...' : 'Analyser la conformite'}</span>
        </button>
        <button
          className={`${styles.histBtn} ${voirHistorique ? styles.histBtnActive : ''}`}
          onClick={() => { if (onToggleHistorique) onToggleHistorique(); }}
        >
          <IconHistoDesktop />
          <span>Historique</span>
          {historiqueCount > 0 && (
            <span className={styles.badge}>{historiqueCount > 99 ? '99+' : historiqueCount}</span>
          )}
        </button>
      </div>

      {/* === Desktop: status + theme === */}
      <div className={styles.desktopRight}>
        <span className={online ? styles.statusOn : styles.statusOff}>
          {online && serverVersion ? 'v' + serverVersion : ''}
          {!online ? 'Hors ligne' : ''}
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}