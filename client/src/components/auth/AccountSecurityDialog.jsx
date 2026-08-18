import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import styles from "./AccountSecurityDialog.module.css";
import { useModalDialog } from "./useModalDialog.js";

export function AccountSecurityDialog({ open, user, onClose, onDeleted, onAvatarChanged }) {
  const dialogRef = useModalDialog(open, onClose);
  const [codes, setCodes] = useState([]);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);
  const [privacy, setPrivacy] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  useEffect(() => {
    if (open)
      fetch(API_URL + "/privacy")
        .then((response) => (response.ok ? response.json() : null))
        .then(setPrivacy)
        .catch(() => {});
  }, [open]);
  useEffect(() => {
    if (!avatarFile) { setAvatarPreview(""); return undefined; }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);
  if (!open) return null;

  async function generateCodes(event) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(API_URL + "/auth/recovery-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "Génération impossible.");
    setCodes(data.codes || []);
    setMessage("Nouveaux codes créés. Les anciens sont désormais invalides.");
    event.currentTarget.reset();
  }

  function downloadCodes() {
    const blob = new Blob(
      [
        `FIMOCheck — codes de récupération pour ${user.username}\nGénérés : ${new Date().toISOString()}\n\n${codes.join("\n")}\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fimocheck-codes-recuperation.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(API_URL + "/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: form.get("password"),
        confirmation: form.get("confirmation"),
      }),
    });
    const data = await response.json();
    if (!response.ok)
      return setMessage(data.error || "Suppression impossible.");
    onDeleted();
  }

  async function uploadAvatar(event) {
    event.preventDefault();
    if (!avatarFile) return;
    setAvatarBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("avatar", avatarFile);
    try {
      const response = await fetch(API_URL + "/account/avatar", { method: "PUT", body: form });
      const data = await response.json();
      if (!response.ok) return setMessage(data.error || "Image refusée.");
      setAvatarFile(null);
      setMessage("Photo de profil mise à jour.");
      onAvatarChanged?.();
    } finally { setAvatarBusy(false); }
  }

  async function deleteAvatar() {
    setAvatarBusy(true);
    setMessage("");
    try {
      const response = await fetch(API_URL + "/account/avatar", { method: "DELETE" });
      if (!response.ok) return setMessage("Suppression impossible.");
      setAvatarFile(null);
      setMessage("Photo supprimée. Les initiales sont de nouveau utilisées.");
      onAvatarChanged?.();
    } finally { setAvatarBusy(false); }
  }

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Sécurité du compte"
      >
        <header>
          <div>
            <p>Compte personnel</p>
            <h2>Sécurité et données</h2>
          </div>
          <button aria-label="Fermer la sécurité du compte" onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.identity}>
          <strong>{user.username}</strong>
          <span>{user.role}</span>
        </div>
        {privacy ? (
          <section className={styles.notice}>
            <strong>Conservation active</strong>
            <span>
              Analyses : {privacy.analysesRetentionDays} jours · Retours :{" "}
              {privacy.feedbackRetentionDays} jours · Journal :{" "}
              {privacy.auditRetentionDays} jours · Session :{" "}
              {privacy.sessionHours} heures
            </span>
            <small>
              Aucun nom de conducteur requis. Les sauvegardes suivent une durée
              distincte administrée.
            </small>
          </section>
        ) : null}
        <section className={styles.block}>
          <h3>Photo de profil</h3>
          <p>
            Choisissez une image ou prenez une photo. Elle est recadrée en carré,
            réencodée sans métadonnées et chiffrée avant stockage.
          </p>
          <form onSubmit={uploadAvatar} className={styles.avatarForm}>
            {avatarPreview ? <img className={styles.avatarPreview} src={avatarPreview} alt="Aperçu de la nouvelle photo de profil" /> : null}
            <label>
              JPEG, PNG ou WebP · 2 Mo maximum
              <input
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className={styles.avatarActions}>
              <button className={styles.primary} disabled={!avatarFile || avatarBusy}>Enregistrer la photo</button>
              <button type="button" className={styles.secondary} disabled={avatarBusy} onClick={deleteAvatar}>Utiliser les initiales</button>
            </div>
          </form>
        </section>
        <section className={styles.block}>
          <h3>Exporter mes analyses</h3>
          <p>
            Télécharge une copie JSON lisible de toutes les analyses rattachées
            à ce compte.
          </p>
          <a
            className={styles.primary}
            href={API_URL + "/analyses/export"}
            download
          >
            Télécharger mon export
          </a>
        </section>
        <section className={styles.block}>
          <h3>Codes de récupération</h3>
          <p>
            La génération invalide tous les anciens codes. Conserve la copie
            hors de cet ordinateur.
          </p>
          {codes.length ? (
            <>
              <ol className={styles.codes}>
                {codes.map((code) => (
                  <li key={code}>
                    <code>{code}</code>
                  </li>
                ))}
              </ol>
              <button className={styles.secondary} onClick={downloadCodes}>
                Télécharger cette copie unique
              </button>
            </>
          ) : (
            <form onSubmit={generateCodes}>
              <label>
                Mot de passe actuel
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className={styles.primary}>
                Créer huit nouveaux codes
              </button>
            </form>
          )}
        </section>
        <section className={`${styles.block} ${styles.danger}`}>
          <h3>Supprimer définitivement le compte</h3>
          <p>
            Supprime le compte, ses sessions, ses codes et toutes ses analyses.
            Une sauvegarde administrateur antérieure peut encore exister selon
            la politique de conservation.
          </p>
          {danger ? (
            <form onSubmit={deleteAccount}>
              <label>
                Mot de passe actuel
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                Écrire exactement <strong>{user.username}</strong>
                <input name="confirmation" required />
              </label>
              <button className={styles.delete}>
                Supprimer définitivement
              </button>
            </form>
          ) : (
            <button
              className={styles.secondary}
              onClick={() => setDanger(true)}
            >
              Préparer la suppression
            </button>
          )}
        </section>
        {message ? (
          <p className={styles.message} role="status">
            {message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
