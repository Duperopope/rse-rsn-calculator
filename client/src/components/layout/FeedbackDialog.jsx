import React, { useState } from 'react';
import { API_URL } from '../../config/constants.js';
import styles from './FeedbackDialog.module.css';

export function FeedbackDialog({ open, onClose }) {
  const [form, setForm] = useState({ note: 0, role: 'exploitant', sujet: 'utilite', message: '' });
  const [status, setStatus] = useState('idle');
  const [receipt, setReceipt] = useState('');
  if (!open) return null;
  async function submit(e) {
    e.preventDefault(); if (!form.note || form.message.trim().length < 5) return;
    setStatus('sending');
    try {
      const res = await fetch(API_URL + '/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReceipt(data.contributionId || '');
      setStatus('sent');
    } catch { setStatus('error'); }
  }
  return <div className={styles.backdrop} role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button className={styles.close} onClick={onClose} aria-label="Fermer">×</button>
      {status === 'sent' ? <div className={styles.success}><span>Merci</span><h2 id="feedback-title">Contribution enregistrée</h2><p>Elle sera examinée avant attribution d’un avantage. Conservez ce reçu pour la rattacher à votre futur compte.</p>{receipt ? <code>{receipt}</code> : null}<button onClick={onClose}>Fermer</button></div> : <form onSubmit={submit}>
        <span className={styles.kicker}>Retour terrain</span><h2 id="feedback-title">FIMOCheck vous a-t-il aidé ?</h2>
        <p className={styles.lead}>Aucun horaire, nom de conducteur ni contenu de mission n’est envoyé. Les apports vérifiés pourront ouvrir des avantages professionnels ; la popularité seule ne compte pas.</p>
        <fieldset><legend>Votre note</legend><div className={styles.rating}>{[1,2,3,4,5].map(n => <button type="button" key={n} className={form.note === n ? styles.selected : ''} onClick={() => setForm({...form,note:n})} aria-label={`${n} sur 5`}>{n}</button>)}</div></fieldset>
        <div className={styles.row}><label>Votre rôle<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="exploitant">Exploitation / planning</option><option value="conducteur">Conducteur</option><option value="formateur">Formation</option><option value="responsable">Responsable transport</option><option value="autre">Autre</option></select></label><label>Sujet<select value={form.sujet} onChange={e=>setForm({...form,sujet:e.target.value})}><option value="utilite">Utilité du résultat</option><option value="exactitude">Exactitude réglementaire</option><option value="ergonomie">Ergonomie</option><option value="fonction">Fonction manquante</option><option value="bug">Bug</option></select></label></div>
        <label>Que faudrait-il améliorer ?<textarea maxLength="1200" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Décrivez le contexte et le résultat attendu…" /></label>
        {status === 'error' ? <p className={styles.error}>Envoi impossible. Réessayez dans un instant.</p> : null}
        <button className={styles.submit} disabled={!form.note || form.message.trim().length < 5 || status === 'sending'}>{status === 'sending' ? 'Enregistrement…' : 'Envoyer le retour'}</button>
      </form>}
    </section>
  </div>;
}
