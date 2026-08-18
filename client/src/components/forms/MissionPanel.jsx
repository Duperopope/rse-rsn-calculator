import React from 'react';
import styles from './MissionPanel.module.css';

export function MissionPanel({ mission, onChange }) {
  function update(key, value) { onChange({ ...mission, [key]: value }); }
  return (
    <section className={styles.panel} aria-labelledby="mission-title" data-tour="mission">
      <div className={styles.intro}>
        <span className={styles.kicker}>Fiche mission</span>
        <h2 id="mission-title">Identifier le service</h2>
        <p>Ces informations restent dans ce navigateur et rendent l’historique et le rapport exploitables.</p>
      </div>
      <div className={styles.fields}>
        <label><span>Référence</span><input maxLength="60" value={mission.reference} onChange={e => update('reference', e.target.value)} placeholder="Ex. NAVETTE-042" /></label>
        <label><span>Dépôt ou site</span><input maxLength="60" value={mission.site} onChange={e => update('site', e.target.value)} placeholder="Ex. Lyon Nord" /></label>
        <label><span>Objet du service</span><input maxLength="90" value={mission.objet} onChange={e => update('objet', e.target.value)} placeholder="Ex. Navette événementielle" /></label>
      </div>
      <p className={styles.privacy}>Ne saisissez pas le nom du conducteur : FIMOCheck n’en a pas besoin.</p>
    </section>
  );
}
