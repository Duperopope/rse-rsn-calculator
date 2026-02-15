import React, { useState, useEffect } from 'react';
import { EURO, API_URL } from '../../config/constants.js';
import { InfractionCard } from './InfractionCard.jsx';
import { RecommandationList } from './RecommandationList.jsx';
import { SanctionTable } from './SanctionTable.jsx';
// import { FixEnginePanel } from './FixEnginePanel.jsx';
import { TrackingDashboard } from './TrackingDashboard.jsx';
import styles from './ResultPanel.module.css';

/**
 * Panneau de resultats complet apres analyse
 * Score anime, infractions, avertissements, details par jour, sanctions
 */
export function ResultPanel({ resultat, compact = false }) {
  const [animScore, setAnimScore] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  function telechargerPDF() {
    setPdfLoading(true);
    fetch(API_URL + '/rapport/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resultat: resultat, options: {} })
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Erreur ' + response.status);
      return response.blob();
    })
    .then(function(blob) {
      var url = window.URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'rapport_rse_rsn_' + new Date().toISOString().slice(0, 10) + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    })
    .catch(function(err) {
      console.error('Erreur PDF:', err);
      alert('Erreur lors de la generation du PDF. Veuillez reessayer.');
    })
    .finally(function() {
      setPdfLoading(false);
    });
  }

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
    const fixEngine = resultat._fix_engine || null;
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
    <div data-tour="results" id="resultats" className={styles.panel}>
      {/* Score principal */}
      {compact ? null : (
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
      )}

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

      {/* Fix-Engine : Comparaison avant/apres */}
      {/* FixEngine masque — correction silencieuse */}

      {/* Infractions */}
      {infractions.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Infractions ({infractions.length})</h3>
          <div className={styles.infractions}>
            {(() => {
              const grouped = [];
              const seen = new Map();
              infractions.forEach((inf, i) => {
                const groupKey = (inf.regle || inf.article || '') + '|' + (inf.description || inf.message || inf.detail || '');
                if (seen.has(groupKey)) {
                  seen.get(groupKey).jours.push(inf.jour || ('J' + (i + 1)));
                  seen.get(groupKey).count++;
                } else {
                  const group = { ...inf, count: 1, jours: [inf.jour || ('J' + (i + 1))], originalIndex: i };
                  seen.set(groupKey, group);
                  grouped.push(group);
                }
              });
              return grouped.map((inf, i) => (
                <InfractionCard key={i} infraction={inf} index={i} grouped={inf.count > 1} count={inf.count} jours={inf.jours} />
              ));
            })()}
          </div>
        </div>
      ) : null}

      {/* Avertissements */}
      {avertissements.length > 0 ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitleWarn}>Avertissements</h3>
          <div className={styles.avertissements}>
            {(() => {
              const grouped = [];
              const seen = new Map();
              avertissements.forEach((av) => {
                const key = (av.regle || av.article || '') + '|' + (av.message || av.description || '');
                if (seen.has(key)) {
                  seen.get(key).count++;
                  if (av.jour) seen.get(key).jours.push(av.jour);
                } else {
                  const g = { ...av, count: 1, jours: av.jour ? [av.jour] : [] };
                  seen.set(key, g);
                  grouped.push(g);
                }
              });
              return grouped.map((av, i) => (
                <div key={i} className={styles.avertissement}>
                  <span className={styles.warnIcon}>!</span>
                  <div>
                    <strong>
                      {av.url_legale ? (
                        <a href={av.url_legale} target="_blank" rel="noopener noreferrer" style={{color: 'inherit', textDecoration: 'underline dotted'}}>
                          {av.regle || ''}
                        </a>
                      ) : (av.regle || '')}
                      {av.count > 1 ? <span style={{marginLeft:'6px',padding:'1px 6px',borderRadius:'8px',background:'rgba(255,170,0,0.15)',color:'#ffaa00',fontSize:'0.7rem',fontWeight:600}}>{String.fromCharCode(215)}{av.count}{av.jours.length > 0 ? ' (' + av.jours.join(', ') + ')' : ''}</span> : null}
                    </strong>
                    <p>{av.message || av.description || ''}</p>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      ) : null}

      {/* Journees analysees */}
      {details.length > 0 ? (
        <div className={styles.section}>
          <button className={styles.toggleBtn} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "\u25B2" : "\u25BC"} {details.length} journee{details.length > 1 ? "s" : ""} analysee{details.length > 1 ? "s" : ""}
          </button>
          {showDetails ? (
            <div className={styles.details}>
              {details.map((jour, i) => {
                const hasInf = jour.infractions && jour.infractions.length > 0;
                const jourDate = jour.date || "";
                const dateObj = jourDate ? new Date(jourDate + "T00:00:00") : null;
                const jourLabel = dateObj ? ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"][dateObj.getDay()] + " " + String(dateObj.getDate()).padStart(2,"0") + "/" + String(dateObj.getMonth()+1).padStart(2,"0") : jourDate;
                return (
                  <div key={i} className={styles.detailJour + (hasInf ? " " + styles.detailJourWarn : "")}>
                    <div className={styles.detailHeader}>
                      <span className={styles.detailDate}>{jourLabel}</span>
                      {hasInf ? <span className={styles.detailBadgeDanger}>{jour.infractions.length} inf.</span> : <span className={styles.detailBadgeOk}>{"\u2713"}</span>}
                    </div>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Conduite</span><span className={styles.detailStatVal}>{jour.conduite_h}h</span></div>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Travail</span><span className={styles.detailStatVal}>{jour.travail_h}h</span></div>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Pause</span><span className={styles.detailStatVal}>{jour.pause_h}h</span></div>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Amplitude</span><span className={styles.detailStatVal}>{jour.amplitude_estimee_h !== "N/A" ? jour.amplitude_estimee_h + "h" : "-"}</span></div>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Cond. max</span><span className={styles.detailStatVal}>{jour.conduite_continue_max_min} min</span></div>
                      <div className={styles.detailStat}><span className={styles.detailStatLabel}>Repos</span><span className={styles.detailStatVal}>{jour.repos_estime_h}h</span></div>
                    </div>
                    {hasInf ? (
                      <div className={styles.detailInf}>
                        {jour.infractions.map((inf, j) => (
                          <span key={j} className={styles.detailInfItem}>{inf.regle}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {tracking ? <TrackingDashboard tracking={tracking} /> : null}

      <SanctionTable />
      <div className={styles.exportBtns}>
        <button className={styles.pdfBtn} onClick={function() { window.print(); }}>
          Imprimer
        </button>
      </div>
    </div>
  );
}
