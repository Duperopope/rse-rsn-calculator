import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import styles from "./AccountSecurityDialog.module.css";
import { useModalDialog } from "./useModalDialog.js";
import { startRegistration } from "@simplewebauthn/browser";
import { useI18n } from "../../platform/i18n/I18nProvider.jsx";

export function AccountSecurityDialog({ open, user, onClose, onDeleted, onAvatarChanged }) {
  const { t, formatDate } = useI18n();
  const dialogRef = useModalDialog(open, onClose);
  const [codes, setCodes] = useState([]);
  const [message, setMessage] = useState("");
  const [danger, setDanger] = useState(false);
  const [privacy, setPrivacy] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  async function loadPasskeys() {
    const response = await fetch(API_URL + "/auth/passkeys");
    if (response.ok) setPasskeys((await response.json()).passkeys || []);
  }
  useEffect(() => {
    if (open) {
      loadPasskeys().catch(() => {});
      fetch(API_URL + "/privacy")
        .then((response) => (response.ok ? response.json() : null))
        .then(setPrivacy)
        .catch(() => {});
    }
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
    if (!response.ok) return setMessage(data.error || t("security.messages.codesError"));
    setCodes(data.codes || []);
    setMessage(t("security.messages.codesCreated"));
    event.currentTarget.reset();
  }

  function downloadCodes() {
    const blob = new Blob(
      [
        t("security.recovery.file", { username: user.username, date: new Date().toISOString(), codes: codes.join("\n") }),
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
      if (!response.ok) return setMessage(data.error || t("security.messages.imageRejected"));
      setAvatarFile(null);
      setMessage(t("security.messages.avatarUpdated"));
      onAvatarChanged?.();
    } finally { setAvatarBusy(false); }
  }

  async function deleteAvatar() {
    setAvatarBusy(true);
    setMessage("");
    try {
      const response = await fetch(API_URL + "/account/avatar", { method: "DELETE" });
      if (!response.ok) return setMessage(t("security.messages.deleteError"));
      setAvatarFile(null);
      setMessage(t("security.messages.avatarDeleted"));
      onAvatarChanged?.();
    } finally { setAvatarBusy(false); }
  }

  async function registerPasskey(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPasskeyBusy(true);
    setMessage("");
    try {
      const optionsResponse = await fetch(API_URL + "/auth/passkeys/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.get("password"), label: form.get("deviceLabel") }),
      });
      const payload = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(payload.error || t("security.messages.enrollError"));
      const credential = await startRegistration({ optionsJSON: payload.options });
      const verifyResponse = await fetch(API_URL + "/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: payload.challengeId, label: form.get("deviceLabel"), response: credential }),
      });
      const verified = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verified.error || t("security.messages.verifyError"));
      event.currentTarget.reset();
      await loadPasskeys();
      setMessage(t("security.messages.passkeyAdded"));
    } catch (error) {
      setMessage(error.message || t("security.messages.enrollCancelled"));
    } finally { setPasskeyBusy(false); }
  }

  async function removePasskey(event, id) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch(API_URL + "/auth/passkeys/" + encodeURIComponent(id), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || t("security.messages.deleteError"));
    await loadPasskeys();
    setMessage(t("security.messages.passkeyRemoved"));
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
        aria-label={t("security.dialogLabel")}
      >
        <header>
          <div>
            <p>{t("security.kicker")}</p>
            <h2>{t("security.title")}</h2>
          </div>
          <button aria-label={t("security.close")} onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.identity}>
          <strong>{user.username}</strong>
          <span>{user.role}</span>
        </div>
        {privacy ? (
          <section className={styles.notice}>
            <strong>{t("security.retention.title")}</strong>
            <span>
              {t("security.retention.values", { analyses: privacy.analysesRetentionDays, feedback: privacy.feedbackRetentionDays, audit: privacy.auditRetentionDays, session: privacy.sessionHours })}
            </span>
            <small>
              {t("security.retention.note")}
            </small>
          </section>
        ) : null}
        <section className={styles.block}>
          <h3>{t("security.avatar.title")}</h3>
          <p>{t("security.avatar.description")}</p>
          <form onSubmit={uploadAvatar} className={styles.avatarForm}>
            {avatarPreview ? <img className={styles.avatarPreview} src={avatarPreview} alt={t("security.avatar.preview")} /> : null}
            <label>
              {t("security.avatar.formats")}
              <input
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
              />
            </label>
            <div className={styles.avatarActions}>
              <button className={styles.primary} disabled={!avatarFile || avatarBusy}>{t("security.avatar.save")}</button>
              <button type="button" className={styles.secondary} disabled={avatarBusy} onClick={deleteAvatar}>{t("security.avatar.initials")}</button>
            </div>
          </form>
        </section>
        <section className={styles.block}>
          <h3>{t("security.passkeys.title")}</h3>
          <p>{t("security.passkeys.description")}</p>
          {typeof window !== "undefined" && window.PublicKeyCredential ? (
            <>
              <form onSubmit={registerPasskey}>
                <label>
                  {t("security.passkeys.deviceName")}
                  <input name="deviceLabel" maxLength="60" placeholder={t("security.passkeys.devicePlaceholder")} autoComplete="one-time-code" required />
                </label>
                <label>
                  {t("security.currentPassword")}
                  <input name="password" type="password" autoComplete="current-password" required />
                </label>
                <button className={styles.primary} disabled={passkeyBusy}>
                  {passkeyBusy ? t("security.passkeys.verifying") : t("security.passkeys.add")}
                </button>
              </form>
              {passkeys.length ? (
                <ul className={styles.passkeyList}>
                  {passkeys.map((passkey) => (
                    <li key={passkey.id}>
                      <div><strong>{passkey.label}</strong><small>{t("security.passkeys.added", { date: formatDate(new Date(passkey.createdAt), { dateStyle: "medium" }) })}</small></div>
                      <details>
                        <summary>{t("security.passkeys.remove")}</summary>
                        <form onSubmit={(event) => removePasskey(event, passkey.id)}>
                          <label>{t("security.currentPassword")}<input name="password" type="password" autoComplete="current-password" required /></label>
                          <button className={styles.delete}>{t("security.passkeys.confirmRemove")}</button>
                        </form>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : <p className={styles.empty}>{t("security.passkeys.empty")}</p>}
            </>
          ) : <p className={styles.empty}>{t("security.passkeys.unsupported")}</p>}
        </section>
        <section className={styles.block}>
          <h3>{t("security.export.title")}</h3>
          <p>{t("security.export.description")}</p>
          <a
            className={styles.primary}
            href={API_URL + "/analyses/export"}
            download
          >
            {t("security.export.download")}
          </a>
        </section>
        <section className={styles.block}>
          <h3>{t("security.recovery.title")}</h3>
          <p>{t("security.recovery.description")}</p>
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
                {t("security.recovery.download")}
              </button>
            </>
          ) : (
            <form onSubmit={generateCodes}>
              <label>
                {t("security.currentPassword")}
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className={styles.primary}>
                {t("security.recovery.create")}
              </button>
            </form>
          )}
        </section>
        <section className={`${styles.block} ${styles.danger}`}>
          <h3>{t("security.deletion.title")}</h3>
          <p>{t("security.deletion.description")}</p>
          {danger ? (
            <form onSubmit={deleteAccount}>
              <label>
                {t("security.currentPassword")}
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                {t("security.deletion.typeExactly")} <strong>{user.username}</strong>
                <input name="confirmation" required />
              </label>
              <button className={styles.delete}>
                {t("security.deletion.confirm")}
              </button>
            </form>
          ) : (
            <button
              className={styles.secondary}
              onClick={() => setDanger(true)}
            >
              {t("security.deletion.prepare")}
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
