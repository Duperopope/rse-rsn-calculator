import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import styles from "./AccountManager.module.css";
import { useModalDialog } from "./useModalDialog.js";

export function AccountManager({ open, onClose, currentUser }) {
  const dialogRef = useModalDialog(open, onClose);
  const [users, setUsers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [credential, setCredential] = useState(null);
  async function load() {
    const [r, m] = await Promise.all([
      fetch(API_URL + "/admin/users"),
      fetch(API_URL + "/admin/metrics"),
    ]);
    const [d, metricData] = await Promise.all([r.json(), m.json()]);
    if (r.ok) setUsers(d.users || []);
    else setError(d.error || "Chargement impossible.");
    if (m.ok) setMetrics(metricData);
  }
  useEffect(() => {
    if (open) load();
  }, [open]);
  if (!open) return null;
  async function create(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await fetch(API_URL + "/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: f.get("username"),
        role: f.get("role"),
      }),
    });
    const d = await r.json();
    if (!r.ok) return setError(d.error || "Création impossible.");
    setCredential(d);
    e.currentTarget.reset();
    load();
  }
  async function action(id, path, body) {
    const r = await fetch(`${API_URL}/admin/users/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const d = await r.json();
    if (!r.ok) setError(d.error);
    else load();
  }
  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounts-title"
      >
        <button className={styles.close} onClick={onClose} aria-label="Fermer la gestion des comptes">
          ×
        </button>
        <span className={styles.kicker}>Administration</span>
        <h2 id="accounts-title">Comptes et accès</h2>
        <p>
          Chaque personne reçoit son propre compte. Ne partagez jamais le compte
          propriétaire.
        </p>
        {metrics ? (
          <section className={styles.metrics} aria-label="Indicateurs vérifiés">
            <article>
              <strong>{metrics.accounts.active}</strong>
              <span>comptes actifs</span>
            </article>
            <article>
              <strong>{metrics.usage.analysesTotal}</strong>
              <span>analyses enregistrées</span>
            </article>
            <article>
              <strong>{metrics.usage.analysesLast30Days}</strong>
              <span>analyses sur 30 jours</span>
            </article>
            <article>
              <strong>
                {(metrics.economics.revenueGrossCents / 100).toLocaleString(
                  "fr-FR",
                  { style: "currency", currency: "EUR" },
                )}
              </strong>
              <span>revenu suivi · paiement non connecté</span>
            </article>
          </section>
        ) : null}
        <form onSubmit={create}>
          <label>
            Identifiant
            <input
              name="username"
              required
              pattern="[a-zA-Z0-9._-]{3,40}"
              placeholder="prenom-equipe"
            />
          </label>
          <label>
            Rôle
            <select name="role">
              <option value="member">Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </label>
          <button>Créer le compte</button>
        </form>
        {credential ? (
          <aside>
            <strong>Secret temporaire — affiché une seule fois</strong>
            <code>{credential.user.username}</code>
            <code>{credential.temporaryPassword}</code>
            <button onClick={() => setCredential(null)}>
              J’ai enregistré ces informations
            </button>
          </aside>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.list}>
          {users.map((u) => (
            <article key={u.id}>
              <div>
                <strong>{u.username}</strong>
                <span>
                  {u.role} · {u.active ? "actif" : "désactivé"}
                  {u.mustChangePassword ? " · secret temporaire" : ""}
                </span>
              </div>
              <div className={styles.row}>
                {u.id !== currentUser.id ? (
                  <button
                    onClick={() =>
                      action(u.id, "status", { active: !u.active })
                    }
                  >
                    {u.active ? "Désactiver" : "Réactiver"}
                  </button>
                ) : null}
                <button onClick={() => action(u.id, "revoke")}>
                  Révoquer les sessions
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
