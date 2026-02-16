var fs = require('fs');

// ============================================================
// ETAPE 1 : Nouveau composant Timeline24h.jsx — 3 vues
// ============================================================
console.log('[1/4] Ecriture Timeline24h.jsx...');

var timelineJsx = `import React, { useState, useMemo } from 'react';
import styles from './Timeline24h.module.css';

// Couleurs par type d activite (standard tachygraphe)
var COULEURS = {
  C: { bg: '#4CAF50', label: 'Conduite' },
  T: { bg: '#2196F3', label: 'Travail' },
  P: { bg: '#9C27B0', label: 'Pause' },
  D: { bg: '#FF9800', label: 'Disponibilite' },
  R: { bg: '#78909C', label: 'Repos' }
};

function minutesDepuisMinuit(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  var parts = hhmm.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function formatDuree(min) {
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (h === 0) return m + 'min';
  if (m === 0) return h + 'h';
  return h + 'h' + (m < 10 ? '0' : '') + m;
}

function formatHeure(min) {
  var h = Math.floor(min / 60) % 24;
  var m = min % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

// === VUE JOUR ===
function VueJour(props) {
  var activites = props.activites || [];
  var equipage = props.equipage;
  var theme = props.theme;
  var onActiviteClick = props.onActiviteClick;
  var tooltip = props.tooltip;
  var setTooltip = props.setTooltip;

  var blocs = useMemo(function() {
    return activites.map(function(a, i) {
      var debut = minutesDepuisMinuit(a.debut);
      var fin = minutesDepuisMinuit(a.fin);
      var duree = fin - debut;
      if (duree <= 0) duree = 1;
      var left = (debut / 1440) * 100;
      var width = (duree / 1440) * 100;
      var couleur = COULEURS[a.type] || COULEURS.T;
      return {
        index: i,
        left: left,
        width: width,
        bg: couleur.bg,
        label: couleur.label,
        type: a.type,
        debut: a.debut,
        fin: a.fin,
        duree: duree,
        showLabel: duree >= 60
      };
    });
  }, [activites]);

  return React.createElement('div', { className: styles.vueJour },
    // Echelle horaire
    React.createElement('div', { className: styles.echelleHoraire },
      [0, 3, 6, 9, 12, 15, 18, 21].map(function(h) {
        return React.createElement('span', {
          key: h,
          className: styles.echelleMarque,
          style: { left: (h / 24 * 100) + '%' }
        }, h + 'h');
      })
    ),
    // Track
    React.createElement('div', { className: styles.track },
      // Bandes nuit
      React.createElement('div', { className: styles.nightBand, style: { left: '0%', width: (6 / 24 * 100) + '%' } }),
      React.createElement('div', { className: styles.nightBand, style: { left: (21 / 24 * 100) + '%', width: (3 / 24 * 100) + '%' } }),
      // Blocs
      blocs.map(function(b) {
        return React.createElement('div', {
          key: b.index,
          className: styles.bloc,
          style: { left: b.left + '%', width: b.width + '%', backgroundColor: b.bg },
          onClick: function(e) {
            e.stopPropagation();
            if (tooltip && tooltip.index === b.index) {
              setTooltip(null);
            } else {
              setTooltip(b);
            }
            if (onActiviteClick) onActiviteClick(b.index);
          }
        },
          b.showLabel ? React.createElement('span', { className: styles.blocLabel }, b.type) : null
        );
      })
    ),
    // Badge equipage
    React.createElement('div', { className: styles.badgeRow },
      React.createElement('span', { className: styles.badge },
        (equipage === 'double' ? '\\uD83D\\uDC65 Duo' : '\\uD83D\\uDC64 Solo')
      )
    ),
    // Tooltip
    tooltip ? React.createElement('div', { className: styles.tooltip },
      React.createElement('strong', null, (COULEURS[tooltip.type] || {}).label || tooltip.type),
      ' \\u2022 ', tooltip.debut, ' \\u2192 ', tooltip.fin,
      ' \\u2022 ', formatDuree(tooltip.duree)
    ) : null
  );
}

// === VUE SEMAINE ===
function VueSemaine(props) {
  var jours = props.jours || [];
  var detailsJours = props.detailsJours || [];
  var jourActifIndex = props.jourActifIndex;
  var onJourClick = props.onJourClick;
  var statistiques = props.statistiques;

  // Associer details_jours par date
  var detailsMap = {};
  detailsJours.forEach(function(d) { if (d.date) detailsMap[d.date] = d; });

  var conduiteTotaleSemaine = 0;
  detailsJours.forEach(function(d) { conduiteTotaleSemaine += (d.conduite_min || 0); });

  return React.createElement('div', { className: styles.vueSemaine },
    // En-tete
    React.createElement('div', { className: styles.semaineHeader },
      React.createElement('span', { className: styles.semaineTitle }, 'Vue semaine'),
      React.createElement('span', { className: styles.semaineCounter,
        style: { color: conduiteTotaleSemaine > 3360 ? '#ff4444' : conduiteTotaleSemaine > 2880 ? '#ffaa00' : '#00ff88' }
      }, formatDuree(conduiteTotaleSemaine) + ' / 56h conduite')
    ),
    // Lignes jours
    jours.map(function(jour, i) {
      var detail = detailsMap[jour.date] || {};
      var nbInf = detail.infractions ? detail.infractions.length : 0;
      var nbAvert = detail.avertissements ? detail.avertissements.length : 0;
      var isActif = i === jourActifIndex;
      var dateLabel = jour.date ? jour.date.slice(5) : 'J' + (i + 1);
      var jourNom = '';
      try {
        var d = new Date(jour.date + 'T12:00:00');
        jourNom = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
      } catch(e) { jourNom = ''; }

      return React.createElement('div', {
        key: i,
        className: styles.semaineLigne + (isActif ? ' ' + styles.semaineLigneActive : ''),
        onClick: function() { if (onJourClick) onJourClick(i); }
      },
        // Label date
        React.createElement('div', { className: styles.semaineDate },
          React.createElement('span', { className: styles.semaineJourNom }, jourNom),
          React.createElement('span', { className: styles.semaineDateNum }, dateLabel)
        ),
        // Mini barre 0-24h
        React.createElement('div', { className: styles.semaineBarre },
          // Bandes nuit mini
          React.createElement('div', { className: styles.nightBandMini, style: { left: '0%', width: '25%' } }),
          React.createElement('div', { className: styles.nightBandMini, style: { left: '87.5%', width: '12.5%' } }),
          // Blocs activites
          (jour.activites || []).map(function(a, ai) {
            var debut = minutesDepuisMinuit(a.debut);
            var fin = minutesDepuisMinuit(a.fin);
            var duree = fin - debut;
            if (duree <= 0) duree = 1;
            var couleur = COULEURS[a.type] || COULEURS.T;
            return React.createElement('div', {
              key: ai,
              className: styles.semaineBlocAct,
              style: {
                left: (debut / 1440 * 100) + '%',
                width: (duree / 1440 * 100) + '%',
                backgroundColor: couleur.bg
              }
            });
          })
        ),
        // Stats rapides
        React.createElement('div', { className: styles.semaineStats },
          detail.conduite_h ? React.createElement('span', { className: styles.semaineStat }, detail.conduite_h + 'h C') : null,
          nbInf > 0 ? React.createElement('span', { className: styles.semaineInfBadge }, nbInf) : null,
          nbAvert > 0 ? React.createElement('span', { className: styles.semaineAvertBadge }, nbAvert) : null
        )
      );
    }),
    // Statistiques globales
    statistiques ? React.createElement('div', { className: styles.semaineFooter },
      React.createElement('span', null, 'Moy. ' + (statistiques.moyenne_conduite_jour_h || '?') + 'h/j'),
      React.createElement('span', null, 'Total ' + (statistiques.conduite_totale_h || '?') + 'h')
    ) : null
  );
}

// === COMPOSANT PRINCIPAL ===
export function Timeline24h(props) {
  var activites = props.activites || [];
  var equipage = props.equipage || 'solo';
  var theme = props.theme || 'light';
  var onActiviteClick = props.onActiviteClick;
  // Props multi-jours
  var jours = props.jours;
  var detailsJours = props.detailsJours;
  var jourActifIndex = props.jourActifIndex;
  var onJourClick = props.onJourClick;
  var statistiques = props.statistiques;

  var hasMultiJours = jours && jours.length > 1;

  var vueOptions = ['Jour'];
  if (hasMultiJours) {
    vueOptions.push('Semaine');
  }

  var savedVue = 'Jour';
  var _s = useState(savedVue);
  var vue = _s[0];
  var setVue = _s[1];

  var _t = useState(null);
  var tooltip = _t[0];
  var setTooltip = _t[1];

  // Si pas de multi-jours et vue semaine selectionnee, revenir a jour
  if (!hasMultiJours && vue !== 'Jour') {
    setVue('Jour');
  }

  return React.createElement('div', {
    className: styles.container + ' ' + (theme === 'dark' ? styles.dark : ''),
    'data-tour': 'timeline'
  },
    // Selecteur de vue (seulement si multi-jours)
    hasMultiJours ? React.createElement('div', { className: styles.vueSelector },
      vueOptions.map(function(v) {
        return React.createElement('button', {
          key: v,
          className: styles.vueSelectorBtn + (vue === v ? ' ' + styles.vueSelectorActive : ''),
          onClick: function() { setVue(v); setTooltip(null); }
        }, v);
      })
    ) : null,

    // Legende
    React.createElement('div', { className: styles.legende },
      Object.keys(COULEURS).map(function(k) {
        return React.createElement('span', { key: k, className: styles.legendeItem },
          React.createElement('span', {
            className: styles.legendeDot,
            style: { backgroundColor: COULEURS[k].bg }
          }),
          COULEURS[k].label
        );
      })
    ),

    // Vue active
    vue === 'Jour' ? React.createElement(VueJour, {
      activites: activites,
      equipage: equipage,
      theme: theme,
      onActiviteClick: onActiviteClick,
      tooltip: tooltip,
      setTooltip: setTooltip
    }) : null,

    vue === 'Semaine' ? React.createElement(VueSemaine, {
      jours: jours,
      detailsJours: detailsJours,
      jourActifIndex: jourActifIndex,
      onJourClick: onJourClick,
      statistiques: statistiques
    }) : null
  );
}
`;

