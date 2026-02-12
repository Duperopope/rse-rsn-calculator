import React, { useState, useEffect, useRef } from 'react';

/* ============================================================
   RSE/RSN Calculator v5.6.0 - Frontend complet
   Auteur : Samir Medjaher
   Sources reglementaires :
     - CE 561/2006 Art.6-8 (conduite, pause, repos)
     - Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2
     - CE 3821/85 Annexe IB, UE 165/2014 (pictogrammes)
   ============================================================ */

/* === ICONES SVG TACHYGRAPHE === */
function IconeConduite({ taille = 22, couleur = '#3b82f6' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke={couleur} strokeWidth="2.2" fill="none"/>
      <circle cx="12" cy="12" r="3" stroke={couleur} strokeWidth="1.8" fill="none"/>
      <line x1="12" y1="3" x2="12" y2="9" stroke={couleur} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="3" y1="14" x2="9" y2="12.5" stroke={couleur} strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="21" y1="14" x2="15" y2="12.5" stroke={couleur} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconeAutreTache({ taille = 22, couleur = '#f59e0b' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Marteau gauche : manche diagonal + tete rectangulaire */}
      <line x1="5" y1="19" x2="14" y2="6" stroke={couleur} strokeWidth="2" strokeLinecap="round"/>
      <rect x="12" y="2.5" width="7" height="4" rx="1" transform="rotate(25 15 4.5)" fill={couleur} opacity="0.85"/>
      {/* Marteau droit : manche diagonal + tete rectangulaire */}
      <line x1="19" y1="19" x2="10" y2="6" stroke={couleur} strokeWidth="2" strokeLinecap="round"/>
      <rect x="5" y="2.5" width="7" height="4" rx="1" transform="rotate(-25 9 4.5)" fill={couleur} opacity="0.85"/>
    </svg>
  );
}
function IconeDisponibilite({ taille = 22, couleur = '#8b5cf6' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={couleur} strokeWidth="2.2" fill="none"/>
      <line x1="3" y1="21" x2="21" y2="3" stroke={couleur} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}
function IconeRepos({ taille = 22, couleur = '#10b981' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="14" width="20" height="3" rx="1.5" stroke={couleur} strokeWidth="2" fill="none"/>
      <path d="M4 14 L4 8 Q4 6 6 6 L8 6 Q10 6 10 8 L10 14" stroke={couleur} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="2" y1="20" x2="2" y2="17" stroke={couleur} strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="20" x2="22" y2="17" stroke={couleur} strokeWidth="2" strokeLinecap="round"/>
      <line x1="10" y1="14" x2="10" y2="10" stroke={couleur} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* === CONSTANTES === */
const API = '/api';
const EURO = '€';
const VERSION = '5.6.0';

const TYPES_ACTIVITE = {
  C: { code: 'C', label: 'Conduite', couleur: '#3b82f6', bgLight: 'rgba(59,130,246,0.1)', Icone: IconeConduite },
  T: { code: 'T', label: 'Autre tâche', couleur: '#f59e0b', bgLight: 'rgba(245,158,11,0.1)', Icone: IconeAutreTache },
  D: { code: 'D', label: 'Disponibilité', couleur: '#8b5cf6', bgLight: 'rgba(139,92,246,0.1)', Icone: IconeDisponibilite },
  P: { code: 'P', label: 'Pause / Repos', couleur: '#10b981', bgLight: 'rgba(16,185,129,0.1)', Icone: IconeRepos }
};

const TYPES_SERVICE = [
  { code: 'STANDARD', label: 'Standard', amplitude: 14 },
  { code: 'REGULIER', label: 'Ligne régulière (>50km)', amplitude: 13 },
  { code: 'OCCASIONNEL', label: 'Occasionnel', amplitude: 14 },
  { code: 'SLO', label: 'SLO (Service libre occasionnel)', amplitude: 14 }
];

const PAYS_LISTE = [
  { code: 'FR', nom: 'France', drapeau: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: 'DE', nom: 'Allemagne', drapeau: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: 'ES', nom: 'Espagne', drapeau: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: 'IT', nom: 'Italie', drapeau: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: 'BE', nom: 'Belgique', drapeau: '\uD83C\uDDE7\uD83C\uDDEA' },
  { code: 'NL', nom: 'Pays-Bas', drapeau: '\uD83C\uDDF3\uD83C\uDDF1' },
  { code: 'PT', nom: 'Portugal', drapeau: '\uD83C\uDDF5\uD83C\uDDF9' },
  { code: 'GB', nom: 'Royaume-Uni', drapeau: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: 'CH', nom: 'Suisse', drapeau: '\uD83C\uDDE8\uD83C\uDDED' },
  { code: 'AT', nom: 'Autriche', drapeau: '\uD83C\uDDE6\uD83C\uDDF9' },
  { code: 'PL', nom: 'Pologne', drapeau: '\uD83C\uDDF5\uD83C\uDDF1' },
  { code: 'RO', nom: 'Roumanie', drapeau: '\uD83C\uDDF7\uD83C\uDDF4' },
  { code: 'GR', nom: 'Grèce', drapeau: '\uD83C\uDDEC\uD83C\uDDF7' },
  { code: 'CZ', nom: 'Tchéquie', drapeau: '\uD83C\uDDE8\uD83C\uDDFF' },
  { code: 'HU', nom: 'Hongrie', drapeau: '\uD83C\uDDED\uD83C\uDDFA' },
  { code: 'SE', nom: 'Suède', drapeau: '\uD83C\uDDF8\uD83C\uDDEA' },
  { code: 'DK', nom: 'Danemark', drapeau: '\uD83C\uDDE9\uD83C\uDDF0' },
  { code: 'FI', nom: 'Finlande', drapeau: '\uD83C\uDDEB\uD83C\uDDEE' },
  { code: 'IE', nom: 'Irlande', drapeau: '\uD83C\uDDEE\uD83C\uDDEA' },
  { code: 'LU', nom: 'Luxembourg', drapeau: '\uD83C\uDDF1\uD83C\uDDFA' },
  { code: 'NO', nom: 'Norvège', drapeau: '\uD83C\uDDF3\uD83C\uDDF4' },
  { code: 'MA', nom: 'Maroc', drapeau: '\uD83C\uDDF2\uD83C\uDDE6' },
  { code: 'TN', nom: 'Tunisie', drapeau: '\uD83C\uDDF9\uD83C\uDDF3' },
  { code: 'DZ', nom: 'Algérie', drapeau: '\uD83C\uDDE9\uD83C\uDDFF' },
  { code: 'TR', nom: 'Turquie', drapeau: '\uD83C\uDDF9\uD83C\uDDF7' }
];

const TEMPLATES = {
  conduite: { label: 'Journée conduite', activites: [
    { heure_debut: '06:00', heure_fin: '06:30', type: 'T' },
    { heure_debut: '06:30', heure_fin: '10:30', type: 'C' },
    { heure_debut: '10:30', heure_fin: '11:15', type: 'P' },
    { heure_debut: '11:15', heure_fin: '15:00', type: 'C' },
    { heure_debut: '15:00', heure_fin: '15:30', type: 'T' }
  ]},
  mixte: { label: 'Journée mixte', activites: [
    { heure_debut: '07:00', heure_fin: '07:30', type: 'T' },
    { heure_debut: '07:30', heure_fin: '10:00', type: 'C' },
    { heure_debut: '10:00', heure_fin: '10:30', type: 'P' },
    { heure_debut: '10:30', heure_fin: '12:00', type: 'T' },
    { heure_debut: '12:00', heure_fin: '13:00', type: 'P' },
    { heure_debut: '13:00', heure_fin: '16:00', type: 'C' },
    { heure_debut: '16:00', heure_fin: '17:00', type: 'D' }
  ]},
  nuit: { label: 'Service de nuit', activites: [
    { heure_debut: '20:00', heure_fin: '20:30', type: 'T' },
    { heure_debut: '20:30', heure_fin: '00:30', type: 'C' },
    { heure_debut: '00:30', heure_fin: '01:15', type: 'P' },
    { heure_debut: '01:15', heure_fin: '04:00', type: 'C' },
    { heure_debut: '04:00', heure_fin: '04:30', type: 'T' }
  ]},
  rapide: { label: 'Saisie rapide (conduit seul)', activites: [
    { heure_debut: '06:00', heure_fin: '10:30', type: 'C' },
    { heure_debut: '10:30', heure_fin: '11:15', type: 'P' },
    { heure_debut: '11:15', heure_fin: '15:00', type: 'C' }
  ]}
};

/* === LIMITES REGLEMENTAIRES (pour jauges temps reel) === */
const LIMITES = {
  CONDUITE_CONTINUE: 270,
  CONDUITE_JOURNALIERE: 540,
  CONDUITE_DEROG: 600,
  AMPLITUDE_REGULIER: 780,
  AMPLITUDE_OCCASIONNEL: 840,
  TRAVAIL_JOURNALIER: 600,
  REPOS_JOURNALIER_NORMAL: 660,
  REPOS_JOURNALIER_REDUIT: 540
};

/* === UTILITAIRES === */
function dureeMin(hd, hf) {
  const [h1, m1] = hd.split(':').map(Number);
  const [h2, m2] = hf.split(':').map(Number);
  let d = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (d < 0) d += 1440;
  return d;
}
function fmtMin(m) {
  if (m < 0) m = 0;
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return h + 'h' + (mn > 0 ? (mn < 10 ? '0' : '') + mn : '');
}
function fmtH(m) { return (m / 60).toFixed(1); }
function incH(h, m) {
  const [hh, mm] = h.split(':').map(Number);
  const t = hh * 60 + mm + m;
  return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
}

/* === CALCUL TEMPS REEL COTE CLIENT (pour jauges) === */
function calculerStatsJour(activites) {
  let conduite = 0, tache = 0, pause = 0, dispo = 0;
  let conduiteMax = 0, condCourante = 0;
  let premierDebut = null, derniereFin = null;

  activites.forEach(a => {
    const d = dureeMin(a.heure_debut, a.heure_fin);
    const [h1, m1] = a.heure_debut.split(':').map(Number);
    const [h2, m2] = a.heure_fin.split(':').map(Number);
    const debut = h1 * 60 + m1;
    let fin = h2 * 60 + m2;
    if (fin <= debut) fin += 1440;

    if (premierDebut === null || debut < premierDebut) premierDebut = debut;
    if (derniereFin === null || fin > derniereFin) derniereFin = fin;

    if (a.type === 'C') {
      conduite += d;
      condCourante += d;
      if (condCourante > conduiteMax) conduiteMax = condCourante;
    } else {
      if (a.type === 'P' && d >= 15) condCourante = 0;
      if (a.type === 'T') tache += d;
      else if (a.type === 'D') dispo += d;
      else if (a.type === 'P') pause += d;
    }
  });

  const amplitude = (premierDebut !== null && derniereFin !== null) ? derniereFin - premierDebut : 0;
  const travailTotal = conduite + tache;

  return {
    conduite, tache, pause, dispo,
    conduiteMax,
    condCourante,
    amplitude,
    travailTotal,
    premierDebut,
    derniereFin
  };
}

/* === COMPOSANT JAUGE CIRCULAIRE === */
function JaugeCirculaire({ valeur, max, label, unite, couleur, seuils }) {
  const pct = Math.min(valeur / max, 1.2);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 1) * circ);

  let couleurBarre = couleur;
  let statut = 'ok';
  if (seuils) {
    if (valeur >= max) { couleurBarre = '#ef4444'; statut = 'danger'; }
    else if (seuils.warning && valeur >= seuils.warning) { couleurBarre = '#f59e0b'; statut = 'warning'; }
  }

  const anim = statut === 'danger' ? 'pulse 1.5s ease-in-out infinite' : 'none';

  return (
    <div style={{ textAlign: 'center', padding: 8 }}>
      <svg width="90" height="90" viewBox="0 0 90 90" style={{ animation: anim }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="#1e293b" strokeWidth="7" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={couleurBarre} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 45 45)"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }} />
        <text x="45" y="42" textAnchor="middle" fill={couleurBarre} fontSize="14" fontWeight="800">
          {fmtMin(valeur)}
        </text>
        <text x="45" y="56" textAnchor="middle" fill="#64748b" fontSize="9">
          / {fmtMin(max)}
        </text>
      </svg>
      <div style={{ fontSize: 11, color: statut === 'danger' ? '#ef4444' : statut === 'warning' ? '#f59e0b' : '#94a3b8', fontWeight: 600, marginTop: 2 }}>
        {label}
      </div>
      {statut === 'danger' && (
        <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, marginTop: 2 }}>
          Dépassement !
        </div>
      )}
    </div>
  );
}

