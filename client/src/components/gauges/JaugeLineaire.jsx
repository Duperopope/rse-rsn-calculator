import React, { useState } from 'react';
import styles from './JaugeLineaire.module.css';

/**
 * Jauge lineaire interactive avec seuils colores et preview sanctions
 * Tap pour afficher details + sanction previsible si depassement
 * Sources: CE 561/2006, Code des transports L3312-2, Art.131-13 CP
 */

const SANCTIONS_PREVIEW = {
  'Conduite continue': {
    ref: 'CE 561/2006 Art.7',
    seuil4: 90,
    desc4: '> 1h30 au-dela de 4h30',
    desc5: 'Au-dela du seuil 4e classe'
  },
  'Conduite journaliere': {
    ref: 'CE 561/2006 Art.6 + L3312-2',
    seuil4: 120,
    desc4: '> 2h au-dela de 9h (ou 10h derog.)',
    desc5: 'Au-dela du seuil 4e classe'
  },
  'Amplitude': {
    ref: 'Code transports R3312-9',
    seuil4: 0,
    desc4: 'Depassement amplitude max',
    desc5: 'Depassement grave'
  },
  'Pause cumulee': {
    ref: 'CE 561/2006 Art.7',
    seuil4: 0,
    desc4: 'Pause insuffisante (< 45 min)',
    desc5: 'Absence totale de pause'
  }
};

export function JaugeLineaire({
  valeur = 0,
  max = 100,
  label = '',
  texteValeur = '',
  seuilWarning = 0.8,
  compact = false
}) {
  const [expanded, setExpanded] = useState(false);
  const ratio = max > 0 ? Math.min(valeur / max, 1) : 0;
  const pourcent = Math.round(ratio * 100);
  const restant = max - valeur;

  let status = 'ok';
  let statusLabel = 'Conforme';
  if (valeur > max) {
    status = 'danger';
    statusLabel = 'Limite dépassée';
  } else if (ratio >= 1) {
    status = 'warning';
    statusLabel = 'Limite atteinte';
  } else if (ratio >= seuilWarning) {
    status = 'warning';
    statusLabel = 'Attention';
  }

  // Pour pause: inverse (valeur doit etre >= max)
  const isPause = label.toLowerCase().includes('pause');
  if (isPause && max <= 1) {
    // Seuil de conduite non atteint : pas encore d obligation de pause
    status = 'ok';
    statusLabel = 'Conforme';
  } else if (isPause) {
    if (valeur >= max) {
      status = 'ok';
      statusLabel = 'Conforme';
    } else if (valeur >= max * 0.5) {
      status = 'warning';
      statusLabel = 'Pause insuffisante';
    } else {
      status = 'danger';
      statusLabel = 'Pause manquante';
    }
  }

  function handleTap() {
    if (navigator.vibrate) navigator.vibrate(5);
    setExpanded(function(prev) { return !prev; });
  }

  var restantMin = Math.max(0, Math.round(Math.abs(restant)));
  var restantH = Math.floor(restantMin / 60);
  var restantM = restantMin % 60;
  var restantTxt = restantH > 0
    ? restantH + 'h' + (restantM > 0 ? ' ' + restantM + 'min' : '')
    : restantM + 'min';

  // Trouver la sanction correspondante
  var sanction = null;
  var sanctionKeys = Object.keys(SANCTIONS_PREVIEW);
  for (var k = 0; k < sanctionKeys.length; k++) {
    if (label.includes(sanctionKeys[k])) {
      sanction = SANCTIONS_PREVIEW[sanctionKeys[k]];
      break;
    }
  }

  var depassementMin = Math.round(valeur - max);
  var showSanction = status === 'danger' && sanction && !isPause;
  var showPauseSanction = isPause && status === 'danger' && sanction;

  return (
    <div
      className={[styles.container, compact ? styles.compact : '', expanded ? styles.expanded : ''].join(' ')}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label={label + ' : ' + texteValeur}
    >
      {label || texteValeur ? (
        <div className={styles.header}>
          <span className={styles.label}>{label}</span>
          <span className={styles.texteValeur} data-status={status}>{texteValeur}</span>
        </div>
      ) : null}
      <div className={styles.track}>
        <div
          className={styles.fill}
          data-status={status}
          style={{ width: pourcent + '%' }}
        />
      </div>
      {expanded ? (
        <div className={styles.details} data-status={status}>
          <div className={styles.detailRow}>
            <span className={styles.detailIcon}>{status === 'danger' ? '⚠' : status === 'warning' ? '⏱' : '✅'}</span>
            <span>{statusLabel}</span>
            <span className={styles.detailSep}>|</span>
            <span>{pourcent}%</span>
            <span className={styles.detailSep}>|</span>
            <span>{ratio < 1 || isPause ? 'Reste ' + restantTxt : 'Depasse de ' + depassementMin + ' min'}</span>
          </div>
          {(showSanction || showPauseSanction) ? (
            <div className={styles.sanctionPreview}>
              <span className={styles.sanctionRef}>{sanction.ref}</span>
              <span className={styles.sanctionSep}>•</span>
              <span className={styles.sanctionClass}>4e classe : 135€ forfait (90€ min. / 375€ maj.)</span>
            </div>
          ) : null}
          {sanction && status !== 'danger' ? (
            <div className={styles.refLine}>
              <span className={styles.refText}>{sanction.ref}</span>
            </div>
          ) : null}
          {status !== 'ok' ? (
            <div className={styles.conseil}>
              <span className={styles.conseilIcon}>💡</span>
              <span>{
                label.includes('Conduite continue') && status === 'danger'
                  ? 'Pause obligatoire de 45 min (ou 15+30 min) requise maintenant'
                  : label.includes('Conduite continue') && status === 'warning'
                  ? (restant <= 0 ? 'Pause obligatoire de 45 min requise maintenant' : 'Prevoir une pause dans les ' + restantTxt + ' prochaines')
                  : label.includes('journaliere') && status === 'danger'
                  ? 'Arret de conduite obligatoire. Max 10h avec derogation (2x/sem.)'
                  : label.includes('journaliere') && status === 'warning'
                  ? 'Encore ' + restantTxt + ' de conduite possible aujourd\u0027hui'
                  : label.includes('Amplitude') && status === 'danger'
                  ? 'Fin de service obligatoire. Repos journalier min. 11h (ou 9h reduit)'
                  : label.includes('Amplitude') && status === 'warning'
                  ? 'Fin de service dans ' + restantTxt + ' max'
                  : label.includes('Pause') && status === 'danger'
                  ? 'Prendre une pause immediatement (min. 45 min cumulees)'
                  : label.includes('Pause') && status === 'warning'
                  ? 'Pause supplementaire de ' + restantTxt + ' necessaire'
                  : ''
              }</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