fs.writeFileSync('client/src/components/timeline/Timeline24h.jsx', timelineJsx, 'utf8');
console.log('  OK - Timeline24h.jsx ecrit (' + timelineJsx.split('\n').length + ' lignes)');

// ============================================================
// ETAPE 2 : CSS
// ============================================================
console.log('[2/4] Ecriture Timeline24h.module.css...');

var css = `/* Timeline24h v6 — Multi-niveaux */

/* === CONTAINER === */
.container {
  width: 100%;
  padding: 8px 0;
}
.dark {
  color: #e0e0e0;
}

/* === SELECTEUR VUE === */
.vueSelector {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  padding: 0 4px;
}
.vueSelectorBtn {
  flex: 1;
  padding: 6px 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.dark .vueSelectorBtn {
  border-color: #444;
  color: #999;
}
.vueSelectorActive {
  background: #1a73e8;
  color: #fff !important;
  border-color: #1a73e8 !important;
  font-weight: 600;
}

/* === LEGENDE === */
.legende {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding: 0 4px 6px;
  font-size: 11px;
  color: #888;
}
.legendeItem {
  display: flex;
  align-items: center;
  gap: 3px;
}
.legendeDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

/* ============================== */
/* === VUE JOUR === */
/* ============================== */
.vueJour {
  position: relative;
}

/* Echelle horaire */
.echelleHoraire {
  position: relative;
  height: 16px;
  margin: 0 4px;
  font-size: 10px;
  color: #aaa;
}
.echelleMarque {
  position: absolute;
  transform: translateX(-50%);
}

/* Track */
.track {
  position: relative;
  height: 52px;
  background: #f5f5f5;
  border-radius: 10px;
  margin: 0 4px;
  overflow: hidden;
}
.dark .track {
  background: #2a2a2a;
}

/* Bandes nuit */
.nightBand {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(63, 81, 181, 0.05);
  pointer-events: none;
}

/* Blocs activite */
.bloc {
  position: absolute;
  top: 4px;
  height: calc(100% - 8px);
  border-radius: 6px;
  min-width: 6px;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bloc:hover {
  opacity: 0.85;
}
.blocLabel {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  pointer-events: none;
}

/* Badge equipage */
.badgeRow {
  display: flex;
  justify-content: flex-end;
  padding: 4px 8px 0;
}
.badge {
  font-size: 11px;
  color: #888;
}

/* Tooltip */
.tooltip {
  background: #333;
  color: #fff;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  margin: 6px 4px 0;
  text-align: center;
}
.dark .tooltip {
  background: #555;
}

/* ============================== */
/* === VUE SEMAINE === */
/* ============================== */
.vueSemaine {
  padding: 0 4px;
}

.semaineHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.semaineTitle {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}
.dark .semaineTitle {
  color: #ccc;
}
.semaineCounter {
  font-size: 12px;
  font-weight: 700;
}

/* Ligne jour */
.semaineLigne {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}
.semaineLigne:hover {
  background: rgba(0,0,0,0.03);
}
.dark .semaineLigne:hover {
  background: rgba(255,255,255,0.05);
}
.semaineLigneActive {
  background: rgba(26, 115, 232, 0.08) !important;
  border-left: 3px solid #1a73e8;
}

/* Date */
.semaineDate {
  width: 48px;
  flex-shrink: 0;
  text-align: center;
}
.semaineJourNom {
  display: block;
  font-size: 10px;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.semaineDateNum {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #555;
}
.dark .semaineDateNum {
  color: #ccc;
}

/* Mini barre */
.semaineBarre {
  flex: 1;
  height: 24px;
  background: #f0f0f0;
  border-radius: 6px;
  position: relative;
  overflow: hidden;
}
.dark .semaineBarre {
  background: #2a2a2a;
}
.nightBandMini {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(63, 81, 181, 0.04);
  pointer-events: none;
}
.semaineBlocAct {
  position: absolute;
  top: 3px;
  height: calc(100% - 6px);
  border-radius: 4px;
  min-width: 3px;
}

/* Stats */
.semaineStats {
  width: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}
.semaineStat {
  font-size: 11px;
  color: #777;
}
.dark .semaineStat {
  color: #aaa;
}
.semaineInfBadge {
  background: #ff4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.semaineAvertBadge {
  background: #ffaa00;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Footer */
.semaineFooter {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px 0;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #eee;
  margin-top: 6px;
}
.dark .semaineFooter {
  border-top-color: #333;
}

/* === RESPONSIVE MOBILE === */
@media (max-width: 480px) {
  .track {
    height: 56px;
  }
  .bloc {
    min-width: 8px;
  }
  .semaineDate {
    width: 42px;
  }
  .semaineStats {
    width: 64px;
  }
  .semaineBarre {
    height: 20px;
  }
}
`;

