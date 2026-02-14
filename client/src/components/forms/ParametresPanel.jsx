import React, { useState } from 'react';
import { TYPES_SERVICE, PAYS_LISTE } from '../../config/constants.js';
import styles from './ParametresPanel.module.css';

/**
 * FIMO Check — ParametresPanel v7.11.0
 * UX Conducteur : labels humains, chips clairs, panneau compact
 * Les chips utilisent le champ 'short' de TYPES_SERVICE
 * Tap sur les chips = ouvrir/fermer le panneau
 */

export function ParametresPanel({
  typeService, onTypeServiceChange,
  pays, onPaysChange,
  equipage, onEquipageChange,
  mode, onModeChange
}) {
  const [ouvert, setOuvert] = useState(false);

  const paysObj = PAYS_LISTE.find(p => p.code === pays) || PAYS_LISTE[0];
  const serviceObj = TYPES_SERVICE.find(t => t.code === typeService) || TYPES_SERVICE[0];
  const serviceShort = serviceObj.short || serviceObj.label;

  const togglePanel = () => {
    setOuvert(v => !v);
    if (navigator.vibrate) navigator.vibrate(5);
  };

  return (
    <div className={`${styles.panel} ${ouvert ? styles.panelOpen : ''}`}>
      {/* === Barre de chips cliquable === */}
      <button
        className={styles.summaryBtn}
        onClick={togglePanel}
        aria-expanded={ouvert}
        aria-label="Modifier les parametres"
      >
        <div className={styles.chipsRow}>
          <span className={styles.chipService}>
            <span className={styles.chipIcon}>🚍</span>
            {serviceShort}
          </span>
          <span className={styles.chip}>
            {paysObj.drapeau} {paysObj.code}
          </span>
          <span className={styles.chip}>
            {equipage === 'double' ? '👥 Duo' : '👤 Solo'}
          </span>
          <span className={styles.chipMode}>
            {mode === 'formulaire' ? '✏️ Manuel' : '📄 CSV'}
          </span>
        </div>
        <span className={`${styles.chevron} ${ouvert ? styles.chevronOpen : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {/* === Panneau depliable === */}
      {ouvert && (
        <div className={styles.content}>
          <div className={styles.grid}>
            <div className={styles.group}>
              <label className={styles.label}>Type de trajet</label>
              <select
                className={styles.select}
                value={typeService}
                onChange={(e) => onTypeServiceChange(e.target.value)}
              >
                {TYPES_SERVICE.map(t => (
                  <option key={t.code} value={t.code}>
                    {t.label}{t.detail ? ' — ' + t.detail : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Pays</label>
              <select
                className={styles.select}
                value={pays}
                onChange={(e) => onPaysChange(e.target.value)}
              >
                {PAYS_LISTE.map(p => (
                  <option key={p.code} value={p.code}>{p.drapeau} {p.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Equipage</label>
              <div className={styles.toggle}>
                <button
                  className={equipage === 'solo' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onEquipageChange('solo')}
                  type="button"
                >
                  <span className={styles.toggleIcon}>👤</span> Solo
                </button>
                <button
                  className={equipage === 'double' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onEquipageChange('double')}
                  type="button"
                >
                  <span className={styles.toggleIcon}>👥</span> Duo
                </button>
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Mode de saisie</label>
              <div className={styles.toggle}>
                <button
                  className={mode === 'formulaire' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onModeChange('formulaire')}
                  type="button"
                >
                  <span className={styles.toggleIcon}>✏️</span> Manuel
                </button>
                <button
                  className={mode === 'csv' ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onModeChange('csv')}
                  type="button"
                >
                  <span className={styles.toggleIcon}>📄</span> Fichier CSV
                </button>
              </div>
            </div>
          </div>

          {/* Info contextuelle */}
          {serviceObj.detail && (
            <div className={styles.detailHint}>
              <span className={styles.detailIcon}>ℹ️</span>
              <span>{serviceObj.detail}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}