/* === COMPOSANT BARRE DE JAUGE LINEAIRE === */
function JaugeLineaire({ valeur, max, label, couleur, seuils }) {
  const pct = Math.min((valeur / max) * 100, 110);
  let bg = couleur;
  if (valeur >= max) bg = '#ef4444';
  else if (seuils && seuils.warning && valeur >= seuils.warning) bg = '#f59e0b';

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: valeur >= max ? '#ef4444' : '#e2e8f0', fontWeight: 700 }}>{fmtMin(valeur)} / {fmtMin(max)}</span>
      </div>
      <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: Math.min(pct, 100) + '%', height: '100%', background: bg, borderRadius: 4,
          transition: 'width 0.5s ease, background 0.3s ease'
        }} />
        {seuils && seuils.warning && (
          <div style={{
            position: 'absolute', top: 0, left: (seuils.warning / max * 100) + '%',
            width: 2, height: '100%', background: '#f59e0b', opacity: 0.6
          }} />
        )}
      </div>
    </div>
  );
}

/* === TIMELINE INTERACTIVE 24H === */
function Timeline24h({ activites }) {
  const [tooltip, setTooltip] = useState(null);
  const ref = useRef(null);

  if (!activites || activites.length === 0) return null;

  const heures = [];
  for (let h = 0; h <= 24; h += 3) heures.push(h);

  return (
    <div style={{ position: 'relative', marginTop: 8, marginBottom: 12 }}>
      {/* Echelle horaire */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, padding: '0 1px' }}>
        {heures.map(h => (
          <span key={h} style={{ fontSize: 9, color: '#475569', minWidth: 20, textAlign: 'center' }}>
            {String(h).padStart(2, '0')}h
          </span>
        ))}
      </div>

      {/* Barre 24h */}
      <div ref={ref} style={{
        position: 'relative', height: 28, background: '#0f172a', borderRadius: 6, overflow: 'hidden',
        border: '1px solid #1e293b'
      }}>
        {/* Zone nuit 21h-6h */}
        <div style={{ position: 'absolute', left: '87.5%', width: '12.5%', height: '100%', background: 'rgba(30,41,59,0.8)', borderRight: '1px dashed #334155' }} />
        <div style={{ position: 'absolute', left: '0%', width: '25%', height: '100%', background: 'rgba(30,41,59,0.8)', borderRight: '1px dashed #334155' }} />

        {/* Activites */}
        {activites.map((a, i) => {
          const [h1, m1] = a.heure_debut.split(':').map(Number);
          const [h2, m2] = a.heure_fin.split(':').map(Number);
          let debut = h1 * 60 + m1;
          let fin = h2 * 60 + m2;
          if (fin <= debut) fin += 1440;
          const left = (debut / 1440) * 100;
          const width = ((fin - debut) / 1440) * 100;
          const ta = TYPES_ACTIVITE[a.type];
          const dur = fin - debut;

          return (
            <div key={i}
              style={{
                position: 'absolute', left: left + '%', width: Math.max(width, 0.3) + '%',
                height: '100%', background: ta ? ta.couleur : '#666',
                opacity: 0.85, cursor: 'pointer',
                transition: 'opacity 0.2s',
                borderRight: '1px solid rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => {
                const rect = ref.current.getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  label: (ta ? ta.label : a.type),
                  hd: a.heure_debut, hf: a.heure_fin,
                  duree: fmtMin(dur)
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Marqueurs seuils */}
        <div style={{ position: 'absolute', top: 0, left: '25%', width: 1, height: '100%', background: '#475569', opacity: 0.3 }} title="06:00" />
        <div style={{ position: 'absolute', top: 0, left: '87.5%', width: 1, height: '100%', background: '#475569', opacity: 0.3 }} title="21:00" />
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: -42, left: Math.min(tooltip.x, 250),
          background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
          padding: '4px 10px', fontSize: 11, color: '#e2e8f0', whiteSpace: 'nowrap',
          zIndex: 10, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          <strong>{tooltip.label}</strong> {tooltip.hd} - {tooltip.hf} ({tooltip.duree})
        </div>
      )}

      {/* Label zone nuit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 9, color: '#475569' }}>Zone nuit (21h-6h)</span>
        <span style={{ fontSize: 9, color: '#475569' }}>CE 561/2006</span>
      </div>
    </div>
  );
}

/* === PANNEAU JAUGES TEMPS REEL === */
function PanneauJauges({ stats, typeService }) {
  const ampMax = typeService === 'REGULIER' ? LIMITES.AMPLITUDE_REGULIER : LIMITES.AMPLITUDE_OCCASIONNEL;
  const ampLabel = typeService === 'REGULIER' ? '13h' : '14h';

  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 12, border: '1px solid #334155' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textAlign: 'center' }}>
        Suivi temps réel — CE 561/2006
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <JaugeCirculaire valeur={stats.condCourante} max={LIMITES.CONDUITE_CONTINUE} label="Continue" couleur="#3b82f6" seuils={{ warning: 240 }} />
        <JaugeCirculaire valeur={stats.conduite} max={LIMITES.CONDUITE_JOURNALIERE} label="Journalière" couleur="#06b6d4" seuils={{ warning: 480 }} />
        <JaugeCirculaire valeur={stats.amplitude} max={ampMax} label={'Amplitude ' + ampLabel} couleur="#a855f7" seuils={{ warning: ampMax - 60 }} />
        <JaugeCirculaire valeur={stats.travailTotal} max={LIMITES.TRAVAIL_JOURNALIER} label="Travail total" couleur="#f59e0b" seuils={{ warning: 540 }} />
      </div>
      <JaugeLineaire valeur={stats.conduite} max={LIMITES.CONDUITE_DEROG} label="Conduite (dérogatoire 10h)" couleur="#3b82f6" seuils={{ warning: LIMITES.CONDUITE_JOURNALIERE }} />
      <JaugeLineaire valeur={stats.pause} max={45} label="Pause cumulée (min 45min)" couleur="#10b981" seuils={{ warning: 30 }} />
    </div>
  );
}


/* === STYLES DYNAMIQUES === */
function getStyles(theme) {
  const dk = theme === 'dark';
  const bg0 = dk ? '#0f172a' : '#f1f5f9';
  const bg1 = dk ? '#1e293b' : '#ffffff';
  const bg2 = dk ? '#334155' : '#e2e8f0';
  const txt = dk ? '#e2e8f0' : '#1e293b';
  const txtSub = dk ? '#94a3b8' : '#64748b';
  const border = dk ? '#334155' : '#cbd5e1';
  const accent = '#3b82f6';

  return {
    container: { maxWidth: 940, margin: '0 auto', padding: 16, minHeight: '100vh', background: bg0, color: txt, transition: 'background 0.3s, color 0.3s' },
    header: { textAlign: 'center', padding: '20px 0', borderBottom: '2px solid ' + border, marginBottom: 20 },
    hTitle: { fontSize: 26, fontWeight: 800, color: accent, margin: 0, letterSpacing: -0.5 },
    hSub: { fontSize: 13, color: txtSub, marginTop: 4 },
    card: { background: bg1, borderRadius: 12, padding: 18, marginBottom: 14, border: '1px solid ' + border, transition: 'background 0.3s' },
    cTitle: { fontSize: 16, fontWeight: 700, color: txt, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
    row: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
    field: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 4 },
    lbl: { fontSize: 12, color: txtSub, fontWeight: 600 },
    bP: { background: accent, color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 15, fontWeight: 700, width: '100%', minHeight: 48, border: 'none', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' },
    bS: { background: bg2, color: txt, borderRadius: 8, padding: '8px 14px', fontSize: 13, minHeight: 38, border: 'none', cursor: 'pointer', transition: 'background 0.2s' },
    bD: { background: '#ef4444', color: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, minHeight: 34, border: 'none', cursor: 'pointer' },
    bG: { background: '#10b981', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, minHeight: 38, border: 'none', cursor: 'pointer', width: '100%' },
    actRow: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '7px 0', borderBottom: '1px solid ' + border },
    scoreBox: { textAlign: 'center', padding: 24, borderRadius: 12, marginBottom: 14 },
    inf: { background: dk ? '#7f1d1d' : '#fef2f2', border: '1px solid ' + (dk ? '#dc2626' : '#fca5a5'), borderRadius: 8, padding: 14, marginBottom: 10 },
    warn: { background: dk ? '#78350f' : '#fffbeb', border: '1px solid ' + (dk ? '#f59e0b' : '#fcd34d'), borderRadius: 8, padding: 14, marginBottom: 10 },
    ok: { background: dk ? '#064e3b' : '#ecfdf5', border: '1px solid ' + (dk ? '#10b981' : '#6ee7b7'), borderRadius: 8, padding: 14, marginBottom: 10 },
    sGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 },
    sCard: { background: bg0, borderRadius: 8, padding: 10, textAlign: 'center', transition: 'background 0.3s' },
    foot: { textAlign: 'center', padding: '20px 0', marginTop: 20, borderTop: '1px solid ' + border, color: txtSub, fontSize: 11 },
    amendeBox: { background: dk ? '#7f1d1d' : '#fef2f2', border: '2px solid #dc2626', borderRadius: 12, padding: 18, textAlign: 'center', marginBottom: 14 },
    togBtn: { background: 'transparent', color: txtSub, padding: '4px 8px', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', border: 'none', minHeight: 'auto' },
    tabBar: { display: 'flex', gap: 0, marginBottom: 14, borderRadius: 8, overflow: 'hidden' },
    tab: { flex: 1, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: bg2, color: txtSub, border: 'none', minHeight: 42, transition: 'background 0.2s' },
    tabA: { flex: 1, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: accent, color: '#fff', border: 'none', minHeight: 42 },
    legend: { display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', padding: '10px 0', marginBottom: 10 },
    legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: txtSub },
    themeBtn: { background: 'none', border: '1px solid ' + border, borderRadius: 20, padding: '4px 12px', fontSize: 12, color: txtSub, cursor: 'pointer', minHeight: 30 },
    histItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: bg0, marginBottom: 6, cursor: 'pointer', border: '1px solid ' + border, transition: 'background 0.2s' },
    badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
    recoCard: { background: dk ? '#0c4a6e' : '#eff6ff', border: '1px solid ' + (dk ? '#0ea5e9' : '#93c5fd'), borderRadius: 8, padding: 12, marginBottom: 8 },
    printHide: {}
  };
}

/* === GESTION HISTORIQUE LOCALSTORAGE === */
const HIST_KEY = 'rse_rsn_historique';
function chargerHistorique() {
  try { const d = localStorage.getItem(HIST_KEY); return d ? JSON.parse(d) : []; }
  catch { return []; }
}
function sauverHistorique(hist) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(hist.slice(0, 20))); }
  catch { }
}
function ajouterAHistorique(resultat, params) {
  const hist = chargerHistorique();
  hist.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    score: resultat.score,
    infractions: resultat.infractions ? resultat.infractions.length : 0,
    amende: resultat.amende_estimee,
    jours: resultat.nombre_jours,
    typeService: params.typeService,
    pays: params.pays,
    resume: resultat.resume,
    resultat: resultat,
    params: params
  });
  sauverHistorique(hist);
}

