import React, { useState, useEffect, useRef } from 'react';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useTheme } from '../hooks/useTheme.js';
import { useServerHealth } from '../hooks/useServerHealth.js';
import { STORAGE_KEY, HISTORIQUE_MAX } from '../config/constants.js';
import { activitesToCSV } from '../utils/csv.js';
import { calculerStatsJour } from '../utils/stats.js';
import { Header } from '../components/layout/Header.jsx';
import { BottomBar } from '../components/layout/BottomBar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { Onboarding } from '../components/layout/Onboarding.jsx';
import { ParametresPanel } from '../components/forms/ParametresPanel.jsx';
import { JourFormulaire } from '../components/forms/JourFormulaire.jsx';
import { CsvInput } from '../components/forms/CsvInput.jsx';
import { PanneauJauges } from '../components/gauges/PanneauJauges.jsx';
import { Timeline24h } from '../components/timeline/Timeline24h.jsx';
import { ResultPanel } from '../components/results/ResultPanel.jsx';
import { Loader } from '../components/common/Loader.jsx';
import { Button } from '../components/common/Button.jsx';
import { Card } from '../components/common/Card.jsx';
import { Badge } from '../components/common/Badge.jsx';
import styles from './Calculator.module.css';

/**
 * FIMO Check v7.10.0
 * - Boutons Analyser + Historique remontes dans le Header
 * - Dashboard sticky avec var(--header-height)
 * - Onglets colores vert/orange/rouge + fleches navigation
 */
