import React, { useState } from 'react';
import styles from './SanctionTable.module.css';

const sanctions = [
  {
    infraction: 'Conduite continue > 4h30',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.7',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Conduite journalière > 9h (ou 10h dérog.)',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.6',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Repos journalier < 9h (ou 11h)',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.8',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Amplitude > 13h (rég.) ou 14h (occ.)',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'C. transports R3312-9 / R3312-11',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043651232',
    sourceLabel: 'Légifrance – C. transports R3312-9 / R3312-11'
  },
  {
    infraction: 'Travail de nuit > 10h',
    classe: '5e', forfait: 200, minore: 150, majore: 450, max: 1500,
    article: 'L3312-1',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297',
    sourceLabel: 'Légifrance – Art. L3312-1'
  },
  {
    infraction: 'Absence chronotachygraphe',
    classe: '5e', forfait: 200, minore: 150, majore: 450, max: 1500,
    article: 'CE 561/2006 Art.13',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Repos hebdo < 24h (ou 45h)',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.8',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Conduite hebdomadaire > 56h',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.6 + R3312-11',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Conduite bi-hebdomadaire > 90h',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'CE 561/2006 Art.6§3',
    sourceUrl: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    sourceLabel: 'EUR-Lex – Règlement CE 561/2006'
  },
  {
    infraction: 'Sanctions barème (4e classe)',
    classe: '4e', forfait: 135, minore: 90, majore: 375, max: 750,
    article: 'R3315-10',
    sourceUrl: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033450489/',
    sourceLabel: 'Légifrance – R3315-10 (barème)'
  }
];

export function SanctionTable() {
  const [visible, setVisible] = useState(false);

  function handleSourceClick(e) {
    e.stopPropagation();
  }

  return (
    <div className={styles.container}>
      <button className={styles.toggleBtn} onClick={() => setVisible(!visible)}>
        {visible ? 'Masquer' : 'Afficher'} le barème des sanctions ({sanctions.length} infractions référencées)
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
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sourceLink}
                onClick={handleSourceClick}
              >
                <span className={styles.sourceLinkIcon}>📜</span>
                <span className={styles.sourceLinkText}>{s.sourceLabel} — {s.article}</span>
                <span className={styles.sourceLinkArrow}>↗</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
