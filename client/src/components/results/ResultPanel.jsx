import React, { useState, useEffect } from 'react';
import { EURO } from '../../config/constants.js';
import { fmtMin, fmtH } from '../../utils/time.js';
import { InfractionCard } from './InfractionCard.jsx';
import { RecommandationList } from './RecommandationList.jsx';
import { SanctionTable } from './SanctionTable.jsx';
import styles from './ResultPanel.module.css';

/**
 * Panneau de resultats complet apres analyse
 * Score anime, infractions, avertissements, details par jour, sanctions
 * @param {Object} resultat - Reponse de POST /api/analyze
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
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setAnimScore(current);
    }, 30);
    return () => clearInterval(timer);
  }, [resultat]);

  if (!resultat) return null;

  const score = resultat.score || 0;
  const infractions = resultat.infractions || [];
  const avertissements = resultat.avertissements || [];
  const recommandations = resultat.recommandations || [];
  const details = resultat.details || resultat.detail_jours || [];
  const amende = resultat.amende_estimee || resultat.amendeEstimee || 0;

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
          <span className={styles.scoreValue} style={{ color: getScoreColor() }}>
            {animScore}
          </span>
          <span className={styles.scoreUnit}>%</span>
        </div>
        <div className={styles.scoreMeta}>
          <span className={styles.scoreLabel} style={{ color: getScoreColor() }}>
            {getScoreLabel()}
          </span>
          {amende > 0 ? (
            <span className={styles.amende}>
              Amende estimee : {amende.toLocaleString('fr-FR')} {EURO}
            </span>
          ) : null}
          <span className={styles.scoreSummary}>
            {infractions.length} infraction(s), {avertissements.length} avertissement(s)
          </span>
        </div>
      </div>

      {/* Infractions */}
      {infractions.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Infractions ({infractions.length})
          </h3>
          <div className={styles.infractions}>
            {infractions.map((inf, i) => (
              <InfractionCard key={i} infraction={inf} index={i} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Avertissements */}
      {avertissements.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitleWarn}>
            Avertissements ({avertissements.length})
          </h3>
          <div className={styles.avertissements}>
            {avertissements.map((av, i) => (
              <div key={i} className={styles.avertissement}>
                <span className={styles.warnIcon}>!</span>
                <span>{typeof av === 'string' ? av : av.message || av.description || JSON.stringify(av)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Recommandations */}
      {recommandations.length > 0 ? (
        <RecommandationList recommandations={recommandations} />
      ) : null}

      {/* Details par jour */}
      {details.length > 0 ? (
        <div className={styles.section}>
          <button
            className={styles.toggleBtn}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Masquer' : 'Afficher'} les details ({details.length} jour(s))
          </button>
          {showDetails ? (
            <div className={styles.details}>
              {details.map((jour, i) => (
                <div key={i} className={styles.detailJour}>
                  <div className={styles.detailHeader}>
                    <strong>{jour.date || 'Jour ' + (i + 1)}</strong>
                    <span style={{ color: (jour.score || 0) >= 90 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                      {jour.score || 0}%
                    </span>
                  </div>
                  {jour.conduite_totale !== undefined ? (
                    <div className={styles.detailStats}>
                      <span>Conduite : {fmtH(jour.conduite_totale || jour.conduiteTotale || 0)}</span>
                      <span>Amplitude : {fmtH(jour.amplitude || 0)}</span>
                      <span>Travail : {fmtH(jour.travail_total || jour.travailTotal || 0)}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Tableau sanctions */}
      <SanctionTable />

      {/* Bouton imprimer */}
      <button className={styles.printBtn} onClick={() => window.print()}>
        Imprimer le rapport
      </button>
    </div>
  );
}
