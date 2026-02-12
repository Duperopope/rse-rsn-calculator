import React, { useState, useEffect } from 'react';

/* ============================================================
   ICONES SVG TACHYGRAPHE OFFICIELLES
   Source : Reglement CE 3821/85 Annexe IB, Reglement UE 165/2014
   - Conduite = Volant (steering wheel)
   - Autre tache = Marteaux croises (crossed hammers)
   - Disponibilite = Carre avec diagonale (square with diagonal)
   - Repos/Pause = Lit (bed)
   ============================================================ */

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
      <line x1="7" y1="4" x2="12" y2="12" stroke={couleur} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="17" y1="4" x2="12" y2="12" stroke={couleur} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="12" x2="7" y2="20" stroke={couleur} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="12" y1="12" x2="17" y2="20" stroke={couleur} strokeWidth="2.5" strokeLinecap="round"/>
      <rect x="4" y="2" width="6" height="3" rx="1" fill={couleur} opacity="0.3"/>
      <rect x="14" y="2" width="6" height="3" rx="1" fill={couleur} opacity="0.3"/>
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

/* ============================================================
   CONSTANTES UI
   ============================================================ */
const API = '/api';
const EURO = '€';

const TYPES_ACTIVITE = {
  C: { code: 'C', label: 'Conduite', couleur: '#3b82f6', Icone: IconeConduite },
  T: { code: 'T', label: 'Autre tâche', couleur: '#f59e0b', Icone: IconeAutreTache },
  D: { code: 'D', label: 'Disponibilité', couleur: '#8b5cf6', Icone: IconeDisponibilite },
  P: { code: 'P', label: 'Pause / Repos', couleur: '#10b981', Icone: IconeRepos }
};

const TYPES_SERVICE = [
  { code: 'STANDARD', label: 'Standard' },
  { code: 'REGULIER', label: 'Ligne régulière (>50km)' },
  { code: 'OCCASIONNEL', label: 'Occasionnel' },
  { code: 'SLO', label: 'SLO (Service libre occasionnel)' }
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
  conduite: [
    { heure_debut: '06:00', heure_fin: '06:30', type: 'T' },
    { heure_debut: '06:30', heure_fin: '10:30', type: 'C' },
    { heure_debut: '10:30', heure_fin: '11:00', type: 'P' },
    { heure_debut: '11:00', heure_fin: '13:00', type: 'C' },
    { heure_debut: '13:00', heure_fin: '14:00', type: 'P' },
    { heure_debut: '14:00', heure_fin: '17:30', type: 'C' },
    { heure_debut: '17:30', heure_fin: '18:00', type: 'T' }
  ],
  mixte: [
    { heure_debut: '07:00', heure_fin: '07:30', type: 'T' },
    { heure_debut: '07:30', heure_fin: '10:00', type: 'C' },
    { heure_debut: '10:00', heure_fin: '10:30', type: 'P' },
    { heure_debut: '10:30', heure_fin: '12:00', type: 'T' },
    { heure_debut: '12:00', heure_fin: '13:00', type: 'P' },
    { heure_debut: '13:00', heure_fin: '16:00', type: 'C' },
    { heure_debut: '16:00', heure_fin: '17:00', type: 'D' }
  ],
  nuit: [
    { heure_debut: '20:00', heure_fin: '20:30', type: 'T' },
    { heure_debut: '20:30', heure_fin: '00:30', type: 'C' },
    { heure_debut: '00:30', heure_fin: '01:00', type: 'P' },
    { heure_debut: '01:00', heure_fin: '04:00', type: 'C' },
    { heure_debut: '04:00', heure_fin: '04:30', type: 'T' }
  ]
};

/* ============================================================
   STYLES
   ============================================================ */
