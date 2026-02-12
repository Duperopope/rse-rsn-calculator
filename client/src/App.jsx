import React, { useState, useEffect, useCallback } from 'react';

// ============================================================
// ICÔNES SVG OFFICIELLES DU TACHYGRAPHE (CE 3821/85 Annexe IB)
// Source: https://fleetgo.fr/tachygraphe/les-symboles-et-pictogrammes-chronotachygraphe/
// Source: https://www.webfleet.com/en_gb/webfleet/fleet-management/glossary/digi-tacho-symbols/
// ============================================================

function IconeConduite({ size = 28, color = '#3b82f6' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" stroke={color} strokeWidth="6" fill="none" />
      <circle cx="50" cy="50" r="8" fill={color} />
      <line x1="50" y1="5" x2="50" y2="20" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="5" y1="50" x2="20" y2="50" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="95" y1="50" x2="80" y2="50" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="95" x2="50" y2="80" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <line x1="15" y1="15" x2="26" y2="26" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="85" y1="15" x2="74" y2="26" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="15" y1="85" x2="26" y2="74" stroke={color} strokeWidth="4" strokeLinecap="round" />
      <line x1="85" y1="85" x2="74" y2="74" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function IconeAutreTache({ size = 28, color = '#f59e0b' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="20" y1="80" x2="50" y2="30" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <line x1="80" y1="80" x2="50" y2="30" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <rect x="15" y="72" width="18" height="8" rx="2" fill={color} transform="rotate(-60 24 76)" />
      <rect x="67" y="72" width="18" height="8" rx="2" fill={color} transform="rotate(60 76 76)" />
      <circle cx="50" cy="28" r="6" fill={color} />
    </svg>
  );
}

function IconeDisponibilite({ size = 28, color = '#a855f7' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" stroke={color} strokeWidth="6" fill="none" rx="4" />
      <line x1="10" y1="90" x2="90" y2="10" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function IconeRepos({ size = 28, color = '#22c55e' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="70" width="90" height="6" rx="3" fill={color} />
      <rect x="10" y="55" width="80" height="18" rx="4" stroke={color} strokeWidth="4" fill="none" />
      <path d="M15 55 Q15 35 35 35 Q45 35 45 45 Q45 55 35 55" fill={color} opacity="0.6" />
      <rect x="5" y="30" width="6" height="46" rx="3" fill={color} />
      <rect x="89" y="30" width="6" height="46" rx="3" fill={color} />
    </svg>
  );
}

// ============================================================
// CONSTANTES & CONFIGURATION
// ============================================================

const TYPES_ACTIVITE = [
  { id: 'conduite', code: 'C', label: 'Conduite', Icone: IconeConduite, color: '#3b82f6' },
  { id: 'autre_tache', code: 'T', label: 'Autre tâche', Icone: IconeAutreTache, color: '#f59e0b' },
  { id: 'disponibilite', code: 'D', label: 'Disponibilité', Icone: IconeDisponibilite, color: '#a855f7' },
  { id: 'repos', code: 'P', label: 'Repos / Pause', Icone: IconeRepos, color: '#22c55e' },
];

const CSV_EXEMPLE = [
  '# Exemple CSV - Semaine type conducteur transport de personnes',
  '# Format : date;heure_debut;heure_fin;type (C=Conduite, T=Autre tâche, D=Disponibilité, P=Pause)',
  '2025-01-06;06:00;06:30;T',
  '2025-01-06;06:30;10:30;C',
  '2025-01-06;10:30;11:00;P',
  '2025-01-06;11:00;13:00;C',
  '2025-01-06;13:00;14:00;P',
  '2025-01-06;14:00;17:30;C',
  '2025-01-06;17:30;18:00;T',
  '2025-01-07;05:30;06:00;T',
  '2025-01-07;06:00;10:00;C',
  '2025-01-07;10:00;10:30;P',
  '2025-01-07;10:30;13:00;C',
  '2025-01-07;13:00;13:45;P',
  '2025-01-07;13:45;17:00;C',
  '2025-01-07;17:00;17:30;T',
  '2025-01-08;06:00;06:15;T',
  '2025-01-08;06:15;10:30;C',
  '2025-01-08;10:30;11:00;P',
  '2025-01-08;11:00;14:00;C',
  '2025-01-08;14:00;14:45;P',
  '2025-01-08;14:45;18:00;C',
  '2025-01-08;18:00;18:15;T',
].join('\n');

// ============================================================
// STYLES (thème sombre, cohérent avec index.html body #0f172a)
// ============================================================

const S = {
  page: { maxWidth: 920, margin: '0 auto', padding: 16, minHeight: '100vh' },
  header: { textAlign: 'center', padding: '24px 16px', marginBottom: 20, background: 'linear-gradient(135deg, #1e293b, #0f172a)', borderRadius: 16, border: '1px solid #334155' },
  h1: { fontSize: '1.5em', fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px 0' },
  sub: { fontSize: '0.9em', color: '#94a3b8', margin: 0 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #334155' },
  cardTitle: { fontSize: '1.05em', fontWeight: 600, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  label: { fontSize: '0.85em', fontWeight: 600, color: '#94a3b8', marginBottom: 6, display: 'block' },
  select: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.95em', marginBottom: 12 },
  textarea: { width: '100%', minHeight: 180, padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '0.85em', fontFamily: "'Courier New', monospace", resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' },
  btnPrimary: { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: '1em', fontWeight: 600, cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', minHeight: 48 },
  btnSmall: { background: '#1e3a5f', color: '#93c5fd', border: '1px solid #2563eb', borderRadius: 8, padding: '8px 14px', fontSize: '0.82em', fontWeight: 500, cursor: 'pointer', marginRight: 8, marginBottom: 8, minHeight: 40 },
  legend: { display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', padding: '12px 0' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82em', color: '#cbd5e1' },
  resultCard: { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #334155' },
  scoreBar: { height: 12, borderRadius: 6, background: '#0f172a', overflow: 'hidden', marginBottom: 8 },
  infrCard: { background: '#2d1215', border: '1px solid #7f1d1d', borderRadius: 10, padding: 14, marginBottom: 10 },
  warnCard: { background: '#2d2305', border: '1px solid #854d0e', borderRadius: 10, padding: 14, marginBottom: 10 },
  okCard: { background: '#052e16', border: '1px solid #166534', borderRadius: 10, padding: 14, marginBottom: 10 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72em', fontWeight: 700, marginRight: 8 },
  badgeRed: { background: '#450a0a', color: '#fca5a5' },
  badgeOrg: { background: '#451a03', color: '#fde68a' },
  badgeGrn: { background: '#052e16', color: '#86efac' },
  totalBad: { textAlign: 'center', padding: 20, background: 'linear-gradient(135deg, #dc2626, #991b1b)', borderRadius: 12, color: 'white', marginTop: 16 },
  totalGood: { textAlign: 'center', padding: 20, background: 'linear-gradient(135deg, #16a34a, #15803d)', borderRadius: 12, color: 'white', marginTop: 16 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 },
  statBox: { background: '#0f172a', borderRadius: 10, padding: 12, textAlign: 'center', border: '1px solid #334155' },
  statVal: { fontSize: '1.3em', fontWeight: 700, color: '#f1f5f9' },
  statLbl: { fontSize: '0.75em', color: '#94a3b8', marginTop: 4 },
  dayCard: { background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 10, border: '1px solid #334155' },
  dayHdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' },
  dayTitle: { fontWeight: 600, color: '#f1f5f9', fontSize: '0.95em' },
  dayGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 },
  dayStat: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: '#1e293b', border: '1px solid #334155' },
  scaleSection: { background: '#0f172a', borderRadius: 10, padding: 14, marginTop: 16, border: '1px solid #334155' },
  scaleRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e293b', fontSize: '0.85em', color: '#cbd5e1' },
  errBox: { background: '#2d1215', border: '1px solid #7f1d1d', borderRadius: 10, padding: 14, marginBottom: 12, color: '#fca5a5', fontSize: '0.85em' },
  footer: { textAlign: 'center', marginTop: 24, padding: 20, fontSize: '0.8em', color: '#64748b' },
  tabs: { display: 'flex', gap: 0, marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' },
  tab: { flex: 1, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600, background: '#0f172a', color: '#94a3b8', border: 'none', minHeight: 44 },
  tabOn: { flex: 1, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', fontSize: '0.85em', fontWeight: 600, background: '#1e3a5f', color: '#93c5fd', border: 'none', minHeight: 44 },
  fileInput: { display: 'block', width: '100%', padding: 10, marginBottom: 12, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: '0.9em', minHeight: 48, boxSizing: 'border-box' },
};

// ============================================================
// APP PRINCIPAL
// ============================================================

export default function App() {
  const [onglet, setOnglet] = useState('csv');
  const [csv, setCsv] = useState('');
  const [typeService, setTypeService] = useState('STANDARD');
  const [pays, setPays] = useState('FR');
  const [listePays, setListePays] = useState({});
  const [resultats, setResultats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');
  const [serverInfo, setServerInfo] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { setServerInfo(d); console.log('[RSE/RSN] Serveur OK:', d.version); })
      .catch(() => console.warn('[RSE/RSN] Serveur non disponible'));
    fetch('/api/pays')
      .then(r => r.json())
      .then(d => setListePays(d))
      .catch(() => { });
  }, []);

  const chargerExemple = useCallback(() => {
    fetch('/api/example-csv')
      .then(r => r.text())
      .then(t => { setCsv(t); setResultats(null); setErreur(''); })
      .catch(() => { setCsv(CSV_EXEMPLE); setResultats(null); setErreur(''); });
  }, []);

  const handleUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('fichier', file);
    fetch('/api/upload', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => {
        if (d.csv) { setCsv(d.csv); setResultats(null); setErreur(''); }
        else if (d.error) setErreur(d.error);
      })
      .catch(() => {
        const reader = new FileReader();
        reader.onload = (ev) => { setCsv(ev.target.result); setResultats(null); setErreur(''); };
        reader.readAsText(file, 'UTF-8');
      });
  }, []);

  const analyser = useCallback(() => {
    if (!csv.trim()) { setErreur('Veuillez coller du contenu CSV ou charger un fichier.'); return; }
    setLoading(true); setErreur(''); setResultats(null);
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv, typeService, pays }),
    })
      .then(r => r.json())
      .then(d => { if (d.error) setErreur(d.error); else setResultats(d); setLoading(false); })
      .catch(err => { setErreur('Erreur de connexion : ' + err.message); setLoading(false); });
  }, [csv, typeService, pays]);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h1 style={S.h1}>Calculateur RSE / RSN</h1>
        <p style={S.sub}>Analyse de conformité — Règlement CE 561/2006 — Transport routier de personnes</p>
        {serverInfo && serverInfo.version && (
          <p style={{ fontSize: '0.75em', color: '#475569', marginTop: 8 }}>
            Serveur v{serverInfo.version} — {serverInfo.pays_supportes} pays supportés
          </p>
        )}
      </div>

      {/* Pictogrammes */}
      <div style={S.card}>
        <div style={S.cardTitle}>Pictogrammes officiels du tachygraphe</div>
        <div style={S.legend}>
          {TYPES_ACTIVITE.map(t => (
            <div key={t.id} style={S.legendItem}>
              <t.Icone size={22} color={t.color} />
              <span>{t.label} ({t.code})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Paramètres */}
      <div style={S.card}>
        <div style={S.cardTitle}>Paramètres d'analyse</div>
        <label style={S.label}>Type de service</label>
        <select style={S.select} value={typeService} onChange={e => setTypeService(e.target.value)}>
          <option value="STANDARD">Standard</option>
          <option value="REGULIER">Service régulier (&gt; 50 km)</option>
          <option value="OCCASIONNEL">Service occasionnel</option>
          <option value="SLO">Service librement organisé (SLO)</option>
        </select>
        <label style={S.label}>Pays</label>
        <select style={S.select} value={pays} onChange={e => setPays(e.target.value)}>
          {Object.keys(listePays).length > 0
            ? Object.entries(listePays).map(([code, info]) => (
              <option key={code} value={code}>{info.nom} (UTC+{info.utc_hiver}/{info.utc_ete})</option>
            ))
            : <option value="FR">France (UTC+1/+2)</option>
          }
        </select>
      </div>

      {/* Données CSV */}
      <div style={S.card}>
        <div style={S.cardTitle}>Données d'activité</div>
        <div style={S.tabs}>
          <button style={onglet === 'csv' ? S.tabOn : S.tab} onClick={() => setOnglet('csv')}>Coller du CSV</button>
          <button style={onglet === 'fichier' ? S.tabOn : S.tab} onClick={() => setOnglet('fichier')}>Charger un fichier</button>
        </div>

        {onglet === 'csv' && (
          <div>
            <label style={S.label}>Format : date;heure_début;heure_fin;type (C/T/D/P)</label>
            <textarea style={S.textarea} value={csv} onChange={e => { setCsv(e.target.value); setResultats(null); }}
              placeholder={'2025-01-06;06:00;10:30;C\n2025-01-06;10:30;11:00;P\n2025-01-06;11:00;14:00;C'} />
            <div>
              <button style={S.btnSmall} onClick={chargerExemple}>Charger l'exemple</button>
              <button style={S.btnSmall} onClick={() => { setCsv(''); setResultats(null); setErreur(''); }}>Effacer</button>
            </div>
          </div>
        )}

        {onglet === 'fichier' && (
          <div>
            <label style={S.label}>Sélectionner un fichier .csv ou .txt</label>
            <input type="file" accept=".csv,.txt" onChange={handleUpload} style={S.fileInput} />
            {csv && <p style={{ fontSize: '0.8em', color: '#22c55e', marginTop: 8 }}>
              Fichier chargé — {csv.split('\n').filter(l => l.trim() && !l.startsWith('#')).length} lignes de données
            </p>}
          </div>
        )}

        {erreur && <div style={S.errBox}>{erreur}</div>}

        <button style={{ ...S.btnPrimary, marginTop: 16, opacity: loading ? 0.7 : 1 }} onClick={analyser} disabled={loading}>
          {loading ? 'Analyse en cours...' : 'Analyser la conformité'}
        </button>
      </div>

      {/* Résultats */}
      {resultats && <PanneauResultats r={resultats} />}

      {/* Barème */}
      <div style={S.scaleSection}>
        <div style={{ fontWeight: 600, fontSize: '0.95em', marginBottom: 12, color: '#f1f5f9' }}>
          Barème des sanctions (Code des transports)
        </div>
        <div style={S.scaleRow}><span>Contravention 4ème classe</span><span style={{ fontWeight: 600, color: '#fde68a' }}>135 € à 750 €</span></div>
        <div style={S.scaleRow}><span>Contravention 5ème classe</span><span style={{ fontWeight: 600, color: '#fca5a5' }}>1 500 € à 3 000 €</span></div>
        <div style={S.scaleRow}><span>Falsification tachygraphe</span><span style={{ fontWeight: 600, color: '#fca5a5' }}>1 an prison + 30 000 €</span></div>
        <div style={S.scaleRow}><span>Absence de tachygraphe</span><span style={{ fontWeight: 600, color: '#fca5a5' }}>1 500 € (5ème classe)</span></div>
        <div style={S.scaleRow}><span>Carte conducteur non conforme</span><span style={{ fontWeight: 600, color: '#fde68a' }}>6 mois prison + 3 750 €</span></div>
        <div style={S.scaleRow}><span>Refus de contrôle</span><span style={{ fontWeight: 600, color: '#fca5a5' }}>6 mois prison + 7 500 €</span></div>
      </div>

      <div style={S.footer}>
        <p>Calculateur RSE/RSN v5.3.0 — Créé par Samir Medjaher</p>
        <p>Sources : Règlement CE 561/2006 | Règlement UE 165/2014 | Code des transports français</p>
        <p>Cet outil est informatif. Les montants réels sont fixés par le tribunal.</p>
      </div>
    </div>
  );
}

// ============================================================
// PANNEAU DE RÉSULTATS (exploite toute la réponse API du backend)
// ============================================================

function PanneauResultats({ r }) {
  const [jourOuvert, setJourOuvert] = useState(null);
  const scoreColor = r.score >= 80 ? '#22c55e' : r.score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={S.resultCard}>
      <div style={S.cardTitle}>Résultats de l'analyse</div>

      {/* Score */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '2.5em', fontWeight: 700, color: scoreColor }}>{r.score}%</div>
        <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>Score de conformité</div>
        <div style={S.scoreBar}>
          <div style={{ height: '100%', width: r.score + '%', background: scoreColor, borderRadius: 6, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ fontSize: '0.85em', color: '#cbd5e1', marginTop: 8 }}>{r.resume}</div>
        {r.periode && r.periode !== 'N/A' && (
          <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: 4 }}>
            Période : {r.periode} — {r.nombre_jours} jour{r.nombre_jours > 1 ? 's' : ''} — Service : {r.type_service}
          </div>
        )}
      </div>

      {/* Statistiques */}
      {r.statistiques && (
        <div>
          <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 10, fontSize: '0.95em' }}>Statistiques globales</div>
          <div style={S.statGrid}>
            <div style={S.statBox}>
              <IconeConduite size={20} color="#3b82f6" />
              <div style={S.statVal}>{r.statistiques.conduite_totale_h}h</div>
              <div style={S.statLbl}>Conduite totale</div>
            </div>
            <div style={S.statBox}>
              <IconeAutreTache size={20} color="#f59e0b" />
              <div style={S.statVal}>{r.statistiques.travail_autre_total_h}h</div>
              <div style={S.statLbl}>Autre tâche</div>
            </div>
            <div style={S.statBox}>
              <IconeRepos size={20} color="#22c55e" />
              <div style={S.statVal}>{r.statistiques.pause_totale_h}h</div>
              <div style={S.statLbl}>Pauses totales</div>
            </div>
            <div style={S.statBox}>
              <IconeDisponibilite size={20} color="#a855f7" />
              <div style={S.statVal}>{r.statistiques.disponibilite_totale_h}h</div>
              <div style={S.statLbl}>Disponibilité</div>
            </div>
            <div style={S.statBox}>
              <div style={S.statVal}>{r.statistiques.moyenne_conduite_jour_h}h</div>
              <div style={S.statLbl}>Moy. conduite/jour</div>
            </div>
            <div style={S.statBox}>
              <div style={S.statVal}>{r.statistiques.moyenne_travail_total_jour_h}h</div>
              <div style={S.statLbl}>Moy. travail total/jour</div>
            </div>
          </div>
        </div>
      )}

      {/* Erreurs parsing */}
      {r.erreurs_analyse && r.erreurs_analyse.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#fca5a5', marginBottom: 8, fontSize: '0.9em' }}>
            Erreurs de parsing ({r.erreurs_analyse.length})
          </div>
          {r.erreurs_analyse.map((err, i) => <div key={i} style={S.errBox}>{err}</div>)}
        </div>
      )}

      {/* Infractions */}
      {r.infractions && r.infractions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#fca5a5', marginBottom: 10, fontSize: '0.95em' }}>
            {r.infractions.length} infraction{r.infractions.length > 1 ? 's' : ''} détectée{r.infractions.length > 1 ? 's' : ''}
          </div>
          {r.infractions.map((inf, i) => (
            <div key={i} style={S.infrCard}>
              <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: '#fca5a5' }}>
                <span style={{ ...S.badge, ...S.badgeRed }}>{inf.classe}</span>
                {inf.regle}
              </div>
              <div style={{ fontSize: '0.83em', color: '#94a3b8', marginBottom: 4 }}>Limite : {inf.limite} — Constaté : {inf.constate}</div>
              <div style={{ fontSize: '0.83em', color: '#94a3b8', marginBottom: 4 }}>Dépassement : {inf.depassement}</div>
              <div style={{ fontSize: '0.83em', fontWeight: 600, color: '#fca5a5' }}>Amende : {inf.amende}</div>
            </div>
          ))}
        </div>
      )}

      {/* Avertissements */}
      {r.avertissements && r.avertissements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, color: '#fde68a', marginBottom: 10, fontSize: '0.95em' }}>
            {r.avertissements.length} avertissement{r.avertissements.length > 1 ? 's' : ''}
          </div>
          {r.avertissements.map((av, i) => (
            <div key={i} style={S.warnCard}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#fde68a' }}>
                <span style={{ ...S.badge, ...S.badgeOrg }}>Attention</span>{av.regle}
              </div>
              <div style={{ fontSize: '0.83em', color: '#94a3b8' }}>{av.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* OK */}
      {r.infractions && r.infractions.length === 0 && (
        <div style={S.okCard}>
          <div style={{ fontWeight: 600, color: '#86efac', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...S.badge, ...S.badgeGrn }}>Conforme</span>Aucune infraction détectée
          </div>
          <div style={{ fontSize: '0.83em', color: '#94a3b8', marginTop: 6 }}>
            Les temps enregistrés respectent les limites réglementaires CE 561/2006.
          </div>
        </div>
      )}

      {/* Détails par jour */}
      {r.details_jours && r.details_jours.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, color: '#f1f5f9', marginBottom: 10, fontSize: '0.95em' }}>
            Détail par journée ({r.details_jours.length} jour{r.details_jours.length > 1 ? 's' : ''})
          </div>
          {r.details_jours.map((jour, idx) => (
            <div key={idx} style={S.dayCard}>
              <div style={S.dayHdr} onClick={() => setJourOuvert(jourOuvert === idx ? null : idx)}>
                <div style={S.dayTitle}>{jour.date} — {jour.fuseau}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {jour.infractions.length > 0 && <span style={{ ...S.badge, ...S.badgeRed }}>{jour.infractions.length} infr.</span>}
                  {jour.avertissements.length > 0 && <span style={{ ...S.badge, ...S.badgeOrg }}>{jour.avertissements.length} avert.</span>}
                  {jour.infractions.length === 0 && jour.avertissements.length === 0 && <span style={{ ...S.badge, ...S.badgeGrn }}>OK</span>}
                  <span style={{ color: '#94a3b8', fontSize: '1.2em' }}>{jourOuvert === idx ? '\u25B2' : '\u25BC'}</span>
                </div>
              </div>

              {jourOuvert === idx && (
                <div>
                  <div style={S.dayGrid}>
                    <div style={S.dayStat}><IconeConduite size={16} color="#3b82f6" /><span style={{ fontSize: '0.8em', color: '#cbd5e1' }}>{jour.conduite_h}h</span></div>
                    <div style={S.dayStat}><IconeAutreTache size={16} color="#f59e0b" /><span style={{ fontSize: '0.8em', color: '#cbd5e1' }}>{jour.travail_h}h</span></div>
                    <div style={S.dayStat}><IconeRepos size={16} color="#22c55e" /><span style={{ fontSize: '0.8em', color: '#cbd5e1' }}>{jour.pause_h}h</span></div>
                    <div style={S.dayStat}><IconeDisponibilite size={16} color="#a855f7" /><span style={{ fontSize: '0.8em', color: '#cbd5e1' }}>{jour.disponibilite_h}h</span></div>
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <span>Amplitude : {jour.amplitude_estimee_h}h</span>
                    <span>Conduite continue max : {jour.conduite_continue_max_min} min</span>
                    <span>Repos estimé : {jour.repos_estime_h}h</span>
                    <span>Activités : {jour.nombre_activites}</span>
                  </div>
                  {jour.infractions.length > 0 && <div style={{ marginTop: 10 }}>
                    {jour.infractions.map((inf, j) => (
                      <div key={j} style={{ ...S.infrCard, padding: 10, marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82em', color: '#fca5a5', marginBottom: 4 }}>
                          <span style={{ ...S.badge, ...S.badgeRed, fontSize: '0.7em' }}>{inf.classe}</span>{inf.regle}
                        </div>
                        <div style={{ fontSize: '0.78em', color: '#94a3b8' }}>
                          Limite : {inf.limite} — Constaté : {inf.constate} — Dépassement : {inf.depassement}
                        </div>
                      </div>
                    ))}
                  </div>}
                  {jour.avertissements.length > 0 && <div style={{ marginTop: 8 }}>
                    {jour.avertissements.map((av, j) => (
                      <div key={j} style={{ ...S.warnCard, padding: 10, marginBottom: 6 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82em', color: '#fde68a', marginBottom: 4 }}>{av.regle}</div>
                        <div style={{ fontSize: '0.78em', color: '#94a3b8' }}>{av.message}</div>
                      </div>
                    ))}
                  </div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Total amende */}
      {r.amende_estimee > 0 ? (
        <div style={S.totalBad}>
          <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Amende totale estimée</div>
          <div style={{ fontSize: '2.2em', fontWeight: 700, margin: '8px 0' }}>{r.amende_estimee.toLocaleString('fr-FR')} €</div>
          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>Estimation basée sur les amendes forfaitaires — Montant réel fixé par le tribunal</div>
        </div>
      ) : (
        <div style={S.totalGood}>
          <div style={{ fontSize: '1.3em', fontWeight: 700 }}>Aucune amende</div>
          <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: 6 }}>Situation conforme à la réglementation</div>
        </div>
      )}
    </div>
  );
}
