import React from 'react';
import { VERSION } from '../../config/constants.js';
import styles from './Header.module.css';

/**
 * En-tete de l'application
 * Affiche le logo, la version, le statut serveur et le toggle theme
 * @param {boolean} online - Serveur connecte
 * @param {string} serverVersion - Version du backend
 * @param {string} theme - 'dark' ou 'light'
 * @param {Function} onToggleTheme - Callback toggle theme
 */
export function Header({ online, serverVersion, theme, onToggleTheme }) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="url(#grad)" strokeWidth="2.5" />
            <path d="M16 8 L16 16 L22 19" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
                <stop offset="0%" stopColor="var(--gradient-start, #667eea)" />
                <stop offset="100%" stopColor="var(--gradient-end, #764ba2)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className={styles.titles}>
          <h1 className={styles.title}>RSE/RSN Calculator</h1>
          <span className={styles.subtitle}>Conformite temps de conduite</span>
        </div>
      </div>
      <div className={styles.actions}>
        <span className={styles.version}>v{VERSION}</span>
        <span className={online ? styles.statusOn : styles.statusOff}>
          {online ? 'En ligne' : 'Hors ligne'}
          {serverVersion && online ? ' (v' + serverVersion + ')' : ''}
        </span>
        <button
          className={styles.themeBtn}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          aria-label="Changer de theme"
        >
          {theme === 'dark' ? '\u2600' : '\u263E'}
        </button>
      </div>
    </header>
  );
}
