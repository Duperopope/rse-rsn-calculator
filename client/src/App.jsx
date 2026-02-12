import React, { useState, useCallback } from 'react';

// ============================================================
// ICÔNES SVG OFFICIELLES DU TACHYGRAPHE (CE 3821/85 Annexe IB)
// Source: https://fleetgo.fr/tachygraphe/les-symboles-et-pictogrammes-chronotachygraphe/
// Source: https://www.webfleet.com/en_gb/webfleet/fleet-management/glossary/digi-tacho-symbols/
// ============================================================

function IconeConduite({ size = 28, color = '#1a73e8' }) {
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

function IconeAutreTache({ size = 28, color = '#e67e22' }) {
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

function IconeDisponibilite({ size = 28, color = '#9b59b6' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="80" height="80" stroke={color} strokeWidth="6" fill="none" rx="4" />
      <line x1="10" y1="90" x2="90" y2="10" stroke={color} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function IconeRepos({ size = 28, color = '#27ae60' }) {
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
// CONSTANTES RÉGLEMENTAIRES
// Sources :
// - Règlement CE 561/2006 (temps de conduite)
//   https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32006R0561
// - Code des transports français (sanctions)
//   https://www.legifrance.gouv.fr/codes/id/LEGITEXT000023086525/
// - Règlement UE 165/2014 (tachygraphe)
//   https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32014R0165
// ============================================================

const TYPES_ACTIVITE = [
  { id: 'conduite', label: 'Conduite', icone: IconeConduite, couleur: '#1a73e8' },
  { id: 'autre_tache', label: 'Autre tâche', icone: IconeAutreTache, couleur: '#e67e22' },
  { id: 'disponibilite', label: 'Disponibilité', icone: IconeDisponibilite, couleur: '#9b59b6' },
  { id: 'repos', label: 'Repos / Pause', icone: IconeRepos, couleur: '#27ae60' },
];

const LIMITES = {
  conduiteContinu: { minutes: 270, label: '4h30 de conduite continue max' },
  conduiteJour: { minutes: 540, label: '9h de conduite journalière max (10h dérogatoire 2x/sem)' },
  conduiteSemaine: { minutes: 3360, label: '56h de conduite hebdomadaire max' },
  conduiteBiHebdo: { minutes: 5400, label: '90h de conduite bi-hebdomadaire max' },
  reposJournalier: { minutes: 660, label: '11h de repos journalier min (9h réduit 3x/sem)' },
  reposHebdo: { minutes: 2700, label: '45h de repos hebdomadaire min (24h réduit)' },
  travailJournalier: { minutes: 600, label: '10h de travail journalier max' },
  pause45: { minutes: 45, label: '45 min de pause après 4h30 de conduite' },
};

const AMENDES = {
  classe4: { min: 135, max: 750, label: 'Contravention 4ème classe' },
  classe5: { min: 1500, max: 3000, label: 'Contravention 5ème classe' },
};

// ============================================================
// STYLES
// ============================================================

const styles = {
  container: {
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    maxWidth: 900,
    margin: '0 auto',
    padding: '20px 16px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
    padding: '20px',
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.6em',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '0.95em',
    color: '#666',
    margin: 0,
  },
  card: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  cardTitle: {
    fontSize: '1.1em',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: '0.85em',
    fontWeight: 600,
    color: '#555',
    marginBottom: 4,
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid #ddd',
    fontSize: '1em',
    transition: 'border-color 0.2s',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  activiteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f0f0f0',
  },
  activiteLabel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.95em',
    fontWeight: 500,
  },
  heureInput: {
    width: 70,
    padding: '8px 10px',
    borderRadius: 8,
    border: '1.5px solid #ddd',
    fontSize: '0.95em',
    textAlign: 'center',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '14px 28px',
    fontSize: '1em',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
  },
  btnSecondary: {
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '0.85em',
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: 8,
    marginBottom: 8,
  },
  resultSection: {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
  },
  infractionCard: {
    background: '#fff5f5',
    border: '1px solid #ffcccc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  warningCard: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  okCard: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: '0.75em',
    fontWeight: 600,
    marginRight: 6,
  },
  badgeRed: { background: '#fee2e2', color: '#dc2626' },
  badgeOrange: { background: '#fef3c7', color: '#d97706' },
  badgeGreen: { background: '#dcfce7', color: '#16a34a' },
  totalAmende: {
    textAlign: 'center',
    padding: 20,
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    borderRadius: 12,
    color: 'white',
    marginTop: 16,
  },
  totalAmendeOk: {
    textAlign: 'center',
    padding: 20,
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    borderRadius: 12,
    color: 'white',
    marginTop: 16,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.82em',
    color: '#555',
  },
  scaleSection: {
    background: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    border: '1px solid #e2e8f0',
  },
  scaleTitle: {
    fontWeight: 600,
    fontSize: '0.95em',
    marginBottom: 10,
    color: '#334155',
  },
  scaleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '0.85em',
  },
  footer: {
    textAlign: 'center',
    marginTop: 24,
    padding: 16,
    fontSize: '0.8em',
    color: '#999',
  },
  templateBtn: {
    background: '#e8f0fe',
    color: '#1a73e8',
    border: '1px solid #c5d9f7',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: '0.82em',
    fontWeight: 500,
    cursor: 'pointer',
    marginRight: 8,
    marginBottom: 8,
  },
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function App() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activites, setActivites] = useState({
    conduite: '',
    autre_tache: '',
    disponibilite: '',
    repos: '',
  });
  const [resultats, setResultats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback((type, val) => {
    const cleaned = val.replace(',', '.').replace(/[^0-9.]/g, '');
    setActivites(prev => ({ ...prev, [type]: cleaned }));
  }, []);

  const chargerTemplate = useCallback((template) => {
    const templates = {
      normal: { conduite: '8', autre_tache: '1', disponibilite: '0.5', repos: '14.5' },
      long: { conduite: '10', autre_tache: '2', disponibilite: '1', repos: '11' },
      infraction: { conduite: '14', autre_tache: '0', disponibilite: '0', repos: '10' },
      nuit: { conduite: '5', autre_tache: '3', disponibilite: '1', repos: '15' },
    };
    if (templates[template]) {
      setActivites(templates[template]);
      setResultats(null);
    }
  }, []);

  const analyser = useCallback(() => {
    setLoading(true);
    const heures = {};
    let totalH = 0;
    for (const type of Object.keys(activites)) {
      const val = parseFloat(activites[type]) || 0;
      heures[type] = val;
      totalH += val;
    }
    const minutes = {};
    for (const type of Object.keys(heures)) {
      minutes[type] = Math.round(heures[type] * 60);
    }

    const infractions = [];
    const avertissements = [];

    // Vérification conduite continue > 4h30
    if (minutes.conduite > LIMITES.conduiteContinu.minutes) {
      const depassement = minutes.conduite - LIMITES.conduiteContinu.minutes;
      infractions.push({
        titre: 'Dépassement conduite continue (4h30)',
        detail: `Enregistré : ${minutes.conduite} min, limite : ${LIMITES.conduiteContinu.minutes} min, dépassement : ${depassement} min`,
        classe: 5,
        amende: AMENDES.classe5.min,
        amendeMax: AMENDES.classe5.max,
        gravite: 'grave',
      });
    }

    // Vérification conduite journalière > 9h (10h dérogatoire)
    if (minutes.conduite > LIMITES.conduiteJour.minutes) {
      const depassement = minutes.conduite - LIMITES.conduiteJour.minutes;
      const derog = minutes.conduite > 600;
      infractions.push({
        titre: `Dépassement conduite journalière (${derog ? '10h dérogatoire dépassé aussi' : '9h'})`,
        detail: `Enregistré : ${heures.conduite}h (${minutes.conduite} min), limite : ${LIMITES.conduiteJour.minutes} min, dépassement : ${depassement} min`,
        classe: 5,
        amende: AMENDES.classe5.min,
        amendeMax: AMENDES.classe5.max,
        gravite: 'grave',
      });
    }

    // Vérification temps de travail journalier > 10h
    const travailTotal = minutes.conduite + minutes.autre_tache;
    if (travailTotal > LIMITES.travailJournalier.minutes) {
      const depassement = travailTotal - LIMITES.travailJournalier.minutes;
      infractions.push({
        titre: 'Dépassement temps de travail journalier (10h)',
        detail: `Travail total : ${(travailTotal / 60).toFixed(1)}h (conduite ${heures.conduite}h + autre tâche ${heures.autre_tache}h), dépassement : ${(depassement / 60).toFixed(1)}h`,
        classe: 4,
        amende: AMENDES.classe4.min,
        amendeMax: AMENDES.classe4.max,
        gravite: 'modéré',
      });
    }

    // Vérification repos journalier
    if (minutes.repos < LIMITES.reposJournalier.minutes) {
      if (minutes.repos >= 540) {
        avertissements.push({
          titre: 'Repos journalier réduit',
          detail: `Repos estimé : ${heures.repos}h. Norme : 11h, réduit autorisé : 9h (max 3 fois par semaine).`,
        });
      } else {
        infractions.push({
          titre: 'Repos journalier insuffisant',
          detail: `Repos estimé : ${heures.repos}h (${minutes.repos} min). Minimum absolu : 9h (réduit) ou 11h (normal).`,
          classe: 4,
          amende: AMENDES.classe4.min,
          amendeMax: AMENDES.classe4.max,
          gravite: 'modéré',
        });
      }
    }

    // Vérification pause après conduite
    if (minutes.conduite > LIMITES.conduiteContinu.minutes && minutes.repos < LIMITES.pause45.minutes) {
      avertissements.push({
        titre: 'Pause de 45 min recommandée',
        detail: `Après 4h30 de conduite, une pause de 45 min (ou 15+30 min fractionnée) est obligatoire.`,
      });
    }

    // Calcul total amendes
    const totalAmende = infractions.reduce((sum, inf) => sum + inf.amende, 0);

    setResultats({
      date,
      heures,
      minutes,
      totalHeures: totalH,
      infractions,
      avertissements,
      totalAmende,
      nbInfractions: infractions.length,
    });
    setLoading(false);
  }, [activites, date]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Calculateur RSE / RSN</h1>
        <p style={styles.subtitle}>
          Analyse de conformité des temps de conduite et repos
          — Règlement CE 561/2006
        </p>
      </div>

      {/* Légende des icônes officielles */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Pictogrammes officiels du tachygraphe</div>
        <div style={styles.legend}>
          {TYPES_ACTIVITE.map(t => {
            const Icone = t.icone;
            return (
              <div key={t.id} style={styles.legendItem}>
                <Icone size={22} color={t.couleur} />
                <span>{t.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saisie */}
      <div style={styles.card}>
        <div style={styles.cardTitle}>Saisie des activités</div>

        <div style={{ marginBottom: 12 }}>
          <div style={styles.label}>Date</div>
          <input
            type="date"
            value={date}
            onChange={e => { setDate(e.target.value); setResultats(null); }}
            style={styles.input}
          />
        </div>

        {TYPES_ACTIVITE.map(t => {
          const Icone = t.icone;
          return (
            <div key={t.id} style={styles.activiteRow}>
              <div style={styles.activiteLabel}>
                <Icone size={24} color={t.couleur} />
                <span>{t.label}</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={activites[t.id]}
                onChange={e => handleChange(t.id, e.target.value)}
                style={styles.heureInput}
              />
              <span style={{ fontSize: '0.85em', color: '#888' }}>h</span>
            </div>
          );
        })}

        <div style={{ marginTop: 16 }}>
          <div style={styles.label}>Exemples rapides :</div>
          <button style={styles.templateBtn} onClick={() => chargerTemplate('normal')}>
            Journée normale
          </button>
          <button style={styles.templateBtn} onClick={() => chargerTemplate('long')}>
            Journée longue
          </button>
          <button style={styles.templateBtn} onClick={() => chargerTemplate('infraction')}>
            Infraction type
          </button>
          <button style={styles.templateBtn} onClick={() => chargerTemplate('nuit')}>
            Service de nuit
          </button>
        </div>

        <button
          style={{
            ...styles.btnPrimary,
            marginTop: 20,
            opacity: loading ? 0.7 : 1,
          }}
          onClick={analyser}
          disabled={loading}
        >
          {loading ? 'Analyse en cours...' : 'Analyser la conformité'}
        </button>
      </div>

      {/* Résultats */}
      {resultats && <ResultPanel r={resultats} />}

      {/* Barème */}
      <div style={styles.scaleSection}>
        <div style={styles.scaleTitle}>Barème des sanctions (Code des transports)</div>
        <div style={styles.scaleRow}>
          <span>Contravention 4ème classe</span>
          <span style={{ fontWeight: 600 }}>135 € à 750 €</span>
        </div>
        <div style={styles.scaleRow}>
          <span>Contravention 5ème classe</span>
          <span style={{ fontWeight: 600 }}>1 500 € à 3 000 €</span>
        </div>
        <div style={styles.scaleRow}>
          <span>Falsification tachygraphe</span>
          <span style={{ fontWeight: 600 }}>1 an prison + 30 000 €</span>
        </div>
        <div style={styles.scaleRow}>
          <span>Absence de tachygraphe</span>
          <span style={{ fontWeight: 600 }}>1 500 € (5ème classe)</span>
        </div>
        <div style={styles.scaleRow}>
          <span>Carte conducteur non conforme</span>
          <span style={{ fontWeight: 600 }}>1 500 € (5ème classe)</span>
        </div>
        <div style={styles.scaleRow}>
          <span>Refus de contrôle</span>
          <span style={{ fontWeight: 600 }}>6 mois prison + 7 500 €</span>
        </div>
      </div>

      <div style={styles.footer}>
        <p>Calculateur RSE/RSN v5.3.0 — Créé par Samir Medjaher</p>
        <p>
          Sources : Règlement CE 561/2006 | Règlement UE 165/2014 | Code des transports français
        </p>
        <p>
          Cet outil est informatif. Les montants réels sont fixés par le tribunal.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PANNEAU DE RÉSULTATS
// ============================================================

function ResultPanel({ r }) {
  return (
    <div style={styles.resultSection}>
      <div style={styles.cardTitle}>
        Résultats de l'analyse — {r.date}
      </div>

      {/* Résumé des heures */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {TYPES_ACTIVITE.map(t => {
          const Icone = t.icone;
          return (
            <div
              key={t.id}
              style={{
                flex: '1 1 45%',
                background: '#f8fafc',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <Icone size={20} color={t.couleur} />
              <span style={{ fontSize: '0.85em', color: '#555' }}>{t.label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1a1a2e' }}>
                {r.heures[t.id]}h
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16, fontSize: '0.9em', color: '#666' }}>
        Total : {r.totalHeures.toFixed(1)}h sur 24h
      </div>

      {/* Infractions */}
      {r.infractions.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 10, fontSize: '0.95em' }}>
            {r.infractions.length} infraction{r.infractions.length > 1 ? 's' : ''} détectée{r.infractions.length > 1 ? 's' : ''}
          </div>
          {r.infractions.map((inf, i) => (
            <div key={i} style={styles.infractionCard}>
              <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...styles.badge, ...styles.badgeRed }}>
                  {inf.classe}ème classe
                </span>
                {inf.titre}
              </div>
              <div style={{ fontSize: '0.85em', color: '#666', marginBottom: 6 }}>
                {inf.detail}
              </div>
              <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#dc2626' }}>
                Amende forfaitaire : {inf.amende} € (max {inf.amendeMax} € en récidive)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Avertissements */}
      {r.avertissements.length > 0 && (
        <div>
          <div style={{ fontWeight: 600, color: '#d97706', marginBottom: 10, marginTop: 10, fontSize: '0.95em' }}>
            Avertissement{r.avertissements.length > 1 ? 's' : ''}
          </div>
          {r.avertissements.map((av, i) => (
            <div key={i} style={styles.warningCard}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                <span style={{ ...styles.badge, ...styles.badgeOrange }}>Attention</span>
                {av.titre}
              </div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>{av.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* Si aucune infraction */}
      {r.infractions.length === 0 && (
        <div style={styles.okCard}>
          <div style={{ fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ ...styles.badge, ...styles.badgeGreen }}>Conforme</span>
            Aucune infraction détectée
          </div>
          <div style={{ fontSize: '0.85em', color: '#666', marginTop: 6 }}>
            Les temps enregistrés respectent les limites réglementaires CE 561/2006.
          </div>
        </div>
      )}

      {/* Total amendes */}
      {r.totalAmende > 0 ? (
        <div style={styles.totalAmende}>
          <div style={{ fontSize: '0.85em', opacity: 0.9 }}>Amende totale estimée</div>
          <div style={{ fontSize: '2em', fontWeight: 700, margin: '8px 0' }}>
            {r.totalAmende} €
          </div>
          <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
            Estimation basée sur les amendes forfaitaires — Montant réel fixé par le tribunal
          </div>
        </div>
      ) : (
        <div style={styles.totalAmendeOk}>
          <div style={{ fontSize: '1.2em', fontWeight: 700 }}>Aucune amende</div>
          <div style={{ fontSize: '0.85em', opacity: 0.9, marginTop: 4 }}>
            Situation conforme à la réglementation
          </div>
        </div>
      )}
    </div>
  );
}