const S = {
  container: { maxWidth: 900, margin: '0 auto', padding: 16, minHeight: '100vh' },
  header: { textAlign: 'center', padding: '24px 0', borderBottom: '2px solid #1e293b', marginBottom: 24 },
  hTitle: { fontSize: 28, fontWeight: 800, color: '#60a5fa', margin: 0 },
  hSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #334155' },
  cTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  field: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 4 },
  lbl: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  bP: { background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 700, width: '100%', minHeight: 48, border: 'none', cursor: 'pointer' },
  bS: { background: '#334155', color: '#e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 14, minHeight: 40, border: 'none', cursor: 'pointer' },
  bD: { background: '#ef4444', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, minHeight: 36, border: 'none', cursor: 'pointer' },
  bG: { background: '#10b981', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 14, minHeight: 40, border: 'none', cursor: 'pointer', width: '100%' },
  actRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid #334155' },
  scoreBox: { textAlign: 'center', padding: 24, borderRadius: 12, marginBottom: 16 },
  inf: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 8, padding: 14, marginBottom: 10 },
  warn: { background: '#78350f', border: '1px solid #f59e0b', borderRadius: 8, padding: 14, marginBottom: 10 },
  sGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  sCard: { background: '#0f172a', borderRadius: 8, padding: 12, textAlign: 'center' },
  tl: { display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
  foot: { textAlign: 'center', padding: '24px 0', marginTop: 24, borderTop: '1px solid #1e293b', color: '#64748b', fontSize: 12 },
  amendeBox: { background: '#7f1d1d', border: '2px solid #dc2626', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 },
  togBtn: { background: 'transparent', color: '#94a3b8', padding: '4px 8px', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', border: 'none', minHeight: 'auto' },
  tabBar: { display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#334155', color: '#94a3b8', border: 'none', minHeight: 44 },
  tabA: { flex: 1, padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', minHeight: 44 },
  legend: { display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '12px 0', marginBottom: 12 },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1' }
};

/* ============================================================
   COMPOSANT PRINCIPAL
   ============================================================ */
export default function App() {
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

  useEffect(() => {
    fetch(API + '/health').then(r => r.json()).then(() => setServeurOk(true)).catch(() => setServeurOk(false));
  }, []);

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
    nj[ij] = { ...nj[ij], activites: tpl.map(a => ({...a})) };
    setJours(nj);
  }

  function modifierDateJour(ij, val) {
    const nj = [...jours];
    nj[ij] = { ...nj[ij], date: val };
    setJours(nj);
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

  function incH(h, m) {
    const [hh, mm] = h.split(':').map(Number);
    const t = hh * 60 + mm + m;
    return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  }

  function construireCSV() {
    let csv = '';
    jours.forEach(j => { j.activites.forEach(a => { csv += j.date + ';' + a.heure_debut + ';' + a.heure_fin + ';' + a.type + '\n'; }); });
    return csv;
  }

  function statsJour(activites) {
    let c = 0, t = 0, p = 0, d = 0;
    activites.forEach(a => {
      const [h1, m1] = a.heure_debut.split(':').map(Number);
      const [h2, m2] = a.heure_fin.split(':').map(Number);
      let dur = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (dur < 0) dur += 1440;
      if (a.type === 'C') c += dur;
      else if (a.type === 'T') t += dur;
      else if (a.type === 'D') d += dur;
      else if (a.type === 'P') p += dur;
    });
    return { c, t, p, d };
  }

  function toggleJour(i) { setJoursOuverts(p => ({...p, [i]: !p[i]})); }

  async function chargerExemple() {
    try { const r = await fetch(API + '/example-csv'); setCsvTexte(await r.text()); } catch(e) { setErreur("Impossible de charger l'exemple"); }
  }

  async function lancerAnalyse() {
    setChargement(true); setErreur(''); setResultat(null);
    try {
      const csv = mode === 'manuel' ? construireCSV() : csvTexte;
      if (!csv.trim()) { setErreur("Aucune donnée à analyser."); setChargement(false); return; }
      const r = await fetch(API + '/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, typeService, pays }) });
      const data = await r.json();
      if (!r.ok) setErreur(data.error || 'Erreur serveur');
      else setResultat(data);
    } catch(e) { setErreur('Erreur de connexion : ' + e.message); }
    setChargement(false);
  }

  async function uploadFichier(e) {
    const f = e.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('fichier', f);
    try { const r = await fetch(API + '/upload', { method: 'POST', body: fd }); const d = await r.json(); if (d.csv) { setCsvTexte(d.csv); setMode('csv'); } }
    catch(e) { setErreur('Erreur upload : ' + e.message); }
  }

  return (
    <div style={S.container}>
      {/* HEADER */}
      <div style={S.header}>
        <h1 style={S.hTitle}>RSE/RSN Calculator</h1>
        <p style={S.hSub}>Réglementation sociale européenne et nationale - Transport routier de personnes</p>
        <div style={{marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8}}>
          <span style={{width: 10, height: 10, borderRadius: '50%', background: serveurOk ? '#10b981' : '#ef4444', display: 'inline-block'}}></span>
          <span style={{fontSize: 12, color: serveurOk ? '#10b981' : '#ef4444'}}>{serveurOk ? 'Serveur connecté' : 'Serveur hors ligne'}</span>
        </div>
      </div>

      {/* LEGENDE PICTOGRAMMES TACHYGRAPHE */}
      <div style={S.legend}>
        {Object.values(TYPES_ACTIVITE).map(ta => (
          <div key={ta.code} style={S.legendItem}>
            <ta.Icone taille={20} couleur={ta.couleur} />
            <span>{ta.label}</span>
          </div>
        ))}
      </div>

      {/* PARAMETRES */}
      <div style={S.card}>
        <div style={S.cTitle}>Paramètres</div>
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

      {/* MODE */}
      <div style={S.tabBar}>
        <button style={mode === 'manuel' ? S.tabA : S.tab} onClick={() => setMode('manuel')}>Saisie manuelle</button>
        <button style={mode === 'csv' ? S.tabA : S.tab} onClick={() => setMode('csv')}>Import CSV</button>
      </div>

      {/* MODE MANUEL */}
      {mode === 'manuel' && (
        <div>
          {jours.map((jour, ij) => {
            const st = statsJour(jour.activites);
            const ouvert = joursOuverts[ij] !== false;
            return (
              <div key={ij} style={S.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: ouvert ? 12 : 0}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto'}}>
                    <button style={S.togBtn} onClick={() => toggleJour(ij)}>{ouvert ? '\u25BC' : '\u25B6'}</button>
                    <span style={{fontWeight: 700, color: '#60a5fa'}}>Jour {ij + 1}</span>
                    <input type="date" value={jour.date} onChange={e => modifierDateJour(ij, e.target.value)} style={{maxWidth: 170, minHeight: 40}} />
                  </div>
                  <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    <button style={S.bS} onClick={() => dupliquerJour(ij)}>Dupliquer</button>
                    {jours.length > 1 && <button style={S.bD} onClick={() => supprimerJour(ij)}>Supprimer</button>}
                  </div>
                </div>

                {/* Stats rapides */}
                <div style={{...S.sGrid, marginBottom: ouvert ? 12 : 0}}>
                  <div style={{...S.sCard, borderLeft: '3px solid #3b82f6'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                      <IconeConduite taille={14} couleur="#3b82f6" />
                      <span style={{fontSize: 11, color: '#94a3b8'}}>Conduite</span>
                    </div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#3b82f6'}}>{(st.c / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...S.sCard, borderLeft: '3px solid #f59e0b'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                      <IconeAutreTache taille={14} couleur="#f59e0b" />
                      <span style={{fontSize: 11, color: '#94a3b8'}}>Autre tâche</span>
                    </div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#f59e0b'}}>{(st.t / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...S.sCard, borderLeft: '3px solid #10b981'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                      <IconeRepos taille={14} couleur="#10b981" />
                      <span style={{fontSize: 11, color: '#94a3b8'}}>Pause</span>
                    </div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#10b981'}}>{(st.p / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...S.sCard, borderLeft: '3px solid #8b5cf6'}}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}>
                      <IconeDisponibilite taille={14} couleur="#8b5cf6" />
                      <span style={{fontSize: 11, color: '#94a3b8'}}>Dispo</span>
                    </div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#8b5cf6'}}>{(st.d / 60).toFixed(1)}h</div>
                  </div>
                </div>

                {/* Timeline */}
                {ouvert && (
                  <div style={S.tl}>
                    {jour.activites.map((act, ia) => {
                      const [h1, m1] = act.heure_debut.split(':').map(Number);
                      const [h2, m2] = act.heure_fin.split(':').map(Number);
                      let dur = (h2 * 60 + m2) - (h1 * 60 + m1);
                      if (dur <= 0) dur += 1440;
                      const tot = jour.activites.reduce((s, a2) => { const [a, b] = a2.heure_debut.split(':').map(Number); const [c, d] = a2.heure_fin.split(':').map(Number); let dd = (c * 60 + d) - (a * 60 + b); if (dd <= 0) dd += 1440; return s + dd; }, 0);
                      return <div key={ia} style={{width: (tot > 0 ? dur / tot * 100 : 0) + '%', background: TYPES_ACTIVITE[act.type]?.couleur || '#666', minWidth: 2}} title={TYPES_ACTIVITE[act.type]?.label + ' ' + act.heure_debut + '-' + act.heure_fin}></div>;
                    })}
                  </div>
                )}

                {/* Templates */}
                {ouvert && (
                  <div style={{display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap'}}>
                    <span style={{fontSize: 12, color: '#64748b', lineHeight: '32px'}}>Modèles :</span>
                    <button style={{...S.bS, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(ij, 'conduite')}>Journée conduite</button>
                    <button style={{...S.bS, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(ij, 'mixte')}>Journée mixte</button>
                    <button style={{...S.bS, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(ij, 'nuit')}>Service de nuit</button>
                  </div>
                )}

                {/* Activites */}
                {ouvert && jour.activites.map((act, ia) => {
                  const TA = TYPES_ACTIVITE[act.type];
                  return (
                    <div key={ia} style={S.actRow}>
                      {TA && <TA.Icone taille={20} couleur={TA.couleur} />}
                      <select value={act.type} onChange={e => modifierActivite(ij, ia, 'type', e.target.value)} style={{flex: '1 1 120px', minHeight: 40}}>
                        {Object.values(TYPES_ACTIVITE).map(ta => <option key={ta.code} value={ta.code}>{ta.label}</option>)}
                      </select>
                      <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto'}}>
                        <label style={{fontSize: 10, color: '#64748b'}}>Début</label>
                        <input type="time" value={act.heure_debut} onChange={e => modifierActivite(ij, ia, 'heure_debut', e.target.value)} style={{minHeight: 40, width: 120}} />
                      </div>
                      <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto'}}>
                        <label style={{fontSize: 10, color: '#64748b'}}>Fin</label>
                        <input type="time" value={act.heure_fin} onChange={e => modifierActivite(ij, ia, 'heure_fin', e.target.value)} style={{minHeight: 40, width: 120}} />
                      </div>
                      {jour.activites.length > 1 && <button style={{...S.bD, minHeight: 36, padding: '4px 10px'}} onClick={() => supprimerActivite(ij, ia)}>X</button>}
                    </div>
                  );
                })}

                {ouvert && <button style={{...S.bG, marginTop: 10}} onClick={() => ajouterActivite(ij)}>+ Ajouter une activité</button>}
              </div>
            );
          })}

          <button style={{...S.bS, width: '100%', marginBottom: 16}} onClick={ajouterJour}>+ Ajouter un jour</button>
        </div>
      )}

      {/* MODE CSV */}
      {mode === 'csv' && (
        <div style={S.card}>
          <div style={S.cTitle}>Données CSV</div>
          <p style={{fontSize: 13, color: '#94a3b8', marginBottom: 12}}>
            Format : <code style={{background: '#334155', padding: '2px 6px', borderRadius: 4}}>date;heure_debut;heure_fin;type</code>
            {' '}(C = Conduite, T = Autre tâche, D = Disponibilité, P = Pause)
          </p>
          <textarea rows={12} value={csvTexte} onChange={e => setCsvTexte(e.target.value)} placeholder={"2025-01-06;06:00;10:30;C\n2025-01-06;10:30;11:00;P\n..."} />
          <div style={{display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap'}}>
            <button style={S.bS} onClick={chargerExemple}>Charger l'exemple</button>
            <label style={{...S.bS, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}}>
              Importer un fichier
              <input type="file" accept=".csv,.txt" onChange={uploadFichier} style={{display: 'none'}} />
            </label>
          </div>
        </div>
      )}

      {/* BOUTON ANALYSE */}
      <button style={{...S.bP, marginBottom: 16, opacity: chargement ? 0.6 : 1}} onClick={lancerAnalyse} disabled={chargement}>
        {chargement ? 'Analyse en cours...' : 'Lancer l\'analyse'}
      </button>

      {/* ERREUR */}
      {erreur && <div style={{...S.inf, marginBottom: 16}}><strong>Erreur :</strong> {erreur}</div>}

      {/* RESULTATS */}
      {resultat && <ResultPanel data={resultat} />}

      {/* FOOTER */}
      <div style={S.foot}>
        <p style={{fontWeight: 600, marginBottom: 4}}>RSE/RSN Calculator v5.4.0</p>
        <p>Crédits : Samir Medjaher</p>
        <p style={{marginTop: 8}}>Sources réglementaires :</p>
        <p>Règlement CE 561/2006 (Art. 6-8) | Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2</p>
        <p>Pictogrammes : Règlement CE 3821/85 Annexe IB, Règlement UE 165/2014</p>
        <p>
          <a href="https://www.legifrance.gouv.fr" target="_blank" rel="noopener" style={{color: '#60a5fa'}}>Legifrance</a>
          {' | '}
          <a href="https://www.ecologie.gouv.fr/politiques-publiques/temps-travail-conducteurs-routiers-transport-personnes" target="_blank" rel="noopener" style={{color: '#60a5fa'}}>Ecologie.gouv.fr</a>
          {' | '}
          <a href="https://eur-lex.europa.eu" target="_blank" rel="noopener" style={{color: '#60a5fa'}}>EUR-Lex</a>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   COMPOSANT RESULTATS
   ============================================================ */
function ResultPanel({ data }) {
  const [joursOuverts, setJoursOuverts] = useState({});
  function toggle(i) { setJoursOuverts(p => ({...p, [i]: !p[i]})); }

  const scC = data.score >= 80 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444';
  const scBg = data.score >= 80 ? '#064e3b' : data.score >= 50 ? '#78350f' : '#7f1d1d';

  function fmtAmende(val) {
    if (typeof val === 'string') return val.replace(/\€/g, EURO).replace(/euros/g, EURO);
    return val;
  }

  return (
    <div>
      {/* SCORE */}
      <div style={{...S.scoreBox, background: scBg, border: '2px solid ' + scC}}>
        <div style={{fontSize: 48, fontWeight: 800, color: scC}}>{data.score}%</div>
        <div style={{fontSize: 16, color: '#e2e8f0', marginTop: 4}}>Score de conformité</div>
        <div style={{fontSize: 14, color: '#94a3b8', marginTop: 4}}>{data.resume}</div>
        {data.periode && data.periode !== 'N/A' && (
          <div style={{fontSize: 13, color: '#64748b', marginTop: 4}}>Période : {data.periode} ({data.nombre_jours} jour(s))</div>
        )}
      </div>

      {/* AMENDE ESTIMEE */}
      {data.amende_estimee > 0 && (
        <div style={S.amendeBox}>
          <div style={{fontSize: 14, color: '#fca5a5'}}>Amende totale estimée</div>
          <div style={{fontSize: 36, fontWeight: 800, color: '#ef4444'}}>{data.amende_estimee} {EURO}</div>
          <div style={{fontSize: 12, color: '#fca5a5', marginTop: 4}}>
            Estimation basée sur les amendes forfaitaires - Montant réel fixé par le tribunal
          </div>
        </div>
      )}

      {/* STATISTIQUES GLOBALES */}
      {data.statistiques && (
        <div style={S.card}>
          <div style={S.cTitle}>Statistiques globales</div>
          <div style={S.sGrid}>
            <div style={{...S.sCard, borderLeft: '3px solid #3b82f6'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}><IconeConduite taille={14} couleur="#3b82f6" /><span style={{fontSize: 11, color: '#94a3b8'}}>Conduite totale</span></div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#3b82f6'}}>{data.statistiques.conduite_totale_h}h</div>
            </div>
            <div style={{...S.sCard, borderLeft: '3px solid #f59e0b'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}><IconeAutreTache taille={14} couleur="#f59e0b" /><span style={{fontSize: 11, color: '#94a3b8'}}>Autre tâche</span></div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#f59e0b'}}>{data.statistiques.travail_autre_total_h}h</div>
            </div>
            <div style={{...S.sCard, borderLeft: '3px solid #10b981'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}><IconeRepos taille={14} couleur="#10b981" /><span style={{fontSize: 11, color: '#94a3b8'}}>Pauses</span></div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#10b981'}}>{data.statistiques.pause_totale_h}h</div>
            </div>
            <div style={{...S.sCard, borderLeft: '3px solid #8b5cf6'}}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4}}><IconeDisponibilite taille={14} couleur="#8b5cf6" /><span style={{fontSize: 11, color: '#94a3b8'}}>Disponibilité</span></div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#8b5cf6'}}>{data.statistiques.disponibilite_totale_h}h</div>
            </div>
            <div style={{...S.sCard, borderLeft: '3px solid #06b6d4'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Moy. conduite/jour</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#06b6d4'}}>{data.statistiques.moyenne_conduite_jour_h}h</div>
            </div>
            <div style={{...S.sCard, borderLeft: '3px solid #ec4899'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Moy. travail total/jour</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#ec4899'}}>{data.statistiques.moyenne_travail_total_jour_h}h</div>
            </div>
          </div>
        </div>
      )}

      {/* INFRACTIONS */}
      {data.infractions && data.infractions.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Infractions ({data.infractions.length})</div>
          {data.infractions.map((inf, i) => (
            <div key={i} style={S.inf}>
              <div style={{fontWeight: 700, fontSize: 14, marginBottom: 6}}>{inf.regle}</div>
              <div style={{fontSize: 13, color: '#fca5a5'}}>
                Limite : {inf.limite} | Constaté : {inf.constate} | Dépassement : {inf.depassement}
              </div>
              <div style={{fontSize: 13, marginTop: 6, padding: '6px 10px', background: '#450a0a', borderRadius: 6}}>
                <span style={{fontWeight: 600}}>{inf.classe}</span> - Amende : {fmtAmende(inf.amende)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AVERTISSEMENTS */}
      {data.avertissements && data.avertissements.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Avertissements ({data.avertissements.length})</div>
          {data.avertissements.map((av, i) => (
            <div key={i} style={S.warn}>
              <div style={{fontWeight: 700, fontSize: 14, marginBottom: 4}}>{av.regle}</div>
              <div style={{fontSize: 13, color: '#fde68a'}}>{av.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* ERREURS D'ANALYSE */}
      {data.erreurs_analyse && data.erreurs_analyse.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Erreurs d'analyse ({data.erreurs_analyse.length})</div>
          {data.erreurs_analyse.map((err, i) => <div key={i} style={{fontSize: 13, color: '#f87171', padding: '4px 0'}}>{err}</div>)}
        </div>
      )}

      {/* DETAIL PAR JOUR */}
      {data.details_jours && data.details_jours.length > 0 && (
        <div style={S.card}>
          <div style={S.cTitle}>Détail par jour</div>
          {data.details_jours.map((jour, i) => (
            <div key={i} style={{borderBottom: '1px solid #334155', paddingBottom: 10, marginBottom: 10}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggle(i)}>
                <div>
                  <span style={{fontWeight: 700, color: '#60a5fa'}}>{jour.date}</span>
                  <span style={{fontSize: 12, color: '#64748b', marginLeft: 8}}>{jour.fuseau}</span>
                  {jour.infractions.length > 0 && <span style={{marginLeft: 8, fontSize: 12, color: '#ef4444', fontWeight: 600}}>{jour.infractions.length} infraction(s)</span>}
                  {jour.avertissements.length > 0 && <span style={{marginLeft: 8, fontSize: 12, color: '#f59e0b'}}>{jour.avertissements.length} avert.</span>}
                </div>
                <span style={{color: '#64748b'}}>{joursOuverts[i] ? '\u25BC' : '\u25B6'}</span>
              </div>

              <div style={{...S.sGrid, marginTop: 6}}>
                <div style={S.sCard}><div style={{fontSize: 10, color: '#94a3b8'}}>Conduite</div><div style={{fontSize: 14, fontWeight: 700, color: '#3b82f6'}}>{jour.conduite_h}h</div></div>
                <div style={S.sCard}><div style={{fontSize: 10, color: '#94a3b8'}}>Travail</div><div style={{fontSize: 14, fontWeight: 700, color: '#f59e0b'}}>{jour.travail_h}h</div></div>
                <div style={S.sCard}><div style={{fontSize: 10, color: '#94a3b8'}}>Pause</div><div style={{fontSize: 14, fontWeight: 700, color: '#10b981'}}>{jour.pause_h}h</div></div>
                <div style={S.sCard}><div style={{fontSize: 10, color: '#94a3b8'}}>Amplitude</div><div style={{fontSize: 14, fontWeight: 700, color: '#e2e8f0'}}>{jour.amplitude_estimee_h}h</div></div>
              </div>

              {joursOuverts[i] && (
                <div style={{marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 8, fontSize: 13}}>
                  <div style={{color: '#94a3b8'}}>Conduite continue max : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.conduite_continue_max_min} min</span></div>
                  <div style={{color: '#94a3b8'}}>Repos estimé : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.repos_estime_h}h</span></div>
                  <div style={{color: '#94a3b8'}}>Travail de nuit : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.travail_nuit_min} min</span></div>
                  <div style={{color: '#94a3b8'}}>Nombre d'activités : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.nombre_activites}</span></div>

                  {jour.infractions.length > 0 && (
                    <div style={{marginTop: 8}}>
                      {jour.infractions.map((inf, j) => (
                        <div key={j} style={{...S.inf, fontSize: 12, padding: 10, marginBottom: 6}}>
                          <div style={{fontWeight: 600}}>{inf.regle}</div>
                          <div style={{color: '#fca5a5'}}>Limite : {inf.limite} | Constaté : {inf.constate}</div>
                          <div style={{color: '#fca5a5', fontWeight: 600}}>{inf.classe} - {fmtAmende(inf.amende)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BAREME */}
      {data.bareme_sanctions && (
        <div style={S.card}>
          <div style={S.cTitle}>Barème des sanctions applicable</div>
          <div style={{fontSize: 13, lineHeight: 1.8}}>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8, marginBottom: 8}}>
              <div style={{fontWeight: 700, color: '#f59e0b', marginBottom: 4}}>{data.bareme_sanctions.classe_4.intitule}</div>
              <div style={{color: '#94a3b8'}}>Amende forfaitaire : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_4.amende_forfaitaire} {EURO}</span></div>
              <div style={{color: '#94a3b8'}}>Amende maximale : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_4.amende_max} {EURO}</span></div>
            </div>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8, marginBottom: 8}}>
              <div style={{fontWeight: 700, color: '#ef4444', marginBottom: 4}}>{data.bareme_sanctions.classe_5.intitule}</div>
              <div style={{color: '#94a3b8'}}>Amende maximale : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_5.amende_max} {EURO}</span></div>
              <div style={{color: '#94a3b8'}}>En récidive : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_5.amende_recidive} {EURO}</span></div>
            </div>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8}}>
              <div style={{fontWeight: 700, color: '#dc2626', marginBottom: 4}}>{data.bareme_sanctions.delits.intitule}</div>
              <div style={{color: '#94a3b8'}}>Falsification : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.falsification}</span></div>
              <div style={{color: '#94a3b8'}}>Absence chronotachygraphe : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.absence_chronotachygraphe}</span></div>
              <div style={{color: '#94a3b8'}}>Carte non conforme : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.carte_non_conforme}</span></div>
              <div style={{color: '#94a3b8'}}>Refus de contrôle : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.refus_controle}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
