import React, { useState, useEffect } from 'react';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useTheme } from '../hooks/useTheme.js';
import { useServerHealth } from '../hooks/useServerHealth.js';
import { STORAGE_KEY, HISTORIQUE_MAX } from '../config/constants.js';
import { activitesToCSV } from '../utils/csv.js';
import { calculerStatsJour } from '../utils/stats.js';
import { Header } from '../components/layout/Header.jsx';
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
 * Page principale du calculateur RSE/RSN v6.2.0
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

  const today = new Date().toISOString().slice(0, 10);
  const [jours, setJours] = useState(() => {
    const saved = localStorage.getItem('rse_jours');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { /* ignore */ }
    }
    return [{ date: new Date().toISOString().slice(0, 10), activites: [] }];
  });

  const [jours2, setJours2] = useState(() => {
    const saved = localStorage.getItem('rse_jours2');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) { /* ignore */ }
    }
    return [{ date: new Date().toISOString().slice(0, 10), activites: [] }];
  });

  
  // Persistence localStorage
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

  const joursActifs = equipage === "double" && conducteurActif === 2 ? jours2 : jours;
  const setJoursActifs = equipage === "double" && conducteurActif === 2 ? setJours2 : setJours;
  function updateJourActif(index, newJour) { setJoursActifs(prev => prev.map((j, i) => i === index ? newJour : j)); }
  function ajouterJourActif() { const ld = joursActifs[joursActifs.length-1]?.date||today; const d=new Date(ld); d.setDate(d.getDate()+1); setJoursActifs(prev=>[...prev,{date:d.toISOString().slice(0,10),activites:[{debut:"06:00",fin:"06:15",type:"T"}]}]); }
  function supprimerJourActif(i) { if(joursActifs.length<=1)return; setJoursActifs(prev=>prev.filter((_,idx)=>idx!==i)); }
  function dupliquerJourActif(i) { const s=joursActifs[i];const d=new Date(s.date);d.setDate(d.getDate()+1);const c={date:d.toISOString().slice(0,10),activites:s.activites.map(a=>({...a}))};setJoursActifs(prev=>{const a=[...prev];a.splice(i+1,0,c);return a;}); }

  return (
    <div className={styles.app}>
      {!onboardingDone ? <Onboarding onClose={() => setOnboardingDone(true)} /> : null}

      <Header online={online} serverVersion={serverVersion} theme={theme} onToggleTheme={toggleTheme} />

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

        <div className={styles.inputSection}>
          {mode === 'formulaire' ? (
            <div className={styles.formulaire}>
              {joursActifs.map((jour, i) => (
                <JourFormulaire
                  key={jour.date + '-' + i}
                  jour={jour} index={i}
                  onUpdate={updateJourActif}
                  onRemove={supprimerJourActif}
                  onDuplicate={dupliquerJourActif}
                  canRemove={joursActifs.length > 1}
                />
              ))}
              <Button variant='secondary' onClick={ajouterJourActif}>+ Ajouter un jour</Button>
            </div>
          ) : (
            <Card><CsvInput value={conducteurActif===1?csvTexte:csvTexte2} onChange={conducteurActif===1?setCsvTexte:setCsvTexte2} /></Card>
          )}
        </div>

        {mode === 'formulaire' && statsJour ? (
          <div className={styles.realtime}>
            {jours.length > 1 ? (
              <div className={styles.jourTabs}>
                {jours.map((j, i) => (
                  <button
                    key={i}
                    className={styles.jourTab + (i === jourActifIndex ? ' ' + styles.jourTabActive : '')}
                    onClick={() => setJourActifIndex(i)}
                  >
                    Jour {i + 1} — {j.date}
                  </button>
                ))}
              </div>
            ) : null}
            <PanneauJauges stats={statsJour} typeService={typeService} />
            {jours[jourActifIndex] && jours[jourActifIndex].activites.length > 0 ? (
              <Card><Timeline24h activites={jours[jourActifIndex].activites} theme={theme} /></Card>
            ) : null}
          </div>
        ) : null}

        <div className={styles.analyseSection}>
          <Button variant='primary' size='lg' fullWidth loading={chargement} disabled={!online || chargement} onClick={() => { if (navigator.vibrate) navigator.vibrate(10); lancerAnalyse(); }}>
            {chargement ? 'Analyse en cours...' : 'Analyser la conformite'}
          </Button>
          {equipage === 'double' ? (
            <p className={styles.equipageInfo}>Mode double equipage : repos 9h dans les 30h (Art.8 par.5)</p>
          ) : null}
          {!online && !healthLoading ? (
            <p className={styles.offlineMsg}>Serveur hors ligne. Verifiez que le backend est demarre.</p>
          ) : null}
        </div>

        {erreur ? <Card variant='danger' animate><p className={styles.erreur}>{erreur}</p></Card> : null}
        {chargement ? <Loader /> : null}
        {resultat && !chargement ? <ResultPanel resultat={resultat} /> : null}

        {historique && historique.length > 0 ? (
          <div className={styles.historique}>
            <button className={styles.histToggle} onClick={() => setVoirHistorique(!voirHistorique)}>
              Historique ({historique.length})
            </button>
            {voirHistorique ? (
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
                <button className={styles.histClear} onClick={() => { setHistorique([]); setVoirHistorique(false); }}>Effacer</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}