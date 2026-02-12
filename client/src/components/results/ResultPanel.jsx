import React, { useState, useEffect } from 'react';
import { EURO } from '../../config/constants.js';
import { InfractionCard } from './InfractionCard.jsx';
import { RecommandationList } from './RecommandationList.jsx';
import { SanctionTable } from './SanctionTable.jsx';
import { TrackingDashboard } from './TrackingDashboard.jsx';
import styles from './ResultPanel.module.css';

/**
 * Panneau de resultats complet apres analyse
 * Score anime, infractions, avertissements, details par jour, sanctions
 */
export function ResultPanel({ resultat }) {
  const [animScore, setAnimScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!resultat) return;
    const target = resultat.score || 0;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 30));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      setAnimScore(current);
    }, 30);
    return () => clearInterval(timer);
  }, [resultat]);

  if (!resultat) return null;

  const score = resultat.score || 0;
  const infractions = resultat.infractions || [];
  const avertissements = resultat.avertissements || [];
  const details = resultat.details_jours || [];
  const stats = resultat.statistiques || {};
  const amende = resultat.amende_estimee || 0;
  const equipage = resultat.equipage || 'solo';
  const tracking = resultat.tracking || null;
  const periode = resultat.periode || '';

  function getScoreColor() {
    if (score >= 90) return 'var(--accent-green, #00ff88)';
    if (score >= 70) return 'var(--accent-orange, #ffaa00)';
    return 'var(--accent-red, #ff4444)';
  }

  function getScoreLabel() {
    if (score >= 90) return 'Conforme';
    if (score >= 70) return 'Attention';
    return 'Non conforme';
  }

  return (
    <div className={styles.panel}>
      {/* Score principal */}
      <div className={styles.scoreSection}>
        <div className={styles.scoreCircle} style={{ borderColor: getScoreColor() }}>
          <span className={styles.scoreValue} style={{ color: getScoreColor() }}>{animScore}</span>
          <span className={styles.scoreUnit}>%</span>
        </div>
        <div className={styles.scoreMeta}>
          <span className={styles.scoreLabel} style={{ color: getScoreColor() }}>{getScoreLabel()}</span>
          {amende > 0 ? (
            <span className={styles.amende}>Amende estimee : {amende.toLocaleString('fr-FR')} {EURO}</span>
          ) : null}
          <span className={styles.scoreSummary}>
            {infractions.length} infraction(s), {avertissements.length} avertissement(s)
          </span>
          {equipage === 'double' ? (
            <span className={styles.equipageBadge}>Double equipage (Art.8 par.5)</span>
          ) : null}
          {periode ? <span className={styles.periode}>Periode : {periode}</span> : null}
        </div>
      </div>

      {/* Statistiques globales */}
      {stats.conduite_totale_h ? (
        <div className={styles.statsGrid}>
          <div className={styles.statItem}><span className={styles.statLabel}>Conduite totale</span><span className={styles.statValue}>{stats.conduite_totale_h}h</span></div>
          <div className={styles.statItem}><span className={styles.statLabel}>Autre travail</span><span className={styles.statValue}>{stats.travail_autre_total_h}h</span></div>
          <div className={styles.statItem}><span className={styles.statLabel}>Pauses</span><span className={styles.statValue}>{stats.pause_totale_h}h</span></div>
          <div className={styles.statItem}><span className={styles.statLabel}>Disponibilite</span><span className={styles.statValue}>{stats.disponibilite_totale_h}h</span></div>
          <div className={styles.statItem}><span className={styles.statLabel}>Moy. conduite/jour</span><span className={styles.statValue}>{stats.moyenne_conduite_jour_h}h</span></div>
          <div className={styles.statItem}><span className={styles.statLabel}>Moy. travail/jour</span><span className={styles.statValue}>{stats.moyenne_travail_total_jour_h}h</span></div>
        </div>
      ) : null}

      {/* Infractions */}
      {infractions.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Infractions ({infractions.length})</h3>
          <div className={styles.infractions}>
            {infractions.map((inf, i) => <InfractionCard key={i} infraction={inf} index={i} />)}
          </div>
        </div>
      ) : null}

      {/* Avertissements */}
      {avertissements.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitleWarn}>Avertissements ({avertissements.length})</h3>
          <div className={styles.avertissements}>
            {avertissements.map((av, i) => (
              <div key={i} className={styles.avertissement}>
                <span className={styles.warnIcon}>!</span>
                <div>
                  <strong>{av.regle || ''}</strong>
                  <p>{av.message || av.description || JSON.stringify(av)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Details par jour */}
      {details.length > 0 ? (
        <div className={styles.section}>
          <button className={styles.toggleBtn} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Masquer' : 'Afficher'} les details ({details.length} jour(s))
          </button>
          {showDetails ? (
            <div className={styles.details}>
              {details.map((jour, i) => (
                <div key={i} className={styles.detailJour}>
                  <div className={styles.detailHeader}>
                    <strong>{jour.date}</strong>
                    <span>{jour.fuseau}</span>
                  </div>
                  <div className={styles.detailStats}>
                    <span>Conduite : {jour.conduite_h}h</span>
                    <span>Travail : {jour.travail_h}h</span>
                    <span>Pause : {jour.pause_h}h</span>
                    <span>Amplitude : {jour.amplitude_estimee_h}h</span>
                    <span>Conduite continue max : {jour.conduite_continue_max_min} min</span>
                    <span>Repos estime : {jour.repos_estime_h}h</span>
                    {parseFloat(jour.ferry_h) > 0 ? <span>Ferry : {jour.ferry_h}h</span> : null}
                  </div>
                  {jour.infractions && jour.infractions.length > 0 ? (
                    <div className={styles.detailInf}>
                      {jour.infractions.map((inf, j) => (
                        <span key={j} className={styles.detailInfItem}>{inf.regle}</span>
                      ))}
                    </div>
                  ) : <span className={styles.detailOk}>Conforme</span>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tracking ? <TrackingDashboard tracking={tracking} /> : null}

      <SanctionTable />
      <button className={styles.printBtn} onClick={() => window.print()}>Imprimer le rapport</button>
    </div>
  );
}
