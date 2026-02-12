import React, { useState, useEffect, useCallback } from 'react';

/* ============================================================
   CONSTANTES UI
   ============================================================ */
const API = '/api';

const TYPES_ACTIVITE = {
  C: { code: 'C', label: 'Conduite', couleur: '#3b82f6', icone: '\u{1F698}' },
  T: { code: 'T', label: 'Autre tache', couleur: '#f59e0b', icone: '\u{1F527}' },
  D: { code: 'D', label: 'Disponibilite', couleur: '#8b5cf6', icone: '\u{23F3}' },
  P: { code: 'P', label: 'Pause / Repos', couleur: '#10b981', icone: '\u{2615}' }
};

const TYPES_SERVICE = [
  { code: 'STANDARD', label: 'Standard' },
  { code: 'REGULIER', label: 'Ligne reguliere (>50km)' },
  { code: 'OCCASIONNEL', label: 'Occasionnel' },
  { code: 'SLO', label: 'SLO (Service libre occasionnel)' }
];

const PAYS_LISTE = [
  { code: 'FR', nom: 'France', drapeau: '\u{1F1EB}\u{1F1F7}' },
  { code: 'DE', nom: 'Allemagne', drapeau: '\u{1F1E9}\u{1F1EA}' },
  { code: 'ES', nom: 'Espagne', drapeau: '\u{1F1EA}\u{1F1F8}' },
  { code: 'IT', nom: 'Italie', drapeau: '\u{1F1EE}\u{1F1F9}' },
  { code: 'BE', nom: 'Belgique', drapeau: '\u{1F1E7}\u{1F1EA}' },
  { code: 'NL', nom: 'Pays-Bas', drapeau: '\u{1F1F3}\u{1F1F1}' },
  { code: 'PT', nom: 'Portugal', drapeau: '\u{1F1F5}\u{1F1F9}' },
  { code: 'GB', nom: 'Royaume-Uni', drapeau: '\u{1F1EC}\u{1F1E7}' },
  { code: 'CH', nom: 'Suisse', drapeau: '\u{1F1E8}\u{1F1ED}' },
  { code: 'AT', nom: 'Autriche', drapeau: '\u{1F1E6}\u{1F1F9}' },
  { code: 'PL', nom: 'Pologne', drapeau: '\u{1F1F5}\u{1F1F1}' },
  { code: 'RO', nom: 'Roumanie', drapeau: '\u{1F1F7}\u{1F1F4}' },
  { code: 'GR', nom: 'Grece', drapeau: '\u{1F1EC}\u{1F1F7}' },
  { code: 'CZ', nom: 'Tchequie', drapeau: '\u{1F1E8}\u{1F1FF}' },
  { code: 'HU', nom: 'Hongrie', drapeau: '\u{1F1ED}\u{1F1FA}' },
  { code: 'SE', nom: 'Suede', drapeau: '\u{1F1F8}\u{1F1EA}' },
  { code: 'DK', nom: 'Danemark', drapeau: '\u{1F1E9}\u{1F1F0}' },
  { code: 'FI', nom: 'Finlande', drapeau: '\u{1F1EB}\u{1F1EE}' },
  { code: 'IE', nom: 'Irlande', drapeau: '\u{1F1EE}\u{1F1EA}' },
  { code: 'LU', nom: 'Luxembourg', drapeau: '\u{1F1F1}\u{1F1FA}' },
  { code: 'NO', nom: 'Norvege', drapeau: '\u{1F1F3}\u{1F1F4}' },
  { code: 'MA', nom: 'Maroc', drapeau: '\u{1F1F2}\u{1F1E6}' },
  { code: 'TN', nom: 'Tunisie', drapeau: '\u{1F1F9}\u{1F1F3}' },
  { code: 'DZ', nom: 'Algerie', drapeau: '\u{1F1E9}\u{1F1FF}' },
  { code: 'TR', nom: 'Turquie', drapeau: '\u{1F1F9}\u{1F1F7}' }
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
const styles = {
  container: { maxWidth: 900, margin: '0 auto', padding: '16px', minHeight: '100vh' },
  header: { textAlign: 'center', padding: '24px 0', borderBottom: '2px solid #1e293b', marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 800, color: '#60a5fa', margin: 0 },
  headerSub: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  card: { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #334155' },
  cardTitle: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  field: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  btnPrimary: { background: '#3b82f6', color: '#fff', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 700, width: '100%', minHeight: 48 },
  btnSecondary: { background: '#334155', color: '#e2e8f0', borderRadius: 8, padding: '8px 16px', fontSize: 14, minHeight: 40 },
  btnDanger: { background: '#ef4444', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 13, minHeight: 36 },
  btnSuccess: { background: '#10b981', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 14, minHeight: 40 },
  actRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid #334155' },
  scoreBox: { textAlign: 'center', padding: 24, borderRadius: 12, marginBottom: 16 },
  infraction: { background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 8, padding: 14, marginBottom: 10 },
  warning: { background: '#78350f', border: '1px solid #f59e0b', borderRadius: 8, padding: 14, marginBottom: 10 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 },
  statCard: { background: '#0f172a', borderRadius: 8, padding: 12, textAlign: 'center' },
  timeline: { display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', marginTop: 8, marginBottom: 8 },
  footer: { textAlign: 'center', padding: '24px 0', marginTop: 24, borderTop: '1px solid #1e293b', color: '#64748b', fontSize: 12 },
  amendeBox: { background: '#7f1d1d', border: '2px solid #dc2626', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 16 },
  toggleBtn: { background: 'transparent', color: '#94a3b8', padding: '4px 8px', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', border: 'none', minHeight: 'auto' },
  tabBar: { display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#334155', color: '#94a3b8', border: 'none', minHeight: 44 },
  tabActive: { flex: 1, padding: '10px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', minHeight: 44 }
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

  // Verifier le serveur
  useEffect(() => {
    fetch(API + '/health')
      .then(r => r.json())
      .then(() => setServeurOk(true))
      .catch(() => setServeurOk(false));
  }, []);

  function creerJourVide() {
    const auj = new Date().toISOString().split('T')[0];
    return { date: auj, activites: [{ heure_debut: '06:00', heure_fin: '07:00', type: 'C' }] };
  }

  function ajouterJour() {
    const dernierJour = jours[jours.length - 1];
    const dateObj = new Date(dernierJour.date);
    dateObj.setDate(dateObj.getDate() + 1);
    const nouvelleDate = dateObj.toISOString().split('T')[0];
    const newIdx = jours.length;
    setJoursOuverts(prev => ({...prev, [newIdx]: true}));
    setJours([...jours, { date: nouvelleDate, activites: [{ heure_debut: '06:00', heure_fin: '07:00', type: 'C' }] }]);
  }

  function supprimerJour(idx) {
    if (jours.length <= 1) return;
    setJours(jours.filter((_, i) => i !== idx));
  }

  function dupliquerJour(idx) {
    const jourSrc = jours[idx];
    const dateObj = new Date(jourSrc.date);
    dateObj.setDate(dateObj.getDate() + 1);
    const copie = { date: dateObj.toISOString().split('T')[0], activites: jourSrc.activites.map(a => ({...a})) };
    const newJours = [...jours];
    newJours.splice(idx + 1, 0, copie);
    setJours(newJours);
  }

  function appliquerTemplate(idxJour, nomTemplate) {
    const tpl = TEMPLATES[nomTemplate];
    if (!tpl) return;
    const newJours = [...jours];
    newJours[idxJour] = { ...newJours[idxJour], activites: tpl.map(a => ({...a})) };
    setJours(newJours);
  }

  function modifierDateJour(idxJour, nouvelleDate) {
    const newJours = [...jours];
    newJours[idxJour] = { ...newJours[idxJour], date: nouvelleDate };
    setJours(newJours);
  }

  function ajouterActivite(idxJour) {
    const newJours = [...jours];
    const derniere = newJours[idxJour].activites[newJours[idxJour].activites.length - 1];
    newJours[idxJour].activites.push({ heure_debut: derniere ? derniere.heure_fin : '08:00', heure_fin: derniere ? incrementerHeure(derniere.heure_fin, 60) : '09:00', type: 'C' });
    setJours(newJours);
  }

  function supprimerActivite(idxJour, idxAct) {
    const newJours = [...jours];
    if (newJours[idxJour].activites.length <= 1) return;
    newJours[idxJour].activites = newJours[idxJour].activites.filter((_, i) => i !== idxAct);
    setJours(newJours);
  }

  function modifierActivite(idxJour, idxAct, champ, valeur) {
    const newJours = [...jours];
    newJours[idxJour].activites[idxAct] = { ...newJours[idxJour].activites[idxAct], [champ]: valeur };
    setJours(newJours);
  }

  function incrementerHeure(heure, minutes) {
    const [h, m] = heure.split(':').map(Number);
    const totalMin = h * 60 + m + minutes;
    const nh = Math.floor(totalMin / 60) % 24;
    const nm = totalMin % 60;
    return String(nh).padStart(2, '0') + ':' + String(nm).padStart(2, '0');
  }

  function construireCSV() {
    let csv = '';
    jours.forEach(jour => {
      jour.activites.forEach(act => {
        csv += jour.date + ';' + act.heure_debut + ';' + act.heure_fin + ';' + act.type + '\n';
      });
    });
    return csv;
  }

  function calculerStatsJour(activites) {
    let conduite = 0, travail = 0, pause = 0, dispo = 0;
    activites.forEach(a => {
      const [hd, md] = a.heure_debut.split(':').map(Number);
      const [hf, mf] = a.heure_fin.split(':').map(Number);
      let duree = (hf * 60 + mf) - (hd * 60 + md);
      if (duree < 0) duree += 24 * 60;
      switch (a.type) {
        case 'C': conduite += duree; break;
        case 'T': travail += duree; break;
        case 'D': dispo += duree; break;
        case 'P': pause += duree; break;
      }
    });
    return { conduite, travail, pause, dispo };
  }

  function toggleJour(idx) {
    setJoursOuverts(prev => ({...prev, [idx]: !prev[idx]}));
  }

  async function chargerExemple() {
    try {
      const r = await fetch(API + '/example-csv');
      const texte = await r.text();
      setCsvTexte(texte);
    } catch(e) {
      setErreur("Impossible de charger l'exemple CSV");
    }
  }

  async function lancerAnalyse() {
    setChargement(true);
    setErreur('');
    setResultat(null);
    try {
      const csvFinal = mode === 'manuel' ? construireCSV() : csvTexte;
      if (!csvFinal.trim()) {
        setErreur("Aucune donnee a analyser.");
        setChargement(false);
        return;
      }
      const r = await fetch(API + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvFinal, typeService: typeService, pays: pays })
      });
      const data = await r.json();
      if (!r.ok) {
        setErreur(data.error || "Erreur serveur");
      } else {
        setResultat(data);
      }
    } catch(e) {
      setErreur("Erreur de connexion au serveur : " + e.message);
    }
    setChargement(false);
  }

  async function uploadFichier(e) {
    const fichier = e.target.files[0];
    if (!fichier) return;
    const formData = new FormData();
    formData.append('fichier', fichier);
    try {
      const r = await fetch(API + '/upload', { method: 'POST', body: formData });
      const data = await r.json();
      if (data.csv) {
        setCsvTexte(data.csv);
        setMode('csv');
      }
    } catch(e) {
      setErreur("Erreur upload : " + e.message);
    }
  }

  /* ============================================================
     RENDU
     ============================================================ */
  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>RSE/RSN Calculator</h1>
        <p style={styles.headerSub}>
          Reglementation sociale europeenne et nationale - Transport routier de personnes
        </p>
        <div style={{marginTop: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8}}>
          <span style={{width: 10, height: 10, borderRadius: '50%', background: serveurOk ? '#10b981' : '#ef4444', display: 'inline-block'}}></span>
          <span style={{fontSize: 12, color: serveurOk ? '#10b981' : '#ef4444'}}>{serveurOk ? 'Serveur connecte' : 'Serveur hors ligne'}</span>
        </div>
      </div>

      {/* PARAMETRES */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>
          <span style={{fontSize: 20}}>{'\u2699\uFE0F'}</span> Parametres
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Pays</label>
            <select value={pays} onChange={e => setPays(e.target.value)}>
              {PAYS_LISTE.map(p => (
                <option key={p.code} value={p.code}>{p.drapeau} {p.nom}</option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Type de service</label>
            <select value={typeService} onChange={e => setTypeService(e.target.value)}>
              {TYPES_SERVICE.map(ts => (
                <option key={ts.code} value={ts.code}>{ts.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MODE */}
      <div style={styles.tabBar}>
        <button style={mode === 'manuel' ? styles.tabActive : styles.tab} onClick={() => setMode('manuel')}>
          {'\u{270F}\uFE0F'} Saisie manuelle
        </button>
        <button style={mode === 'csv' ? styles.tabActive : styles.tab} onClick={() => setMode('csv')}>
          {'\u{1F4C4}'} Import CSV
        </button>
      </div>

      {/* MODE MANUEL */}
      {mode === 'manuel' && (
        <div>
          {jours.map((jour, idxJour) => {
            const statsJour = calculerStatsJour(jour.activites);
            const ouvert = joursOuverts[idxJour] !== false;
            return (
              <div key={idxJour} style={styles.card}>
                {/* En-tete du jour */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: ouvert ? 12 : 0}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 auto'}}>
                    <button style={styles.toggleBtn} onClick={() => toggleJour(idxJour)}>{ouvert ? '\u25BC' : '\u25B6'}</button>
                    <span style={{fontWeight: 700, color: '#60a5fa'}}>Jour {idxJour + 1}</span>
                    <input type="date" value={jour.date} onChange={e => modifierDateJour(idxJour, e.target.value)} style={{maxWidth: 170, minHeight: 40}} />
                  </div>
                  <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    <button style={styles.btnSecondary} onClick={() => dupliquerJour(idxJour)}>Dupliquer</button>
                    {jours.length > 1 && <button style={styles.btnDanger} onClick={() => supprimerJour(idxJour)}>Supprimer</button>}
                  </div>
                </div>

                {/* Stats rapides du jour */}
                <div style={{...styles.statGrid, marginBottom: ouvert ? 12 : 0}}>
                  <div style={{...styles.statCard, borderLeft: '3px solid #3b82f6'}}>
                    <div style={{fontSize: 11, color: '#94a3b8'}}>Conduite</div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#3b82f6'}}>{(statsJour.conduite / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...styles.statCard, borderLeft: '3px solid #f59e0b'}}>
                    <div style={{fontSize: 11, color: '#94a3b8'}}>Autre tache</div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#f59e0b'}}>{(statsJour.travail / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...styles.statCard, borderLeft: '3px solid #10b981'}}>
                    <div style={{fontSize: 11, color: '#94a3b8'}}>Pause</div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#10b981'}}>{(statsJour.pause / 60).toFixed(1)}h</div>
                  </div>
                  <div style={{...styles.statCard, borderLeft: '3px solid #8b5cf6'}}>
                    <div style={{fontSize: 11, color: '#94a3b8'}}>Dispo</div>
                    <div style={{fontSize: 16, fontWeight: 700, color: '#8b5cf6'}}>{(statsJour.dispo / 60).toFixed(1)}h</div>
                  </div>
                </div>

                {/* Timeline visuelle */}
                {ouvert && (
                  <div style={styles.timeline}>
                    {jour.activites.map((act, ia) => {
                      const [hd, md] = act.heure_debut.split(':').map(Number);
                      const [hf, mf] = act.heure_fin.split(':').map(Number);
                      let duree = (hf * 60 + mf) - (hd * 60 + md);
                      if (duree <= 0) duree += 24 * 60;
                      const totalJour = jour.activites.reduce((s, a2) => {
                        const [h1, m1] = a2.heure_debut.split(':').map(Number);
                        const [h2, m2] = a2.heure_fin.split(':').map(Number);
                        let d2 = (h2 * 60 + m2) - (h1 * 60 + m1);
                        if (d2 <= 0) d2 += 24 * 60;
                        return s + d2;
                      }, 0);
                      const pct = totalJour > 0 ? (duree / totalJour * 100) : 0;
                      return <div key={ia} style={{width: pct + '%', background: TYPES_ACTIVITE[act.type]?.couleur || '#666', minWidth: 2}} title={TYPES_ACTIVITE[act.type]?.label + ' ' + act.heure_debut + '-' + act.heure_fin}></div>;
                    })}
                  </div>
                )}

                {/* Templates */}
                {ouvert && (
                  <div style={{display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap'}}>
                    <span style={{fontSize: 12, color: '#64748b', lineHeight: '32px'}}>Modeles :</span>
                    <button style={{...styles.btnSecondary, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(idxJour, 'conduite')}>Journee conduite</button>
                    <button style={{...styles.btnSecondary, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(idxJour, 'mixte')}>Journee mixte</button>
                    <button style={{...styles.btnSecondary, fontSize: 12, minHeight: 32, padding: '4px 12px'}} onClick={() => appliquerTemplate(idxJour, 'nuit')}>Service de nuit</button>
                  </div>
                )}

                {/* Activites */}
                {ouvert && jour.activites.map((act, idxAct) => (
                  <div key={idxAct} style={styles.actRow}>
                    <span style={{fontSize: 18}}>{TYPES_ACTIVITE[act.type]?.icone}</span>
                    <select value={act.type} onChange={e => modifierActivite(idxJour, idxAct, 'type', e.target.value)} style={{flex: '1 1 120px', minHeight: 40}}>
                      {Object.values(TYPES_ACTIVITE).map(ta => (
                        <option key={ta.code} value={ta.code}>{ta.label}</option>
                      ))}
                    </select>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto'}}>
                      <label style={{fontSize: 10, color: '#64748b'}}>Debut</label>
                      <input type="time" value={act.heure_debut} onChange={e => modifierActivite(idxJour, idxAct, 'heure_debut', e.target.value)} style={{minHeight: 40, width: 120}} />
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto'}}>
                      <label style={{fontSize: 10, color: '#64748b'}}>Fin</label>
                      <input type="time" value={act.heure_fin} onChange={e => modifierActivite(idxJour, idxAct, 'heure_fin', e.target.value)} style={{minHeight: 40, width: 120}} />
                    </div>
                    {jour.activites.length > 1 && (
                      <button style={{...styles.btnDanger, minHeight: 36, padding: '4px 10px'}} onClick={() => supprimerActivite(idxJour, idxAct)}>{'\u2716'}</button>
                    )}
                  </div>
                ))}

                {ouvert && (
                  <button style={{...styles.btnSuccess, marginTop: 10, width: '100%'}} onClick={() => ajouterActivite(idxJour)}>
                    + Ajouter une activite
                  </button>
                )}
              </div>
            );
          })}

          <button style={{...styles.btnSecondary, width: '100%', marginBottom: 16}} onClick={ajouterJour}>
            + Ajouter un jour
          </button>
        </div>
      )}

      {/* MODE CSV */}
      {mode === 'csv' && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{1F4C4}'}</span> Donnees CSV
          </div>
          <p style={{fontSize: 13, color: '#94a3b8', marginBottom: 12}}>
            Format : <code style={{background: '#334155', padding: '2px 6px', borderRadius: 4}}>date;heure_debut;heure_fin;type</code>
            &nbsp; (C = Conduite, T = Autre tache, D = Disponibilite, P = Pause)
          </p>
          <textarea rows={12} value={csvTexte} onChange={e => setCsvTexte(e.target.value)} placeholder="2025-01-06;06:00;10:30;C&#10;2025-01-06;10:30;11:00;P&#10;..." />
          <div style={{display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap'}}>
            <button style={styles.btnSecondary} onClick={chargerExemple}>Charger l'exemple</button>
            <label style={{...styles.btnSecondary, display: 'inline-flex', alignItems: 'center', cursor: 'pointer'}}>
              Importer un fichier
              <input type="file" accept=".csv,.txt" onChange={uploadFichier} style={{display: 'none'}} />
            </label>
          </div>
        </div>
      )}

      {/* BOUTON ANALYSE */}
      <button style={{...styles.btnPrimary, marginBottom: 16, opacity: chargement ? 0.6 : 1}} onClick={lancerAnalyse} disabled={chargement}>
        {chargement ? 'Analyse en cours...' : '\u{1F50D} Lancer l\'analyse'}
      </button>

      {/* ERREUR */}
      {erreur && (
        <div style={{...styles.infraction, marginBottom: 16}}>
          <strong>Erreur :</strong> {erreur}
        </div>
      )}

      {/* RESULTATS */}
      {resultat && <ResultPanel data={resultat} />}

      {/* FOOTER */}
      <div style={styles.footer}>
        <p style={{fontWeight: 600, marginBottom: 4}}>RSE/RSN Calculator v5.0.0</p>
        <p>Credits : Samir Medjaher</p>
        <p style={{marginTop: 8}}>Sources reglementaires :</p>
        <p>Reglement CE 561/2006 (Art. 6-8) | Code des transports R3312-9, R3312-11, R3312-28, L3312-1, L3312-2</p>
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
  const [joursDetailOuverts, setJoursDetailOuverts] = useState({});

  function toggleDetail(idx) {
    setJoursDetailOuverts(prev => ({...prev, [idx]: !prev[idx]}));
  }

  const scoreCouleur = data.score >= 80 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#ef4444';
  const scoreBg = data.score >= 80 ? '#064e3b' : data.score >= 50 ? '#78350f' : '#7f1d1d';

  return (
    <div>
      {/* SCORE */}
      <div style={{...styles.scoreBox, background: scoreBg, border: '2px solid ' + scoreCouleur}}>
        <div style={{fontSize: 48, fontWeight: 800, color: scoreCouleur}}>{data.score}%</div>
        <div style={{fontSize: 16, color: '#e2e8f0', marginTop: 4}}>Score de conformite</div>
        <div style={{fontSize: 14, color: '#94a3b8', marginTop: 4}}>{data.resume}</div>
        {data.periode && data.periode !== 'N/A' && (
          <div style={{fontSize: 13, color: '#64748b', marginTop: 4}}>Periode : {data.periode} ({data.nombre_jours} jour(s))</div>
        )}
      </div>

      {/* AMENDE ESTIMEE */}
      {data.amende_estimee > 0 && (
        <div style={styles.amendeBox}>
          <div style={{fontSize: 14, color: '#fca5a5'}}>Amende totale estimee</div>
          <div style={{fontSize: 36, fontWeight: 800, color: '#ef4444'}}>{data.amende_estimee} \u20AC</div>
          <div style={{fontSize: 12, color: '#fca5a5', marginTop: 4}}>
            Estimation basee sur les amendes forfaitaires - Montant reel fixe par le tribunal
          </div>
        </div>
      )}

      {/* STATISTIQUES GLOBALES */}
      {data.statistiques && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{1F4CA}'}</span> Statistiques globales
          </div>
          <div style={styles.statGrid}>
            <div style={{...styles.statCard, borderLeft: '3px solid #3b82f6'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Conduite totale</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#3b82f6'}}>{data.statistiques.conduite_totale_h}h</div>
            </div>
            <div style={{...styles.statCard, borderLeft: '3px solid #f59e0b'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Autre tache</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#f59e0b'}}>{data.statistiques.travail_autre_total_h}h</div>
            </div>
            <div style={{...styles.statCard, borderLeft: '3px solid #10b981'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Pauses</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#10b981'}}>{data.statistiques.pause_totale_h}h</div>
            </div>
            <div style={{...styles.statCard, borderLeft: '3px solid #8b5cf6'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Disponibilite</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#8b5cf6'}}>{data.statistiques.disponibilite_totale_h}h</div>
            </div>
            <div style={{...styles.statCard, borderLeft: '3px solid #06b6d4'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Moy. conduite/jour</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#06b6d4'}}>{data.statistiques.moyenne_conduite_jour_h}h</div>
            </div>
            <div style={{...styles.statCard, borderLeft: '3px solid #ec4899'}}>
              <div style={{fontSize: 11, color: '#94a3b8'}}>Moy. travail total/jour</div>
              <div style={{fontSize: 20, fontWeight: 700, color: '#ec4899'}}>{data.statistiques.moyenne_travail_total_jour_h}h</div>
            </div>
          </div>
        </div>
      )}

      {/* INFRACTIONS */}
      {data.infractions && data.infractions.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{26D4}'}</span> Infractions ({data.infractions.length})
          </div>
          {data.infractions.map((inf, i) => (
            <div key={i} style={styles.infraction}>
              <div style={{fontWeight: 700, fontSize: 14, marginBottom: 6}}>{inf.regle}</div>
              <div style={{fontSize: 13, color: '#fca5a5'}}>
                Limite : {inf.limite} | Constate : {inf.constate} | Depassement : {inf.depassement}
              </div>
              <div style={{fontSize: 13, marginTop: 6, padding: '6px 10px', background: '#450a0a', borderRadius: 6}}>
                <span style={{fontWeight: 600}}>{inf.classe}</span> - Amende : {inf.amende}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AVERTISSEMENTS */}
      {data.avertissements && data.avertissements.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{26A0}\uFE0F'}</span> Avertissements ({data.avertissements.length})
          </div>
          {data.avertissements.map((av, i) => (
            <div key={i} style={styles.warning}>
              <div style={{fontWeight: 700, fontSize: 14, marginBottom: 4}}>{av.regle}</div>
              <div style={{fontSize: 13, color: '#fde68a'}}>{av.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* ERREURS D'ANALYSE */}
      {data.erreurs_analyse && data.erreurs_analyse.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{1F6A8}'}</span> Erreurs d'analyse ({data.erreurs_analyse.length})
          </div>
          {data.erreurs_analyse.map((err, i) => (
            <div key={i} style={{fontSize: 13, color: '#f87171', padding: '4px 0'}}>{err}</div>
          ))}
        </div>
      )}

      {/* DETAIL PAR JOUR */}
      {data.details_jours && data.details_jours.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{1F4C5}'}</span> Detail par jour
          </div>
          {data.details_jours.map((jour, i) => (
            <div key={i} style={{borderBottom: '1px solid #334155', paddingBottom: 10, marginBottom: 10}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer'}} onClick={() => toggleDetail(i)}>
                <div>
                  <span style={{fontWeight: 700, color: '#60a5fa'}}>{jour.date}</span>
                  <span style={{fontSize: 12, color: '#64748b', marginLeft: 8}}>{jour.fuseau}</span>
                  {jour.infractions.length > 0 && <span style={{marginLeft: 8, fontSize: 12, color: '#ef4444', fontWeight: 600}}>{jour.infractions.length} infraction(s)</span>}
                  {jour.avertissements.length > 0 && <span style={{marginLeft: 8, fontSize: 12, color: '#f59e0b'}}>{jour.avertissements.length} avert.</span>}
                </div>
                <span style={{color: '#64748b'}}>{joursDetailOuverts[i] ? '\u25BC' : '\u25B6'}</span>
              </div>

              <div style={{...styles.statGrid, marginTop: 6}}>
                <div style={styles.statCard}>
                  <div style={{fontSize: 10, color: '#94a3b8'}}>Conduite</div>
                  <div style={{fontSize: 14, fontWeight: 700, color: '#3b82f6'}}>{jour.conduite_h}h</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{fontSize: 10, color: '#94a3b8'}}>Travail</div>
                  <div style={{fontSize: 14, fontWeight: 700, color: '#f59e0b'}}>{jour.travail_h}h</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{fontSize: 10, color: '#94a3b8'}}>Pause</div>
                  <div style={{fontSize: 14, fontWeight: 700, color: '#10b981'}}>{jour.pause_h}h</div>
                </div>
                <div style={styles.statCard}>
                  <div style={{fontSize: 10, color: '#94a3b8'}}>Amplitude</div>
                  <div style={{fontSize: 14, fontWeight: 700, color: '#e2e8f0'}}>{jour.amplitude_estimee_h}h</div>
                </div>
              </div>

              {joursDetailOuverts[i] && (
                <div style={{marginTop: 8, padding: 10, background: '#0f172a', borderRadius: 8, fontSize: 13}}>
                  <div style={{color: '#94a3b8'}}>Conduite continue max : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.conduite_continue_max_min} min</span></div>
                  <div style={{color: '#94a3b8'}}>Repos estime : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.repos_estime_h}h</span></div>
                  <div style={{color: '#94a3b8'}}>Travail de nuit : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.travail_nuit_min} min</span></div>
                  <div style={{color: '#94a3b8'}}>Nombre d'activites : <span style={{color: '#e2e8f0', fontWeight: 600}}>{jour.nombre_activites}</span></div>

                  {jour.infractions.length > 0 && (
                    <div style={{marginTop: 8}}>
                      {jour.infractions.map((inf, j) => (
                        <div key={j} style={{...styles.infraction, fontSize: 12, padding: 10, marginBottom: 6}}>
                          <div style={{fontWeight: 600}}>{inf.regle}</div>
                          <div style={{color: '#fca5a5'}}>Limite : {inf.limite} | Constate : {inf.constate}</div>
                          <div style={{color: '#fca5a5', fontWeight: 600}}>{inf.classe} - {inf.amende}</div>
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

      {/* BAREME DES SANCTIONS */}
      {data.bareme_sanctions && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>{'\u{1F4D6}'}</span> Bareme des sanctions applicable
          </div>
          <div style={{fontSize: 13, lineHeight: 1.8}}>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8, marginBottom: 8}}>
              <div style={{fontWeight: 700, color: '#f59e0b', marginBottom: 4}}>{data.bareme_sanctions.classe_4.intitule}</div>
              <div style={{color: '#94a3b8'}}>Amende forfaitaire : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_4.amende_forfaitaire} \u20AC</span></div>
              <div style={{color: '#94a3b8'}}>Amende maximale : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_4.amende_max} \u20AC</span></div>
            </div>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8, marginBottom: 8}}>
              <div style={{fontWeight: 700, color: '#ef4444', marginBottom: 4}}>{data.bareme_sanctions.classe_5.intitule}</div>
              <div style={{color: '#94a3b8'}}>Amende maximale : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_5.amende_max} \u20AC</span></div>
              <div style={{color: '#94a3b8'}}>En recidive : <span style={{color: '#e2e8f0', fontWeight: 600}}>{data.bareme_sanctions.classe_5.amende_recidive} \u20AC</span></div>
            </div>
            <div style={{padding: 10, background: '#0f172a', borderRadius: 8}}>
              <div style={{fontWeight: 700, color: '#dc2626', marginBottom: 4}}>{data.bareme_sanctions.delits.intitule}</div>
              <div style={{color: '#94a3b8'}}>Falsification : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.falsification}</span></div>
              <div style={{color: '#94a3b8'}}>Absence chronotachygraphe : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.absence_chronotachygraphe}</span></div>
              <div style={{color: '#94a3b8'}}>Carte non conforme : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.carte_non_conforme}</span></div>
              <div style={{color: '#94a3b8'}}>Refus de controle : <span style={{color: '#e2e8f0'}}>{data.bareme_sanctions.delits.refus_controle}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
