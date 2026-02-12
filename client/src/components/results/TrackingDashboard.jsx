import React, { useState } from 'react';
import styles from './TrackingDashboard.module.css';

/**
 * TrackingDashboard v7.1.0 - Dashboard de suivi reglementaire complet
 *
 * Affiche les donnees du tracking retourne par analyseMultiSemaines() :
 *   - Repos reduits journaliers (jauge segmentee 0-3)
 *   - Repos hebdomadaires detectes + type (normal/reduit)
 *   - Dette de compensation (timeline)
 *   - Conduite nuit 21h-6h (grille par jour)
 *   - Repos fractionnes 3h+9h detectes
 *   - Derogations actives (Art.12, 12 jours, 2x15 min, etc.)
 *   - Rappels reglementaires
 *
 * Sources :
 *   CE 561/2006 Art.4g, Art.7, Art.8 par.4-6, Art.12
 *   Reglement 2020/1054 (repos hebdo, retour domicile)
 *   Reglement 2024/1258 (pause 2x15, derogation 12j)
 *
 * @param {{ tracking: Object }} props
 */
export function TrackingDashboard({ tracking }) {
  const [showNuit, setShowNuit] = useState(false);
  const [showFrac, setShowFrac] = useState(false);

  if (!tracking) return null;

  const reposReduits = tracking.repos_reduits_journaliers || { compteur: 0, max: 3, details: [] };
  const reposHebdo = tracking.repos_hebdomadaires || [];
  const dette = tracking.dette_compensation || { total_h: 0, details: [] };
  const nuit = tracking.conduite_nuit_21h_6h || [];
  const fractionnes = tracking.repos_journaliers_fractionnes || [];
  const derogations = tracking.derogations || {};
  const rappels = tracking.rappels || [];

  // Calculs derives
  const reposHebdoNormaux = reposHebdo.filter(function(r) { return r.type === 'normal'; }).length;
  const reposHebdoReduits = reposHebdo.filter(function(r) { return r.type === 'reduit'; }).length;
  const nuitJoursAvecConduite = nuit.filter(function(n) { return n.duree_continue_max_min > 0; }).length;
  const nuitMaxMin = nuit.length > 0 ? Math.max.apply(null, nuit.map(function(n) { return n.duree_continue_max_min; })) : 0;
  const nuitDepassements = nuit.filter(function(n) { return n.duree_continue_max_min > (n.limite_min || 240); }).length;
  const derogArt12 = (derogations.art12_depassement_exceptionnel || []).length;
  const derog12j = derogations.art8_6bis_12_jours;
  const derog2reduits = derogations.art8_6_2_reduits_consecutifs;
  const derogPause2x15 = derogations.pause_2x15_occasionnel;

  // Status jauge repos reduits
  var jaugeStatus = 'Ok';
  var jaugeCss = styles.gaugeBadgeOk;
  if (reposReduits.compteur >= reposReduits.max) {
    jaugeStatus = 'MAX';
    jaugeCss = styles.gaugeBadgeDanger;
  } else if (reposReduits.compteur >= reposReduits.max - 1) {
    jaugeStatus = 'Attention';
    jaugeCss = styles.gaugeBadgeWarning;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashTitle}>
        <span className={styles.dashIcon}>&#x1F4CA;</span>
        Suivi reglementaire (Tracking v7)
      </div>

      {/* --- Metriques principales --- */}
      <div className={styles.metricsGrid}>
        <div className={[styles.metricCard, reposReduits.compteur >= reposReduits.max ? styles.metricDanger : reposReduits.compteur >= reposReduits.max - 1 ? styles.metricWarning : styles.metricOk].join(' ')}>
          <div className={styles.metricLabel}>Repos reduits journaliers</div>
          <div className={styles.metricValue}>{reposReduits.compteur}/{reposReduits.max}</div>
          <div className={styles.metricSub}>entre 2 repos hebdo (Art.8 par.4)</div>
        </div>

        <div className={[styles.metricCard, reposHebdo.length === 0 ? styles.metricInfo : reposHebdoNormaux > 0 ? styles.metricOk : styles.metricWarning].join(' ')}>
          <div className={styles.metricLabel}>Repos hebdomadaires</div>
          <div className={styles.metricValue}>{reposHebdo.length}</div>
          <div className={styles.metricSub}>{reposHebdoNormaux} normal(aux), {reposHebdoReduits} reduit(s)</div>
        </div>

        <div className={[styles.metricCard, dette.total_h > 0 ? styles.metricWarning : styles.metricOk].join(' ')}>
          <div className={styles.metricLabel}>Dette compensation</div>
          <div className={styles.metricValue}>{dette.total_h.toFixed(1)}h</div>
          <div className={styles.metricSub}>a compenser sous 3 sem. (Art.8 par.6)</div>
        </div>

        <div className={[styles.metricCard, nuitDepassements > 0 ? styles.metricWarning : styles.metricOk].join(' ')}>
          <div className={styles.metricLabel}>Conduite nuit (21h-6h)</div>
          <div className={styles.metricValue}>{nuitJoursAvecConduite}j</div>
          <div className={styles.metricSub}>max {nuitMaxMin} min ({nuitDepassements} dep.)</div>
        </div>

        <div className={[styles.metricCard, fractionnes.length > 0 ? styles.metricInfo : styles.metricOk].join(' ')}>
          <div className={styles.metricLabel}>Repos fractionnes 3h+9h</div>
          <div className={styles.metricValue}>{fractionnes.length}</div>
          <div className={styles.metricSub}>Art.4 par.g (valeur repos normal)</div>
        </div>

        <div className={[styles.metricCard, derogArt12 > 0 ? styles.metricInfo : styles.metricOk].join(' ')}>
          <div className={styles.metricLabel}>Derogations Art.12</div>
          <div className={styles.metricValue}>{derogArt12}</div>
          <div className={styles.metricSub}>depassements exceptionnels</div>
        </div>
      </div>

      {/* --- Jauge segmentee repos reduits --- */}
      <div className={styles.gaugeSection}>
        <div className={styles.gaugeHeader}>
          <span className={styles.gaugeTitle}>Compteur repos journaliers reduits (9h-11h)</span>
          <span className={[styles.gaugeBadge, jaugeCss].join(' ')}>{jaugeStatus}</span>
        </div>
        <div className={styles.gaugeTrack}>
          {[0, 1, 2].map(function(idx) {
            var filled = idx < reposReduits.compteur;
            var danger = reposReduits.compteur > reposReduits.max && idx >= reposReduits.max;
            return (
              <div
                key={idx}
                className={[styles.gaugeSegment, filled ? (danger ? styles.segmentFilledDanger : styles.segmentFilled) : styles.segmentEmpty].join(' ')}
                title={filled && reposReduits.details[idx] ? reposReduits.details[idx].date + ' : ' + reposReduits.details[idx].duree_h + 'h' : 'Non utilise'}
              />
            );
          })}
        </div>
        <div className={styles.gaugeLabels}>
          <span>0 reduit</span>
          <span>Max {reposReduits.max} (CE 561/2006 Art.8 par.4)</span>
        </div>
        {reposReduits.details.length > 0 ? (
          <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary, #888)' }}>
            {reposReduits.details.map(function(d, i) {
              return (
                <span key={i} style={{ marginRight: '12px' }}>
                  #{d.numero} {d.date} ({d.duree_h}h)
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* --- Dette compensation timeline --- */}
      {dette.details.length > 0 ? (
        <div className={styles.detteSection}>
          <div className={styles.detteTitle}>Dette de compensation repos hebdomadaire</div>
          <div className={styles.detteTimeline}>
            {dette.details.map(function(d, i) {
              return (
                <div key={i} className={styles.detteItem}>
                  <div className={[styles.detteDot, d.statut === 'compense' ? styles.detteDotOk : styles.detteDotPending].join(' ')} />
                  <span className={styles.detteDate}>{d.date_repos}</span>
                  <span className={styles.detteAmount}>{d.dette_h}h</span>
                  <span className={styles.detteEcheance}>{d.echeance}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.detteTotal}>
            <span className={styles.detteTotalLabel}>Total dette en cours</span>
            <span className={styles.detteTotalValue}>{dette.total_h.toFixed(1)}h</span>
          </div>
        </div>
      ) : null}

      {/* --- Derogations actives --- */}
      <div className={styles.derogSection}>
        <div className={styles.derogTitle}>Derogations et regles speciales</div>
        <div className={styles.derogGrid}>
          <div className={derogArt12 > 0 ? styles.derogActive : styles.derogInactive}>
            <div className={[styles.derogDot, derogArt12 > 0 ? styles.derogDotOn : styles.derogDotOff].join(' ')} />
            Art.12 Depassement ({derogArt12})
          </div>
          <div className={derog12j ? styles.derogActive : styles.derogInactive}>
            <div className={[styles.derogDot, derog12j ? styles.derogDotOn : styles.derogDotOff].join(' ')} />
            12 jours voyageurs {derog12j ? '(' + derog12j.jours_consecutifs + 'j)' : ''}
          </div>
          <div className={derog2reduits ? styles.derogActive : styles.derogInactive}>
            <div className={[styles.derogDot, derog2reduits ? styles.derogDotOn : styles.derogDotOff].join(' ')} />
            2 reduits consecutifs
          </div>
          <div className={derogPause2x15 ? styles.derogActive : styles.derogInactive}>
            <div className={[styles.derogDot, derogPause2x15 ? styles.derogDotOn : styles.derogDotOff].join(' ')} />
            Pause 2x15 min (2024/1258)
          </div>
        </div>
      </div>

      {/* --- Conduite nuit detail (accordeon) --- */}
      {nuit.length > 0 ? (
        <div className={styles.nuitSection}>
          <button
            className={styles.nuitTitle}
            onClick={function() { setShowNuit(!showNuit); }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', width: '100%', textAlign: 'left', padding: 0, font: 'inherit' }}
          >
            {showNuit ? 'Masquer' : 'Afficher'} conduite de nuit ({nuit.length} jour(s))
          </button>
          {showNuit ? (
            <div className={styles.nuitGrid}>
              {nuit.map(function(n, i) {
                var ratio = n.limite_min > 0 ? n.duree_continue_max_min / n.limite_min : 0;
                var cls = ratio >= 1 ? styles.nuitDayDanger : ratio >= 0.75 ? styles.nuitDayWarn : styles.nuitDayOk;
                return (
                  <div key={i} className={[styles.nuitDay, cls].join(' ')}>
                    <span className={styles.nuitDayDate}>{n.date}</span>
                    <span className={styles.nuitDayValue} style={{ color: ratio >= 1 ? 'var(--accent-red, #ff4444)' : ratio >= 0.75 ? 'var(--accent-orange, #ffaa00)' : 'var(--accent-green, #00ff88)' }}>
                      {n.duree_continue_max_min} min
                    </span>
                    <span className={styles.nuitDayLimit}>/ {n.limite_min} min max</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* --- Repos fractionnes detail (accordeon) --- */}
      {fractionnes.length > 0 ? (
        <div className={styles.fracSection}>
          <button
            className={styles.fracTitle}
            onClick={function() { setShowFrac(!showFrac); }}
            style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', width: '100%', textAlign: 'left', padding: 0, font: 'inherit' }}
          >
            {showFrac ? 'Masquer' : 'Afficher'} repos fractionnes ({fractionnes.length})
          </button>
          {showFrac ? (
            <div>
              {fractionnes.map(function(f, i) {
                return (
                  <div key={i} className={styles.fracItem}>
                    <span className={styles.fracDate}>{f.date}</span>
                    <span className={styles.fracParts}>{f.partie1_h}h + {f.partie2_h}h</span>
                    <span className={styles.fracTotal}>= {f.total_h}h (Art.4g)</span>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* --- Rappels reglementaires --- */}
      {rappels.length > 0 ? (
        <div className={styles.rappelsSection}>
          <div className={styles.rappelsTitle}>Rappels reglementaires ({rappels.length})</div>
          {rappels.map(function(r, i) {
            return (
              <div key={i} className={styles.rappelItem}>
                <span className={styles.rappelBullet}>&#x25B6;</span>
                <span>{r}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
