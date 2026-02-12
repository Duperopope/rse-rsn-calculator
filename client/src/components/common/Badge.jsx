import React from 'react';
import styles from './Badge.module.css';

/**
 * Badge / pill pour afficher un statut ou une etiquette
 * @param {'ok'|'warning'|'danger'|'info'|'neutral'} variant
 */
export function Badge({ variant = 'neutral', children, className = '' }) {
  const cls = [styles.badge, styles['badge-' + variant], className].filter(Boolean).join(' ');
  return <span className={cls}>{children}</span>;
}
