import React from 'react';
import styles from '../../pages/Calculator.module.css';

export function DriverTabs({ activeDriver, onChange }) {
  return (
    <div className={styles.conducteurTabs} role="tablist" aria-label="Conducteur actif">
      {[1, 2].map((driver) => (
        <button
          key={driver}
          type="button"
          role="tab"
          aria-selected={activeDriver === driver}
          className={activeDriver === driver ? styles.tabActive : styles.tab}
          onClick={() => onChange(driver)}
        >
          Conducteur {driver}
        </button>
      ))}
    </div>
  );
}
