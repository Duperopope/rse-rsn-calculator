import React from 'react';
import styles from './ActionPlan.module.css';

function actionFor(item) {
  const text = `${item.regle || ''} ${item.message || item.description || ''}`.toLowerCase();
  if (text.includes('continue')) return 'Insérer une pause réglementaire avant le seuil, puis relancer la vérification.';
  if (text.includes('journali')) return 'Réduire la conduite prévue ou réaffecter la portion excédentaire à un autre conducteur.';
  if (text.includes('hebdo') || text.includes('semaine')) return 'Contrôler les semaines précédentes et réaffecter le service avant validation.';
  if (text.includes('repos')) return 'Décaler la prise de service pour rétablir le repos requis.';
  if (text.includes('amplitude')) return 'Raccourcir l’amplitude ou organiser une relève compatible avec le service.';
  if (text.includes('pause')) return 'Ajouter ou allonger une pause dans le planning, puis vérifier à nouveau.';
  return 'Vérifier la règle citée, ajuster le planning et relancer le contrôle avant affectation.';
}

export function ActionPlan({ infractions = [], avertissements = [] }) {
  const items = [...infractions, ...avertissements].slice(0, 4);
  if (!items.length) return <section className={styles.ok}><strong>Décision possible</strong><span>Aucun écart détecté sur les données saisies. Confirmer avec les données réelles et le responsable transport.</span></section>;
  return (
    <section className={styles.plan} aria-labelledby="action-title">
      <div className={styles.heading}><span>Plan d’action</span><strong id="action-title">Corriger avant affectation</strong></div>
      <ol>{items.map((item, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{item.regle || 'Point à contrôler'}</strong><p>{actionFor(item)}</p></div></li>)}</ol>
    </section>
  );
}
