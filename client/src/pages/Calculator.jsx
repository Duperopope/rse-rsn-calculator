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


import { IconeConduite, IconePause } from '../components/icons/TachyIcons.jsx';
import { PanneauJauges } from '../components/gauges/PanneauJauges.jsx';


import { Timeline24h } from '../components/timeline/Timeline24h.jsx';


import { ResultPanel } from '../components/results/ResultPanel.jsx';


import { Loader } from '../components/common/Loader.jsx';


import { Button } from '../components/common/Button.jsx';


import { Card } from '../components/common/Card.jsx';


import { Badge } from '../components/common/Badge.jsx';


import styles from './Calculator.module.css';


import { HistoriquePanel } from '../components/history/HistoriquePanel.jsx';





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
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    try { return parseInt(localStorage.getItem('fimo_historique_seen_count') || '0', 10); } catch { return 0; }
  });

  /* Quand on ferme le panel, marquer tout comme vu */
  useEffect(() => {
    if (!voirHistorique && historique && historique.length > 0) {
      const len = historique.length;
      if (len !== lastSeenCount) {
        setLastSeenCount(len);
        try { localStorage.setItem('fimo_historique_seen_count', String(len)); } catch {}
      }
    }
  }, [voirHistorique]);


  const [statsJour, setStatsJour] = useState(null);


  const [jourActifIndex, setJourActifIndex] = useState(0);


  const [jourMenuIndex, setJourMenuIndex] = useState(-1);


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


          jours: JSON.parse(JSON.stringify(jours)),


          parametres: { typeService, pays, equipage },


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


  // --- Historique handlers ---


  const deleteHistorique = (index) => {


    const updated = [...historique];


    updated.splice(index, 1);


    setHistorique(updated);


    if (updated.length === 0) setVoirHistorique(false);


  };





  const deleteAllHistorique = () => {
    setHistorique([]);
    setVoirHistorique(false);
  };

  /* Renommer une entree de l'historique */
  const renameHistorique = (id, nouveauNom) => {
    setHistorique(prev => prev.map(entry => {
      const key = entry.id || entry.date;
      if (key === id) {
        return { ...entry, nom: nouveauNom || '' };
      }
      return entry;
    }));
  };





  const reloadHistorique = (entry) => {


    if (entry.jours) {


      setJours(entry.jours);


      setJourActifIndex(0);


    }


    if (entry.parametres) {


      if (entry.parametres.typeService) setTypeService(entry.parametres.typeService);


      if (entry.parametres.pays) setPays(entry.parametres.pays);


      if (entry.parametres.equipage) setEquipage(entry.parametres.equipage);


    }


    setVoirHistorique(false);


    window.scrollTo({ top: 0, behavior: 'smooth' });


    if (navigator.vibrate) navigator.vibrate([10, 50, 10]);


  };





  const viewHistorique = (entry) => {


    if (entry.data) {


      setResultat(entry.data);


      setVoirHistorique(false);


      window.scrollTo({ top: 0, behavior: 'smooth' });


    }


  };








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


        historiqueCount={Math.max(0, (historique || []).length - lastSeenCount)}


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
            {/* -- Score principal compact -- */}
            {resultat && (
              <div className={styles.scoreStickyRow}>
                <div className={styles.scoreCircleMini} style={{
                  background: resultat.score >= 90 ? '#00ff88' : resultat.score >= 70 ? '#ffaa00' : '#ff4444',
                  color: resultat.score >= 90 ? '#000' : '#fff'
                }}>
                  {Math.round(resultat.score)}
                </div>
                <span className={styles.scoreStickyLabel}>
                  Score FIMO {String.fromCharCode(8226)} {resultat.infractions?.length || 0} infraction{(resultat.infractions?.length || 0) > 1 ? 's' : ''}{resultat.avertissements?.length ? ' ' + String.fromCharCode(183) + ' ' + resultat.avertissements.length + ' alerte' + (resultat.avertissements.length > 1 ? 's' : '') : ''}
                </span>
              </div>
            )}


            {dashExpanded && <PanneauJauges stats={statsJour} typeService={typeService} />}


            {dashExpanded && jours[jourActifIndex] && jours[jourActifIndex].activites.length > 0 ? (


              <div className={styles.timelineWrap}>


                <Card><Timeline24h activites={jours[jourActifIndex].activites} theme={theme} /></Card>


              </div>


            ) : null}


              {/* === BARRE JOURS — Material Scrollable Tabs v7.12.0 === */}
              <div className={styles.jourNavWrapper}>
                <button
                  className={styles.jourNavArrow + ' ' + styles.jourNavArrowLeft}
                  onClick={() => scrollJourTabs('left')}
                  aria-label="Jours precedents"
                  tabIndex={-1}
                >&lsaquo;</button>
                <div className={styles.jourNavTabs} ref={jourTabsRef}>
                  {jours.map((j, i) => (
                    <div key={i} className={styles.jourNavItem}>
                      <button
                        className={
                          (i === jourActifIndex ? styles.jourNavActive : styles.jourNavBtn)
                          + ' ' + (styles['jourNav_' + getJourCouleur(j)] || '')
                        }
                        onClick={() => {
                          setJourActifIndex(i);
                          setJourMenuIndex(-1);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (navigator.vibrate) navigator.vibrate(10);
                          setJourMenuIndex(i === jourMenuIndex ? -1 : i);
                        }}
                        onTouchStart={(e) => {
                          const t = setTimeout(() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            setJourMenuIndex(i);
                          }, 500);
                          e.currentTarget.dataset.lp = t;
                        }}
                        onTouchEnd={(e) => clearTimeout(Number(e.currentTarget.dataset.lp))}
                        onTouchMove={(e) => clearTimeout(Number(e.currentTarget.dataset.lp))}
                      >
                        J{i + 1} <span className={styles.jourNavDate}>{j.date.slice(5)}</span>
                      </button>
                      {jourMenuIndex === i && (
                        <div className={styles.jourMenu}>
                          <button className={styles.jourMenuBtn + ' ' + styles.jourMenuDup} onClick={(e) => {
                            e.stopPropagation();
                            dupliquerJourActif(i);
                            setJourActifIndex(i + 1);
                            setJourMenuIndex(-1);
                          }}>Dupliquer</button>
                          {jours.length > 1 && (
                            <button className={styles.jourMenuBtn + ' ' + styles.jourMenuDel} onClick={(e) => {
                              e.stopPropagation();
                              if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                              supprimerJourActif(i);
                              if (jourActifIndex >= jours.length - 1) setJourActifIndex(Math.max(0, jours.length - 2));
                              setJourMenuIndex(-1);
                            }}>Supprimer</button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                    className={styles.jourNavAddInline}
                    onClick={() => {
                      ajouterJourActif();
                      setJourActifIndex(joursActifs.length);
                      setTimeout(() => {
                        if (jourTabsRef.current) jourTabsRef.current.scrollLeft = jourTabsRef.current.scrollWidth;
                      }, 50);
                    }}
                    aria-label="Ajouter un jour"
                  >+</button>
                <button
                  className={styles.jourNavArrow + ' ' + styles.jourNavArrowRight}
                  onClick={() => scrollJourTabs('right')}
                  aria-label="Jours suivants"
                  tabIndex={-1}
                >&rsaquo;</button>
              </div>
            {/* -- Mini-jauges compactes (toujours visibles) -- */}
            {!dashExpanded && statsJour && statsJour.nbActivites > 0 && (
              <div className={styles.miniJauges}>
                <div className={styles.miniJauge}>
                  <span className={styles.miniJaugeLabel}><IconeConduite size={14} color={statsJour.conduiteMax >= 270 ? '#ff4444' : statsJour.conduiteMax >= 216 ? '#ffaa00' : '#00ff88'} /> Cont.</span>
                  <div className={styles.miniJaugeTrack}><div className={styles.miniJaugeFill} style={{ width: Math.min((statsJour.conduiteMax || 0) / 270 * 100, 100) + '%', background: statsJour.conduiteMax >= 270 ? '#ff4444' : statsJour.conduiteMax >= 216 ? '#ffaa00' : '#00ff88' }} /></div>
                  <span className={styles.miniJaugeVal} style={{ color: statsJour.conduiteMax >= 270 ? '#ff4444' : statsJour.conduiteMax >= 216 ? '#ffaa00' : '#00ff88' }}>{Math.floor((statsJour.conduiteMax || 0) / 60)}h{String(Math.round((statsJour.conduiteMax || 0) % 60)).padStart(2, '0')}</span>
                </div>
                <div className={styles.miniJauge}>
                  <span className={styles.miniJaugeLabel}><IconeConduite size={14} color={statsJour.conduiteTotale >= 540 ? '#ff4444' : statsJour.conduiteTotale >= 432 ? '#ffaa00' : '#00ff88'} /> Jour</span>
                  <div className={styles.miniJaugeTrack}><div className={styles.miniJaugeFill} style={{ width: Math.min((statsJour.conduiteTotale || 0) / 540 * 100, 100) + '%', background: statsJour.conduiteTotale >= 540 ? '#ff4444' : statsJour.conduiteTotale >= 432 ? '#ffaa00' : '#00ff88' }} /></div>
                  <span className={styles.miniJaugeVal} style={{ color: statsJour.conduiteTotale >= 540 ? '#ff4444' : statsJour.conduiteTotale >= 432 ? '#ffaa00' : '#00ff88' }}>{Math.floor((statsJour.conduiteTotale || 0) / 60)}h{String(Math.round((statsJour.conduiteTotale || 0) % 60)).padStart(2, '0')}</span>
                </div>
                <div className={styles.miniJauge}>
                  <span className={styles.miniJaugeLabel}><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" stroke={statsJour.amplitude >= 780 ? '#ff4444' : statsJour.amplitude >= 624 ? '#ffaa00' : '#00ff88'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Ampl.</span>
                  <div className={styles.miniJaugeTrack}><div className={styles.miniJaugeFill} style={{ width: Math.min((statsJour.amplitude || 0) / 780 * 100, 100) + '%', background: statsJour.amplitude >= 780 ? '#ff4444' : statsJour.amplitude >= 624 ? '#ffaa00' : '#00ff88' }} /></div>
                  <span className={styles.miniJaugeVal} style={{ color: statsJour.amplitude >= 780 ? '#ff4444' : statsJour.amplitude >= 624 ? '#ffaa00' : '#00ff88' }}>{Math.floor((statsJour.amplitude || 0) / 60)}h{String(Math.round((statsJour.amplitude || 0) % 60)).padStart(2, '0')}</span>
                </div>
                <div className={styles.miniJauge}>
                  <span className={styles.miniJaugeLabel}><IconePause size={14} color={(statsJour.pauseTotale || 0) >= 45 ? '#00ff88' : (statsJour.pauseTotale || 0) >= 22 ? '#ffaa00' : '#ff4444'} /> Pause</span>
                  <div className={styles.miniJaugeTrack}><div className={styles.miniJaugeFill} style={{ width: Math.min((statsJour.pauseTotale || 0) / 45 * 100, 100) + '%', background: (statsJour.pauseTotale || 0) >= 45 ? '#00ff88' : (statsJour.pauseTotale || 0) >= 22 ? '#ffaa00' : '#ff4444' }} /></div>
                  <span className={styles.miniJaugeVal} style={{ color: (statsJour.pauseTotale || 0) >= 45 ? '#00ff88' : (statsJour.pauseTotale || 0) >= 22 ? '#ffaa00' : '#ff4444' }}>{(statsJour.pauseTotale || 0)}m</span>
                </div>
              </div>
            )}

            <button


              className={styles.expandToggle}


              onClick={() => setDashExpanded(!dashExpanded)}


              aria-label={dashExpanded ? 'Reduire le dashboard' : 'Voir jauges et timeline'}


            >


              {dashExpanded ? '\u25B2 Replier' : '\u25BC Jauges + Timeline'}


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


          <HistoriquePanel
            visible={voirHistorique}
            historique={historique}
            onClose={() => setVoirHistorique(false)}
            onReload={reloadHistorique}
            onDelete={deleteHistorique}
            onDeleteAll={deleteAllHistorique}
            onView={viewHistorique}
            onRename={renameHistorique}
          />
      </main>





      <BottomBar


        onAnalyse={() => { if (navigator.vibrate) navigator.vibrate(10); lancerAnalyse(); }}


        analyseEnCours={chargement}


        analyseDisabled={!online || chargement}


        historiqueCount={Math.max(0, (historique || []).length - lastSeenCount)}


        onToggleHistorique={() => setVoirHistorique(v => !v)}


        voirHistorique={voirHistorique}


        onScrollTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}


      />





      <Footer />


    </div>


  );


}




