import React, { useState } from 'react';
import { exempleCSV, validerCSV } from '../../utils/csv.js';
import styles from './CsvInput.module.css';

/**
 * Zone de saisie CSV brut avec validation en temps reel
 * @param {string} value - Texte CSV
 * @param {Function} onChange - (newValue) => void
 */
export function CsvInput({ value, onChange }) {
  const [validation, setValidation] = useState(null);

  function handleChange(newValue) {
    onChange(newValue);
    if (newValue.trim().length > 0) {
      setValidation(validerCSV(newValue));
    } else {
      setValidation(null);
    }
  }

  function chargerExemple() {
    const ex = exempleCSV();
    onChange(ex);
    setValidation(validerCSV(ex));
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>Donnees CSV</span>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={chargerExemple}>
            Exemple
          </button>
          <button className={styles.btn} onClick={() => { onChange(''); setValidation(null); }}>
            Effacer
          </button>
        </div>
      </div>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={"DATE;HEURE_DEBUT;HEURE_FIN;TYPE\n2025-06-15;06:00;06:15;T\n2025-06-15;06:15;10:45;C\n..."}
        rows={10}
        spellCheck={false}
      />
      {validation ? (
        <div className={validation.valide ? styles.validOk : styles.validErr}>
          {validation.valide ? (
            <span>{validation.nbLignes} lignes, {validation.nbJours} jour(s) - OK</span>
          ) : (
            <div>
              <span>{validation.nbErreurs} erreur(s) :</span>
              {validation.erreurs.slice(0, 3).map((err, i) => (
                <p key={i} className={styles.errLine}>{err}</p>
              ))}
              {validation.nbErreurs > 3 ? <p className={styles.errLine}>...et {validation.nbErreurs - 3} autre(s)</p> : null}
            </div>
          )}
        </div>
      ) : null}
      <p className={styles.hint}>
        Format : DATE;HEURE_DEBUT;HEURE_FIN;TYPE (C=Conduite, T=Tache, P=Pause, D=Disponibilite, R=Repos)
      </p>
    </div>
  );
}
