import React from 'react';
import styles from './Loader.module.css';

/**
 * Indicateur de chargement anime
 * @param {string} text - Texte optionnel sous le spinner
 * @param {'sm'|'md'|'lg'} size
 */
export function Loader({ text = 'Analyse en cours...', size = 'md' }) {
  return (
    <div className={styles.container}>
      <div className={[styles.spinner, styles['spinner-' + size]].join(' ')} />
      {text ? <p className={styles.text}>{text}</p> : null}
    </div>
  );
}
