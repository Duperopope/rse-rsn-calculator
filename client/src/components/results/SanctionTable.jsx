import React, { useState } from 'react';
import styles from './SanctionTable.module.css';

export function SanctionTable() {
  const [visible, setVisible] = useState(false);

  const sanctions = [
    { infraction: 'Conduite continue > 4h30', classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750, article: 'CE 561/2006 Art.7' },
    { infraction: 'Conduite journalière > 9h (ou 10h dérog)', classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750, article: 'CE 561/2006 Art.6' },
    { infraction: 'Repos journalier < 9h (ou 11h)', classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750, article: 'CE 561/2006 Art.8' },
    { infraction: 'Amplitude > 13h (rég.) ou 14h (occ.)', classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750, article: 'Décret 2010-855' },
    { infraction: 'Travail de nuit > 10h', classe: '5e', forfait: 200, minore: 150, majore: 450, max: 1500, article: 'L3312-1' },
    { infraction: 'Absence chronotachygraphe', classe: '5e', forfait: 200, minore: 150, majore: 450, max: 1500, article: 'CE 561/2006 Art.13' },
    { infraction: 'Repos hebdo < 24h (ou 45h)', classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750, article: 'CE 561/2006 Art.8' }
  ];

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setVisible(!visible)}>
        {visible ? 'Masquer' : 'Afficher'} le barème des sanctions
      </button>
      {visible && (
        <div className={styles.cards}>
          {sanctions.map((s, i) => (
            <div key={i} className={styles.sanctionCard}>
              <div className={styles.sanctionHeader}>
                <span className={styles.sanctionInfraction}>{s.infraction}</span>
                <span className={styles.sanctionClasse + (s.classe === '5e' ? ' ' + styles.classe5 : '')}>{s.classe} classe</span>
              </div>
              <div className={styles.sanctionAmounts}>
                <div className={styles.amount + ' ' + styles.amountMinore}>
                  <span className={styles.amountLabel}>Minorée</span>
                  <span className={styles.amountValue}>{s.minore} €</span>
                </div>
                <div className={styles.amount + ' ' + styles.amountForfait}>
                  <span className={styles.amountLabel}>Forfait</span>
                  <span className={styles.amountValue}>{s.forfait} €</span>
                </div>
                <div className={styles.amount + ' ' + styles.amountMajore}>
                  <span className={styles.amountLabel}>Majorée</span>
                  <span className={styles.amountValue}>{s.majore} €</span>
                </div>
                <div className={styles.amount + ' ' + styles.amountMax}>
                  <span className={styles.amountLabel}>Max</span>
                  <span className={styles.amountValue}>{s.max} €</span>
                </div>
              </div>
              <span className={styles.sanctionArticle}>{s.article}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