/* === GENERATION RECOMMANDATIONS === */
function genererRecommandations(data) {
  const recos = [];
  if (!data || !data.infractions) return recos;

  data.infractions.forEach(inf => {
    if (inf.regle && inf.regle.toLowerCase().includes('ontinue')) {
      recos.push({
        type: 'danger',
        titre: 'Pause manquante',
        texte: 'Vous avez dépassé 4h30 de conduite continue. Prenez une pause de 45 minutes (ou 15min + 30min) avant d\'atteindre ce seuil. Art.7 CE 561/2006.',
        icone: 'P'
      });
    }
    if (inf.regle && inf.regle.toLowerCase().includes('ournali')) {
      const isDerog = inf.constate && parseFloat(inf.constate) > 10;
      recos.push({
        type: isDerog ? 'danger' : 'warning',
        titre: 'Conduite journalière excessive',
        texte: isDerog
          ? 'Vous avez dépassé la limite dérogatoire de 10h. Même avec dérogation (2x/semaine), vous ne pouvez pas excéder 10h. Art.6 CE 561/2006.'
          : 'Vous avez dépassé 9h de conduite. Pensez à utiliser une de vos 2 dérogations hebdomadaires (10h max). Art.6 CE 561/2006.',
        icone: 'C'
      });
    }
    if (inf.regle && inf.regle.toLowerCase().includes('mplitude')) {
      recos.push({
        type: 'warning',
        titre: 'Amplitude trop longue',
        texte: 'Réduisez votre plage horaire. Commencez plus tard ou terminez plus tôt. R3312-9/R3312-11 Code des transports.',
        icone: 'T'
      });
    }
    if (inf.regle && inf.regle.toLowerCase().includes('epos')) {
      recos.push({
        type: 'danger',
        titre: 'Repos insuffisant',
        texte: 'Vous devez prendre au minimum 9h de repos (réduit, 3x/semaine) ou 11h (normal). Art.8 CE 561/2006.',
        icone: 'P'
      });
    }
    if (inf.regle && inf.regle.toLowerCase().includes('uit')) {
      recos.push({
        type: 'warning',
        titre: 'Travail de nuit excessif',
        texte: 'Le travail de nuit (21h-6h) ne peut excéder 10h. Prévoyez un deuxième conducteur. L3312-1 Code des transports.',
        icone: 'C'
      });
    }
    if (inf.regle && inf.regle.toLowerCase().includes('ravail')) {
      recos.push({
        type: 'warning',
        titre: 'Durée de travail excessive',
        texte: 'La durée maximale quotidienne de travail est de 10h (12h 2x/semaine). Code du travail + D.3312-6 Code des transports.',
        icone: 'T'
      });
    }
  });

  if (data.score === 100) {
    recos.push({
      type: 'ok',
      titre: 'Conformé !',
      texte: 'Aucune infraction détectée. Vos temps de conduite et de repos sont conformes au règlement CE 561/2006.',
      icone: 'P'
    });
  }

  return recos;
}

