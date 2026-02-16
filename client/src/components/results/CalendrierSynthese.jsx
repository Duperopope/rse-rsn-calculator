import React, { useState } from 'react';
import styles from './CalendrierSynthese.module.css';

/**
 * CalendrierSynthese — Vue calendrier compacte multi-jours
 * Barres horizontales empilees : conduite (cyan), travail (orange), pause (vert), repos (gris)
 * Tap sur un jour = expand detail inline
 * Source: CE 561/2006 Art.6-8, C. transports R3312-9/R3312-11
 */
export function CalendrierSynthese({ details }) {
  const [open, setOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);

  if (!details || details.length === 0) return null;

  /* Formater la date en "Lun 03/02" */
  function fmtDate(dateStr) {
    if (!dateStr) return '?';
    var d = new Date(dateStr + 'T00:00:00');
    var jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return jours[d.getDay()] + ' ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }

  /* Trouver le max d'amplitude pour normaliser les barres */
  var maxAmpl = 0;
  for (var i = 0; i < details.length; i++) {
    var a = parseFloat(details[i].amplitude_estimee_h);
    if (!isNaN(a) && a > maxAmpl) maxAmpl = a;
  }
  if (maxAmpl < 1) maxAmpl = 14;

  /* Calculer les totaux pour le mini-resume */
  var totalConduite = 0;
  var totalTravail = 0;
  var totalPause = 0;
  var totalInfractions = 0;
  for (var i = 0; i < details.length; i++) {
    totalConduite += parseFloat(details[i].conduite_h) || 0;
    totalTravail += parseFloat(details[i].travail_h) || 0;
    totalPause += parseFloat(details[i].pause_h) || 0;
    if (details[i].infractions) totalInfractions += details[i].infractions.length;
  }

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={function () { setOpen(!open); }}>
        <span className={styles.toggleIcon}>{open ? '\u25B2' : '\u25BC'}</span>
        <span className={styles.toggleLabel}>Synth\u00e8se {details.length} jour{details.length > 1 ? 's' : ''}</span>
        <span className={styles.toggleStats}>
          <span className={styles.statCyan}>{totalConduite.toFixed(1)}h</span>
          <span className={styles.statOrange}>{totalTravail.toFixed(1)}h</span>
          {totalInfractions > 0 ? <span className={styles.statRed}>{totalInfractions} inf.</span> : null}
        </span>
      </button>

      {open ? (
        <div className={styles.calendar}>
          {/* Legende */}
          <div className={styles.legend}>
            <span className={styles.legendItem}><span className={styles.dotCyan}></span>Conduite</span>
            <span className={styles.legendItem}><span className={styles.dotOrange}></span>Travail</span>
            <span className={styles.legendItem}><span className={styles.dotGreen}></span>Pause</span>
            <span className={styles.legendItem}><span className={styles.dotGray}></span>Repos</span>
          </div>

          {/* Grille des jours */}
          <div className={styles.grid}>
            {details.map(function (jour, idx) {
              var cH = parseFloat(jour.conduite_h) || 0;
              var tH = parseFloat(jour.travail_h) || 0;
              var pH = parseFloat(jour.pause_h) || 0;
              var rH = parseFloat(jour.repos_estime_h) || 0;
              var total = cH + tH + pH + rH;
              if (total < 1) total = 24;
              var pctC = (cH / total * 100).toFixed(1);
              var pctT = (tH / total * 100).toFixed(1);
              var pctP = (pH / total * 100).toFixed(1);
              var pctR = (rH / total * 100).toFixed(1);
              var hasInf = jour.infractions && jour.infractions.length > 0;
              var isSelected = selectedIdx === idx;

              return (
                <div key={idx}>
                  <button
                    className={styles.dayRow + (hasInf ? ' ' + styles.dayRowWarn : '') + (isSelected ? ' ' + styles.dayRowActive : '')}
                    onClick={function () { setSelectedIdx(isSelected ? null : idx); }}
                  >
                    <span className={styles.dayLabel}>{fmtDate(jour.date)}</span>
                    <div className={styles.barContainer}>
                      <div className={styles.barSegCyan} style={{ width: pctC + '%' }}></div>
                      <div className={styles.barSegOrange} style={{ width: pctT + '%' }}></div>
                      <div className={styles.barSegGreen} style={{ width: pctP + '%' }}></div>
                      <div className={styles.barSegGray} style={{ width: pctR + '%' }}></div>
                    </div>
                    {hasInf ? (
                      <span className={styles.infBadge}>{jour.infractions.length}</span>
                    ) : (
                      <span className={styles.okBadge}>{'\u2713'}</span>
                    )}
                  </button>

                  {/* Detail inline au tap */}
                  {isSelected ? (
                    <div className={styles.dayDetail}>
                      <div className={styles.dayDetailGrid}>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Conduite</span>
                          <span className={styles.dayDetailVal + ' ' + styles.valCyan}>{cH.toFixed(1)}h</span>
                        </div>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Travail</span>
                          <span className={styles.dayDetailVal + ' ' + styles.valOrange}>{tH.toFixed(1)}h</span>
                        </div>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Pause</span>
                          <span className={styles.dayDetailVal + ' ' + styles.valGreen}>{pH.toFixed(1)}h</span>
                        </div>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Repos</span>
                          <span className={styles.dayDetailVal}>{rH.toFixed(1)}h</span>
                        </div>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Amplitude</span>
                          <span className={styles.dayDetailVal}>{jour.amplitude_estimee_h !== 'N/A' ? jour.amplitude_estimee_h + 'h' : '-'}</span>
                        </div>
                        <div className={styles.dayDetailItem}>
                          <span className={styles.dayDetailLabel}>Cond. max</span>
                          <span className={styles.dayDetailVal}>{jour.conduite_continue_max_min} min</span>
                        </div>
                      </div>
                      {hasInf ? (
                        <div className={styles.dayDetailInf}>
                          {jour.infractions.map(function (inf, j) {
                            return <span key={j} className={styles.dayDetailInfItem}>{inf.regle}</span>;
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
