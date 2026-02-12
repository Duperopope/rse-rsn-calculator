import React from 'react';
import styles from './Button.module.css';

/**
 * Bouton reutilisable avec variantes
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} disabled
 * @param {boolean} loading
 * @param {boolean} fullWidth
 * @param {Function} onClick
 * @param {React.ReactNode} children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
  ...rest
}) {
  const cls = [
    styles.btn,
    styles['btn-' + variant],
    styles['btn-' + size],
    fullWidth ? styles.fullWidth : '',
    loading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : null}
      <span className={loading ? styles.textHidden : ''}>{children}</span>
    </button>
  );
}
