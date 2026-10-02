import React, { useState, useEffect, useRef } from 'react';


import { useAnalysis } from '../hooks/useAnalysis.js';


import { useLocalStorage } from '../hooks/useLocalStorage.js';


import { useTheme } from '../hooks/useTheme.js';


import { useServerHealth } from '../hooks/useServerHealth.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';


import { STORAGE_KEY, HISTORIQUE_MAX } from '../config/constants.js';


import { activitesToCSV } from '../utils/csv.js';


import { calculerStatsJour } from '../utils/stats.js';


import { Header } from '../components/layout/Header.jsx';


import { BottomBar } from '../components/layout/BottomBar.jsx';


import { Footer } from '../components/layout/Footer.jsx';


import GuidedTour from '../components/layout/GuidedTour.jsx';


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


import { HistoriquePanel } from '../components/history/HistoriquePanel.jsx';
import { ErrorBoundary } from '../components/common/ErrorBoundary.jsx';
import { ScoreSummary } from '../components/dashboard/ScoreSummary.jsx';
import { MiniGauges } from '../components/dashboard/MiniGauges.jsx';
import { ContentTabs } from '../components/navigation/ContentTabs.jsx';
import { DriverTabs } from '../components/navigation/DriverTabs.jsx';


/**


 * FIMO Check v7.10.0


 * - Boutons Analyser + Historique remontes dans le Header


 * - Dashboard sticky avec var(--header-height)


 * - Onglets colores vert/orange/rouge + fleches navigation


 */


