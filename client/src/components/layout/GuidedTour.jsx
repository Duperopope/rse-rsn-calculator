import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';

/* ============================================================
   GuidedTour v2 — React Joyride + auto-hide dashboard
   8 etapes, theme sombre FIMO Check, glow cyan.
   Les etapes 6-7 (activite/ajouter) masquent le sticky dashboard
   pour liberer le viewport.
   ============================================================ */

const STEPS = [
  {
    target: '[data-tour="header"]',
    title: '\uD83C\uDFAF Bienvenue sur FIMO Check !',
    content: 'Votre assistant de conformite RSE/RSN. Ce guide vous presente les zones principales en 8 etapes rapides.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="params"]',
    title: '\u2699\uFE0F Parametres de conduite',
    content: 'Definissez ici le type de transport (marchandises/voyageurs), le pays et les seuils reglementaires. Ces parametres conditionnent toute l\'analyse.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="gauges"]',
    title: '\uD83D\uDCCA Jauges en temps reel',
    content: 'Les jauges se mettent a jour automatiquement. Vert = conforme, orange = attention, rouge = depassement. Survolez pour voir les details.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="timeline"]',
    title: '\uD83D\uDD52 Frise chronologique 24h',
    content: 'Visualisez votre journee complete : Conduite (bleu), Repos (vert), Travail (orange), Disponibilite (jaune), Pause (violet). Les zones rouges signalent les depassements.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="jour-tabs"]',
    title: '\uD83D\uDCC5 Navigation multi-jours',
    content: 'Basculez entre les jours pour verifier la conformite sur plusieurs journees consecutives. Chaque jour a sa propre frise et ses propres activites.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="activite"]',
    title: '\uD83D\uDCCB Vos activites',
    content: 'Chaque ligne represente une activite. Cliquez le type pour modifier, renseignez debut/fin. La poubelle rouge supprime. Utilisez les modeles rapides au-dessus pour pre-remplir.',
    placement: 'top',
    disableBeacon: true,
    data: { hideDashboard: true },
  },
  {
    target: '[data-tour="ajouter"]',
    title: '\u2795 Ajouter une activite',
    content: 'Inserez une nouvelle ligne. L\'heure de debut se cale sur la fin de la precedente. Ajoutez autant d\'activites que necessaire.',
    placement: 'top',
    disableBeacon: true,
    data: { hideDashboard: true },
  },
  {
    target: '[data-tour="header"]',
    title: '\uD83D\uDE80 Analysez et c\'est parti !',
    content: 'Cliquez "Analyser" dans le header pour obtenir le score (0-100) et les infractions. Vous pouvez relancer ce guide a tout moment via le bouton "?" en haut a droite.',
    placement: 'bottom',
    disableBeacon: true,
  },
];

/* Indices des etapes qui doivent cacher le dashboard */
var HIDE_DASHBOARD_STEPS = [5, 6];

/* Style custom theme sombre FIMO Check */
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
    fontSize: '0.92rem',
    lineHeight: 1.6,
    color: '#cbd5e1',
  },
  buttonNext: {
    backgroundColor: '#06b6d4',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    padding: '8px 20px',
  },
  buttonBack: {
    color: '#94a3b8',
    fontWeight: 500,
    fontSize: '0.9rem',
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
  back: '\u2190 Prec.',
  close: 'Fermer',
  last: 'Terminer',
  next: 'Suivant \u2192',
  open: 'Ouvrir',
  skip: 'Passer',
};

/* ---- Helpers pour masquer/restaurer le dashboard ---- */
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

  /* Sync avec la prop visible */
  useEffect(function () {
    if (visible) {
      setStepIndex(0);
      setDashboardHidden(false);
      /* Small delay to let DOM settle before starting */
      var t = setTimeout(function () { setRun(true); }, 100);
      return function () { clearTimeout(t); };
    } else {
      setRun(false);
      setDashboardHidden(false);
    }
  }, [visible]);

  /* Quand stepIndex change, gerer le dashboard */
  useEffect(function () {
    var hide = shouldHideDashboard(stepIndex);
    setDashboardHidden(hide);
  }, [stepIndex]);

  /* Callback Joyride */
  function handleJoyrideCallback(data) {
    var status = data.status;
    var action = data.action;
    var index = data.index;
    var type = data.type;

    /* Tour termine ou skip */
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      setStepIndex(0);
      setDashboardHidden(false);
      if (onClose) onClose();
      return;
    }

    /* Navigation step par step */
    if (type === EVENTS.STEP_AFTER) {
      var nextIndex = action === ACTIONS.PREV ? index - 1 : index + 1;
      /* Pre-toggle dashboard BEFORE Joyride measures next step */
      var willHide = shouldHideDashboard(nextIndex);
      setDashboardHidden(willHide);
      /* Delay step change to let CSS transition finish */
      setTimeout(function () {
        setStepIndex(nextIndex);
      }, willHide || shouldHideDashboard(index) ? 450 : 50);
      return;
    }

    /* Si target introuvable, passer au suivant */
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