import React from 'react';
import styles from './Onboarding.module.css';

/**
 * Ecran d'accueil premiere utilisation
 * @param {Function} onClose - Ferme l'onboarding
 */
export function Onboarding({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Bienvenue sur RSE/RSN Calculator</h2>
        <div className={styles.content}>
          <div className={styles.step}>
            <span className={styles.num}>1</span>
            <div>
              <strong>Choisissez le mode</strong>
              <p>Formulaire interactif ou saisie CSV directe</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.num}>2</span>
            <div>
              <strong>Renseignez les activites</strong>
              <p>Conduite, taches, pauses, repos de la journee</p>
            </div>
          </div>
          <div className={styles.step}>
            <span className={styles.num}>3</span>
            <div>
              <strong>Lancez l'analyse</strong>
              <p>Score de conformite, infractions, amendes estimees</p>
            </div>
          </div>
        </div>
        <div className={styles.reglements}>
          <p>Basee sur le reglement CE 561/2006, L3312-1 et le decret 2010-855</p>
        </div>
        <button className={styles.btn} onClick={onClose}>
          Commencer
        </button>
      </div>
    </div>
  );
}