export default function Calculator() {


  const { theme, toggleTheme } = useTheme();


  const { online, version: serverVersion, loading: healthLoading } = useServerHealth();
  const isDesktop = useMediaQuery('(min-width: 769px)');


  const { analyser, resultat, setResultat, erreur, chargement, reset } = useAnalysis();


  const [historique, setHistorique] = useLocalStorage(STORAGE_KEY, []);


  const [onboardingDone, setOnboardingDone] = useLocalStorage('rse_onboarding_done', false);
  const [showTour, setShowTour] = useState(false);


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
  const [jaugeContext, setJaugeContext] = useState({
    nbDerogConduite: 0,
    amplNormal: 660,
    amplMax: 780
  });


  const [jourActifIndex, setJourActifIndex] = useState(0);


  const [jourMenuIndex, setJourMenuIndex] = useState(-1);


  const [dashExpanded, setDashExpanded] = useState(false);
  const [showResultDetail, setShowResultDetail] = useState(() => { try { return !!sessionStorage.getItem('fimo_resultat'); } catch(e) { return false; } });
  const [bottomTab, setBottomTab] = useState('saisie');
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);


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
    if (mode !== 'formulaire') return;

    const joursPourStats = equipage === 'double' && conducteurActif === 2 ? jours2 : jours;
    if (!joursPourStats.length) {
      setStatsJour(null);
      return;
    }

    const idx = Math.min(jourActifIndex, joursPourStats.length - 1);
    const jourActif = joursPourStats[idx];
    if (!jourActif || !jourActif.activites) {
      setStatsJour(null);
      return;
    }

    // CE 561/2006 Art.6 §1 : conduite journaliere portee a 10h max 2x/semaine.
    let nbDerogConduite = 0;
    for (let di = 0; di < joursPourStats.length; di++) {
      if (di === idx) continue;
      const jourStats = calculerStatsJour(joursPourStats[di].activites);
      if (jourStats && jourStats.conduiteTotale > 540) nbDerogConduite++;
    }

    const isSLOtype = (
      typeService === 'OCCASIONNEL' ||
      typeService === 'SLO' ||
      typeService === 'INTERURBAIN' ||
      typeService === 'MARCHANDISES'
    );
    const amplNormal = isSLOtype ? 720 : 660;
    const amplDerog = isSLOtype ? 840 : 780;
    const nextStats = calculerStatsJour(jourActif.activites);
    const amplActuelle = nextStats ? nextStats.amplitude : 0;

    setJaugeContext({
      nbDerogConduite: Math.min(nbDerogConduite, 2),
      amplNormal,
      amplMax: amplActuelle > amplNormal ? amplDerog : amplNormal
    });
    setStatsJour(nextStats);
  }, [jours, jours2, mode, jourActifIndex, equipage, conducteurActif, typeService]);


  /* === Analyse === */


  async function lancerAnalyse() {


    let csv = csvTexte;


    if (mode === 'formulaire') csv = activitesToCSV(jours);


    if (!csv || !csv.trim()) return;


    const csv2 = equipage === "double" ? (mode === "csv" ? csvTexte2 : activitesToCSV(jours2)) : null;


    const data = await analyser(csv, csv2, typeService, pays, equipage);


    if (data) {
      setShowResultDetail(true); setBottomTab('resultats');


      const entry = {


        date: new Date().toISOString(),


          jours: JSON.parse(JSON.stringify(jours)),
          jours2: equipage === 'double' ? JSON.parse(JSON.stringify(jours2)) : null,


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
      if (entry.jours2) setJours2(entry.jours2);
      setConducteurActif(1);


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


        <GuidedTour visible={!onboardingDone || showTour} onClose={() => { setOnboardingDone(true); setShowTour(false); }} />


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


        onStartTour={() => setShowTour(true)}


      />


      <main className={styles.main}>


        <ParametresPanel


          typeService={typeService} onTypeServiceChange={setTypeService}


          pays={pays} onPaysChange={setPays}


          equipage={equipage} onEquipageChange={setEquipage}


          mode={mode} onModeChange={(m) => { setMode(m); reset(); }}


        />


        {equipage === 'double' ? (
          <DriverTabs activeDriver={conducteurActif} onChange={setConducteurActif} />
        ) : null}


        {/* === DASHBOARD STICKY === */}


        {mode === 'formulaire' && statsJour ? (


          <div className={styles.realtimeSticky + (dashExpanded ? ' ' + styles.dashExpanded : '')} data-tour-sticky="dashboard">
            <ScoreSummary
              resultat={resultat}
              expanded={showResultDetail}
              onToggle={() => setShowResultDetail((value) => !value)}
            />


            {(dashExpanded || isDesktop) && <PanneauJauges stats={statsJour} typeService={typeService} nbDerogConduite={jaugeContext.nbDerogConduite} jours={jours} jourActifIndex={jourActifIndex} />}


            {(dashExpanded || isDesktop) && jours[jourActifIndex] && jours[jourActifIndex].activites.length > 0 ? (


              <div data-tour="timeline" className={styles.timelineWrap}>


                <ErrorBoundary><Card><Timeline24h equipage={equipage} activites={jours[jourActifIndex] ? jours[jourActifIndex].activites : []} theme={theme} jours={jours} detailsJours={resultat && resultat.details_jours ? resultat.details_jours : []} jourActifIndex={jourActifIndex} onJourClick={function(i) { setJourActifIndex(i); }} onInfractionClick={function(jourIdx, type) { setJourActifIndex(jourIdx); setBottomTab('resultats'); setTimeout(function() { var firstCard = document.querySelector('[data-infraction-index]'); if (firstCard) { firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstCard.style.transition = 'box-shadow 0.3s'; firstCard.style.boxShadow = '0 0 16px rgba(255, 68, 68, 0.6)'; setTimeout(function() { firstCard.style.boxShadow = 'none'; }, 2500); } }, 400); }} statistiques={resultat && resultat.statistiques ? resultat.statistiques : null} onActiviteClick={function(idx) { setBottomTab('saisie'); setTimeout(function() { var el = document.getElementById('activite-' + idx); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.style.transition = 'box-shadow 0.3s'; el.style.boxShadow = '0 0 20px rgba(96, 165, 250, 0.5)'; setTimeout(function() { el.style.boxShadow = 'none'; }, 2000); } }, 100); }} /></Card></ErrorBoundary>


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
                <div data-tour="jour-tabs" className={styles.jourNavTabs} ref={jourTabsRef}>
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
                </div>
                
                <button
                  className={styles.jourNavArrow + ' ' + styles.jourNavArrowRight}
                  onClick={() => scrollJourTabs('right')}
                  aria-label="Jours suivants"
                  tabIndex={-1}
                >&rsaquo;</button>
              </div>
            {!dashExpanded && (
              <MiniGauges stats={statsJour} context={jaugeContext} />
            )}

            <button


              className={styles.expandToggle}


              onClick={() => setDashExpanded(!dashExpanded)}


              aria-label={dashExpanded ? 'Reduire le dashboard' : 'Voir jauges et timeline'}


            >


              {dashExpanded ? '\u25B2' : '\u25BC'}


            </button>


          </div>


        ) : null}


        {/* === ZONE BASSE : Onglets Saisie / Resultats === */}
        <div
          onTouchStart={function(e) { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; }}
          onTouchEnd={function(e) {
            var dx = e.changedTouches[0].clientX - touchStartX.current;
            var dy = e.changedTouches[0].clientY - touchStartY.current;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && resultat) {
              if (dx < 0 && bottomTab === "saisie") setBottomTab("resultats");
              if (dx > 0 && bottomTab === "resultats") setBottomTab("saisie");
            }
          }}
        >
        {chargement && <div role="status" aria-live="polite" style={{ padding: "16px", textAlign: "center" }}><Loader /></div>}
        {erreur && <Card variant="danger" animate><p role="alert" className={styles.erreur}>{erreur}</p></Card>}

        {resultat && (
          <ContentTabs activeTab={bottomTab} onChange={setBottomTab} />
        )}

        {bottomTab === "resultats" && resultat && !chargement ? (
          <div data-tour="results" className={styles.resultInlineWrap}>
            <ResultPanel resultat={resultat} compact onBack={function() { setBottomTab("saisie"); window.scrollTo(0, 0); }} onNavigateTimeline={function(zoneType) { setBottomTab("saisie"); setTimeout(function() { var timeline = document.querySelector("[class*='Timeline']") || document.querySelector("[class*='timeline']"); if (timeline) { timeline.scrollIntoView({ behavior: "smooth", block: "center" }); if (zoneType) { var target = timeline.querySelector("[data-zone-type='" + zoneType + "']"); if (target) { target.style.transition = "box-shadow 0.3s, transform 0.3s"; target.style.boxShadow = "0 0 16px 4px rgba(255, 59, 48, 0.8)"; target.style.transform = "scaleY(1.5)"; target.style.zIndex = "50"; setTimeout(function() { target.style.boxShadow = "none"; target.style.transform = "scaleY(1)"; target.style.zIndex = ""; }, 2500); } } timeline.style.transition = "box-shadow 0.3s"; timeline.style.boxShadow = "0 0 20px rgba(255, 59, 48, 0.5)"; setTimeout(function() { timeline.style.boxShadow = "none"; }, 2000); } }, 400); }} />
          </div>
        ) : (
          <div data-tour="input" className={styles.inputSection}>
            {mode === "formulaire" ? (
              <div className={styles.formulaire}>
                <JourFormulaire
                  key={joursActifs[safeIndex]?.date + "-" + safeIndex}
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
        )}

        </div>


        {/* === Info equipage double === */}


        {equipage === 'double' ? (


          <p className={styles.equipageInfo}>Mode double equipage : repos 9h dans les 30h (Art.8 par.5)</p>


        ) : null}


        {!online && !healthLoading ? (


          <p className={styles.offlineMsg} role="status">Serveur hors ligne. Verifiez votre connexion puis reessayez.</p>


        ) : null}


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
        onStartTour={() => setShowTour(true)}
      />


      <Footer />


    </div>


  );


}