fs.writeFileSync('client/src/components/timeline/Timeline24h.module.css', css, 'utf8');
console.log('  OK - CSS ecrit');

// ============================================================
// ETAPE 3 : Patch Calculator.jsx — passer les props multi-jours
// ============================================================
console.log('[3/4] Patch Calculator.jsx pour props multi-jours...');

var calc = fs.readFileSync('client/src/pages/Calculator.jsx', 'utf8');

// Trouver la ligne Timeline24h actuelle et la remplacer
var oldTimeline = calc.match(/<Card><Timeline24h[^/]*\/><\/Card>/);
if (!oldTimeline) {
  // Essayer sur plusieurs lignes
  oldTimeline = calc.match(/<Card><Timeline24h[\s\S]*?\/><\/Card>/);
}

if (oldTimeline) {
  var newTimeline = '<Card><Timeline24h equipage={equipage} activites={jours[jourActifIndex] ? jours[jourActifIndex].activites : []} theme={theme} jours={jours} detailsJours={resultat && resultat.details_jours ? resultat.details_jours : []} jourActifIndex={jourActifIndex} onJourClick={function(i) { setJourActifIndex(i); }} statistiques={resultat && resultat.statistiques ? resultat.statistiques : null} onActiviteClick={function(idx) { setBottomTab(\'saisie\'); setTimeout(function() { var el = document.getElementById(\'activite-\' + idx); if (el) { el.scrollIntoView({ behavior: \'smooth\', block: \'center\' }); el.style.transition = \'box-shadow 0.3s\'; el.style.boxShadow = \'0 0 20px rgba(0, 212, 255, 0.5)\'; setTimeout(function() { el.style.boxShadow = \'none\'; }, 2000); } }, 100); }} /></Card>';
  
  calc = calc.replace(oldTimeline[0], newTimeline);
  fs.writeFileSync('client/src/pages/Calculator.jsx', calc, 'utf8');
  console.log('  OK - Calculator.jsx patche (props multi-jours ajoutees)');
} else {
  console.log('  ATTENTION - Pattern Timeline24h non trouve dans Calculator.jsx');
  console.log('  Recherche manuelle...');
  var lines = calc.split('\n');
  for (var li = 0; li < lines.length; li++) {
    if (lines[li].indexOf('Timeline24h') !== -1 && lines[li].indexOf('<') !== -1) {
      console.log('  Ligne ' + (li + 1) + ': ' + lines[li].substring(0, 120));
    }
  }
}

