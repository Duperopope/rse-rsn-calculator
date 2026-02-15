import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './GuidedTour.module.css';

/**
 * GuidedTour - Visite guidee interactive complete (16 etapes)
 * Couvre le parcours complet : decouverte -> saisie -> analyse -> resultats
 * Chaque etape cible un element via [data-tour="xxx"]
 */

const STEPS = [
  {
    target: '[data-tour="header"]',
    title: 'Bienvenue sur FIMO Check !',
    text: 'FIMO Check analyse vos temps de conduite et de repos selon la reglementation europeenne CE 561/2006. Ce guide va vous montrer comment utiliser chaque fonctionnalite.',
    position: 'bottom',
    icon: '\u{1F3AF}'
  },
  {
    target: '[data-tour="status"]',
    title: 'Status du serveur',
    text: 'Ce point indique si le serveur est connecte. Vert = en ligne, pret a analyser. Rouge = hors ligne, les analyses ne sont pas disponibles pour le moment.',
    position: 'bottom',
    icon: '\u{1F7E2}'
  },
  {
    target: '[data-tour="theme"]',
    title: 'Theme clair / sombre',
    text: 'Basculez entre le mode sombre et le mode clair selon votre preference. Votre choix est sauvegarde automatiquement.',
    position: 'bottom',
    icon: '\u{1F319}'
  },
  {
    target: '[data-tour="help"]',
    title: 'Besoin d\'aide ?',
    text: 'Ce bouton "?" relance ce guide a tout moment. Si vous etes perdu, un clic et c\'est reparti !',
    position: 'bottom',
    icon: '\u{2753}'
  },
  {
    target: '[data-tour="service-type"]',
    title: 'Votre type de service',
    text: 'Selectionnez votre activite : Urbain, Tourisme, Poids lourd, Long trajet ou Libre. Chaque type applique les seuils reglementaires correspondants (amplitude, derogations...).',
    position: 'bottom',
    icon: '\u{1F698}'
  },
  {
    target: '[data-tour="equipage"]',
    title: 'Solo ou double equipage',
    text: 'Indiquez si vous conduisez seul ou en double equipage. En duo, les regles de repos changent : 9h dans les 30h au lieu de 11h dans les 24h (Art.8 par.5).',
    position: 'bottom',
    icon: '\u{1F465}'
  },
  {
    target: '[data-tour="templates"]',
    title: 'Modeles de journee',
    text: 'Utilisez ces modeles pour pre-remplir une journee type : conduite longue, journee mixte, repos... Un clic et les activites se remplissent automatiquement.',
    position: 'bottom',
    icon: '\u{1F4CB}'
  },
  {
    target: '[data-tour="activite"]',
    title: 'Ligne d\'activite',
    text: 'Chaque ligne represente une activite : le bouton colore a gauche indique le type (Conduite, Repos, Travail, Disponibilite). Les champs horaires definissent le debut et la fin. La poubelle a droite supprime la ligne.',
    position: 'bottom',
    icon: '\u{1F4DD}'
  },
  {
    target: '[data-tour="ajouter"]',
    title: 'Ajouter une activite',
    text: 'Cliquez sur "+ Ajouter une activite" pour inserer une nouvelle ligne. L\'heure de debut se cale automatiquement sur la fin de la precedente.',
    position: 'top',
    icon: '\u{2795}'
  },
  {
    target: '[data-tour="jour-tabs"]',
    title: 'Navigation multi-jours',
    text: 'Chaque onglet represente un jour. Les couleurs indiquent le statut : vert = conforme, orange = attention, rouge = infractions detectees. Cliquez sur "+" pour ajouter un jour.',
    position: 'bottom',
    icon: '\u{1F4C5}'
  },
  {
    target: '[data-tour="gauges"]',
    title: 'Jauges en temps reel',
    text: 'Ces jauges se mettent a jour en direct pendant la saisie. Cliquez sur un cercle pour alterner les vues : Conduite continue / Conduite jour, Amplitude / Repos, Travail hebdo. Les barres en dessous detaillent chaque compteur.',
    position: 'bottom',
    icon: '\u{1F4CA}'
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Frise chronologique 24h',
    text: 'Votre journee en un coup d\'oeil. Bleu = conduite, gris = pause, vert = repos, jaune = autres taches. Les zones rouges signalent des depassements. Cliquez sur une zone pour y acceder dans le formulaire.',
    position: 'top',
    icon: '\u{1F552}'
  },
  {
    target: '[data-tour="analyser"]',
    title: 'Lancer l\'analyse',
    text: 'Une fois vos activites saisies, appuyez sur "Analyser" pour verifier votre conformite. L\'analyse prend quelques secondes et detecte toutes les infractions potentielles.',
    position: 'top',
    icon: '\u{1F50D}'
  },
  {
    target: '[data-tour="results"]',
    title: 'Score et resultats',
    text: 'Apres l\'analyse : votre score de conformite (0 a 100), le nombre d\'infractions, et l\'amende estimee. Vert (90+) = conforme, orange (70-89) = attention, rouge (<70) = problemes serieux. Chaque infraction est detaillee avec l\'article de loi concerne.',
    position: 'top',
    icon: '\u{1F3C6}'
  },
  {
    target: '[data-tour="tracking"]',
    title: 'Suivi reglementaire',
    text: 'Le detail complet : repos hebdomadaires, compensations dues, conduite bi-hebdomadaire (90h max), heures de nuit. Chaque carte est cliquable pour voir le tableau detaille.',
    position: 'top',
    icon: '\u{1F4CB}'
  },
  {
    target: '[data-tour="history"]',
    title: 'Historique des analyses',
    text: 'Toutes vos analyses sont sauvegardees automatiquement. Retrouvez vos resultats passes, comparez vos scores et suivez votre progression. Cliquez sur une entree pour la recharger.',
    position: 'top',
    icon: '\u{1F4DA}'
  }
];

