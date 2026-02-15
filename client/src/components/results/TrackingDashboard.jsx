import React from 'react';
import styles from './TrackingDashboard.module.css';

/**
 * TrackingDashboard v8 — Version compacte pour utilisateur final
 * Affiche les 4 metriques essentielles du suivi reglementaire
 */
export function TrackingDashboard({ tracking }) {
  if (!tracking) return null;

  const reposReduits = tracking.repos_reduits_journaliers || { compteur: 0, max: 3 };
  const reposHebdo = tracking.repos_hebdomadaires || [];
  const dette = tracking.dette_compensation || { total_h: 0 };
  const nuit = tracking.conduite_nuit_21h_6h || [];

  const reposHebdoNormaux = reposHebdo.filter(r => r.type === 'normal').length;
  const reposHebdoReduits = reposHebdo.filter(r => r.type === 'reduit').length;
  const nuitJours = nuit.filter(n => n.duree_continue_max_min > 0).length;
  const nuitMax = nuit.length > 0 ? Math.max(...nuit.map(n => n.duree_continue_max_min)) : 0;

  const statusReduits = reposReduits.compteur >= reposReduits.max ? 'danger' : reposReduits.compteur >= reposReduits.max - 1 ? 'warning' : 'ok';
  const statusDette = dette.total_h > 0 ? 'warning' : 'ok';

  return (
    <div className={styles.dashboard}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard + ' ' + styles['metric' + statusReduits.charAt(0).toUpperCase() + statusReduits.slice(1)]}>
          <div className={styles.metricLabel}>Repos réduits</div>
          <div className={styles.metricValue}>{reposReduits.compteur}/{reposReduits.max}</div>
          <div className={styles.metricSub}>entre 2 repos hebdo</div>
        </div>

        <div className={styles.metricCard + ' ' + (reposHebdo.length === 0 ? styles.metricInfo : styles.metricOk)}>
          <div className={styles.metricLabel}>Repos hebdo</div>
          <div className={styles.metricValue}>{reposHebdo.length}</div>
          <div className={styles.metricSub}>{reposHebdoNormaux} normal, {reposHebdoReduits} réduit</div>
        </div>

        <div className={styles.metricCard + ' ' + styles['metric' + statusDette.charAt(0).toUpperCase() + statusDette.slice(1)]}>
          <div className={styles.metricLabel}>Compensation</div>
          <div className={styles.metricValue}>{dette.total_h.toFixed(1)}h</div>
          <div className={styles.metricSub}>à compenser sous 3 sem.</div>
        </div>

        <div className={styles.metricCard + ' ' + (nuitJours > 0 ? styles.metricInfo : styles.metricOk)}>
          <div className={styles.metricLabel}>Nuit (21h-6h)</div>
          <div className={styles.metricValue}>{nuitJours}j</div>
          <div className={styles.metricSub}>max   {nuitMax} min</div>
        </div>
      </div>
    </div>
  );
}
