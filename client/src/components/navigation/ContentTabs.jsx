import React from 'react';
import styles from '../../pages/Calculator.module.css';

export function ContentTabs({ activeTab, onChange }) {
  return (
    <div data-tour="bottom-tabs" className={styles.bottomTabs} role="tablist" aria-label="Saisie et resultats">
      <button
        role="tab"
        aria-selected={activeTab === 'saisie'}
        className={styles.bottomTab + (activeTab === 'saisie' ? ' ' + styles.bottomTabActive : '')}
        onClick={() => onChange('saisie')}
      >
        Saisie
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'resultats'}
        className={styles.bottomTab + (activeTab === 'resultats' ? ' ' + styles.bottomTabActive : '')}
        onClick={() => onChange('resultats')}
      >
        Resultats
      </button>
    </div>
  );
}
