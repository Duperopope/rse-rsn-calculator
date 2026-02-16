import React, { useRef, useState, useEffect, useMemo } from 'react';
import { TYPES_ACTIVITE, LIMITES } from '../../config/constants.js';
import { dureeMin } from '../../utils/time.js';
import styles from './Timeline24h.module.css';

/**
 * Calcule les zones de depassement pour colorer les blocs en rouge
 * Retourne {zones: [{startMin, endMin, type, label, detail}], marqueurs: [...]}
 */

/**
 * Fusionne les zones de depassement qui se chevauchent
 * pour eviter les empilements visuels
 */
function fusionnerZones(zones) {
  if (zones.length <= 1) return zones;
  var sorted = zones.slice().sort(function(a, b) { return a.startMin - b.startMin; });
  var merged = [sorted[0]];
  for (var i = 1; i < sorted.length; i++) {
    var last = merged[merged.length - 1];
    if (sorted[i].startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, sorted[i].endMin);
      last.label = last.label + " + " + sorted[i].label;
      last.type = "multiple";
    } else {
      merged.push(sorted[i]);
    }
  }
  return merged;
}

function analyserInfractions(activites) {
  const zones = [];
  const marqueurs = [];
  if (!activites || activites.length === 0) return { zones, marqueurs };

  const sorted = [...activites]
    .filter(a => a.debut && a.fin)
    .sort((a, b) => dureeMin(a.debut) - dureeMin(b.debut));

  // --- Conduite continue > 4h30 ---
  let conduiteAcc = 0;
  let depassementDebut = null;

  for (const act of sorted) {
    const start = dureeMin(act.debut);
    const end = dureeMin(act.fin) <= start ? dureeMin(act.fin) + 1440 : dureeMin(act.fin);
    const duree = end - start;

    if (act.type === 'C') {
      const avant = conduiteAcc;
      conduiteAcc += duree;

      if (conduiteAcc > LIMITES.CONDUITE_CONTINUE_MAX && avant <= LIMITES.CONDUITE_CONTINUE_MAX) {
        const minuteSeuil = start + (LIMITES.CONDUITE_CONTINUE_MAX - avant);
        depassementDebut = minuteSeuil;
        marqueurs.push({
          minute: Math.min(minuteSeuil, 1440),
          type: 'conduite_continue',
          label: 'Conduite continue > 4h30',
          detail: 'Pause de 45 min obligatoire (CE 561/2006 Art.7)',
          severity: 'danger'
        });
        zones.push({
          startMin: Math.min(minuteSeuil, 1440),
          endMin: Math.min(end, 1440),
          type: 'conduite_continue',
          label: 'Dépassement conduite continue'
        });
      } else if (conduiteAcc > LIMITES.CONDUITE_CONTINUE_MAX) {
        zones.push({
          startMin: Math.min(start, 1440),
          endMin: Math.min(end, 1440),
          type: 'conduite_continue',
          label: 'Dépassement conduite continue'
        });
      }
    } else if (act.type === 'P' || act.type === 'R') {
      if (duree >= 45) { // CE 561/2006 Art.7 : seule une pause >= 45min reset la conduite
        conduiteAcc = 0;
        depassementDebut = null;
      }
    }
  }

  // --- Conduite journaliere > 9h ---
  let conduiteJour = 0;

  for (const act of sorted) {
    if (act.type === 'C') {
      const start = dureeMin(act.debut);
      const end = dureeMin(act.fin) <= start ? dureeMin(act.fin) + 1440 : dureeMin(act.fin);
      const duree = end - start;
      const avant = conduiteJour;
      conduiteJour += duree;

      if (conduiteJour > LIMITES.CONDUITE_JOURNALIERE_MAX && avant <= LIMITES.CONDUITE_JOURNALIERE_MAX) {
        const minuteSeuil = start + (LIMITES.CONDUITE_JOURNALIERE_MAX - avant);
        marqueurs.push({
          minute: Math.min(minuteSeuil, 1440),
          type: 'conduite_journaliere',
          label: 'Conduite journalière > 9h',
          detail: '4e classe : 135 € (CE 561/2006 Art.6)',
          severity: 'danger'
        });
        zones.push({
          startMin: Math.min(minuteSeuil, 1440),
          endMin: Math.min(end, 1440),
          type: 'conduite_journaliere',
          label: 'Dépassement conduite journalière'
        });
      }
    }
  }

  // --- Amplitude ---
  if (sorted.length >= 2) {
    const premiere = dureeMin(sorted[0].debut);
    const derniere = sorted.reduce((max, act) => {
      const fin = dureeMin(act.fin);
      return fin > max ? fin : max;
    }, 0);
    if ((derniere - premiere) > LIMITES.AMPLITUDE_REGULIER_DEROG) {
      const seuil = premiere + LIMITES.AMPLITUDE_REGULIER_DEROG;
      marqueurs.push({
        minute: Math.min(seuil, 1440),
        type: 'amplitude',
        label: 'Amplitude > 13h',
        detail: 'Arrêt obligatoire (CE 561/2006 Art.8)',
        severity: 'warning'
      });
      zones.push({
        startMin: Math.min(seuil, 1440),
        endMin: Math.min(derniere, 1440),
        type: 'amplitude',
        label: 'Dépassement amplitude'
      });
    }
  }


  // --- Travail de nuit (21h-6h) : limite 10h total ---
  var travailNuit = 0;
  for (var ni = 0; ni < sorted.length; ni++) {
    var nAct = sorted[ni];
    if (nAct.type === "C" || nAct.type === "T") {
      var nStart = dureeMin(nAct.debut);
      var nEnd = dureeMin(nAct.fin) <= nStart ? dureeMin(nAct.fin) + 1440 : dureeMin(nAct.fin);
      // Plage nuit : 0-360 (0h-6h) et 1260-1440 (21h-24h)
      if (nStart < 360) {
        travailNuit += Math.min(nEnd, 360) - nStart;
        if (nEnd > 360) { /* depasse 6h, partie hors nuit */ }
      }
      if (nEnd > 1260) {
        travailNuit += nEnd - Math.max(nStart, 1260);
      }
      if (nStart >= 1260 && nEnd <= 1440) {
        travailNuit += nEnd - nStart;
      }
    }
  }
  if (travailNuit > 600) {
    // Zone nuit soir (21h-24h)
    zones.push({
      startMin: 1260,
      endMin: 1440,
      type: "nuit",
      label: "Travail de nuit > 10h"
    });
    // Zone nuit matin (0h-6h)
    zones.push({
      startMin: 0,
      endMin: 360,
      type: "nuit",
      label: "Travail de nuit > 10h"
    });
    marqueurs.push({
      minute: 1260,
      type: "nuit",
      label: "Travail de nuit > 10h",
      detail: "Limite 10h de travail total entre 21h et 6h (L3312-1). Constate : " + Math.round(travailNuit / 60 * 10) / 10 + "h",
      severity: "danger"
    });
  }

  return { zones, marqueurs };
}

