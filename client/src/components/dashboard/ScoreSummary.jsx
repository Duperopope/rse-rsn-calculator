import React from 'react';
import styles from '../../pages/Calculator.module.css';

export function ScoreSummary({ resultat, expanded, onToggle }) {
  if (!resultat) return null;

  const score = Math.round(resultat.score || 0);
  const infractions = (resultat.infractions || []).length;
  const avertissements = (resultat.avertissements || []).length;
  const tone = score >= 90
    ? 'var(--success, #10B981)'
    : score >= 70
      ? 'var(--warning, #F59E0B)'
      : 'var(--danger, #EF4444)';

  function toggle() {
    if (onToggle) onToggle();
  }

  return (
    <div
      className={styles.scoreStickyRow}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label="Afficher ou masquer le detail du resultat"
    >
      <div
        className={styles.scoreCircleMini}
        style={{
          background: tone,
          color: score >= 90 ? '#000' : '#fff'
        }}
      >
        {score}
      </div>
      <span className={styles.scoreStickyLabel}>
        Score FIMO {String.fromCharCode(8226)} {infractions} infraction{infractions > 1 ? 's' : ''}
        {avertissements > 0
          ? ' ' + String.fromCharCode(183) + ' ' + avertissements + ' alerte' + (avertissements > 1 ? 's' : '')
          : ''}
      </span>
      <span className={styles.scoreChevron} aria-hidden="true">
        {expanded ? '\u25B2' : '\u25BC'}
      </span>
    </div>
  );
}
