import React, { useRef, useState, useEffect } from 'react';
import { TYPES_ACTIVITE } from '../../config/constants.js';
import { dureeMin } from '../../utils/time.js';
import styles from './Timeline24h.module.css';

/**
 * Timeline 24h interactive - visualisation des activites sur une journee
 * Affiche les blocs d'activite sur une barre horizontale de 0h a 24h
 * @param {Array} activites - [{debut:"HH:MM", fin:"HH:MM", type:"C"|"T"|"P"|"D"|"R"}]
 * @param {string} theme - 'dark' ou 'light'
 */
export function Timeline24h({ activites = [], theme = 'dark' }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
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

  const totalMin = 1440; // 24h

  function getCouleur(type) {
    const t = TYPES_ACTIVITE.find(a => a.code === type);
    return t ? t.couleur : '#666';
  }

  function getLabel(type) {
    const t = TYPES_ACTIVITE.find(a => a.code === type);
    return t ? t.label : type;
  }

  // Calculer les blocs
  const blocs = [];
  for (const act of activites) {
    if (!act.debut || !act.fin) continue;
    let startMin = dureeMin(act.debut);
    let endMin = dureeMin(act.fin);
    if (endMin <= startMin) endMin += 1440; // passage minuit

    // Si le bloc depasse 24h, on le coupe
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

  // Marqueurs d'heures
  const heures = [];
  for (let h = 0; h <= 24; h += 3) {
    heures.push(h);
  }

  return (
    <div className={styles.container} onTouchStart={(e) => { /* touch-dismiss */ if (e.target === e.currentTarget) setTooltip(null); }} ref={containerRef}>
      <div className={styles.labels}>
        {heures.map(h => (
          <span
            key={h}
            className={styles.heure}
            style={{ left: (h / 24 * 100) + '%' }}
          >
            {h}h
          </span>
        ))}
      </div>
      <div className={styles.track}>
        {/* Lignes de grille */}
        {heures.map(h => (
          <div
            key={'g' + h}
            className={styles.gridLine}
            style={{ left: (h / 24 * 100) + '%' }}
          />
        ))}
        {/* Blocs d'activite */}
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
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip(prev => prev && prev.text === (getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin) ? null : {
                  text: getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8
                });
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  text: getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              title={getLabel(bloc.type) + ' : ' + bloc.debut + ' - ' + bloc.fin}
            />
          );
        })}
      </div>
      {/* Legende */}
      <div className={styles.legende}>
        {TYPES_ACTIVITE.filter(t => blocs.some(b => b.type === t.code)).map(t => (
          <span key={t.code} className={styles.legendeItem}>
            <span className={styles.legendeDot} style={{ background: t.couleur }} />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}
