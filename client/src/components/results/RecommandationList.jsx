import React from 'react';
import styles from './RecommandationList.module.css';

/**
 * Liste de recommandations
 * @param {Array} recommandations - [{niveau, texte}] ou [string]
 */
export function RecommandationList({ recommandations = [] }) {
  if (recommandations.length === 0) return null;

  function getIcon(niveau) {
    switch (niveau) {
      case 'danger': return '!';
      case 'warning': return '!';
      case 'info': return 'i';
      case 'ok': return '\u2713';
      default: return '\u2022';
    }
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Recommandations</h3>
      <div className={styles.list}>
        {recommandations.map((rec, i) => {
          const texte = typeof rec === 'string' ? rec : rec.texte || rec.message || '';
          const niveau = typeof rec === 'string' ? 'info' : rec.niveau || 'info';
          return (
            <div key={i} className={styles.item} data-niveau={niveau}>
              <span className={styles.icon} data-niveau={niveau}>{getIcon(niveau)}</span>
              <span className={styles.texte}>{texte}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
