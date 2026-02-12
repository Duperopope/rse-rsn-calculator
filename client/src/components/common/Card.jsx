import React from 'react';
import styles from './Card.module.css';

/**
 * Carte reutilisable (conteneur avec bordure et ombre)
 * @param {Object} props
 * @param {string} title - Titre optionnel
 * @param {'default'|'accent'|'danger'|'success'} variant
 * @param {boolean} animate - Animation fadeIn a l'apparition
 * @param {React.ReactNode} children
 */
export function Card({ title, variant = 'default', animate = false, children, className = '', style = {} }) {
  const cls = [
    styles.card,
    styles['card-' + variant],
    animate ? styles.animate : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={style}>
      {title ? <h3 className={styles.title}>{title}</h3> : null}
      {children}
    </div>
  );
}
