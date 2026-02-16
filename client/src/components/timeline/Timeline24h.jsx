import React, { useState, useMemo } from 'react';
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
  var detailJour = props.detailJour;
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
    // Barre infractions jour
    detailJour && detailJour.infractions && detailJour.infractions.length > 0 ? React.createElement('div', { className: styles.jourInfBar },
      React.createElement('span', { className: styles.jourInfIcon }, '\u26A0'),
      React.createElement('span', { className: styles.jourInfText }, detailJour.infractions.length + ' infraction' + (detailJour.infractions.length > 1 ? 's' : '') + ' sur ce jour')
    ) : null,
    detailJour && detailJour.avertissements && detailJour.avertissements.length > 0 && (!detailJour.infractions || detailJour.infractions.length === 0) ? React.createElement('div', { className: styles.jourAvertBar },
      React.createElement('span', { className: styles.jourAvertIcon }, '\u24D8'),
      React.createElement('span', { className: styles.jourAvertText }, detailJour.avertissements.length + ' alerte' + (detailJour.avertissements.length > 1 ? 's' : '') + ' sur ce jour')
    ) : null,
    // Badge equipage
    React.createElement('div', { className: styles.badgeRow },
      React.createElement('span', { className: styles.badge },
        (equipage === 'double' ? '\uD83D\uDC65 Duo' : '\uD83D\uDC64 Solo')
      )
    ),
    // Tooltip
    tooltip ? React.createElement('div', { className: styles.tooltip },
      React.createElement('strong', null, (COULEURS[tooltip.type] || {}).label || tooltip.type),
      ' \u2022 ', tooltip.debut, ' \u2192 ', tooltip.fin,
      ' \u2022 ', formatDuree(tooltip.duree)
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
  var onInfractionClick = props.onInfractionClick;

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
          nbInf > 0 ? React.createElement('span', { className: styles.semaineInfBadge, onClick: function(e) { e.stopPropagation(); if (onInfractionClick) onInfractionClick(i, 'infraction'); } }, nbInf) : null,
          nbAvert > 0 ? React.createElement('span', { className: styles.semaineAvertBadge, onClick: function(e) { e.stopPropagation(); if (onInfractionClick) onInfractionClick(i, 'avertissement'); } }, nbAvert) : null
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
  var onInfractionClick = props.onInfractionClick;

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

  // Auto-reset vue si plus de multi-jours (useEffect pour eviter setState pendant render)
  React.useEffect(function() {
    if (!hasMultiJours && vue !== "Jour") { setVue("Jour"); }
  }, [hasMultiJours]);
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
      detailJour: detailsJours && detailsJours[jourActifIndex] ? detailsJours[jourActifIndex] : null,
      activites: activites,
      equipage: equipage,
      theme: theme,
      onActiviteClick: onActiviteClick,
      tooltip: tooltip,
      setTooltip: setTooltip
    }) : null,

    vue === 'Semaine' ? React.createElement(VueSemaine, {
      onInfractionClick: onInfractionClick,
      jours: jours,
      detailsJours: detailsJours,
      jourActifIndex: jourActifIndex,
      onJourClick: onJourClick,
      statistiques: statistiques
    }) : null
  );
}
