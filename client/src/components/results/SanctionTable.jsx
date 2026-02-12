import React, { useState } from 'react';
import { EURO } from '../../config/constants.js';
import styles from './SanctionTable.module.css';

/**
 * Tableau bareme des sanctions (reglementaire)
 * Source: CE 561/2006, Code des transports
 */
export function SanctionTable() {
  const [visible, setVisible] = useState(false);

  const sanctions = [
    { infraction: 'Conduite continue > 4h30', classe: '4e classe', amende: 750, article: 'CE 561/2006 Art.7' },
    { infraction: 'Conduite journaliere > 9h (ou 10h derog)', classe: '4e classe', amende: 750, article: 'CE 561/2006 Art.6' },
    { infraction: 'Repos journalier < 9h (ou 11h)', classe: '4e classe', amende: 750, article: 'CE 561/2006 Art.8' },
    { infraction: 'Amplitude > 13h (regulier) ou 14h (occasionnel)', classe: '4e classe', amende: 750, article: 'Decret 2010-855' },
    { infraction: 'Travail de nuit > 10h (activite 0-5h)', classe: '5e classe', amende: 1500, article: 'L3312-1' },
    { infraction: 'Absence/manipulation chronotachygraphe', classe: '5e classe', amende: 1500, article: 'CE 561/2006 Art.13' },
    { infraction: 'Repos hebdomadaire < 24h (ou 45h)', classe: '4e classe', amende: 750, article: 'CE 561/2006 Art.8' }
  ];

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setVisible(!visible)}>
        {visible ? 'Masquer' : 'Afficher'} le bareme des sanctions
      </button>
      {visible ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Infraction</th>
                <th>Classe</th>
                <th>Amende max</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {sanctions.map((s, i) => (
                <tr key={i}>
                  <td>{s.infraction}</td>
                  <td className={styles.classe}>{s.classe}</td>
                  <td className={styles.amende}>{s.amende.toLocaleString('fr-FR')} {EURO}</td>
                  <td className={styles.article}>{s.article}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