export function Timeline24h({ activites = [], theme = 'dark', onActiviteClick, equipage = 'solo' }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [selectedMarqueur, setSelectedMarqueur] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { zones: rawZones, marqueurs: infractions } = useMemo(() => analyserInfractions(activites), [activites]);
  const zones = useMemo(() => fusionnerZones(rawZones), [rawZones]);
  const totalMin = 1440;

  function getCouleur(type) {
    const t = TYPES_ACTIVITE.find(a => a.code === type);
    return t ? t.couleur : '#666';
  }

  function getLabel(type) {
    const t = TYPES_ACTIVITE.find(a => a.code === type);
    return t ? t.label : type;
  }

  const blocs = [];
  for (const act of activites) {
    if (!act.debut || !act.fin) continue;
    let startMin = dureeMin(act.debut);
    let endMin = dureeMin(act.fin);
    if (endMin <= startMin) endMin += 1440;

    if (startMin < 1440 && endMin > 1440) {
      blocs.push({ startMin, endMin: 1440, type: act.type, debut: act.debut, fin: '24:00' });
      blocs.push({ startMin: 0, endMin: endMin - 1440, type: act.type, debut: '00:00', fin: act.fin });
    } else {
      blocs.push({
        startMin: startMin % 1440,
        endMin: Math.min(endMin, 1440),
        type: act.type,
        debut: act.debut,
        fin: act.fin
      });
    }
  }

  const heures = [];
  for (let h = 0; h <= 24; h += 3) heures.push(h);

  function formatMinute(m) {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  return (
    <div className={styles.container} ref={containerRef}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) {
          setTooltip(null);
          setSelectedMarqueur(null);
        }
      }}
    >
      {infractions.length > 0 && (
        <div className={styles.infractionBar}>
          <span className={styles.infractionCount}>
            {'⛔'} {infractions.length} infraction{infractions.length > 1 ? 's' : ''} détectée{infractions.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

            {/* Badge Solo/Duo */}
      <div className={styles.equipageBadge + ' ' + (equipage === 'double' ? styles.equipageDuo : styles.equipageSolo)}>
        <span className={styles.equipageIcon}>{equipage === 'double' ? '\u{1F465}' : '\u{1F464}'}</span>
        <span className={styles.equipageLabel}>{equipage === 'double' ? 'Double equipage' : 'Solo'}</span>
      </div>
      <div className={styles.labels}>
        {heures.map(h => (
          <span key={h} className={styles.heure} style={{ left: (h / 24 * 100) + '%' }}>{h}h</span>
        ))}
      </div>

      <div className={styles.track}>
        {heures.map(h => (
          <div key={'g' + h} className={styles.gridLine} style={{ left: (h / 24 * 100) + '%' }} />
        ))}

                {/* Bandes nuit 21h-6h */}
        <div className={styles.nightZone} style={{ left: "0%", width: (360/1440*100) + "%" }} />
        <div className={styles.nightZone} style={{ left: (1260/1440*100) + "%", width: (180/1440*100) + "%" }} />

        {/* Blocs normaux */}
        {blocs.map((bloc, i) => {
          const left = (bloc.startMin / totalMin * 100);
          const w = ((bloc.endMin - bloc.startMin) / totalMin * 100);
          return (
            <div
              key={i}
              className={styles.bloc}
              style={{
                left: left + '%',
                width: Math.max(w, 0.3) + '%',
                background: getCouleur(bloc.type)
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedMarqueur(null);
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip(prev => prev && prev.index === i ? null : {
                  text: getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  index: i
                });
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  text: getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin,
                  index: i
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => {
                if (onActiviteClick) {
                  const actIndex = activites.findIndex(a => a.debut === bloc.debut && a.fin === bloc.fin && a.type === bloc.type);
                  if (actIndex >= 0) onActiviteClick(actIndex);
                }
              }}
            />
          );
        })}

        {/* ZONES DE DEPASSEMENT - hachures rouges par dessus les blocs */}
        {zones.map((zone, i) => {
          const left = (zone.startMin / totalMin * 100);
          const w = ((zone.endMin - zone.startMin) / totalMin * 100);
          return (
            <div
              key={'zone' + i}
              className={styles.zoneDepassement}
              data-zone-type={zone.type}
              style={{
                left: left + '%',
                width: Math.max(w, 0.5) + '%'
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setTooltip(null);
                if (navigator.vibrate) navigator.vibrate(20);
                setSelectedMarqueur('zone' + i);
              }}
            >
              <div className={styles.zoneHachures} />
            </div>
          );
        })}

        {/* Marqueurs d'infraction */}
        {infractions.map((inf, i) => {
          const leftPct = (inf.minute / totalMin * 100);
          return (
            <div
              key={'inf' + i}
              className={styles.marqueurInfraction + ' ' + (inf.severity === 'danger' ? styles.marqueurDanger : styles.marqueurWarning)}
              style={{ left: leftPct + '%' }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setTooltip(null);
                if (navigator.vibrate) navigator.vibrate(15);
                setSelectedMarqueur(prev => prev === i ? null : i);
              }}
              onClick={() => setSelectedMarqueur(prev => prev === i ? null : i)}
            >
              <div className={styles.marqueurPin} />
              <div className={styles.marqueurPulse} />
            </div>
          );
        })}
      </div>

      {/* Detail infraction ou zone */}
      {selectedMarqueur !== null && typeof selectedMarqueur === 'number' && infractions[selectedMarqueur] && (
        <div className={styles.infractionDetail}>
          <div className={styles.infractionHeader}>
            <span className={styles.infractionIcon}>{infractions[selectedMarqueur].severity === 'danger' ? '⚠' : '⏱'}</span>
            <span className={styles.infractionLabel}>{infractions[selectedMarqueur].label}</span>
            <span className={styles.infractionTime}>{'à'} {formatMinute(infractions[selectedMarqueur].minute)}</span>
          </div>
          <div className={styles.infractionBody}>{infractions[selectedMarqueur].detail}</div>
        </div>
      )}

      {selectedMarqueur !== null && typeof selectedMarqueur === 'string' && selectedMarqueur.startsWith('zone') && (
        <div className={styles.infractionDetail}>
          <div className={styles.infractionHeader}>
            <span className={styles.infractionIcon}>{'⚠'}</span>
            <span className={styles.infractionLabel}>{zones[parseInt(selectedMarqueur.replace('zone',''))]?.label || 'Zone de dépassement'}</span>
          </div>
          <div className={styles.infractionBody}>
            {(() => {
              const z = zones[parseInt(selectedMarqueur.replace('zone',''))];
              if (!z) return '';
              return formatMinute(z.startMin) + ' → ' + formatMinute(z.endMin) + ' (' + (z.endMin - z.startMin) + ' min en infraction)';
            })()}
          </div>
        </div>
      )}

      <div className={styles.legende}>
        {TYPES_ACTIVITE.filter(t => blocs.some(b => b.type === t.code)).map(t => (
          <span key={t.code} className={styles.legendeItem}>
            <span className={styles.legendeDot} style={{ background: t.couleur }} />
            {t.label}
          </span>
        ))}
        {zones.length > 0 && (
          <span className={styles.legendeItem}>
            <span className={styles.legendeDot + ' ' + styles.legendeDepassement} />
            Dépassement
          </span>
        )}
      </div>

      {tooltip && (
        <div
          className={styles.tooltipBubble}
          style={{
            position: 'fixed',
            left: Math.min(Math.max(tooltip.x, 60), window.innerWidth - 60) + 'px',
            top: (tooltip.y - 36) + 'px',
            transform: 'translateX(-50%)',
            zIndex: 9999
          }}
          onClick={() => setTooltip(null)}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

