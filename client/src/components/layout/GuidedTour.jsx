import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';

/* ============================================================
   GuidedTour v4.0 — 4 etapes adaptees a la visibilite DOM
   Etapes 1-6: elements toujours presents
   Etapes 7-10: elements toujours presents (header, params, input)
   Les cibles conditionnelles (timeline, gauges, results)
   sont couvertes par le texte explicatif.
   ============================================================ */

var STEPS = [
    {
      target: '[data-tour="header"]',
      title: '\uD83C\uDFAF Bienvenue sur FIMO Check !',
      content: 'Verifiez en quelques clics si vos temps de conduite et repos respectent la reglementation europeenne (CE 561/2006). Suivez ce guide rapide en 4 etapes.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="templates"]',
      title: '\u26A1 Saisissez vos activites',
      content: 'Utilisez un modele pre-rempli (journee type, longue, nuit) ou ajoutez vos activites manuellement. Chaque activite a un type (conduite, pause, repos), une heure de debut et de fin. Ajoutez des jours avec le bouton "+".',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="header"]',
      title: '\uD83D\uDE80 Analysez et consultez',
      content: 'Cliquez sur "Analyser" (en bas sur mobile) pour obtenir votre score sur 100, les infractions avec references legales, les amendes estimees et un export PDF. Les jauges en temps reel vous alertent avant meme l\'analyse.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="params"]',
      title: '\u2753 Besoin d\'aide ?',
      content: 'Relancez ce guide via le bouton "Aide" en bas de l\'ecran ou le "?" en haut. Parametrez votre type de service, pays et equipage dans la barre du haut. Bonne route !',
      placement: 'bottom',
      disableBeacon: true
    }
  ];

var HIDE_DASHBOARD_STEPS = [4, 5];

var JOYRIDE_STYLES = {
  options: {
    arrowColor: '#1e293b',
    backgroundColor: '#1e293b',
    overlayColor: 'rgba(0, 0, 0, 0.85)',
    primaryColor: '#06b6d4',
    textColor: '#e2e8f0',
    spotlightShadow: '0 0 25px rgba(6, 182, 212, 0.5)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(6,182,212,0.15)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    maxWidth: '420px',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#f1f5f9',
  },
  tooltipContent: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#cbd5e1',
  },
  buttonNext: {
    backgroundColor: '#06b6d4',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    padding: '8px 20px',
  },
  buttonBack: {
    color: '#94a3b8',
    fontWeight: 500,
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonSkip: {
    color: '#64748b',
    fontSize: '0.85rem',
  },
  buttonClose: {
    color: '#94a3b8',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  spotlight: {
    borderRadius: '14px',
    boxShadow: '0 0 0 3px #06b6d4, 0 0 30px rgba(6, 182, 212, 0.6), 0 0 60px rgba(6, 182, 212, 0.3)',
  },
};

var LOCALE = {
  back: '\u2190 Retour',
  close: 'Fermer',
  last: 'C\'est parti !',
  next: 'Suivant \u2192',
  open: 'Ouvrir',
  skip: 'Passer le guide',
};

function setDashboardHidden(hidden) {
  var el = document.querySelector('[data-tour-sticky="dashboard"]');
  if (!el) return;
  if (hidden) {
    el.setAttribute('data-tour-hidden', 'true');
  } else {
    el.removeAttribute('data-tour-hidden');
  }
}

function shouldHideDashboard(stepIndex) {
  return HIDE_DASHBOARD_STEPS.indexOf(stepIndex) !== -1;
}

export default function GuidedTour({ visible, onClose }) {
  var runState = useState(false);
  var run = runState[0];
  var setRun = runState[1];
  var stepState = useState(0);
  var stepIndex = stepState[0];
  var setStepIndex = stepState[1];

  useEffect(function () {
    if (visible) {
      setStepIndex(0);
      setDashboardHidden(false);
      var t = setTimeout(function () { setRun(true); }, 100);
      return function () { clearTimeout(t); };
    } else {
      setRun(false);
      setDashboardHidden(false);
    }
  }, [visible]);

  useEffect(function () {
    setDashboardHidden(shouldHideDashboard(stepIndex));
  }, [stepIndex]);

  function handleJoyrideCallback(data) {
    var status = data.status;
    var action = data.action;
    var index = data.index;
    var type = data.type;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      setDashboardHidden(false);
      if (onClose) onClose();
      return;
    }

    if (type === EVENTS.STEP_AFTER) {
      var nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      var willHide = shouldHideDashboard(nextIndex);
      setDashboardHidden(willHide);
      setTimeout(function () {
        setStepIndex(nextIndex);
      }, willHide || shouldHideDashboard(index) ? 450 : 50);
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + 1);
    }
  }

  if (!visible) return null;

  return (
    <Joyride
      steps={STEPS}
      run={run}
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      continuous={true}
      showSkipButton={true}
      showProgress={true}
      scrollToFirstStep={true}
      scrollOffset={100}
      disableOverlayClose={false}
      disableCloseOnEsc={false}
      spotlightClicks={false}
      spotlightPadding={12}
      styles={JOYRIDE_STYLES}
      locale={LOCALE}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            filter: 'none',
          },
        },
      }}
    />
  );
}
