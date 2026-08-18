import React from 'react';
import styles from './ContributionDialog.module.css';

export function ContributionDialog({ open, onClose, onContribute }) {
  if (!open) return null;
  return <div className={styles.backdrop} role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="pact-title">
      <button className={styles.close} onClick={onClose} aria-label="Fermer">×</button>
      <span className={styles.kicker}>Pacte de contribution</span>
      <h2 id="pact-title">Le travail utile ouvre des droits</h2>
      <p className={styles.thesis}>FIMOCheck reste gratuit pour vérifier un service. Les personnes qui améliorent réellement le produit doivent bénéficier de la valeur qu’elles créent.</p>
      <div className={styles.rules}>
        <article><span>01</span><div><strong>Une preuve, pas une popularité</strong><p>Un bug reproductible, un cas réglementaire documenté ou un test terrain compte davantage qu’un nombre de mentions « j’aime ».</p></div></article>
        <article><span>02</span><div><strong>Une validation humaine</strong><p>Chaque contribution est examinée, reliée à une correction et rendue traçable avant d’ouvrir une récompense.</p></div></article>
        <article><span>03</span><div><strong>Des droits concrets</strong><p>Accès professionnel temporaire, fonctionnalités d’équipe, mois offerts ou crédit de service selon l’impact vérifié.</p></div></article>
        <article><span>04</span><div><strong>Aucune donnée revendue</strong><p>Les contributions ne servent ni au profilage publicitaire ni à la spéculation sur les données des conducteurs.</p></div></article>
      </div>
      <aside><strong>Programme pilote</strong><span>Les reçus de contribution sont actifs. L’attribution automatique des avantages viendra avec les comptes utilisateurs et le registre de validation.</span></aside>
      <div className={styles.actions}><button onClick={onContribute}>Proposer une amélioration</button><button className={styles.secondary} onClick={onClose}>Continuer gratuitement</button></div>
    </section>
  </div>;
}
