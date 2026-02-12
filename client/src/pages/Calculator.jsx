import React, { useState, useMemo } from 'react';
import { useAnalysis } from '../hooks/useAnalysis';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useTheme } from '../hooks/useTheme';
import { useServerHealth } from '../hooks/useServerHealth';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Onboarding } from '../components/layout/Onboarding';
import { ParametresPanel } from '../components/forms/ParametresPanel';
import { JourFormulaire } from '../components/forms/JourFormulaire';
import { CsvInput } from '../components/forms/CsvInput';
import { PanneauJauges } from '../components/gauges/PanneauJauges';
import { Timeline24h } from '../components/timeline/Timeline24h';
import { ResultPanel } from '../components/results/ResultPanel';
import { Loader } from '../components/common/Loader';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { calculerStatsJour } from '../utils/stats';
import { activitesToCSV } from '../utils/csv';
import styles from './Calculator.module.css';

export default function Calculator() {
  const { theme, toggleTheme } = useTheme();
  const { online, version } = useServerHealth();
  const { analyser, chargement, erreur, resultat } = useAnalysis();
  const [historique, setHistorique] = useLocalStorage('rse_rsn_historique', []);
  const [showOnboarding, setShowOnboarding] = useState(!localStorage.getItem('rse_onboarding_done'));
  const [typeService, setTypeService] = useState('REGULIER');
  const [pays, setPays] = useState('FR');
  const [equipage, setEquipage] = useState('solo');
  const [mode, setMode] = useState('formulaire');
  const [csvText, setCsvText] = useState('');
  const [csvText2, setCsvText2] = useState('');
  const [showHistorique, setShowHistorique] = useState(false);

  const [activitesJour, setActivitesJour] = useState([{
    date: new Date().toISOString().slice(0, 10),
    activites: [{ debut: '06:00', fin: '10:30', type: 'C' }, { debut: '10:30', fin: '11:15', type: 'P' }, { debut: '11:15', fin: '14:30', type: 'C' }]
  }]);
  const [activitesJour2, setActivitesJour2] = useState([{
    date: new Date().toISOString().slice(0, 10),
    activites: [{ debut: '06:00', fin: '10:30', type: 'D' }, { debut: '10:30', fin: '11:15', type: 'T' }, { debut: '11:15', fin: '14:30', type: 'D' }]
  }]);
  const [conducteurActif, setConducteurActif] = useState(1);

  const joursActifs = conducteurActif === 1 ? activitesJour : activitesJour2;
  const setJoursActifs = conducteurActif === 1 ? setActivitesJour : setActivitesJour2;

  const stats = useMemo(function() {
    if (joursActifs.length === 0) return null;
    return calculerStatsJour(joursActifs[0] ? joursActifs[0].activites : []);
  }, [joursActifs]);

  function ajouterJour() {
    var dernierDate = joursActifs.length > 0 ? joursActifs[joursActifs.length - 1].date : new Date().toISOString().slice(0, 10);
    var d = new Date(dernierDate);
    d.setDate(d.getDate() + 1);
    setJoursActifs(joursActifs.concat([{ date: d.toISOString().slice(0, 10), activites: [{ debut: '06:00', fin: '06:15', type: 'C' }] }]));
  }

  function supprimerJour(idx) {
    setJoursActifs(joursActifs.filter(function(_, i) { return i !== idx; }));
  }

  function dupliquerJour(idx) {
    var copie = JSON.parse(JSON.stringify(joursActifs[idx]));
    var d = new Date(copie.date);
    d.setDate(d.getDate() + 1);
    copie.date = d.toISOString().slice(0, 10);
    var nv = joursActifs.slice();
    nv.splice(idx + 1, 0, copie);
    setJoursActifs(nv);
  }

  function majJour(idx, jour) {
    var nv = joursActifs.slice();
    nv[idx] = jour;
    setJoursActifs(nv);
  }

  async function lancerAnalyse() {
    var csv1, c2;
    if (mode === 'csv') {
      csv1 = csvText;
      c2 = equipage === 'double' ? csvText2 : null;
    } else {
      csv1 = activitesToCSV(activitesJour);
      c2 = equipage === 'double' ? activitesToCSV(activitesJour2) : null;
    }
    var res = await analyser(csv1, c2, typeService, pays, equipage);
    if (res && res.score !== undefined) {
      var entry = { date: new Date().toISOString(), score: res.score, infractions: res.infractions ? res.infractions.length : 0, equipage: equipage };
      setHistorique(function(h) { return [entry].concat(h).slice(0, 50); });
    }
  }

  function finOnboarding() {
    localStorage.setItem('rse_onboarding_done', '1');
    setShowOnboarding(false);
  }

  return (
    <div className={styles.container} data-theme={theme}>
      {showOnboarding && <Onboarding onClose={finOnboarding} />}
      <Header online={online} serverVersion={version} theme={theme} onToggleTheme={toggleTheme} />

      <main className={styles.main}>
        <ParametresPanel
          typeService={typeService} onTypeService={setTypeService}
          pays={pays} onPays={setPays}
          equipage={equipage} onEquipage={setEquipage}
          mode={mode} onMode={setMode}
        />

        {equipage === 'double' && (
          <div className={styles.conducteurTabs}>
            <button
              className={conducteurActif === 1 ? styles.tabActive : styles.tab}
              onClick={function() { setConducteurActif(1); }}
            >Conducteur 1</button>
            <button
              className={conducteurActif === 2 ? styles.tabActive : styles.tab}
              onClick={function() { setConducteurActif(2); }}
            >Conducteur 2</button>
          </div>
        )}

        {mode === 'formulaire' ? (
          <div className={styles.formulaire}>
            {joursActifs.map(function(jour, idx) {
              return (
                <JourFormulaire
                  key={conducteurActif + '-' + idx}
                  jour={jour}
                  index={idx}
                  onUpdate={function(j) { majJour(idx, j); }}
                  onRemove={function() { supprimerJour(idx); }}
                  onDuplicate={function() { dupliquerJour(idx); }}
                  canRemove={joursActifs.length > 1}
                />
              );
            })}
            <button className={styles.addDay} onClick={ajouterJour}>+ Ajouter un jour</button>
          </div>
        ) : (
          <div className={styles.csvZone}>
            <CsvInput value={conducteurActif === 1 ? csvText : csvText2} onChange={conducteurActif === 1 ? setCsvText : setCsvText2} />
          </div>
        )}

        {stats && joursActifs.length > 0 && (
          <React.Fragment>
            <PanneauJauges stats={stats} typeService={typeService} />
            <Timeline24h activites={joursActifs[0] ? joursActifs[0].activites : []} />
          </React.Fragment>
        )}

        <Button onClick={lancerAnalyse} disabled={!online || chargement} className={styles.analyseBtn}>
          {chargement ? 'Analyse en cours...' : 'Analyser la conformite'}
        </Button>

        {erreur && <div className={styles.error}>{erreur}</div>}
        {chargement && <Loader />}

        {resultat && <ResultPanel resultat={resultat} />}

        {historique.length > 0 && (
          <div className={styles.historique}>
            <button className={styles.histToggle} onClick={function() { setShowHistorique(!showHistorique); }}>
              Historique ({historique.length})
            </button>
            {showHistorique && (
              <div className={styles.histList}>
                {historique.map(function(h, i) {
                  return (
                    <div key={i} className={styles.histItem}>
                      <Badge variant={h.score >= 80 ? 'success' : h.score >= 50 ? 'warning' : 'danger'}>{h.score}</Badge>
                      <span>{new Date(h.date).toLocaleString('fr-FR')}</span>
                      <span>{h.infractions} infraction(s)</span>
                      {h.equipage === 'double' && <Badge variant='info'>Double</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}