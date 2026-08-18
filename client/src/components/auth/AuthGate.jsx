import React, { useEffect, useState } from "react";
import { API_URL } from "../../config/constants.js";
import styles from "./AuthGate.module.css";
import { AccountManager } from "./AccountManager.jsx";
import { AccountSecurityDialog } from "./AccountSecurityDialog.jsx";
import { AccountSessionProvider } from "./AccountSessionContext.jsx";
import { useI18n } from "../../platform/i18n/I18nProvider.jsx";
import { OperationsCenter } from "./OperationsCenter.jsx";
import { startAuthentication } from "@simplewebauthn/browser";

export function AuthGate({ children }) {
  const { t } = useI18n();
  const [state, setState] = useState({ loading: true, user: null, error: "" });
  const [manageAccounts, setManageAccounts] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [avatarRevision, setAvatarRevision] = useState(0);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  useEffect(() => {
    refresh();
  }, []);
  async function refresh() {
    try {
      const res = await fetch(API_URL + "/auth/status");
      const data = await res.json();
      setState({ loading: false, user: data.user || null, error: "" });
    } catch {
      setState({ loading: false, user: null, error: t("auth.unavailable") });
    }
  }
  async function login(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState((s) => ({ ...s, error: "" }));
    const res = await fetch(API_URL + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    if (!res.ok)
      return setState((s) => ({
        ...s,
        error: data.error || "Connexion impossible.",
      }));
    setState({ loading: false, user: data.user, error: "" });
  }
  async function loginWithPasskey() {
    if (!loginUsername.trim()) {
      return setState((s) => ({ ...s, error: t("auth.passkeyUsernameRequired") }));
    }
    setPasskeyBusy(true);
    setState((s) => ({ ...s, error: "" }));
    try {
      const optionsResponse = await fetch(API_URL + "/auth/passkeys/login/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername }),
      });
      const payload = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(payload.error || t("auth.passkeyUnavailable"));
      const credential = await startAuthentication({ optionsJSON: payload.options });
      const verifyResponse = await fetch(API_URL + "/auth/passkeys/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          challengeId: payload.challengeId,
          response: credential,
        }),
      });
      const verified = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(verified.error || t("auth.passkeyFailed"));
      setState({ loading: false, user: verified.user, error: "" });
    } catch (error) {
      setState((s) => ({ ...s, error: error.message || t("auth.passkeyFailed") }));
    } finally {
      setPasskeyBusy(false);
    }
  }
  async function changePassword(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = form.get("newPassword");
    if (next !== form.get("confirmPassword"))
      return setState((s) => ({
        ...s,
        error: "Les nouveaux mots de passe diffèrent.",
      }));
    const res = await fetch(API_URL + "/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword: next,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      return setState((s) => ({
        ...s,
        error: data.error || "Modification impossible.",
      }));
    setState({
      loading: false,
      user: null,
      error: "Mot de passe modifié. Reconnectez-vous.",
    });
  }
  async function logout() {
    await fetch(API_URL + "/auth/logout", { method: "POST" });
    setState({ loading: false, user: null, error: "" });
  }
  async function recover(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = form.get("newPassword");
    if (next !== form.get("confirmPassword"))
      return setState((s) => ({
        ...s,
        error: "Les nouveaux mots de passe diffèrent.",
      }));
    const res = await fetch(API_URL + "/auth/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: form.get("username"),
        code: form.get("code"),
        newPassword: next,
      }),
    });
    const data = await res.json();
    if (!res.ok)
      return setState((s) => ({
        ...s,
        error: data.error || "Récupération impossible.",
      }));
    setRecovering(false);
    setState({
      loading: false,
      user: null,
      error: "Accès restauré. Reconnectez-vous avec le nouveau mot de passe.",
    });
  }
  if (state.loading)
    return (
      <div className={styles.loading}>{t("auth.loading")}</div>
    );
  if (!state.user && recovering)
    return (
      <AuthScreen
        title={t("auth.recoveryTitle")}
        subtitle={t("auth.recoverySubtitle")}
        error={state.error}
        onSubmit={recover}
        footer={
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setRecovering(false);
              setState((s) => ({ ...s, error: "" }));
            }}
          >
            {t("auth.backToLogin")}
          </button>
        }
      >
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} required />
        </label>
        <label>
          {t("auth.recoveryCode")}
          <input name="code" autoComplete="one-time-code" required />
        </label>
        <label>
          {t("auth.newPassword")}
          <input
            name="newPassword"
            type="password"
            minLength="15"
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          {t("auth.confirm")}
          <input
            name="confirmPassword"
            type="password"
            minLength="15"
            autoComplete="new-password"
            required
          />
        </label>
        <button>{t("auth.restore")}</button>
      </AuthScreen>
    );
  if (!state.user)
    return (
      <AuthScreen
        title={t("auth.loginTitle")}
        subtitle={t("auth.loginSubtitle")}
        error={state.error}
        onSubmit={login}
        footer={
          <button
            type="button"
            className={styles.textButton}
            onClick={() => {
              setRecovering(true);
              setState((s) => ({ ...s, error: "" }));
            }}
          >
            {t("auth.lostPassword")}
          </button>
        }
      >
        <label>
          {t("auth.username")}
          <input name="username" autoComplete="username" required />
        </label>
        <label>
          {t("auth.password")}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <button>{t("auth.login")}</button>
        {typeof window !== "undefined" && window.PublicKeyCredential ? (
          <div className={styles.passkeyChoice}>
            <span>{t("auth.or")}</span>
            <button type="button" className={styles.passkeyButton} disabled={passkeyBusy} onClick={loginWithPasskey}>
              {passkeyBusy ? t("auth.passkeyWaiting") : t("auth.passkeyLogin")}
            </button>
          </div>
        ) : null}
      </AuthScreen>
    );
  if (state.user.mustChangePassword)
    return (
      <AuthScreen
        title={t("auth.initialTitle")}
        subtitle={t("auth.initialSubtitle")}
        error={state.error}
        onSubmit={changePassword}
      >
        <label>
          {t("auth.temporaryPassword")}
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          {t("auth.newPassword")}
          <input
            name="newPassword"
            type="password"
            minLength="15"
            autoComplete="new-password"
            required
          />
          <small>{t("auth.passwordHint")}</small>
        </label>
        <label>
          {t("auth.confirm")}
          <input
            name="confirmPassword"
            type="password"
            minLength="15"
            autoComplete="new-password"
            required
          />
        </label>
        <button>{t("auth.changeAndLogin")}</button>
      </AuthScreen>
    );
  return (
    <AccountSessionProvider value={{
      user: state.user,
      openAccounts: () => setManageAccounts(true),
      openOperations: () => setOperationsOpen(true),
      openSecurity: () => setSecurityOpen(true),
      logout,
      avatarRevision,
    }}>
      {children}
      <AccountManager
        open={manageAccounts}
        onClose={() => setManageAccounts(false)}
        currentUser={state.user}
      />
      <OperationsCenter open={operationsOpen} onClose={() => setOperationsOpen(false)} />
      <AccountSecurityDialog
        open={securityOpen}
        user={state.user}
        onClose={() => setSecurityOpen(false)}
        onAvatarChanged={() => setAvatarRevision((value) => value + 1)}
        onDeleted={() =>
          setState({
            loading: false,
            user: null,
            error: "Compte et données supprimés.",
          })
        }
      />
    </AccountSessionProvider>
  );
}

function AuthScreen({ title, subtitle, error, onSubmit, children, footer }) {
  const { t } = useI18n();
  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <span>FIMO</span>
          <strong>CHECK</strong>
        </div>
        <p className={styles.kicker}>{t("auth.workspace")}</p>
        <h1>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        <form onSubmit={onSubmit}>
          {children}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
        </form>
        {footer}
        <aside>
          <strong>{t("auth.protection")}</strong>
          <span>{t("auth.protectionHint")}</span>
        </aside>
      </section>
    </main>
  );
}
