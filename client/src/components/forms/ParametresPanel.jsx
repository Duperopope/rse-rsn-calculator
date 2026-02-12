import React from 'react';
import { TYPES_SERVICE, PAYS_LISTE } from '../../config/constants.js';
import styles from './ParametresPanel.module.css';

/**
 * Panneau de parametres : type de service, pays, mode de saisie
 * @param {string} typeService - Code type service
 * @param {Function} onTypeServiceChange
 * @param {string} pays - Code pays
 * @param {Function} onPaysChange
 * @param {string} mode - 'formulaire' ou 'csv'
 * @param {Function} onModeChange
 */
export function ParametresPanel({
  typeService,
  onTypeServiceChange,
  pays,
  onPaysChange,
  mode,
  onModeChange
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.group}>
        <label className={styles.label}>Type de service</label>
        <select
          className={styles.select}
          value={typeService}
          onChange={(e) => onTypeServiceChange(e.target.value)}
        >
          {TYPES_SERVICE.map(t => (
            <option key={t.code} value={t.code}>{t.label}</option>
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
        <label className={styles.label}>Mode de saisie</label>
        <div className={styles.modeSwitch}>
          <button
            className={mode === 'formulaire' ? styles.modeActive : styles.modeBtn}
            onClick={() => onModeChange('formulaire')}
          >
            Formulaire
          </button>
          <button
            className={mode === 'csv' ? styles.modeActive : styles.modeBtn}
            onClick={() => onModeChange('csv')}
          >
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
