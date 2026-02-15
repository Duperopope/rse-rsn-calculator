import React, { useState } from 'react';
import { TYPES_ACTIVITE, TEMPLATES } from '../../config/constants.js';
import { IconeActivite } from '../icons/TachyIcons.jsx';
import styles from './JourFormulaire.module.css';

/**
 * Formulaire d'un jour - v7.9.0 Refonte UX
 * - Templates en cartes visuelles cliquables
 * - Selecteur d'activite en boutons avec icones
 * - Resume temps reel par jour
 * @param {Object} jour - { date, activites: [{debut, fin, type}] }
 * @param {number} index
 * @param {Function} onUpdate
 * @param {Function} onRemove
 * @param {Function} onDuplicate
 * @param {boolean} canRemove
 */

function useSwipeDelete(onDelete, threshold = 80) {
  const startX = React.useRef(0);
  const currentX = React.useRef(0);
  const swiping = React.useRef(false);
  const elRef = React.useRef(null);

  const handlers = {
    onTouchStart(e) {
      startX.current = e.touches[0].clientX;
      swiping.current = true;
      if (elRef.current) elRef.current.style.transition = 'none';
    },
    onTouchMove(e) {
      if (!swiping.current) return;
      currentX.current = e.touches[0].clientX;
      const diff = currentX.current - startX.current;
      if (diff < 0 && elRef.current) {
        elRef.current.style.transform = 'translateX(' + Math.max(diff, -120) + 'px)';
        elRef.current.style.opacity = String(1 - Math.min(Math.abs(diff) / 200, 0.5));
      }
    },
    onTouchEnd() {
      swiping.current = false;
      const diff = currentX.current - startX.current;
      if (elRef.current) {
        elRef.current.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        if (diff < -threshold) {
          elRef.current.style.transform = 'translateX(-100%)';
          elRef.current.style.opacity = '0';
          if (navigator.vibrate) navigator.vibrate(15);
          setTimeout(onDelete, 300);
        } else {
          elRef.current.style.transform = 'translateX(0)';
          elRef.current.style.opacity = '1';
        }
      }
      currentX.current = 0;
    }
  };
  return { ref: elRef, handlers };
}