// ============================================================
// ETAPE 4 : CLAUDE-current.md
// ============================================================
console.log('[4/4] Mise a jour CLAUDE-current.md...');

var current = '# Tache en cours\\n\\n## Statut: TIMELINE V6 MULTI-NIVEAUX\\n\\n';
current += '## Fichiers modifies\\n';
current += '- client/src/components/timeline/Timeline24h.jsx (reecrit - 3 vues)\\n';
current += '- client/src/components/timeline/Timeline24h.module.css (reecrit)\\n';
current += '- client/src/pages/Calculator.jsx (props multi-jours ajoutees)\\n\\n';
current += '## Donnees consommees\\n';
current += '- Vue Jour: jours[jourActifIndex].activites (state client)\\n';
current += '- Vue Semaine: jours[] + resultat.details_jours[] + resultat.statistiques\\n';
current += '- Zero calcul client, tout vient du backend\\n\\n';
current += '## Prochaine etape\\n';
current += '- Build, test, commit\\n';
current += '- Vue 2 Semaines (phase 2, apres validation vue Semaine)\\n';

fs.writeFileSync('CLAUDE-current.md', current.replace(/\\n/g, '\n'), 'utf8');
console.log('  OK - CLAUDE-current.md mis a jour');

console.log('\n=== TERMINE ===');
