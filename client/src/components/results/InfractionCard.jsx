import React from 'react';
import { EURO } from '../../config/constants.js';
import styles from './InfractionCard.module.css';

/**
 * Carte d'une infraction individuelle
 * @param {Object} infraction - Objet infraction du backend
 * @param {number} index
 */
export function InfractionCard({ infraction, index }) {
  const inf = infraction || {};
  const message = inf.message || inf.description || inf.regle || 'Infraction';
  const article = inf.article || inf.reference || '';
  const amende = inf.amende || inf.amendeEstimee || 0;
  const gravite = inf.gravite || inf.classe || '';
  const detail = inf.detail || inf.explication || '';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.badge}>{index + 1}</span>
        <span className={styles.message}>{message}</span>
      </div>
      {detail ? <p className={styles.detail}>{detail}</p> : null}
      <div className={styles.meta}>
        {article ? <span className={styles.article}>{article}</span> : null}
        {gravite ? <span className={styles.gravite}>{gravite}</span> : null}
        {amende > 0 ? (
          <span className={styles.amende}>{amende.toLocaleString('fr-FR')} {EURO}</span>
        ) : null}
      </div>
    </div>
  );
}
