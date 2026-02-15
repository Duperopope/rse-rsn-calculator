import React, { useState } from 'react';
import styles from './FixEnginePanel.module.css';

/**
 * FixEnginePanel - Comparaison avant/apres fix-engine
 * Affiche les faux positifs retires, le delta de score,
 * et le detail des infractions filtrees.
 * 
 * Props:
 *   fixEngine: objet _fix_engine de la reponse API
 *   score: score final (apres correction)
 *   amendeFinale: amende apres correction
 *   infractions: infractions finales (apres correction)
 */
export function FixEnginePanel({ fixEngine, score, amendeFinale, infractions }) {
  var showDetail = useState(false);
  var isOpen = showDetail[0];
  var setIsOpen = showDetail[1];

  if (!fixEngine || fixEngine.error) return null;

  var originales = fixEngine.originales || 0;
  var retirees = fixEngine.retirees || 0;
  var finales = fixEngine.finales || 0;
  var reposCorreiges = fixEngine.repos_corriges || 0;
  var reposHebdos = fixEngine.repos_hebdos || 0;
  var detail = fixEngine.retirees_detail || [];
  var version = fixEngine.version || '?';

  // Calcul du score "avant" estime
  // Chaque infraction retiree represente environ 100/originales points
  var scoreAvant = originales > 0 ? Math.max(0, Math.round(score - (retirees * (100 / originales)))) : score;
  
  // Calcul de l amende "avant" estimee
  // Moyenne par infraction retiree basee sur l amende finale
  var moyenneParInfr = finales > 0 ? amendeFinale / finales : 135;
  var amendeAvant = Math.round(amendeFinale + (retirees * moyenneParInfr));

  var tauxFiltrage = originales > 0 ? Math.round((retirees / originales) * 100) : 0;
  var economie = amendeAvant - amendeFinale;

  // Regrouper les retirees par raison
  var parRaison = {};
  detail.forEach(function(d) {
    var raison = d.raison || 'autre';
    if (!parRaison[raison]) { parRaison[raison] = []; }
    parRaison[raison].push(d);
  });

  var raisonLabels = {
    'faux_positif_0h': 'Faux positif (valeur 0h)',
    'faux_positif_estimation': 'Estimation imprecise',
    'ancien_fixengine': 'Regle obsolete',
    'doublon': 'Doublon detecte',
    'seuil_minimal': 'Sous le seuil minimal',
    'hors_periode': 'Hors periode analysee',
    'autre': 'Autre raison'
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>&#x1F9F9;</span>
          <div>
            <h3 className={styles.title}>Analyse corrig\u00e9e</h3>
            <span className={styles.subtitle}>{retirees} alerte(s) non pertinente(s) retir\u00e9e(s)</span>
          </div>
        </div>
        <div className={styles.badge}>
          <span className={styles.badgeValue}>{retirees}</span>
          <span className={styles.badgeLabel}>corrig\u00e9(s)</span>
        </div>
      </div>

      <div className={styles.comparison}>
        <div className={styles.compCard + ' ' + styles.avant}>
          <span className={styles.compLabel}>Avant correction</span>
          <div className={styles.compStats}>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{originales}</span>
              <span className={styles.compDesc}>infractions</span>
            </div>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{scoreAvant}%</span>
              <span className={styles.compDesc}>score</span>
            </div>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{amendeAvant.toLocaleString('fr-FR')}</span>
              <span className={styles.compDesc}>euros</span>
            </div>
          </div>
        </div>

        <div className={styles.arrow}>
          <span>&#x27A1;</span>
        </div>

        <div className={styles.compCard + ' ' + styles.apres}>
          <span className={styles.compLabel}>Apres correction</span>
          <div className={styles.compStats}>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{finales}</span>
              <span className={styles.compDesc}>infractions</span>
            </div>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{score}%</span>
              <span className={styles.compDesc}>score</span>
            </div>
            <div className={styles.compStat}>
              <span className={styles.compNum}>{amendeFinale.toLocaleString('fr-FR')}</span>
              <span className={styles.compDesc}>euros</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.savings}>
        <div className={styles.savingItem}>
          <span className={styles.savingIcon}>&#x2716;</span>
          <span><strong>{retirees}</strong> alerte(s) non pertinente(s) retir\u00e9e(s)</span>
        </div>
        {reposCorreiges > 0 ? (
          <div className={styles.savingItem}>
            <span className={styles.savingIcon}>&#x1F4C5;</span>
            <span><strong>{reposCorreiges}</strong> repos recalcule(s)</span>
          </div>
        ) : null}
        {reposHebdos > 0 ? (
          <div className={styles.savingItem}>
            <span className={styles.savingIcon}>&#x1F5D3;</span>
            <span><strong>{reposHebdos}</strong> repos hebdomadaire(s) detecte(s)</span>
          </div>
        ) : null}
        {economie > 0 ? (
          <div className={styles.savingItem}>
            <span className={styles.savingIcon}>&#x1F4B0;</span>
            <span>Economie estimee : <strong>{economie.toLocaleString('fr-FR')} euros</strong></span>
          </div>
        ) : null}
      </div>

      {detail.length > 0 ? (
        <div className={styles.detailSection}>
          <button className={styles.toggleBtn} onClick={function() { setIsOpen(!isOpen); }}>
            {isOpen ? 'Masquer' : 'Voir'} le detail des {detail.length} correction(s)
          </button>
          {isOpen ? (
            <div className={styles.detailList}>
              {Object.keys(parRaison).map(function(raison) {
                var items = parRaison[raison];
                var label = raisonLabels[raison] || raison;
                return (
                  <div key={raison} className={styles.raisonGroup}>
                    <div className={styles.raisonHeader}>
                      <span className={styles.raisonLabel}>{label}</span>
                      <span className={styles.raisonCount}>{items.length}</span>
                    </div>
                    {items.map(function(item, idx) {
                      return (
                        <div key={idx} className={styles.detailItem}>
                          <span className={styles.detailRegle}>{item.regle}</span>
                          {item.constate ? (
                            <span className={styles.detailVal}>constate: {item.constate}</span>
                          ) : null}
                          {item.depassement ? (
                            <span className={styles.detailVal}>depassement: {item.depassement}</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}