/* Mini helper : minutes depuis minuit */
function toMin(hhmm) {
  if (!hhmm || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function fmtDuree(minutes) {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + ' min';
  if (m === 0) return h + 'h';
  return h + 'h' + String(m).padStart(2, '0');
}

/* Calcul du resume du jour */
function resumeJour(activites) {
  let conduite = 0;
  let pause = 0;
  let travail = 0;
  let premierDebut = null;
  let dernierFin = null;

  for (const act of activites) {
    if (!act.debut || !act.fin) continue;
    let d = toMin(act.fin) - toMin(act.debut);
    if (d < 0) d += 1440;
    if (premierDebut === null) premierDebut = toMin(act.debut);
    dernierFin = toMin(act.fin);

    if (act.type === 'C') { conduite += d; travail += d; }
    else if (act.type === 'T' || act.type === 'D') { travail += d; }
    else if (act.type === 'P' || act.type === 'R') { pause += d; }
  }

  let amplitude = 0;
  if (premierDebut !== null && dernierFin !== null) {
    amplitude = dernierFin - premierDebut;
    if (amplitude < 0) amplitude += 1440;
  }

  return { conduite, pause, travail, amplitude };
}

/* Composant carte template */
function TemplateCard({ templateKey, template, selected, onClick }) {
  const iconeMap = { journeeType: 'C', journeeLongue: 'C', serviceNuit: 'T' };
  const couleurMap = { journeeType: '#4CAF50', journeeLongue: '#FF9800', serviceNuit: '#9C27B0' };

  return (
    <button
      className={selected ? styles.templateCardActive : styles.templateCard}
      onClick={onClick}
      type="button"
      title={template.label}
    >
      <span className={styles.templateIcon}>
        <IconeActivite type={iconeMap[templateKey] || 'C'} size={18} color={couleurMap[templateKey] || '#888'} />
      </span>
      <span className={styles.templateLabel}>{template.label}</span>
    </button>
  );
}

/* Composant selecteur d'activite en boutons */
function TypeActiviteSelector({ value, onChange }) {
  return (
    <div className={styles.typeSelector}>
      {TYPES_ACTIVITE.map(t => (
        <button
          key={t.code}
          type="button"
          className={value === t.code ? styles.typeBtnActive : styles.typeBtn}
          onClick={() => onChange(t.code)}
          title={t.label}
          style={value === t.code ? { borderColor: t.couleur, background: t.couleur + '18' } : {}}
        >
          <IconeActivite type={t.code} size={18} color={value === t.code ? t.couleur : undefined} />
          <span className={styles.typeBtnLabel}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function JourFormulaire({ jour, index, onUpdate, onRemove, onDuplicate, canRemove = true }) {
  const [showTypeSelector, setShowTypeSelector] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);

  function updateDate(newDate) {
    onUpdate(index, { ...jour, date: newDate });
  }

  function updateActivite(actIndex, field, value) {
    const acts = [...jour.activites];
    const old = acts[actIndex];
    const updated = { ...old, [field]: value };

    // Si on change le debut: ajuster la fin pour garder la meme duree
    if (field === "debut" && old.debut && old.fin && value) {
      var oldDuree = toMin(old.fin) - toMin(old.debut);
      if (oldDuree < 0) oldDuree += 1440;
      if (oldDuree > 0) {
        var newFin = toMin(value) + oldDuree;
        if (newFin >= 1440) newFin -= 1440;
        var hh = String(Math.floor(newFin / 60)).padStart(2, "0");
        var mm = String(newFin % 60).padStart(2, "0");
        updated.fin = hh + ":" + mm;
      }
    }

    acts[actIndex] = updated;

    // Chainage: si on change la fin, ajuster le debut de la suivante
    if (field === "fin" && actIndex < acts.length - 1) {
      var next = acts[actIndex + 1];
      // Ne chainer que si le debut de la suivante = ancien fin (etait chaine)
      if (next.debut === old.fin || !next.debut) {
        var nextDuree = 0;
        if (next.debut && next.fin) {
          nextDuree = toMin(next.fin) - toMin(next.debut);
          if (nextDuree < 0) nextDuree += 1440;
        }
        acts[actIndex + 1] = { ...next, debut: value };
        // Ajuster aussi la fin de la suivante pour garder sa duree
        if (nextDuree > 0 && value) {
          var nf = toMin(value) + nextDuree;
          if (nf >= 1440) nf -= 1440;
          var hh2 = String(Math.floor(nf / 60)).padStart(2, "0");
          var mm2 = String(nf % 60).padStart(2, "0");
          acts[actIndex + 1] = { ...acts[actIndex + 1], fin: hh2 + ":" + mm2 };
        }
      }
    }

    // Chainage: si on change le debut, ajuster la fin du precedent
    if (field === "debut" && actIndex > 0) {
      var prev = acts[actIndex - 1];
      if (prev.fin === old.debut || !prev.fin) {
        acts[actIndex - 1] = { ...prev, fin: value };
      }
    }

    onUpdate(index, { ...jour, activites: acts });
  }

  function changeType(actIndex, newType) {
    updateActivite(actIndex, 'type', newType);
    setShowTypeSelector(null);
  }

  function ajouterActivite() {
    const last = jour.activites[jour.activites.length - 1];
    var debutMin = last && last.fin ? toMin(last.fin) : 360;
    var finMin = debutMin + 15;
    if (finMin >= 1440) finMin -= 1440;
    var dH = String(Math.floor(debutMin / 60)).padStart(2, "0");
    var dM = String(debutMin % 60).padStart(2, "0");
    var fH = String(Math.floor(finMin / 60)).padStart(2, "0");
    var fM = String(finMin % 60).padStart(2, "0");
    const newAct = {
      debut: dH + ":" + dM,
      fin: fH + ":" + fM,
      type: "C"
    };
    onUpdate(index, { ...jour, activites: [...jour.activites, newAct] });
  }

  function supprimerActivite(actIndex) {
    if (jour.activites.length <= 1) return;
    const newActivites = jour.activites.filter((_, i) => i !== actIndex);
    onUpdate(index, { ...jour, activites: newActivites });
  }

  function appliquerTemplate(templateKey) {
    const tpl = TEMPLATES[templateKey];
    if (!tpl) return;
    setActiveTemplate(templateKey);
    onUpdate(index, {
      ...jour,
      activites: tpl.activites.map(a => ({ ...a }))
    });
  }

  const stats = resumeJour(jour.activites);
  const conduiteOk = stats.conduite <= 540;
  const amplitudeOk = stats.amplitude <= 780;

  return (
    <div className={styles.jour}>
      {/* EN-TETE DU JOUR */}
      <div className={styles.jourHeader}>
        <div className={styles.dateGroup}>
          <span className={styles.jourBadge}>Jour {index + 1}</span>
          <input
            type="date"
            className={styles.dateInput}
            value={jour.date}
            onChange={(e) => updateDate(e.target.value)}
          />
        </div>
        <div className={styles.jourActions}>
          <button className={styles.actionBtnLabel} onClick={() => onDuplicate(index)} title="Dupliquer ce jour">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            <span>Dupliquer</span>
          </button>
          {canRemove ? (
            <button className={styles.removeBtnLabel} onClick={() => onRemove(index)} title="Supprimer ce jour">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              <span>Supprimer</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* TEMPLATES EN CARTES */}
      <div className={styles.templates}>
        <span className={styles.templatesLabel}>Remplissage rapide :</span>
        <div className={styles.templateCards}>
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <TemplateCard
              key={key}
              templateKey={key}
              template={tpl}
              selected={activeTemplate === key}
              onClick={() => appliquerTemplate(key)}
            />
          ))}
        </div>
      </div>

      {/* LISTE DES ACTIVITES */}
      <div className={styles.activites}>
        <div className={styles.activitesHeader}>
          <span className={styles.colHead}>Type</span>
          <span className={styles.colHead}>Debut</span>
          <span className={styles.colHead}></span>
          <span className={styles.colHead}>Fin</span>
          <span className={styles.colHead}></span>
        </div>
        {jour.activites.map((act, actIdx) => {
          const typeInfo = TYPES_ACTIVITE.find(t => t.code === act.type) || TYPES_ACTIVITE[0];
          // Detection chevauchement
          var chevauchement = false;
          if (actIdx > 0 && act.debut) {
            var prevAct = jour.activites[actIdx - 1];
            if (prevAct.fin && toMin(act.debut) < toMin(prevAct.fin)) {
              chevauchement = true;
            }
          }
          if (actIdx < jour.activites.length - 1 && act.fin) {
            var nextAct = jour.activites[actIdx + 1];
            if (nextAct.debut && toMin(nextAct.debut) < toMin(act.fin)) {
              chevauchement = true;
            }
          }
          let duree = 0;
          if (act.debut && act.fin) {
            duree = toMin(act.fin) - toMin(act.debut);
            if (duree < 0) duree += 1440;
          }

          return (
            <React.Fragment key={actIdx}>
              <div id={'activite-' + actIdx} data-activite-index={actIdx} className={styles.activiteLine + (chevauchement ? ' ' + styles.chevauchement : '')} style={{ '--type-color': typeInfo.couleur + '80' }}>
                <button
                  type="button"
                  className={styles.activiteTypeBtn}
                  onClick={() => setShowTypeSelector(showTypeSelector === actIdx ? null : actIdx)}
                  style={{ borderColor: typeInfo.couleur + '60', background: typeInfo.couleur + '12' }}
                  title={'Changer le type (actuellement: ' + typeInfo.label + ')'}
                >
                  <IconeActivite type={act.type} size={20} color={typeInfo.couleur} />
                  <span className={styles.activiteTypeName} style={{ color: typeInfo.couleur }}>
                    {typeInfo.label}
                  </span>
                </button>

                <input
                  type="time"
                  className={styles.timeInput}
                  value={act.debut}
                  onChange={(e) => updateActivite(actIdx, 'debut', e.target.value)}
                />
                <span className={styles.fleche}>&rarr;</span>
                <input
                  type="time"
                  className={styles.timeInput}
                  value={act.fin}
                  onChange={(e) => updateActivite(actIdx, 'fin', e.target.value)}
                />

                <span className={styles.dureeLabel}>
                  {duree > 0 ? fmtDuree(duree) : ''}
                </span>

                <button
                  className={styles.deleteActBtn}
                  onClick={() => supprimerActivite(actIdx)}
                  disabled={jour.activites.length <= 1}
                  title="Supprimer cette activite"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              {showTypeSelector === actIdx ? (
                <div className={styles.typeSelectorWrapper}>
                  <TypeActiviteSelector value={act.type} onChange={(code) => changeType(actIdx, code)} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </div>

      <button className={styles.addActBtn} onClick={ajouterActivite} type="button">
        + Ajouter une activite
      </button>

      {/* RESUME DU JOUR */}
      <div className={styles.resume}>
        <div className={styles.resumeItem}>
          <IconeActivite type="C" size={16} />
          <span className={styles.resumeLabel}>Conduite</span>
          <span className={conduiteOk ? styles.resumeValueOk : styles.resumeValueDanger}>
            {fmtDuree(stats.conduite)}
          </span>
        </div>
        <div className={styles.resumeSep}></div>
        <div className={styles.resumeItem}>
          <IconeActivite type="P" size={16} />
          <span className={styles.resumeLabel}>Pause</span>
          <span className={styles.resumeValueOk}>{fmtDuree(stats.pause)}</span>
        </div>
        <div className={styles.resumeSep}></div>
        <div className={styles.resumeItem}>
          <span className={styles.resumeLabel}>Amplitude</span>
          <span className={amplitudeOk ? styles.resumeValueOk : styles.resumeValueDanger}>
            {fmtDuree(stats.amplitude)}
          </span>
        </div>
      </div>
    </div>
  );
}
