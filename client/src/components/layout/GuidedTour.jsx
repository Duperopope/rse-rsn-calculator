import React, { useState, useEffect, useCallback } from 'react';
import styles from './GuidedTour.module.css';

/**
 * GuidedTour v2.0 — Tour interactif 8 etapes
 * Cible les data-tour poses sur les composants reels
 * Saute automatiquement les etapes dont l'element n'est pas visible
 */

const STEPS = [
  {
    target: '[data-tour="header"]',
    title: 'Votre tableau de bord',
    text: 'En haut, vous voyez si le serveur est connecte (point vert), et vous pouvez changer le theme clair/sombre. Le bouton "?" rouvre ce guide a tout moment.',
    position: 'bottom'
  },
  {
    target: '[data-tour="params"]',
    title: 'Votre situation',
    text: 'Choisissez votre type de trajet (regulier, longue distance, occasionnel), le pays et si vous roulez seul ou en equipage double. Tapez sur la barre pour ouvrir les options.',
    position: 'bottom'
  },
  {
    target: '[data-tour="input"]',
    title: 'Remplissez votre journee',
    text: 'Ajoutez vos activites : conduite, pause, repos, autres taches. Chaque ligne a une heure de debut, une heure de fin et un type. Vous pouvez aussi coller un fichier CSV.',
    position: 'top'
  },
  {
    target: '[data-tour="gauges"]',
    title: 'Jauges en temps reel',
    text: 'Ces barres de couleur montrent ou vous en etes : conduite continue, conduite du jour, amplitude, temps de travail. Vert = OK, orange = attention, rouge = depasse.',
    position: 'bottom'
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Frise de la journee',
    text: 'La timeline affiche vos 24 heures en couleurs. Bleu = conduite, gris = pause, vert = repos, jaune = autres taches. Tapez sur une zone pour y acceder dans le formulaire.',
    position: 'top'
  },
  {
    target: '[data-tour="results"]',
    title: 'Resultats de l\'analyse',
    text: 'Apres avoir clique "Analyser", vous verrez votre score (0 a 100), le nombre d\'infractions detectees et l\'amende estimee. Vert = conforme, rouge = problemes.',
    position: 'top'
  },
  {
    target: '[data-tour="tracking"]',
    title: 'Suivi reglementaire',
    text: 'Le detail des repos hebdomadaires, compensations dues et rappels reglementaires. Cliquez sur chaque carte pour voir le tableau detaille.',
    position: 'top'
  },
  {
    target: '[data-tour="history"]',
    title: 'Vos analyses passees',
    text: 'Chaque analyse est sauvegardee automatiquement. Retrouvez vos anciens resultats, comparez vos scores et suivez votre progression.',
    position: 'top'
  }
];

export function GuidedTour({ onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [visibleSteps, setVisibleSteps] = useState([]);

  // Filtrer les etapes dont l'element existe dans le DOM
  useEffect(function() {
    var available = [];
    for (var i = 0; i < STEPS.length; i++) {
      var el = document.querySelector(STEPS[i].target);
      if (el) {
        available.push(i);
      }
    }
    // Toujours inclure au moins les 3 premieres meme si pas encore rendues
    if (available.length === 0) {
      available = [0, 1, 2];
    }
    setVisibleSteps(available);
  }, []);

  // Calculer la position du spotlight
  var updateSpotlight = useCallback(function() {
    if (visibleSteps.length === 0) return;
    var stepIndex = visibleSteps[currentStep];
    if (stepIndex === undefined) return;
    var step = STEPS[stepIndex];
    var el = document.querySelector(step.target);
    if (el) {
      var rect = el.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16
      });
      // Scroll l'element en vue si necessaire
      var inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Re-calculer apres le scroll
        setTimeout(function() {
          var r2 = el.getBoundingClientRect();
          setSpotlightRect({
            top: r2.top - 8,
            left: r2.left - 8,
            width: r2.width + 16,
            height: r2.height + 16
          });
        }, 400);
      }
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep, visibleSteps]);

  useEffect(function() {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    return function() {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [updateSpotlight]);

  // Navigation
  function goNext() {
    if (currentStep < visibleSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  // Fermer avec Escape
  useEffect(function() {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return function() { window.removeEventListener('keydown', handleKey); };
  });

  if (visibleSteps.length === 0) return null;

  var stepIndex = visibleSteps[currentStep];
  if (stepIndex === undefined) { onClose(); return null; }
  var step = STEPS[stepIndex];
  var isLast = currentStep >= visibleSteps.length - 1;
  var progress = ((currentStep + 1) / visibleSteps.length) * 100;

  // Position de la bulle
  var bubbleStyle = {};
  if (spotlightRect) {
    var pos = step.position || 'bottom';
    if (pos === 'bottom') {
      bubbleStyle.top = (spotlightRect.top + spotlightRect.height + 16) + 'px';
      bubbleStyle.left = Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)) + 'px';
    } else {
      bubbleStyle.top = Math.max(16, spotlightRect.top - 200) + 'px';
      bubbleStyle.left = Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340)) + 'px';
    }
  } else {
    bubbleStyle.top = '50%';
    bubbleStyle.left = '50%';
    bubbleStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <div className={styles.overlay}>
      {/* Fond sombre avec trou */}
      <svg className={styles.maskSvg} width="100%" height="100%">
        <defs>
          <mask id="tourMask">
            <rect width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tourMask)" />
      </svg>

      {/* Bordure lumineuse autour de l'element */}
      {spotlightRect && (
        <div
          className={styles.spotlight}
          style={{
            top: spotlightRect.top + 'px',
            left: spotlightRect.left + 'px',
            width: spotlightRect.width + 'px',
            height: spotlightRect.height + 'px'
          }}
        />
      )}

      {/* Bulle explicative */}
      <div className={styles.bubble} style={bubbleStyle}>
        {/* Barre de progression */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: progress + '%' }} />
        </div>

        <div className={styles.bubbleHeader}>
          <span className={styles.stepCount}>{currentStep + 1}/{visibleSteps.length}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer le guide">&times;</button>
        </div>

        <h3 className={styles.bubbleTitle}>{step.title}</h3>
        <p className={styles.bubbleText}>{step.text}</p>

        <div className={styles.bubbleNav}>
          {currentStep > 0 ? (
            <button className={styles.prevBtn} onClick={goPrev}>Precedent</button>
          ) : (
            <button className={styles.skipBtn} onClick={onClose}>Passer</button>
          )}
          <button className={styles.nextBtn} onClick={goNext}>
            {isLast ? 'Terminer' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  );
}
