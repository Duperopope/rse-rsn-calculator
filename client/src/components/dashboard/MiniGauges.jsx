import React from 'react';
import { IconeConduite, IconePause } from '../icons/TachyIcons.jsx';
import styles from '../../pages/Calculator.module.css';

function formatHeures(minutes) {
  const safe = Number(minutes) || 0;
  return Math.floor(safe / 60) + 'h' + String(Math.round(safe % 60)).padStart(2, '0');
}

function Gauge({ label, icon, value, width, tone }) {
  return (
    <div className={styles.miniJauge}>
      <span className={styles.miniJaugeLabel}>{icon} {label}</span>
      <div className={styles.miniJaugeTrack} aria-hidden="true">
        <div
          className={styles.miniJaugeFill}
          style={{ width: Math.min(Math.max(width, 0), 100) + '%', background: tone }}
        />
      </div>
      <span className={styles.miniJaugeVal} style={{ color: tone }}>{value}</span>
    </div>
  );
}

export function MiniGauges({ stats, context }) {
  if (!stats || stats.nbActivites <= 0) return null;

  const success = 'var(--success, #10B981)';
  const warning = 'var(--warning, #F59E0B)';
  const danger = 'var(--danger, #EF4444)';

  const blocTone = stats.conduiteBloc >= 270 ? danger : stats.conduiteBloc >= 216 ? warning : success;
  const dailyMax = context.nbDerogConduite < 2 && stats.conduiteTotale > 540 ? 600 : 540;
  const dailyTone = stats.conduiteTotale >= dailyMax ? danger : stats.conduiteTotale >= 432 ? warning : success;
  const amplitudeTone = stats.amplitude >= context.amplMax
    ? danger
    : stats.amplitude >= context.amplNormal * 0.92
      ? warning
      : success;
  const pauseTone = stats.pauseTotale >= 45 ? success : stats.pauseTotale >= 22 ? warning : danger;

  return (
    <div className={styles.miniJauges} aria-label="Resume des seuils de conduite">
      <Gauge
        label="Cont."
        icon={<IconeConduite size={14} color={blocTone} />}
        value={formatHeures(stats.conduiteBloc)}
        width={(stats.conduiteBloc || 0) / 270 * 100}
        tone={blocTone}
      />
      <Gauge
        label="Jour"
        icon={<IconeConduite size={14} color={dailyTone} />}
        value={formatHeures(stats.conduiteTotale)}
        width={(stats.conduiteTotale || 0) / dailyMax * 100}
        tone={dailyTone}
      />
      <Gauge
        label="Ampl."
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" stroke={amplitudeTone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        value={formatHeures(stats.amplitude)}
        width={(stats.amplitude || 0) / context.amplMax * 100}
        tone={amplitudeTone}
      />
      <Gauge
        label="Pause"
        icon={<IconePause size={14} color={pauseTone} />}
        value={(stats.pauseTotale || 0) + 'm'}
        width={(stats.pauseTotale || 0) / 45 * 100}
        tone={pauseTone}
      />
    </div>
  );
}
