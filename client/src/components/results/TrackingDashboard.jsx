import React, { useState } from 'react';
import styles from './TrackingDashboard.module.css';

/**
 * TrackingDashboard v10 — Version enrichie FIX-08
 * Affiche : metriques, repos hebdo detailles, dette compensation, rappels
 * Ref: CE 561/2006 Art.7-8, Decret 2020-1088
 */
export function TrackingDashboard({ tracking }) {
  if (!tracking) return null;

  const [showReposDetail, setShowReposDetail] = useState(false);
  const [showDetteDetail, setShowDetteDetail] = useState(false);

  const reposReduits = tracking.repos_reduits_journaliers || { compteur: 0, max: 3 };
  const reposHebdo = tracking.repos_hebdomadaires || [];
  const dette = tracking.dette_compensation || { total_h: 0, details: [] };
  const nuit = tracking.conduite_nuit_21h_6h || [];
  const rappels = tracking.rappels || [];
  const derogations = tracking.derogations || {};

  const reposHebdoNormaux = reposHebdo.filter(function(r) { return r.type === 'normal'; }).length;
  const reposHebdoReduits = reposHebdo.filter(function(r) { return r.type === 'reduit'; }).length;
  const reposHebdoInsuffisants = reposHebdo.filter(function(r) { return r.type === 'insuffisant'; }).length;
  const nuitJours = nuit.filter(function(n) { return n.duree_continue_max_min > 0; }).length;
  const nuitMax = nuit.length > 0 ? Math.max.apply(null, nuit.map(function(n) { return n.duree_continue_max_min; })) : 0;

  var statusReduits = 'ok';
  if (reposReduits.compteur >= reposReduits.max) { statusReduits = 'danger'; }
  else if (reposReduits.compteur >= reposReduits.max - 1) { statusReduits = 'warning'; }

  var statusDette = dette.total_h > 0 ? 'warning' : 'ok';
  if (dette.total_h > 20) { statusDette = 'danger'; }

  var statusHebdo = 'ok';
  if (reposHebdoInsuffisants > 0) { statusHebdo = 'danger'; }
  else if (reposHebdoReduits > 2) { statusHebdo = 'warning'; }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    var parts = dateStr.split('-');
    if (parts.length === 3) return parts[2] + '/' + parts[1];
    return dateStr;
  }

  function getTypeLabel(type) {
    if (type === 'normal') return 'Normal';
    if (type === 'reduit') return 'Reduit';
    if (type === 'insuffisant') return 'Insuffisant';
    return type || '—';
  }

  function getTypeClass(type) {
    if (type === 'normal') return styles.tagNormal;
    if (type === 'reduit') return styles.tagReduit;
    if (type === 'insuffisant') return styles.tagInsuffisant;
    return '';
  }

  function ucfirst(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  return (
    <div data-tour="tracking" className={styles.dashboard}>
      <div className={styles.sectionTitle}>Suivi reglementaire</div>

      {/* --- METRIQUES PRINCIPALES --- */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard + ' ' + styles['metric' + ucfirst(statusReduits)]}>
          <div className={styles.metricLabel}>Repos reduits journ.</div>
          <div className={styles.metricValue}>{reposReduits.compteur}/{reposReduits.max}</div>
          <div className={styles.metricSub}>entre 2 repos hebdo</div>
        </div>

        <div className={styles.metricCard + ' ' + styles['metric' + ucfirst(statusHebdo)]}
             onClick={function() { setShowReposDetail(!showReposDetail); }}
             style={{ cursor: 'pointer' }}>
          <div className={styles.metricLabel}>Repos hebdo</div>
          <div className={styles.metricValue}>{reposHebdo.length}</div>
          <div className={styles.metricSub}>{reposHebdoNormaux}N {reposHebdoReduits}R {reposHebdoInsuffisants > 0 ? reposHebdoInsuffisants + 'I' : ''}</div>
        </div>

        <div className={styles.metricCard + ' ' + styles['metric' + ucfirst(statusDette)]}
             onClick={function() { setShowDetteDetail(!showDetteDetail); }}
             style={{ cursor: 'pointer' }}>
          <div className={styles.metricLabel}>Compensation</div>
          <div className={styles.metricValue}>{dette.total_h ? dette.total_h.toFixed(1) : '0'}h</div>
          <div className={styles.metricSub}>{dette.details ? dette.details.length : 0} dette(s) en cours</div>
        </div>

        <div className={styles.metricCard + ' ' + (nuitJours > 0 ? styles.metricInfo : styles.metricOk)}>
          <div className={styles.metricLabel}>Nuit (21h-6h)</div>
          <div className={styles.metricValue}>{nuitJours}j</div>
          <div className={styles.metricSub}>max {nuitMax} min</div>
        </div>
      </div>

      {/* --- DETAIL REPOS HEBDOMADAIRES --- */}
      {showReposDetail && reposHebdo.length > 0 ? (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>Repos hebdomadaires ({reposHebdo.length} blocs)</div>
          <div className={styles.reposTable}>
            <div className={styles.reposHeader}>
              <span>Date</span>
              <span>Duree</span>
              <span>Type</span>
              <span>Bloc</span>
              <span>Avant</span>
              <span>Apres</span>
              <span>Travail</span>
            </div>
            {reposHebdo.map(function(r, i) {
              return (
                <div key={i} className={styles.reposRow + ' ' + (r.type === 'reduit' ? styles.reposRowReduit : r.type === 'insuffisant' ? styles.reposRowInsuffisant : '')}>
                  <span className={styles.reposDate}>{formatDate(r.date_debut)}</span>
                  <span className={styles.reposDuree}>{r.duree_h ? (typeof r.duree_h === 'number' ? r.duree_h.toFixed(1) : r.duree_h) : '—'}h</span>
                  <span><span className={getTypeClass(r.type)}>{getTypeLabel(r.type)}</span></span>
                  <span>{r.jours_repos_bloc || 1}j</span>
                  <span className={styles.reposResiduel}>{r.repos_avant_h !== undefined ? r.repos_avant_h + 'h' : '—'}</span>
                  <span className={styles.reposResiduel}>{r.repos_apres_h !== undefined ? r.repos_apres_h + 'h' : '—'}</span>
                  <span>{r.jours_travail_avant || 0}j</span>
                </div>
              );
            })}
          </div>
          {reposHebdo.some(function(r) { return r.repos_avant_h !== undefined; }) ? (
            <div className={styles.legendeResiduel}>
              Avant = fin service veille &rarr; minuit | Apres = minuit &rarr; debut service lendemain (CE 561/2006 Art.8)
            </div>
          ) : null}
        </div>
      ) : null}

      {/* --- DETAIL DETTE COMPENSATION --- */}
      {showDetteDetail && dette.details && dette.details.length > 0 ? (
        <div className={styles.detailSection}>
          <div className={styles.detailTitle}>Dette de compensation ({dette.total_h ? dette.total_h.toFixed(1) : 0}h)</div>
          <div className={styles.detteList}>
            {dette.details.map(function(d, i) {
              return (
                <div key={i} className={styles.detteItem}>
                  <span className={styles.detteDate}>{formatDate(d.date_repos)}</span>
                  <span className={styles.detteH}>{d.dette_h ? d.dette_h.toFixed(1) : '?'}h</span>
                  <span className={styles.detteEcheance}>{d.echeance || '—'}</span>
                  <span className={styles.detteStatut + ' ' + (d.statut === 'compense' ? styles.detteCompense : styles.detteEnCours)}>
                    {d.statut === 'compense' ? 'Compense' : 'En cours'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* --- RAPPELS REGLEMENTAIRES --- */}
      {rappels.length > 0 ? (
        <div className={styles.rappelsSection}>
          {rappels.map(function(r, i) {
            return (
              <div key={i} className={styles.rappelItem}>{r}</div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
