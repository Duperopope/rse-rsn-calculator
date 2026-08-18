import React, { useEffect, useRef, useState } from "react";
import { useAccountSession } from "./AccountSessionContext.jsx";
import styles from "./AccountMenu.module.css";
import { useI18n } from "../../platform/i18n/I18nProvider.jsx";
import { API_URL } from "../../config/constants.js";
import { Icon } from "../../platform/assets/Icon.jsx";

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
        <Icon name="chevronDown" className={styles.chevron} />
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
            <Icon name="shield" />
            <span><strong>{t("account.menu.security")}</strong><small>{t("account.menu.securityHint")}</small></span>
          </button>
          {user.role === "admin" ? (
            <>
              <button type="button" role="menuitem" onClick={() => run(session.openOperations)}>
                <Icon name="operations" />
                <span><strong>{t("account.menu.operations")}</strong><small>{t("account.menu.operationsHint")}</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => run(session.openAccounts)}>
                <Icon name="users" />
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
            <Icon name="logout" />
            <span><strong>{t("account.menu.logout")}</strong><small>{t("account.menu.logoutHint")}</small></span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
