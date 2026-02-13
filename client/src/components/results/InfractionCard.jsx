import React from 'react';
import styles from './InfractionCard.module.css';

const BAREMES = {
  '4e classe': { forfait: 135, minore: 90, majore: 375, max: 750 },
  '5e classe': { forfait: 200, minore: 150, majore: 450, max: 1500 }
};


const SOURCES_OFFICIELLES = {
  'CE 561/2006 Art.6': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.6'
  },
  'CE 561/2006 Art.7': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.7'
  },
  'CE 561/2006 Art.8': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.8'
  },
  'CE 561/2006 Art.8 par.4': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.8§4'
  },
  'CE 561/2006 Art.8 par.6': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.8§6'
  },
  'CE 561/2006 Art.6 par.3': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.6§3'
  },
  'CE 561/2006 Art.13': {
    url: 'https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32006R0561',
    label: 'EUR-Lex – Règlement CE 561/2006 Art.13'
  },
  'L3312-1': {
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297',
    label: 'Légifrance – Code des transports Art. L3312-1'
  },
  'L3312-2': {
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000026054561',
    label: 'Légifrance – Code des transports Art. L3312-2'
  },
  'R3315-4': {
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033450503',
    label: 'Légifrance – Code des transports Art. R3315-4'
  },
  'R3315-10': {
    url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000033450489/',
    label: 'Légifrance – Code des transports R3315-10'
  },
  'Décret 2010-855': {
    url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000022512271',
    label: 'Légifrance – Décret 2010-855'
  },
  'R3312-11': {
    url: 'https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000023086525/LEGISCTA000023071274/',
    label: 'Légifrance – Code des transports R3312-11'
  },
  'Code du travail': {
    url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033021297',
    label: 'Légifrance – Code des transports L3312-1 (durée travail)'
  }
};


function trouverSource(regle) {
  if (!regle) return null;
  for (const [key, val] of Object.entries(SOURCES_OFFICIELLES)) {
    if (regle.includes(key)) return val;
  }
  return null;
}

export function InfractionCard({ infraction, index, onNavigate }) {
  const inf = infraction || {};
  const message = inf.regle || inf.message || inf.description || 'Infraction';
  const article = inf.article || inf.reference || '';
  const classe = inf.classe || inf.gravite || '4e classe';
  const detail = inf.detail || inf.explication || inf.constate || '';
  const depassement = inf.depassement || '';
  const limite = inf.limite || '';
  const dates = inf.dates_concernees || [];
  const bareme = BAREMES[classe] || BAREMES['4e classe'];

  const sourceFromRegle = trouverSource(message);
  const sourceFromArticle = trouverSource(article);
  const source = sourceFromRegle || sourceFromArticle;

  function handleTap() {
    if (navigator.vibrate) navigator.vibrate(10);
    const timeline = document.querySelector('[class*="Timeline"]') || document.querySelector('[class*="timeline"]');
    if (timeline) {
      timeline.scrollIntoView({ behavior: 'smooth', block: 'center' });
      timeline.style.transition = 'box-shadow 0.3s';
      timeline.style.boxShadow = '0 0 20px rgba(255, 59, 48, 0.5)';
      setTimeout(() => { timeline.style.boxShadow = 'none'; }, 1500);
    }
    if (onNavigate) onNavigate(inf);
  }

  function handleSourceClick(e) {
    e.stopPropagation();
  }

  return (
    <div className={styles.card} onClick={handleTap} role="button" tabIndex={0}>
      <div className={styles.header}>
        <span className={styles.badge}>{index + 1}</span>
        <div className={styles.headerText}>
          <span className={styles.message}>{message}</span>
          <span className={styles.classeBadge + (classe === '5e classe' ? ' ' + styles.classe5 : '')}>{classe}</span>
        </div>
      </div>

      {(limite || detail) && (
        <div className={styles.detailBlock}>
          {limite && <div className={styles.detailRow}><span className={styles.detailLabel}>Limite :</span> {limite}</div>}
          {detail && <div className={styles.detailRow}><span className={styles.detailLabel}>Constaté :</span> {detail}</div>}
          {depassement && depassement !== 'N/A' && <div className={styles.detailRow}><span className={styles.detailLabel}>Dépassement :</span> <strong className={styles.depassement}>{depassement}</strong></div>}
        </div>
      )}

      <div className={styles.amendeGrid}>
        <div className={styles.amendeItem + ' ' + styles.amendeMinore}>
          <span className={styles.amendeLabel}>Minorée</span>
          <span className={styles.amendeValue}>{bareme.minore} €</span>
        </div>
        <div className={styles.amendeItem + ' ' + styles.amendeForfait}>
          <span className={styles.amendeLabel}>Forfait</span>
          <span className={styles.amendeValue}>{bareme.forfait} €</span>
        </div>
        <div className={styles.amendeItem + ' ' + styles.amendeMajore}>
          <span className={styles.amendeLabel}>Majorée</span>
          <span className={styles.amendeValue}>{bareme.majore} €</span>
        </div>
        <div className={styles.amendeItem + ' ' + styles.amendeMax}>
          <span className={styles.amendeLabel}>Maximum</span>
          <span className={styles.amendeValue}>{bareme.max} €</span>
        </div>
      </div>

      {source && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
          onClick={handleSourceClick}
        >
          <span className={styles.sourceLinkIcon}>📜</span>
          <span className={styles.sourceLinkText}>{source.label}</span>
          <span className={styles.sourceLinkArrow}>↗</span>
        </a>
      )}

      {dates.length > 0 && (
        <div className={styles.dates}>
          {dates.map((d, i) => <span key={i} className={styles.dateBadge}>{d}</span>)}
        </div>
      )}

      <div className={styles.navHint}>
        Appuyez pour localiser sur la timeline ↑
      </div>
    </div>
  );
}
