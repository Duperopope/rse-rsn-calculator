import React, { useEffect, useRef, useState } from "react";
import { useAccountSession } from "./AccountSessionContext.jsx";
import styles from "./AccountMenu.module.css";
import { useI18n } from "../../platform/i18n/I18nProvider.jsx";
import { API_URL } from "../../config/constants.js";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19c.7-3.4 3-5.2 6.5-5.2s5.8 1.8 6.5 5.2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5 19 6v5.2c0 4.2-2.7 7.6-7 9.3-4.3-1.7-7-5.1-7-9.3V6l7-2.5Z" />
      <path d="m9.2 12 1.8 1.8 3.9-4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.8 18c.5-3 2.2-4.6 5.2-4.6s4.7 1.6 5.2 4.6" />
      <path d="M15 6.2a2.7 2.7 0 0 1 0 5.2M16 13.8c2.4.4 3.7 1.8 4.2 4.2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 5H5v14h5M14.5 8l4 4-4 4M8 12h10" />
    </svg>
  );
}
function OperationsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V9M10 18V5M16 18v-7M22 18H2"/><path d="m3 7 5-3 6 5 7-5"/></svg>;
}

export function AccountMenu() {
  const session = useAccountSession();
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const firstItemRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    fetch(`${API_URL}/account/avatar`)
      .then((response) => response.ok ? response.blob() : null)
      .then((blob) => {
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setAvatarUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [session?.user?.id, session?.avatarRevision]);

  if (!session?.user) return null;
  const { user } = session;
  const initial = user.username.trim().charAt(0).toUpperCase() || "U";
  const roleLabel = t(`account.role.${user.role}`);

  const run = (action) => {
    setOpen(false);
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
      action();
    });
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-label={t("account.menu.open", { username: user.username })}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.avatar} aria-hidden="true">{avatarUrl ? <img src={avatarUrl} alt="" /> : initial}</span>
        <span className={styles.triggerText}>
          <strong>{user.username}</strong>
          <small>{roleLabel}</small>
        </span>
        <svg className={styles.chevron} viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div className={styles.menu} role="menu" aria-label={t("account.menu.label")}>
          <div className={styles.identity}>
            <span className={styles.avatarLarge} aria-hidden="true">{avatarUrl ? <img src={avatarUrl} alt="" /> : initial}</span>
            <span>
              <strong>{user.username}</strong>
              <small>{roleLabel}</small>
            </span>
          </div>
          <div className={styles.locale} aria-label={t("account.menu.language")}>
            <span>{t("account.menu.language")}</span>
            <div>
              <button type="button" aria-pressed={locale === "fr"} onClick={() => setLocale("fr")}>FR</button>
              <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
            </div>
          </div>
          <div className={styles.separator} />
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => run(session.openSecurity)}
          >
            <ShieldIcon />
            <span><strong>{t("account.menu.security")}</strong><small>{t("account.menu.securityHint")}</small></span>
          </button>
          {user.role === "admin" ? (
            <>
              <button type="button" role="menuitem" onClick={() => run(session.openOperations)}>
                <OperationsIcon />
                <span><strong>{t("account.menu.operations")}</strong><small>{t("account.menu.operationsHint")}</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => run(session.openAccounts)}>
                <UsersIcon />
                <span><strong>{t("account.menu.manage")}</strong><small>{t("account.menu.manageHint")}</small></span>
              </button>
            </>
          ) : null}
          <div className={styles.separator} />
          <button
            type="button"
            role="menuitem"
            className={styles.logout}
            onClick={() => run(session.logout)}
          >
            <LogoutIcon />
            <span><strong>{t("account.menu.logout")}</strong><small>{t("account.menu.logoutHint")}</small></span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