export default function Calculator() {
  const { theme, toggleTheme } = useTheme();
  const { online, version: serverVersion, loading: healthLoading } = useServerHealth();
  const { analyser, resultat, setResultat, erreur, chargement, reset } = useAnalysis();
  const [historique, setHistorique] = useLocalStorage(STORAGE_KEY, []);
  const [onboardingDone, setOnboardingDone] = useLocalStorage('rse_onboarding_done', false);

  const [typeService, setTypeService] = useState('REGULIER');
  const [pays, setPays] = useState('FR');
  const [equipage, setEquipage] = useState('solo');
  const [mode, setMode] = useState('formulaire');
  const [csvTexte, setCsvTexte] = useState('');
  const [csvTexte2, setCsvTexte2] = useState('');
  const [conducteurActif, setConducteurActif] = useState(1);
  const [voirHistorique, setVoirHistorique] = useState(false);
  const [statsJour, setStatsJour] = useState(null);
  const [jourActifIndex, setJourActifIndex] = useState(0);
  const [dashExpanded, setDashExpanded] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  /* === Navigation jour-tabs === */
  const jourTabsRef = useRef(null);
  const scrollJourTabs = (direction) => {
    if (jourTabsRef.current) {
      const amount = direction === 'left' ? -120 : 120;
      jourTabsRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  /* === Couleur des onglets jours === */
  const getJourCouleur = (jour) => {
    if (!jour || !jour.activites || jour.activites.length === 0) return 'neutre';
    const s = calculerStatsJour(jour.activites);
    if (!s || !s.alertes || s.alertes.length === 0) return 'ok';
    if (s.alertes.some(a => a.type === 'danger')) return 'danger';
    if (s.alertes.some(a => a.type === 'warning')) return 'warning';
    return 'ok';
  };

  /* === Jours conducteur 1 === */
  const [jours, setJours] = useState(() => {
    const saved = localStorage.getItem('rse_jours');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { /* ignore */ }
    }
    return [{ date: new Date().toISOString().slice(0, 10), activites: [] }];
  });

  /* === Jours conducteur 2 === */
  const [jours2, setJours2] = useState(() => {
    const saved = localStorage.getItem('rse_jours2');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { /* ignore */ }
    }
    return [{ date: new Date().toISOString().slice(0, 10), activites: [] }];
  });

  useEffect(() => {
    localStorage.setItem('rse_jours', JSON.stringify(jours));
  }, [jours]);

  useEffect(() => {
    localStorage.setItem('rse_jours2', JSON.stringify(jours2));
  }, [jours2]);

  useEffect(() => {
    if (mode === 'formulaire' && jours.length > 0) {
      const idx = Math.min(jourActifIndex, jours.length - 1);
      if (jours[idx] && jours[idx].activites) {
        setStatsJour(calculerStatsJour(jours[idx].activites));
      }
    }
  }, [jours, mode, jourActifIndex]);

  /* === CRUD Jours conducteur 1 === */
  function updateJour(index, newJour) {
    setJours(prev => prev.map((j, i) => i === index ? newJour : j));
  }

  function ajouterJour() {
    const lastDate = jours[jours.length - 1]?.date || today;
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 1);
    setJours(prev => [...prev, {
      date: d.toISOString().slice(0, 10),
      activites: [{ debut: '06:00', fin: '06:15', type: 'T' }]
    }]);
  }

  function supprimerJour(index) {
    if (jours.length <= 1) return;
    setJours(prev => prev.filter((_, i) => i !== index));
  }

  function dupliquerJour(index) {
    const src = jours[index];
    const d = new Date(src.date);
    d.setDate(d.getDate() + 1);
    const copy = { date: d.toISOString().slice(0, 10), activites: src.activites.map(a => ({ ...a })) };
    setJours(prev => { const arr = [...prev]; arr.splice(index + 1, 0, copy); return arr; });
  }

  /* === Analyse === */
  async function lancerAnalyse() {
    let csv = csvTexte;
    if (mode === 'formulaire') csv = activitesToCSV(jours);
    if (!csv || !csv.trim()) return;
    const csv2 = equipage === "double" ? (mode === "csv" ? csvTexte2 : activitesToCSV(jours2)) : null;
    const data = await analyser(csv, csv2, typeService, pays, equipage);
    if (data) {
      const entry = {
        date: new Date().toISOString(),
        score: data.score || 0,
        infractions: (data.infractions || []).length,
        typeService, pays, equipage, data
      };
      setHistorique(prev => [entry, ...(prev || [])].slice(0, HISTORIQUE_MAX));
    }
  }

  /* === Equipage double : jours actifs === */
  const joursActifs = equipage === "double" && conducteurActif === 2 ? jours2 : jours;
  const setJoursActifs = equipage === "double" && conducteurActif === 2 ? setJours2 : setJours;
  function updateJourActif(index, newJour) { setJoursActifs(prev => prev.map((j, i) => i === index ? newJour : j)); }
  function ajouterJourActif() {
    const ld = joursActifs[joursActifs.length - 1]?.date || today;
    const d = new Date(ld);
    d.setDate(d.getDate() + 1);
    setJoursActifs(prev => [...prev, { date: d.toISOString().slice(0, 10), activites: [{ debut: "06:00", fin: "06:15", type: "T" }] }]);
  }
  function supprimerJourActif(i) { if (joursActifs.length <= 1) return; setJoursActifs(prev => prev.filter((_, idx) => idx !== i)); }
  function dupliquerJourActif(i) {
    const s = joursActifs[i];
    const d = new Date(s.date);
    d.setDate(d.getDate() + 1);
    const c = { date: d.toISOString().slice(0, 10), activites: s.activites.map(a => ({ ...a })) };
    setJoursActifs(prev => { const a = [...prev]; a.splice(i + 1, 0, c); return a; });
  }

  const safeIndex = Math.min(jourActifIndex, joursActifs.length - 1);

  return (
    <div className={styles.app}>
      {!onboardingDone ? <Onboarding onClose={() => setOnboardingDone(true)} /> : null}

      <Header
        online={online}
        serverVersion={serverVersion}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAnalyse={() => { if (navigator.vibrate) navigator.vibrate(10); lancerAnalyse(); }}
        analyseEnCours={chargement}
        analyseDisabled={!online || chargement}
        historiqueCount={(historique || []).length}
        onToggleHistorique={() => setVoirHistorique(v => !v)}
        voirHistorique={voirHistorique}
      />

      <main className={styles.main}>
        <ParametresPanel
          typeService={typeService} onTypeServiceChange={setTypeService}
          pays={pays} onPaysChange={setPays}
          equipage={equipage} onEquipageChange={setEquipage}
          mode={mode} onModeChange={(m) => { setMode(m); reset(); }}

        />

        {equipage === 'double' ? (
          <div className={styles.conducteurTabs}>
            <button
              className={conducteurActif === 1 ? styles.tabActive : styles.tab}
              onClick={() => setConducteurActif(1)}
            >
              Conducteur 1
            </button>
            <button
              className={conducteurActif === 2 ? styles.tabActive : styles.tab}
              onClick={() => setConducteurActif(2)}
            >
              Conducteur 2
            </button>
          </div>
        ) : null}

        {/* === DASHBOARD STICKY === */}
        {mode === 'formulaire' && statsJour ? (
          <div className={styles.realtimeSticky + (dashExpanded ? ' ' + styles.dashExpanded : '')}>
            <PanneauJauges stats={statsJour} typeService={typeService} />
            {jours[jourActifIndex] && jours[jourActifIndex].activites.length > 0 ? (
              <div className={styles.timelineWrap}>
                <Card><Timeline24h activites={jours[jourActifIndex].activites} theme={theme} /></Card>
              </div>
            ) : null}
            <button
              {jours.length > 1 ? (
                <div className={styles.jourNavWrapper}>
                  <button
                    className={styles.jourNavArrow}
                    onClick={() => scrollJourTabs('left')}
                    aria-label="Jours precedents"
                  >
                    &#8249;
                  </button>
                  <div className={styles.jourNavTabs} ref={jourTabsRef}>
                    {jours.map((j, i) => (
                      <button
                        key={i}
                        className={
                          (i === jourActifIndex ? styles.jourNavActive : styles.jourNavBtn)
                          + ' ' + (styles['jourNav_' + getJourCouleur(j)] || '')
                        }
                        onClick={() => setJourActifIndex(i)}
                      >
                        J{i + 1} <span className={styles.jourNavDate}>{j.date.slice(5)}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className={styles.jourNavArrow}
                    onClick={() => scrollJourTabs('right')}
                    aria-label="Jours suivants"
                  >
                    &#8250;
                  </button>
                </div>
              ) : null}
              className={styles.expandToggle}
              onClick={() => setDashExpanded(!dashExpanded)}
              aria-label={dashExpanded ? 'Reduire le dashboard' : 'Voir jauges et timeline'}
            >
              {dashExpanded ? '\u25B2 Reduire' : '\u25BC Voir detail'}
            </button>
          </div>
        ) : null}

        {/* === FORMULAIRE DE SAISIE === */}
        <div className={styles.inputSection}>
          {mode === 'formulaire' ? (
            <div className={styles.formulaire}>
              <JourFormulaire
                key={joursActifs[safeIndex]?.date + '-' + safeIndex}
                jour={joursActifs[safeIndex]}
                index={safeIndex}
                onUpdate={updateJourActif}
                onRemove={(idx) => {
                  supprimerJourActif(idx);
                  if (jourActifIndex >= joursActifs.length - 1) {
                    setJourActifIndex(Math.max(0, joursActifs.length - 2));
                  }
                }}
                onDuplicate={(idx) => {
                  dupliquerJourActif(idx);
                  setJourActifIndex(idx + 1);
                }}
                canRemove={joursActifs.length > 1}
              />
              <div className={styles.jourBottomActions}>
                <Button variant='secondary' onClick={() => { ajouterJourActif(); setJourActifIndex(joursActifs.length); }}>+ Ajouter un jour</Button>
                {joursActifs.length > 1 ? (
                  <span className={styles.jourCount}>{joursActifs.length} jours</span>
                ) : null}
              </div>
            </div>
          ) : (
            <Card><CsvInput value={conducteurActif === 1 ? csvTexte : csvTexte2} onChange={conducteurActif === 1 ? setCsvTexte : setCsvTexte2} /></Card>
          )}
        </div>

        {/* === Info equipage double === */}
        {equipage === 'double' ? (
          <p className={styles.equipageInfo}>Mode double equipage : repos 9h dans les 30h (Art.8 par.5)</p>
        ) : null}
        {!online && !healthLoading ? (
          <p className={styles.offlineMsg}>Serveur hors ligne. Verifiez que le backend est demarre.</p>
        ) : null}

        {/* === Resultats === */}
        {erreur ? <Card variant='danger' animate><p className={styles.erreur}>{erreur}</p></Card> : null}
        {chargement ? <Loader /> : null}
        {resultat && !chargement ? <ResultPanel resultat={resultat} /> : null}

        {/* === Historique (panneau deroulant, controle par le header) === */}
        {voirHistorique && historique && historique.length > 0 ? (
          <div className={styles.historique}>
            <div className={styles.histList}>
              {historique.slice(0, 10).map((h, i) => (
                <div key={i} className={styles.histItem} onClick={() => { if (h.data) { setResultat(h.data); window.scrollTo({ top: 0, behavior: "smooth" }); } }} style={{ cursor: "pointer" }}>
                  <span className={styles.histDate}>
                    {new Date(h.date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge variant={h.score >= 90 ? 'ok' : h.score >= 70 ? 'warning' : 'danger'}>{h.score}%</Badge>
                  <span className={styles.histMeta}>{h.infractions} inf. {h.equipage === 'double' ? '(2x)' : ''}</span>
                </div>
              ))}
              <button className={styles.histClear} onClick={() => { setHistorique([]); setVoirHistorique(false); }}>Effacer tout l'historique</button>
            </div>
          </div>
        ) : null}

        {/* === Historique vide === */}
        {voirHistorique && (!historique || historique.length === 0) ? (
          <Card><p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>Aucun historique. Lancez une analyse pour commencer.</p></Card>
        ) : null}
      </main>

      <BottomBar
        onAnalyse={() => { if (navigator.vibrate) navigator.vibrate(10); lancerAnalyse(); }}
        analyseEnCours={chargement}
        analyseDisabled={!online || chargement}
        historiqueCount={(historique || []).length}
        onToggleHistorique={() => setVoirHistorique(v => !v)}
        voirHistorique={voirHistorique}
        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />

      <Footer />
    </div>
  );
}
