import React from 'react';
import { TYPES_ACTIVITE, TEMPLATES } from '../../config/constants.js';
import { IconeActivite } from '../icons/TachyIcons.jsx';
import styles from './JourFormulaire.module.css';

/**
 * Formulaire d'un jour : date + liste d'activites editables
 * @param {Object} jour - { date, activites: [{debut, fin, type}] }
 * @param {number} index - Index du jour
 * @param {Function} onUpdate - (index, jour) => void
 * @param {Function} onRemove - (index) => void
 * @param {Function} onDuplicate - (index) => void
 * @param {boolean} canRemove - Peut-on supprimer ce jour
 */
export function JourFormulaire({ jour, index, onUpdate, onRemove, onDuplicate, canRemove = true }) {

  function updateDate(newDate) {
    onUpdate(index, { ...jour, date: newDate });
  }

  function updateActivite(actIndex, field, value) {
    const newActivites = jour.activites.map((a, i) =>
      i === actIndex ? { ...a, [field]: value } : a
    );
    onUpdate(index, { ...jour, activites: newActivites });
  }

  function ajouterActivite() {
    const last = jour.activites[jour.activites.length - 1];
    const newAct = {
      debut: last ? last.fin : '06:00',
      fin: last ? '' : '06:15',
      type: 'C'
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
    onUpdate(index, {
      ...jour,
      activites: tpl.activites.map(a => ({ ...a }))
    });
  }

  return (
    <div className={styles.jour}>
      <div className={styles.jourHeader}>
        <div className={styles.dateGroup}>
          <label className={styles.dateLabel}>Jour {index + 1}</label>
          <input
            type="date"
            className={styles.dateInput}
            value={jour.date}
            onChange={(e) => updateDate(e.target.value)}
          />
        </div>
        <div className={styles.jourActions}>
          <select
            className={styles.templateSelect}
            value=""
            onChange={(e) => { if (e.target.value) appliquerTemplate(e.target.value); }}
          >
            <option value="">Template...</option>
            {Object.entries(TEMPLATES).map(([key, tpl]) => (
              <option key={key} value={key}>{tpl.label}</option>
            ))}
          </select>
          <button className={styles.actionBtn} onClick={() => onDuplicate(index)} title="Dupliquer">
            +
          </button>
          {canRemove ? (
            <button className={styles.removeBtn} onClick={() => onRemove(index)} title="Supprimer">
              x
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.activites}>
        {jour.activites.map((act, actIdx) => (
          <div key={actIdx} className={styles.activiteLine}>
            <div className={styles.activiteIcon}>
              <IconeActivite type={act.type} size={16} />
            </div>
            <input
              type="time"
              className={styles.timeInput}
              value={act.debut}
              onChange={(e) => updateActivite(actIdx, 'debut', e.target.value)}
            />
            <span className={styles.tiret}>-</span>
            <input
              type="time"
              className={styles.timeInput}
              value={act.fin}
              onChange={(e) => updateActivite(actIdx, 'fin', e.target.value)}
            />
            <select
              className={styles.typeSelect}
              value={act.type}
              onChange={(e) => updateActivite(actIdx, 'type', e.target.value)}
            >
              {TYPES_ACTIVITE.map(t => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
            <button
              className={styles.deleteActBtn}
              onClick={() => supprimerActivite(actIdx)}
              disabled={jour.activites.length <= 1}
              title="Supprimer activite"
            >
              x
            </button>
          </div>
        ))}
      </div>

      <button className={styles.addActBtn} onClick={ajouterActivite}>
        + Ajouter une activite
      </button>
    </div>
  );
}