export default function GuidedTour({ visible, onClose }) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const bubbleRef = useRef(null);

  const current = STEPS[step] || STEPS[0];
  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  // Positionner le spotlight et la bulle sur l element cible
  const updatePosition = useCallback(() => {
    if (!visible) return;
    const el = document.querySelector(current.target);
    if (!el) {
      // Element pas visible (ex: resultats pas encore affiches) -> centrer la bulle
      setPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const pad = 10;
    setPos({
      top: rect.top - pad + window.scrollY,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      elRect: rect
    });
    // Scroll l element en vue
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [visible, current.target]);

  useEffect(() => {
    if (!visible) return;
    // Petit delai pour laisser le DOM se stabiliser
    const timer = setTimeout(updatePosition, 150);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [visible, step, updatePosition]);

  // Reset au step 0 quand on ouvre
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  if (!visible) return null;

  function next() {
    if (step < total - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setStep(step + 1);
        setTransitioning(false);
      }, 200);
    } else {
      onClose();
    }
  }

  function prev() {
    if (step > 0) {
      setTransitioning(true);
      setTimeout(() => {
        setStep(step - 1);
        setTransitioning(false);
      }, 200);
    }
  }

  function skip() {
    onClose();
  }

  // Calculer la position de la bulle
  function getBubbleStyle() {
    if (!pos) {
      // Element non visible -> centrer
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }
    const bubbleHeight = 280;
    const bubbleWidth = 340;
    const margin = 16;
    const viewH = window.innerHeight;
    const viewW = window.innerWidth;

    let top, left;
    
    if (current.position === 'bottom') {
      top = pos.top + pos.height + margin - window.scrollY;
      if (top + bubbleHeight > viewH - margin) {
        top = pos.top - bubbleHeight - margin - window.scrollY;
      }
    } else {
      top = pos.top - bubbleHeight - margin - window.scrollY;
      if (top < margin) {
        top = pos.top + pos.height + margin - window.scrollY;
      }
    }

    left = pos.left + (pos.width - bubbleWidth) / 2;
    if (left < margin) left = margin;
    if (left + bubbleWidth > viewW - margin) left = viewW - bubbleWidth - margin;
    
    // Clamp vertical
    if (top < margin) top = margin;
    if (top + bubbleHeight > viewH - margin) top = viewH - bubbleHeight - margin;

    return {
      position: 'fixed',
      top: top + 'px',
      left: left + 'px'
    };
  }

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) skip(); }}>
      {/* Masque SVG pour le spotlight */}
      {pos ? (
        <svg className={styles.maskSvg} width="100%" height="100%">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={pos.left}
                y={pos.top - window.scrollY}
                width={pos.width}
                height={pos.height}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.75)" mask="url(#tour-mask)" />
        </svg>
      ) : (
        <div className={styles.fullOverlay} />
      )}

      {/* Spotlight border */}
      {pos ? (
        <div
          className={styles.spotlight}
          style={{
            position: 'fixed',
            top: (pos.top - window.scrollY) + 'px',
            left: pos.left + 'px',
            width: pos.width + 'px',
            height: pos.height + 'px',
          }}
        />
      ) : null}

      {/* Bulle */}
      <div
        ref={bubbleRef}
        className={styles.bubble + (transitioning ? ' ' + styles.bubbleHidden : '')}
        style={getBubbleStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de progression */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: progress + '%' }} />
        </div>

        {/* Header bulle */}
        <div className={styles.bubbleHeader}>
          <span className={styles.bubbleIcon}>{current.icon}</span>
          <span className={styles.stepCount}>{step + 1} / {total}</span>
          <button className={styles.closeBtn} onClick={skip} title="Fermer le guide" aria-label="Fermer">&times;</button>
        </div>

        {/* Contenu */}
        <h3 className={styles.bubbleTitle}>{current.title}</h3>
        <p className={styles.bubbleText}>{current.text}</p>

        {/* Navigation */}
        <div className={styles.bubbleNav}>
          <button
            className={styles.skipBtn}
            onClick={skip}
          >
            Passer
          </button>
          <div className={styles.navRight}>
            {step > 0 ? (
              <button className={styles.prevBtn} onClick={prev}>
                &larr; Precedent
              </button>
            ) : null}
            <button className={styles.nextBtn} onClick={next}>
              {step < total - 1 ? 'Suivant \u2192' : 'Terminer \u2713'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