/* === COMPOSANT PRINCIPAL === */
export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('rse_theme') || 'dark'; } catch { return 'dark'; }
  });
  const [typeService, setTypeService] = useState('STANDARD');
  const [pays, setPays] = useState('FR');
  const [mode, setMode] = useState('manuel');
  const [jours, setJours] = useState([creerJourVide()]);
  const [csvTexte, setCsvTexte] = useState('');
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat] = useState(null);
  const [erreur, setErreur] = useState('');
  const [serveurOk, setServeurOk] = useState(false);
  const [joursOuverts, setJoursOuverts] = useState({0: true});
  const [historique, setHistorique] = useState(chargerHistorique);
  const [voirHistorique, setVoirHistorique] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem('rse_onboarding_done'); } catch { return true; }
  });
  const [animScore, setAnimScore] = useState(0);

  const S = getStyles(theme);

  useEffect(() => {
    fetch(API + '/health').then(r => r.json()).then(() => setServeurOk(true)).catch(() => setServeurOk(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem('rse_theme', theme); } catch {}
    document.body.style.background = theme === 'dark' ? '#0f172a' : '#f1f5f9';
    document.body.style.color = theme === 'dark' ? '#e2e8f0' : '#1e293b';
  }, [theme]);

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  function creerJourVide() {
    return { date: new Date().toISOString().split('T')[0], activites: [{ heure_debut: '06:00', heure_fin: '07:00', type: 'C' }] };
  }

  function ajouterJour() {
    const d = new Date(jours[jours.length - 1].date);
    d.setDate(d.getDate() + 1);
    const ni = jours.length;
    setJoursOuverts(p => ({...p, [ni]: true}));
    setJours([...jours, { date: d.toISOString().split('T')[0], activites: [{ heure_debut: '06:00', heure_fin: '07:00', type: 'C' }] }]);
  }

  function supprimerJour(i) {
    if (jours.length <= 1) return;
    setJours(jours.filter((_, j) => j !== i));
  }

  function dupliquerJour(i) {
    const src = jours[i];
    const d = new Date(src.date);
    d.setDate(d.getDate() + 1);
    const copie = { date: d.toISOString().split('T')[0], activites: src.activites.map(a => ({...a})) };
    const nj = [...jours];
    nj.splice(i + 1, 0, copie);
    setJours(nj);
  }

  function appliquerTemplate(ij, nom) {
    const tpl = TEMPLATES[nom];
    if (!tpl) return;
    const nj = [...jours];
    nj[ij] = { ...nj[ij], activites: tpl.activites.map(a => ({...a})) };
    setJours(nj);
  }

  function modifierDateJour(ij, val) {
    const nj = [...jours]; nj[ij] = { ...nj[ij], date: val }; setJours(nj);
  }

  function ajouterActivite(ij) {
    const nj = [...jours];
    const dern = nj[ij].activites[nj[ij].activites.length - 1];
    const hd = dern ? dern.heure_fin : '08:00';
    const hf = dern ? incH(dern.heure_fin, 60) : '09:00';
    nj[ij].activites.push({ heure_debut: hd, heure_fin: hf, type: 'C' });
    setJours(nj);
  }

  function supprimerActivite(ij, ia) {
    const nj = [...jours];
    if (nj[ij].activites.length <= 1) return;
    nj[ij].activites = nj[ij].activites.filter((_, k) => k !== ia);
    setJours(nj);
  }

  function modifierActivite(ij, ia, champ, val) {
    const nj = [...jours];
    nj[ij].activites[ia] = { ...nj[ij].activites[ia], [champ]: val };
    setJours(nj);
  }

  function toggleJour(i) { setJoursOuverts(p => ({...p, [i]: !p[i]})); }

  function construireCSV() {
    let csv = '';
    jours.forEach(j => { j.activites.forEach(a => { csv += j.date + ';' + a.heure_debut + ';' + a.heure_fin + ';' + a.type + '\n'; }); });
    return csv;
  }

  async function chargerExemple() {
    try { const r = await fetch(API + '/example-csv'); setCsvTexte(await r.text()); } catch(e) { setErreur("Impossible de charger l'exemple"); }
  }

  async function lancerAnalyse() {
    setChargement(true); setErreur(''); setResultat(null); setAnimScore(0);
    try {
      const csv = mode === 'manuel' ? construireCSV() : csvTexte;
      if (!csv.trim()) { setErreur("Aucune donnée à analyser."); setChargement(false); return; }
      const r = await fetch(API + '/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, typeService, pays }) });
      const data = await r.json();
      if (!r.ok) { setErreur(data.error || 'Erreur serveur'); }
      else {
        setResultat(data);
        ajouterAHistorique(data, { typeService, pays });
        setHistorique(chargerHistorique());
        // Animation score
        let current = 0;
        const target = data.score || 0;
        const step = Math.max(1, Math.floor(target / 30));
        const anim = setInterval(() => {
          current += step;
          if (current >= target) { current = target; clearInterval(anim); }
          setAnimScore(current);
        }, 30);
      }
    } catch(e) { setErreur('Erreur de connexion : ' + e.message); }
    setChargement(false);
  }

  async function uploadFichier(e) {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('fichier', f);
    try { const r = await fetch(API + '/upload', { method: 'POST', body: fd }); const d = await r.json(); if (d.csv) { setCsvTexte(d.csv); setMode('csv'); } }
    catch(e) { setErreur('Erreur upload : ' + e.message); }
  }

  function chargerDepuisHistorique(item) {
    setResultat(item.resultat);
    setAnimScore(item.score);
    setVoirHistorique(false);
  }

  function supprimerHistorique(id) {
    const nh = historique.filter(h => h.id !== id);
    sauverHistorique(nh);
    setHistorique(nh);
  }

  function viderHistorique() {
    sauverHistorique([]);
    setHistorique([]);
  }

  function fermerOnboarding() {
    setShowOnboarding(false);
    try { localStorage.setItem('rse_onboarding_done', '1'); } catch {}
  }

  function imprimerRapport() {
    window.print();
  }


  /* === RENDU === */
  return (
    <div style={S.container}>
      {/* CSS IMPRESSION */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .anim-fade { animation: fadeIn 0.4s ease-out; }
        .anim-slide { animation: slideIn 0.3s ease-out; }
        button:hover { filter: brightness(1.1); }
        button:active { transform: scale(0.97); }
        @media print {
          body { background: #fff !important; color: #000 !important; }
          button, .no-print, [class*="tabBar"], [class*="togBtn"] { display: none !important; }
          div { break-inside: avoid; }
        }
        @media (max-width: 600px) {
          input[type="time"], input[type="date"] { min-height: 44px; font-size: 14px; }
          select { font-size: 14px; }
        }
      `}</style>

      {/* ONBOARDING */}
      {showOnboarding && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} className="anim-fade">
          <div style={{ background: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: 16, padding: 30, maxWidth: 480, width: '100%', textAlign: 'center', border: '2px solid #3b82f6' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1F698;</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6', marginBottom: 12 }}>Bienvenue sur RSE/RSN Calculator</h2>
            <p style={{ fontSize: 14, color: theme === 'dark' ? '#94a3b8' : '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
              Analysez vos temps de conduite et de repos conform{'é'}ment au r{'è'}glement CE 561/2006
              et au Code des transports fran{'ç'}ais.
            </p>
            <div style={{ textAlign: 'left', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>1</span>
                <span style={{ fontSize: 13, color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Saisissez vos activit{'é'}s manuellement ou importez un fichier CSV depuis votre chronotachygraphe</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>2</span>
                <span style={{ fontSize: 13, color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Suivez vos limites en temps r{'é'}el gr{'â'}ce aux jauges (conduite continue, journali{'è'}re, amplitude)</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>3</span>
                <span style={{ fontSize: 13, color: theme === 'dark' ? '#cbd5e1' : '#475569' }}>Lancez l'analyse pour d{'é'}tecter les infractions, voir les amendes estim{'é'}es et obtenir des recommandations</span>
              </div>
            </div>
            <button style={S.bP} onClick={fermerOnboarding}>Commencer</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }} className="no-print">
          <button style={S.themeBtn} onClick={toggleTheme}>{theme === 'dark' ? '\u2600\uFE0F Clair' : '\uD83C\uDF19 Sombre'}</button>
        </div>
        <h1 style={S.hTitle}>RSE/RSN Calculator</h1>
        <p style={S.hSub}>R{'é'}glementation sociale europ{'é'}enne et nationale {'—'} Transport routier de personnes</p>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: serveurOk ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
          <span style={{ fontSize: 11, color: serveurOk ? '#10b981' : '#ef4444' }}>{serveurOk ? 'Serveur connecté' : 'Serveur hors ligne'}</span>
        </div>
      </div>

      {/* LEGENDE */}
      <div style={S.legend}>
        {Object.values(TYPES_ACTIVITE).map(ta => (
          <div key={ta.code} style={S.legendItem}><ta.Icone taille={18} couleur={ta.couleur} /><span>{ta.label}</span></div>
        ))}
      </div>

      {/* PARAMETRES */}
      <div style={S.card}>
        <div style={S.cTitle}>Param{'è'}tres</div>
        <div style={S.row}>
          <div style={S.field}>
            <label style={S.lbl}>Pays</label>
            <select value={pays} onChange={e => setPays(e.target.value)}>
              {PAYS_LISTE.map(p => <option key={p.code} value={p.code}>{p.drapeau} {p.nom}</option>)}
            </select>
          </div>
          <div style={S.field}>
            <label style={S.lbl}>Type de service</label>
            <select value={typeService} onChange={e => setTypeService(e.target.value)}>
              {TYPES_SERVICE.map(ts => <option key={ts.code} value={ts.code}>{ts.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* HISTORIQUE */}
      <div className="no-print">
        <button style={{ ...S.bS, width: '100%', marginBottom: 14 }} onClick={() => setVoirHistorique(!voirHistorique)}>
          {voirHistorique ? '\u25B2 Masquer l\'historique' : '\u25BC Historique des analyses (' + historique.length + ')'}
        </button>
        {voirHistorique && (
          <div style={S.card} className="anim-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={S.cTitle}>Analyses pr{'é'}c{'é'}dentes</div>
              {historique.length > 0 && <button style={{ ...S.bD, fontSize: 11 }} onClick={viderHistorique}>Tout supprimer</button>}
            </div>
            {historique.length === 0 && <p style={{ color: '#64748b', fontSize: 13 }}>Aucune analyse enregistr{'é'}e.</p>}
            {historique.map(h => (
              <div key={h.id} style={S.histItem} onClick={() => chargerDepuisHistorique(h)}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(h.date).toLocaleDateString('fr-FR')} {new Date(h.date).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{h.jours}j {'\u2022'} {h.typeService} {'\u2022'} {h.pays}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...S.badge, background: h.score >= 80 ? '#064e3b' : h.score >= 50 ? '#78350f' : '#7f1d1d', color: h.score >= 80 ? '#10b981' : h.score >= 50 ? '#f59e0b' : '#ef4444' }}>{h.score}%</span>
                  {h.amende > 0 && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{h.amende}{EURO}</span>}
                  <button style={{ ...S.bD, fontSize: 10, padding: '2px 8px', minHeight: 24 }} onClick={(e) => { e.stopPropagation(); supprimerHistorique(h.id); }}>X</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODE */}
      <div style={S.tabBar} className="no-print">
        <button style={mode === 'manuel' ? S.tabA : S.tab} onClick={() => setMode('manuel')}>Saisie manuelle</button>
        <button style={mode === 'csv' ? S.tabA : S.tab} onClick={() => setMode('csv')}>Import CSV</button>
      </div>

      {/* MODE MANUEL */}
      {mode === 'manuel' && (
        <div>
          {jours.map((jour, ij) => {
            const stats = calculerStatsJour(jour.activites);
            const ouvert = joursOuverts[ij] !== false;
            return (
              <div key={ij} style={S.card} className="anim-slide">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: ouvert ? 10 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 auto' }}>
                    <button style={S.togBtn} onClick={() => toggleJour(ij)}>{ouvert ? '\u25BC' : '\u25B6'}</button>
                    <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14 }}>Jour {ij + 1}</span>
                    <input type="date" value={jour.date} onChange={e => modifierDateJour(ij, e.target.value)} style={{ maxWidth: 160, minHeight: 38 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button style={S.bS} onClick={() => dupliquerJour(ij)}>Dupliquer</button>
                    {jours.length > 1 && <button style={S.bD} onClick={() => supprimerJour(ij)}>Supprimer</button>}
                  </div>
                </div>

                {/* JAUGES TEMPS REEL */}
                {ouvert && <PanneauJauges stats={stats} typeService={typeService} />}

                {/* TIMELINE 24H */}
                {ouvert && <Timeline24h activites={jour.activites} />}

                {/* Stats compactes */}
                <div style={S.sGrid}>
                  {[
                    { ta: TYPES_ACTIVITE.C, val: stats.conduite },
                    { ta: TYPES_ACTIVITE.T, val: stats.tache },
                    { ta: TYPES_ACTIVITE.P, val: stats.pause },
                    { ta: TYPES_ACTIVITE.D, val: stats.dispo }
                  ].map(({ ta, val }) => (
                    <div key={ta.code} style={{ ...S.sCard, borderLeft: '3px solid ' + ta.couleur }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <ta.Icone taille={13} couleur={ta.couleur} />
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{ta.label}</span>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: ta.couleur }}>{fmtH(val)}h</div>
                    </div>
                  ))}
                </div>

                {/* Templates */}
                {ouvert && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#64748b', lineHeight: '30px' }}>Mod{'è'}les :</span>
                    {Object.entries(TEMPLATES).map(([k, tpl]) => (
                      <button key={k} style={{ ...S.bS, fontSize: 11, minHeight: 30, padding: '3px 10px' }} onClick={() => appliquerTemplate(ij, k)}>{tpl.label}</button>
                    ))}
                  </div>
                )}

                {/* Activites */}
                {ouvert && jour.activites.map((act, ia) => {
                  const TA = TYPES_ACTIVITE[act.type];
                  return (
                    <div key={ia} style={S.actRow}>
                      {TA && <TA.Icone taille={18} couleur={TA.couleur} />}
                      <select value={act.type} onChange={e => modifierActivite(ij, ia, 'type', e.target.value)} style={{ flex: '1 1 110px', minHeight: 38, fontSize: 13 }}>
                        {Object.values(TYPES_ACTIVITE).map(ta => <option key={ta.code} value={ta.code}>{ta.label}</option>)}
                      </select>
                      <input type="time" value={act.heure_debut} onChange={e => modifierActivite(ij, ia, 'heure_debut', e.target.value)} style={{ minHeight: 38, width: 110 }} />
                      <span style={{ color: '#64748b', fontSize: 12 }}>{'\u2192'}</span>
                      <input type="time" value={act.heure_fin} onChange={e => modifierActivite(ij, ia, 'heure_fin', e.target.value)} style={{ minHeight: 38, width: 110 }} />
                      <span style={{ fontSize: 11, color: '#64748b', minWidth: 40 }}>{fmtMin(dureeMin(act.heure_debut, act.heure_fin))}</span>
                      {jour.activites.length > 1 && <button style={{ ...S.bD, padding: '3px 8px', minHeight: 30 }} onClick={() => supprimerActivite(ij, ia)}>X</button>}
                    </div>
                  );
                })}

                {ouvert && <button style={{ ...S.bG, marginTop: 8 }} onClick={() => ajouterActivite(ij)}>+ Ajouter une activit{'é'}</button>}
              </div>
            );
          })}
          <button style={{ ...S.bS, width: '100%', marginBottom: 14 }} onClick={ajouterJour}>+ Ajouter un jour</button>
        </div>
      )}

      {/* MODE CSV */}
      {mode === 'csv' && (
        <div style={S.card}>
          <div style={S.cTitle}>Donn{'é'}es CSV</div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
            Format : <code style={{ background: theme === 'dark' ? '#334155' : '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>date;heure_debut;heure_fin;type</code> (C/T/D/P)
          </p>
          <textarea rows={10} value={csvTexte} onChange={e => setCsvTexte(e.target.value)} placeholder={"2025-01-06;06:00;10:30;C\n2025-01-06;10:30;11:00;P\n..."} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button style={S.bS} onClick={chargerExemple}>Charger l'exemple</button>
            <label style={{ ...S.bS, display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
              Importer fichier <input type="file" accept=".csv,.txt" onChange={uploadFichier} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* BOUTON ANALYSE */}
      <button style={{ ...S.bP, marginBottom: 14, opacity: chargement ? 0.6 : 1 }} onClick={lancerAnalyse} disabled={chargement} className="no-print">
        {chargement ? 'Analyse en cours...' : 'Lancer l\'analyse'}
      </button>

      {/* ERREUR */}
      {erreur && <div style={S.inf} className="anim-fade"><strong>Erreur :</strong> {erreur}</div>}

      {/* RESULTATS */}
      {resultat && <ResultPanel data={resultat} S={S} theme={theme} animScore={animScore} EURO={EURO} imprimerRapport={imprimerRapport} />}

      {/* FOOTER */}
      <div style={S.foot}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>RSE/RSN Calculator v{VERSION}</p>
        <p>Cr{'é'}dits : Samir Medjaher</p>
        <p style={{ marginTop: 6 }}>Sources : CE 561/2006 (Art.6-8) | Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2</p>
        <p>Pictogrammes : CE 3821/85 Annexe IB, UE 165/2014</p>
        <p style={{ marginTop: 4 }}>
          <a href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>Legifrance</a>
          {' | '}
          <a href="https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes" target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>Ecologie.gouv.fr</a>
          {' | '}
          <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>EUR-Lex</a>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   COMPOSANT RESULTATS COMPLET
   ============================================================ */
function ResultPanel({ data, S, theme, animScore, EURO, imprimerRapport }) {
  const [joursOuverts, setJoursOuverts] = useState({});
  function toggle(i) { setJoursOuverts(p => ({...p, [i]: !p[i]})); }

  const scC = data.score >= 80 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444';
  const scBg = theme === 'dark'
    ? (data.score >= 80 ? '#064e3b' : data.score >= 50 ? '#78350f' : '#7f1d1d')
    : (data.score >= 80 ? '#ecfdf5' : data.score >= 50 ? '#fffbeb' : '#fef2f2');

  const recos = genererRecommandations(data);

  return (
    <div className="anim-fade">
      {/* SCORE ANIME */}
      <div style={{ ...S.scoreBox, background: scBg, border: '2px solid ' + scC }}>
        <div style={{ fontSize: 52, fontWeight: 800, color: scC, transition: 'color 0.3s' }}>{animScore}%</div>
        <div style={{ fontSize: 15, color: theme === 'dark' ? '#e2e8f0' : '#1e293b', marginTop: 4 }}>Score de conformit{'é'}</div>
        {/* Barre de score */}
        <div style={{ width: '80%', height: 10, background: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: 5, margin: '12px auto 0', overflow: 'hidden' }}>
          <div style={{ width: animScore + '%', height: '100%', background: scC, borderRadius: 5, transition: 'width 0.8s ease-out' }} />
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>{data.resume}</div>
        {data.periode && data.periode !== 'N/A' && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>P{'é'}riode : {data.periode} ({data.nombre_jours} jour(s))</div>
        )}
      </div>

      {/* BOUTONS ACTIONS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }} className="no-print">
        <button style={{ ...S.bS, flex: 1 }} onClick={imprimerRapport}>{'\uD83D\uDDA8\uFE0F'} Imprimer / PDF</button>
      </div>

      {/* AMENDE */}
      {data.amende_estimee > 0 && (
        <div style={S.amendeBox}>
          <div style={{ fontSize: 13, color: '#fca5a5' }}>Amende totale estim{'é'}e</div>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#ef4444' }}>{data.amende_estimee} {EURO}</div>
          <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 4 }}>Estimation amendes forfaitaires {'—'} Montant r{'é'}el fix{'é'} par le tribunal</div>
        </div>
      )}

      {/* RECOMMANDATIONS */}
      {recos.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Recommandations</div>
          {recos.map((r, i) => {
            const TA = TYPES_ACTIVITE[r.icone];
            const bg = r.type === 'danger' ? S.inf : r.type === 'warning' ? S.warn : S.ok;
            return (
              <div key={i} style={bg} className="anim-slide">
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  {TA && <TA.Icone taille={20} couleur={TA.couleur} />}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: r.type === 'danger' ? '#ef4444' : r.type === 'warning' ? '#f59e0b' : '#10b981' }}>{r.titre}</div>
                    <div style={{ fontSize: 12, color: theme === 'dark' ? '#cbd5e1' : '#475569', lineHeight: 1.5 }}>{r.texte}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STATISTIQUES */}
      {data.statistiques && (
        <div style={S.card}>
          <div style={S.cTitle}>Statistiques globales</div>
          <div style={S.sGrid}>
            {[
              { label: 'Conduite', val: data.statistiques.conduite_totale_h + 'h', c: '#3b82f6', I: IconeConduite },
              { label: 'Autre tâche', val: data.statistiques.travail_autre_total_h + 'h', c: '#f59e0b', I: IconeAutreTache },
              { label: 'Pauses', val: data.statistiques.pause_totale_h + 'h', c: '#10b981', I: IconeRepos },
              { label: 'Disponibilité', val: data.statistiques.disponibilite_totale_h + 'h', c: '#8b5cf6', I: IconeDisponibilite },
              { label: 'Moy. conduite/j', val: data.statistiques.moyenne_conduite_jour_h + 'h', c: '#06b6d4', I: null },
              { label: 'Moy. travail/j', val: data.statistiques.moyenne_travail_total_jour_h + 'h', c: '#ec4899', I: null }
            ].map((s, i) => (
              <div key={i} style={{ ...S.sCard, borderLeft: '3px solid ' + s.c }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {s.I && <s.I taille={12} couleur={s.c} />}
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.c }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ERREURS PARSING */}
      {data.erreurs_parsing && data.erreurs_parsing.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Erreurs de format</div>
          {data.erreurs_parsing.map((e, i) => (
            <div key={i} style={{ ...S.warn, fontSize: 12 }}>{e}</div>
          ))}
        </div>
      )}

      {/* INFRACTIONS */}
      {data.infractions && data.infractions.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Infractions d{'é'}tect{'é'}es ({data.infractions.length})</div>
          {data.infractions.map((inf, i) => (
            <div key={i} style={S.inf} className="anim-slide">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ ...S.badge, background: inf.classe && inf.classe.includes('5e') ? '#dc2626' : '#f59e0b', color: '#fff' }}>{inf.classe}</span>
                {inf.amende && <span style={{ fontSize: 14, fontWeight: 800, color: '#ef4444' }}>{typeof inf.amende === 'number' ? inf.amende + ' ' + EURO : inf.amende}</span>}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{inf.regle}</div>
              {inf.detail && <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 2 }}>{inf.detail}</div>}
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {inf.limite && <span>Limite : {inf.limite}</span>}
                {inf.constate && <span> | Constat{'é'} : {inf.constate}</span>}
                {inf.depassement && <span> | D{'é'}passement : {inf.depassement}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AVERTISSEMENTS */}
      {data.avertissements && data.avertissements.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Avertissements ({data.avertissements.length})</div>
          {data.avertissements.map((a, i) => (
            <div key={i} style={S.warn}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.regle}</div>
              <div style={{ fontSize: 12, color: theme === 'dark' ? '#fcd34d' : '#92400e' }}>{a.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS PAR JOUR */}
      {data.details_jours && data.details_jours.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>D{'é'}tail par jour</div>
          {data.details_jours.map((jour, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: theme === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: 8, cursor: 'pointer', border: '1px solid ' + (theme === 'dark' ? '#1e293b' : '#e2e8f0') }} onClick={() => toggle(i)}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{jour.date}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {jour.infractions_jour > 0 && <span style={{ ...S.badge, background: '#7f1d1d', color: '#ef4444' }}>{jour.infractions_jour} inf.</span>}
                  <span style={{ fontSize: 12, color: '#3b82f6' }}>{jour.conduite_h || jour.conduite}h cond.</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{joursOuverts[i] ? '\u25B2' : '\u25BC'}</span>
                </div>
              </div>
              {joursOuverts[i] && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: '#94a3b8' }} className="anim-fade">
                  {jour.amplitude && <div>Amplitude : {jour.amplitude}</div>}
                  {jour.conduite_continue_max && <div>Conduite continue max : {jour.conduite_continue_max}</div>}
                  {jour.repos_estime && <div>Repos estim{'é'} : {jour.repos_estime}</div>}
                  {jour.travail_nuit_min > 0 && <div>Travail de nuit : {jour.travail_nuit_min} min</div>}
                  {jour.nombre_activites && <div>Activit{'é'}s : {jour.nombre_activites}</div>}
                  {jour.infractions_detail && jour.infractions_detail.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {jour.infractions_detail.map((inf2, j) => (
                        <div key={j} style={{ ...S.inf, fontSize: 11, padding: 8 }}>
                          <span style={{ ...S.badge, background: '#dc2626', color: '#fff', fontSize: 10 }}>{inf2.classe}</span> {inf2.regle}
                          {inf2.depassement && <span style={{ color: '#fca5a5' }}> ({inf2.depassement})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {jour.avertissements_detail && jour.avertissements_detail.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {jour.avertissements_detail.map((av, j) => (
                        <div key={j} style={{ ...S.warn, fontSize: 11, padding: 8 }}>{av.regle} : {av.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BARÈME SANCTIONS */}
      <div style={S.card}>
        <div style={S.cTitle}>Bar{'è'}me des sanctions</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid ' + (theme === 'dark' ? '#334155' : '#cbd5e1') }}>
                <th style={{ padding: 8, textAlign: 'left', color: '#94a3b8' }}>Infraction</th>
                <th style={{ padding: 8, textAlign: 'center', color: '#f59e0b' }}>4e classe</th>
                <th style={{ padding: 8, textAlign: 'center', color: '#ef4444' }}>5e classe</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Conduite continue > 4h30', 'Dép. < 1h30 : 135€ (max 750€)', 'Dép. ≥ 1h30 : 1500€ (3000€ réc.)'],
                ['Conduite journalière > 9h/10h', 'Dép. < 2h : 135€ (max 750€)', 'Dép. ≥ 2h : 1500€ (3000€ réc.)'],
                ['Conduite hebdo > 56h', 'Dép. < 14h : 135€ (max 750€)', 'Dép. ≥ 14h : 1500€'],
                ['Repos journalier < 11h/9h', 'Insuf. < 2h30 : 135€ (max 750€)', 'Insuf. ≥ 2h30 : 1500€'],
                ['Repos hebdo < 45h/24h', 'Insuf. < 9h : 135€ (max 750€)', 'Insuf. ≥ 9h : 1500€'],
                ['Falsification tachygraphe', '—', '1 an prison + 30 000€'],
                ['Carte conducteur non conforme', '—', '6 mois prison + 3 750€']
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid ' + (theme === 'dark' ? '#1e293b' : '#e2e8f0') }}>
                  <td style={{ padding: 8 }}>{row[0]}</td>
                  <td style={{ padding: 8, textAlign: 'center', color: '#f59e0b' }}>{row[1]}</td>
                  <td style={{ padding: 8, textAlign: 'center', color: '#ef4444' }}>{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
          Sources : dan-dis-scan.fr | inodis.fr | D{'é'}cret 2010-855 | R{'è'}glement CE 561/2006
        </div>
      </div>
    </div>
  );
}
