import React, { useState, useEffect } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS } from 'react-joyride';

/* ============================================================
   GuidedTour — parcours débutant, cibles toujours visibles
   Etapes 1-6: elements toujours presents
   Etapes 7-10: elements toujours presents (header, params, input)
   Les cibles conditionnelles (timeline, gauges, results)
   sont couvertes par le texte explicatif.
   ============================================================ */

var STEPS = [
    {
      target: '[data-tour="header"]',
      title: 'Bienvenue sur FIMO Check',
      content: 'FIMOCheck prépare un service avant son affectation. Il signale les écarts possibles, mais ne remplace ni les données tachygraphe ni la décision du responsable transport.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="params"]',
      title: 'Définissez le contexte',
      content: 'Choisissez le type de service, le pays, l’équipage et le mode de saisie. Ces choix déterminent les règles utilisées : ne les laissez pas au hasard.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="mission"]',
      title: 'Identifiez la mission',
      content: 'Ajoutez une référence, un site et un objet. N’indiquez pas le nom du conducteur : il n’est pas nécessaire au calcul.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="templates"]',
      title: 'Décrivez la journée',
      content: 'Partez d’un modèle ou saisissez chaque période de conduite, travail, pause et repos. Les heures utilisent toujours le format 24 heures.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="header"]',
      title: 'Vérifiez le service',
      content: 'Cliquez sur « Vérifier le service ». Le résultat donne une décision, les règles concernées et un plan d’action. Après toute modification, relancez la vérification.',
      placement: 'bottom',
      disableBeacon: true
    },
    {
      target: '[data-tour="params"]',
      title: 'Gardez la preuve, pas le doute',
      content: 'Exportez le rapport pour documenter le pré-contrôle, puis confirmez les données réelles. Vous pouvez relancer ce parcours à tout moment avec « Aide ».',
      placement: 'bottom',
      disableBeacon: true
    }
  ];

var HIDE_DASHBOARD_STEPS = [4, 5];

var JOYRIDE_STYLES = {
  options: {
    arrowColor: '#fbfdfc',
    backgroundColor: '#fbfdfc',
    overlayColor: 'rgba(15, 31, 32, 0.66)',
    primaryColor: '#136f6c',
    textColor: '#172426',
    spotlightShadow: '0 0 0 3px rgba(19, 111, 108, 0.28)',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '10px',
    padding: '22px',
    boxShadow: '0 18px 48px rgba(23,36,38,0.22)',
    border: '1px solid #c9d5d3',
    maxWidth: '420px',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#172426',
  },
  tooltipContent: {
    fontSize: '15px',
    lineHeight: 1.6,
    color: '#5b6c6c',
  },
  buttonNext: {
    backgroundColor: '#136f6c',
    borderRadius: '7px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    padding: '8px 20px',
  },
  buttonBack: {
    color: '#5b6c6c',
    fontWeight: 500,
    fontSize: '14px',
    marginRight: '8px',
  },
  buttonSkip: {
    color: '#5b6c6c',
    fontSize: '0.85rem',
  },
  buttonClose: {
    color: '#5b6c6c',
  },
  overlay: {
    backgroundColor: 'rgba(15, 31, 32, 0.66)',
  },
  spotlight: {
    borderRadius: '10px',
    boxShadow: '0 0 0 3px #136f6c, 0 0 24px rgba(19,111,108,0.24)',
  },
};

var LOCALE = {
  back: '\u2190 Retour',
  close: 'Fermer',
  last: 'C\'est parti !',
  next: 'Suivant \u2192',
  nextLabelWithProgress: 'Suivant ({step} sur {steps})',
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
