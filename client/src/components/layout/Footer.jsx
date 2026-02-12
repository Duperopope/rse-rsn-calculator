import React from 'react';
import { VERSION } from '../../config/constants.js';
import styles from './Footer.module.css';

/**
 * Pied de page avec sources reglementaires et infos
 */
export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.sources}>
        <span className={styles.label}>Sources :</span>
        <a href="https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561" target="_blank" rel="noopener noreferrer">
          CE 561/2006
        </a>
        <span className={styles.sep}>|</span>
        <a href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297" target="_blank" rel="noopener noreferrer">
          L3312-1
        </a>
        <span className={styles.sep}>|</span>
        <a href="https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers" target="_blank" rel="noopener noreferrer">
          ecologie.gouv.fr
        </a>
      </div>
      <div className={styles.info}>
        <span>RSE/RSN Calculator v{VERSION}</span>
        <span className={styles.sep}>|</span>
        <span>Samir Medjaher</span>
      </div>
    </footer>
  );
}
