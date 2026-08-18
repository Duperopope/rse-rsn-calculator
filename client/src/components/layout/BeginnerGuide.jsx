import React, { useState } from 'react';
import styles from './BeginnerGuide.module.css';

export function BeginnerGuide({ onStartTour }) {
  const [open, setOpen] = useState(false);
  return <section className={styles.guide} aria-labelledby="beginner-title">
    <div className={styles.header}>
      <div><span className={styles.kicker}>Première vérification</span><h2 id="beginner-title">Vous débutez ? Partez d’une journée connue.</h2><p>Une vérification guidée prend environ trois minutes. Aucun vocabulaire réglementaire n’est nécessaire pour commencer.</p></div>
      <div className={styles.actions}><button onClick={onStartTour}>Lancer le parcours guidé</button><button className={styles.secondary} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Masquer les repères' : 'Comprendre les repères'}</button></div>
    </div>
    {open ? <div className={styles.content}>
      <div className={styles.path}>
        <article><span>Avant</span><strong>Décrivez ce qui est prévu</strong><p>Choisissez le service, indiquez les heures et donnez une référence à la mission.</p></article>
        <article><span>Pendant</span><strong>Surveillez les limites</strong><p>Les jauges montrent ce qui se rapproche d’un seuil, sans attendre le rapport.</p></article>
        <article><span>Après</span><strong>Corrigez puis vérifiez</strong><p>Un résultat n’est plus valable dès qu’un horaire change : relancez le contrôle.</p></article>
      </div>
      <dl className={styles.glossary}>
        <div><dt>Conduite continue</dt><dd>Temps conduit depuis la dernière pause suffisante.</dd></div>
        <div><dt>Amplitude</dt><dd>Écart entre le début et la fin de la journée de service.</dd></div>
        <div><dt>Repos</dt><dd>Période réellement libre dont dispose le conducteur.</dd></div>
        <div><dt>Avertissement</dt><dd>Point à confirmer ; ce n’est pas automatiquement une infraction.</dd></div>
      </dl>
    </div> : null}
  </section>;
}
